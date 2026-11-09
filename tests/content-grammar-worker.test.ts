import { test } from "node:test";
import { strict as assert } from "node:assert";
import {
  getLinter,
  lintForIssues,
  proofreadAddWord,
  proofreadIgnoreLint,
  subscribeProofreadState,
} from "../src/content/grammar-worker.ts";

Object.defineProperty(globalThis, "chrome", { value: undefined, writable: true, configurable: true });

test("content sends every proofreading operation to the background and awaits its reply", async (t) => {
  const requests: { message: unknown; reply: (response: unknown) => void }[] = [];
  // No local storage, i18n or WASM API is available to the content client.
  t.mock.method(globalThis, "fetch", () => { throw new Error("No network allowed"); });
  t.mock.property(globalThis, "chrome", {
    runtime: {
      sendMessage(message: unknown, reply: (response: unknown) => void) {
        requests.push({ message, reply });
      },
    },
  });
  const operations = [
    { run: () => getLinter(), message: { type: "WARMUP_LINTER" } },
    { run: () => lintForIssues("a tset"), message: { type: "LINT_TEXT", text: "a tset" } },
    { run: () => proofreadAddWord("  Hone  "), message: { type: "PROOFREAD_STATE_ADDED", word: "Hone" } },
    { run: () => proofreadIgnoreLint("123"), message: { type: "PROOFREAD_STATE_ADDED", hash: "123" } },
  ];
  for (const operation of operations) {
    let done = false;
    const result = operation.run().then((value) => { done = true; return value; });
    await Promise.resolve();
    assert.equal(done, false);
    const request = requests.shift()!;
    assert.deepEqual(request.message, operation.message);
    request.reply({ success: true, issues: [] });
    await result;
    assert.equal(done, true);
  }
  assert.equal(requests.length, 0);
});

test("transport, background and malformed-response failures reject instead of returning no issues", async (t) => {
  let response: unknown;
  const runtime = {
    lastError: undefined as { message: string } | undefined,
    sendMessage(_message: unknown, reply: (value: unknown) => void) { reply(response); },
  };
  t.mock.property(globalThis, "chrome", { runtime });
  for (const run of [
    () => lintForIssues("a tset"),
    () => getLinter(),
    () => proofreadAddWord("Hone"),
    () => proofreadIgnoreLint("123"),
  ]) {
    runtime.lastError = { message: "Disconnected" };
    await assert.rejects(run(), /Disconnected/);
    runtime.lastError = undefined;
    response = { success: false, error: "Storage failed" };
    await assert.rejects(run(), /Storage failed/);
    response = undefined;
    await assert.rejects(run(), /Background proofreading failed/);
  }
  response = { success: true };
  await assert.rejects(lintForIssues("a tset"), /Invalid background/);
  response = { success: true, issues: [] };
  assert.deepEqual(await lintForIssues("a tset"), []);
  t.mock.method(runtime, "sendMessage", () => { throw new Error("Extension context invalidated"); });
  await assert.rejects(lintForIssues("a tset"), /context invalidated/);
});

test("proofreading state subscriptions filter local keys, notify once and unsubscribe without linting", (t) => {
  type Listener = (changes: Record<string, unknown>, area: string) => void;
  const listeners = new Set<Listener>();
  t.mock.property(globalThis, "chrome", {
    storage: {
      onChanged: {
        addListener: (listener: Listener) => listeners.add(listener),
        removeListener: (listener: Listener) => listeners.delete(listener),
      },
    },
  });
  let notifications = 0;
  const unsubscribe = subscribeProofreadState(() => notifications++);
  const notify = (changes: Record<string, unknown>, area = "local") => {
    for (const listener of listeners) listener(changes, area);
  };
  notify({ proofreadWords: {} }, "sync");
  notify({ unrelated: {} });
  assert.equal(notifications, 0);
  notify({ proofreadWords: {} });
  notify({ proofreadIgnoredLintHashes: {} });
  notify({ proofreadWords: {}, proofreadIgnoredLintHashes: {} });
  assert.equal(notifications, 3);
  unsubscribe();
  notify({ proofreadWords: {} });
  assert.equal(listeners.size, 0);
  assert.equal(notifications, 3);
});
