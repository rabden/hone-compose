import { test, type TestContext } from "node:test";
import { strict as assert } from "node:assert";
import { registerHooks } from "node:module";
import { LocalLinter, createBinaryModuleFromUrl } from "harper.js";

Object.defineProperty(globalThis, "chrome", { value: undefined, writable: true, configurable: true });

const sourceRoot = new URL("../src/", import.meta.url).href;
// Native Node TS tests need extension resolution for the bundler's imports.
// Carry the query through local imports to isolate each background's state.
registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier.startsWith(".") && context.parentURL?.startsWith(sourceRoot)) {
      const url = new URL(specifier, context.parentURL);
      if (!/\.[a-z]+$/i.test(url.pathname)) url.pathname += ".ts";
      url.search = new URL(context.parentURL).search;
      return nextResolve(url.href, context);
    }
    return nextResolve(specifier, context);
  },
});

let moduleId = 0;
async function freshBackground() {
  return import(`../src/background/grammar-worker.ts?test=${moduleId++}`);
}

const wasmUrl = new URL("../node_modules/harper.js/dist/harper_wasm_bg.wasm", import.meta.url).href;
function stubChrome(t: TestContext, stored: Record<string, string[]> = {}) {
  const local = {
    async get() { return structuredClone(stored); },
    async set(update: object) { Object.assign(stored, structuredClone(update)); },
  };
  t.mock.property(globalThis, "chrome", {
    runtime: { getURL: () => wasmUrl },
    storage: { local },
    i18n: {
      detectLanguage(_text: string, callback: (result: object) => void) {
        callback({ isReliable: true, languages: [{ language: "en", percentage: 100 }] });
      },
    },
  });
  t.mock.method(globalThis, "fetch", () => { throw new Error("No external network allowed"); });
  return local;
}

test("a transient wasm fetch failure is retried once; a persistent one rejects", { timeout: 20000 }, async (t) => {
  // Cold-start wasm fetches can reject once ("Failed to fetch") and succeed
  // immediately after. harper caches the compiled wasm module-wide once it
  // loads, so a failing load can only be simulated before that: this test
  // must stay first in this file.
  stubChrome(t);
  t.mock.method(LocalLinter.prototype, "importWords", async () => {});
  t.mock.method(LocalLinter.prototype, "dispose", async () => {});
  const missingUrl = new URL("../node_modules/harper.js/dist/harper_wasm_bg.wasm.missing", import.meta.url).href;
  const served = [missingUrl, missingUrl, missingUrl, wasmUrl];
  const getURL = t.mock.method(chrome.runtime, "getURL", () => served.shift() ?? wasmUrl);

  const stubborn = await freshBackground();
  await assert.rejects(stubborn.getLinter(), /ENOENT/);
  assert.equal(getURL.mock.callCount(), 2);

  const transient = await freshBackground();
  await transient.getLinter();
  assert.equal(getURL.mock.callCount(), 4);
});

test("warmup, multi-tab writes, imports, ignores and linting share one non-deadlocking queue", { timeout: 10000 }, async (t) => {
  const stored = { proofreadWords: ["Seed"], proofreadIgnoredLintHashes: [] };
  const local = stubChrome(t, stored);
  t.mock.method(LocalLinter.prototype, "dispose", async () => {});
  const events: string[] = [];
  const setupStarted = Promise.withResolvers<void>();
  const setupGate = Promise.withResolvers<void>();
  const writeStarted = Promise.withResolvers<void>();
  const writeGate = Promise.withResolvers<void>();
  const importStarted = Promise.withResolvers<void>();
  const importGate = Promise.withResolvers<void>();
  t.mock.method(LocalLinter.prototype, "setup", async () => {
    events.push("setup");
    setupStarted.resolve();
    await setupGate.promise;
  });
  t.mock.method(local, "set", async (update: { proofreadWords?: string[] }) => {
    if (update.proofreadWords?.includes("Alpha") && !update.proofreadWords.includes("Beta")) {
      writeStarted.resolve();
      await writeGate.promise;
    }
    Object.assign(stored, structuredClone(update));
    events.push("persist");
  });
  t.mock.method(LocalLinter.prototype, "importWords", async (words: string[]) => {
    events.push(`import:${words.join(",")}`);
    if (words.includes("Alpha")) {
      importStarted.resolve();
      await importGate.promise;
    }
  });
  t.mock.method(LocalLinter.prototype, "lint", async () => {
    events.push("lint");
    assert.deepEqual(stored.proofreadWords, ["Seed", "Alpha", "Beta"]);
    assert.deepEqual(stored.proofreadIgnoredLintHashes, ["123"]);
    return [];
  });
  const background = await freshBackground();
  const warmup = background.getLinter();
  await setupStarted.promise;
  const alpha = background.syncProofreadState({ word: "Alpha" });
  const beta = background.syncProofreadState({ word: "Beta" });
  const ignore = background.syncProofreadState({ hash: "123" });
  const lint = background.lintForIssues("This is a tset.");
  assert.deepEqual(events, ["setup"]);
  setupGate.resolve();
  await writeStarted.promise;
  assert.deepEqual(events, ["setup", "import:Seed"]);
  writeGate.resolve();
  await importStarted.promise;
  assert.deepEqual(events, ["setup", "import:Seed", "persist", "import:Alpha"]);
  importGate.resolve();
  await Promise.all([warmup, alpha, beta, ignore, lint, background.getLinter()]);
  assert.deepEqual(events, ["setup", "import:Seed", "persist", "import:Alpha", "persist", "import:Beta", "persist", "lint"]);
});

test("failed startup and linting reject callers but do not poison the queue", async (t) => {
  stubChrome(t);
  t.mock.method(LocalLinter.prototype, "importWords", async () => {});
  t.mock.method(LocalLinter.prototype, "dispose", async () => {});
  let setupCalls = 0;
  t.mock.method(LocalLinter.prototype, "setup", async () => {
    if (++setupCalls === 1) throw new Error("Startup failed");
  });
  const background = await freshBackground();
  await assert.rejects(background.getLinter(), /Startup failed/);
  await background.getLinter();
  assert.equal(setupCalls, 2);
  let lintCalls = 0;
  t.mock.method(LocalLinter.prototype, "lint", async () => {
    if (++lintCalls === 1) throw new Error("Lint failed");
    return [];
  });
  await assert.rejects(background.lintForIssues("This is a test."), /Lint failed/);
  assert.deepEqual(await background.lintForIssues("This is a test."), []);
});

test("failed writes are not imported; failed imports report errors and re-prime on the next job", async (t) => {
  const stored = { proofreadWords: ["Seed"] };
  const local = stubChrome(t, stored);
  t.mock.method(LocalLinter.prototype, "setup", async () => {});
  t.mock.method(LocalLinter.prototype, "lint", async () => []);
  const imports: string[][] = [];
  let failImport = true;
  let disposed = 0;
  t.mock.method(LocalLinter.prototype, "dispose", async () => { disposed++; });
  t.mock.method(LocalLinter.prototype, "importWords", async (words: string[]) => {
    imports.push(words);
    if (failImport) throw new Error("Import failed");
  });
  const background = await freshBackground();
  await assert.rejects(background.getLinter(), /Import failed/);
  assert.equal(disposed, 1);
  failImport = false;
  await background.getLinter();
  let failWrite = true;
  t.mock.method(local, "set", async (update: object) => {
    if (failWrite) throw new Error("Write failed");
    Object.assign(stored, structuredClone(update));
  });
  await assert.rejects(background.syncProofreadState({ word: "Alpha" }), /Write failed/);
  assert.deepEqual(imports, [["Seed"], ["Seed"]]);
  failWrite = false;
  failImport = true;
  await assert.rejects(background.syncProofreadState({ word: "Alpha" }), /Import failed/);
  assert.deepEqual(stored.proofreadWords, ["Seed", "Alpha"]);
  assert.equal(disposed, 2);
  failImport = false;
  await background.lintForIssues("This is a test.");
  assert.deepEqual(imports.at(-1), ["Seed", "Alpha"]);
});

test("a word added before startup primes Harper; limits also bound the active linter", async (t) => {
  const stored = { proofreadWords: Array.from({ length: 1999 }, (_, i) => `Word${i}`) };
  stubChrome(t, stored);
  t.mock.method(LocalLinter.prototype, "setup", async () => {});
  t.mock.method(LocalLinter.prototype, "lint", async () => []);
  t.mock.method(LocalLinter.prototype, "dispose", async () => {});
  const imported: string[] = [];
  t.mock.method(LocalLinter.prototype, "importWords", async (words: string[]) => { imported.push(...words); });
  const background = await freshBackground();
  await background.syncProofreadState({ word: "LastWord" });
  assert.equal(imported.length, 0);
  await background.getLinter();
  assert.equal(imported.length, 2000);
  assert.equal(imported.at(-1), "LastWord");
  await assert.rejects(background.syncProofreadState({ word: "Overflow" }), /dictionary is full/);
  await background.syncProofreadState({ word: "LastWord" });
  assert.equal(imported.length, 2000);
  assert.equal(stored.proofreadWords.length, 2000);
});

test("service-worker proofreading handlers validate input, await state and report failures", async (t) => {
  const stored: Record<string, string[]> = {};
  const local = stubChrome(t, stored);
  t.mock.method(console, "error", () => {});
  t.mock.method(LocalLinter.prototype, "setup", async () => {});
  t.mock.method(LocalLinter.prototype, "importWords", async () => {});
  t.mock.method(LocalLinter.prototype, "dispose", async () => {});
  let failLint = false;
  const lintMock = t.mock.method(LocalLinter.prototype, "lint", async () => {
    if (failLint) throw new Error("Lint failed");
    return [];
  });
  type Handler = (message: Record<string, unknown>, sender: { id: string }, reply: (response: unknown) => void) => boolean;
  let handler: Handler;
  Object.assign(chrome.runtime, {
    id: "test-extension",
    onInstalled: { addListener() {} },
    onMessage: { addListener(listener: Handler) { handler = listener; } },
  });
  Object.assign(chrome, { commands: { onCommand: { addListener() {} } } });
  await import(`../src/background/service-worker.ts?test=${moduleId++}`);
  const request = (message: Record<string, unknown>) => {
    const response = Promise.withResolvers<{ success: boolean; error?: string; issues?: unknown[] }>();
    const asynchronous = handler(message, { id: "test-extension" }, response.resolve);
    return { asynchronous, response: response.promise };
  };
  for (const text of [undefined, null, 42, {}, "x".repeat(8001), "\u{1f600}".repeat(4001)]) {
    const result = request({ type: "LINT_TEXT", text });
    assert.equal(result.asynchronous, false);
    assert.equal((await result.response).success, false);
  }
  assert.equal(lintMock.mock.callCount(), 0);
  for (const text of ["x".repeat(8000), "\u{1f600}".repeat(4000)]) {
    const result = request({ type: "LINT_TEXT", text });
    assert.equal(result.asynchronous, true);
    assert.deepEqual(await result.response, { success: true, issues: [] });
  }
  for (const state of [{}, { word: 3 }, { word: " " }, { hash: null }, { hash: "" }]) {
    const result = request({ type: "PROOFREAD_STATE_ADDED", ...state });
    assert.equal(result.asynchronous, false);
    assert.equal((await result.response).success, false);
  }
  const writeStarted = Promise.withResolvers<void>();
  const writeGate = Promise.withResolvers<void>();
  let failWrite = false;
  t.mock.method(local, "set", async (update: object) => {
    if (failWrite) throw new Error("Storage failed");
    writeStarted.resolve();
    await writeGate.promise;
    Object.assign(stored, update);
  });
  let replied = false;
  const state = request({ type: "PROOFREAD_STATE_ADDED", word: "Hone" });
  const persisted = state.response.then((value) => { replied = true; return value; });
  await writeStarted.promise;
  assert.equal(replied, false);
  writeGate.resolve();
  assert.deepEqual(await persisted, { success: true });
  assert.deepEqual(stored.proofreadWords, ["Hone"]);
  failWrite = true;
  assert.deepEqual(await request({ type: "PROOFREAD_STATE_ADDED", hash: "123" }).response, { success: false, error: "Storage failed" });
  failLint = true;
  assert.deepEqual(await request({ type: "LINT_TEXT", text: "This is a test." }).response, { success: false, error: "Lint failed" });
  assert.deepEqual(await request({ type: "WARMUP_LINTER" }).response, { success: true });
});

test("installed Harper spans and the background pipeline both use UTF-16, including astral and ZWJ prefixes", async (t) => {
  stubChrome(t);
  const binary = createBinaryModuleFromUrl(wasmUrl);
  const linter = new LocalLinter({ binary });
  await linter.setup();
  const background = await freshBackground();
  try {
    for (const prefix of ["", "\u{1f600} ", "\u{1f469}\u200d\u{1f4bb} ", "e\u0301 "]) {
      const text = prefix + "This is a tset of the checker.";
      const raw = await linter.lint(text, { language: "plaintext" });
      try {
        const misspelling = raw.find((lint) => lint.get_problem_text() === "tset");
        assert.ok(misspelling);
        const span = misspelling.span();
        assert.equal(span.start, text.indexOf("tset"));
        assert.equal(span.end, text.indexOf("tset") + 4);
        span.free();
        const issues = await background.lintForIssues(text);
        const issue = issues.find((issue) => issue.kind === "spelling" && text.slice(issue.start, issue.end) === "tset");
        assert.ok(issue);
        assert.equal(issue.start, text.indexOf("tset"));
        assert.equal(issue.end, text.indexOf("tset") + 4);
      } finally {
        for (const lint of raw) lint.free();
      }
    }
    const text = "This is a tset of the checker.";
    const issue = (await background.lintForIssues(text)).find((issue) => issue.kind === "spelling");
    assert.ok(issue?.contextHash);
    await background.syncProofreadState({ hash: issue.contextHash });
    assert.equal((await background.lintForIssues(text)).some((lint) => lint.contextHash === issue.contextHash), false);
    await background.syncProofreadState({ word: "tset" });
    assert.equal((await background.lintForIssues("Another tset of the checker.")).some((lint) => lint.kind === "spelling"), false);
  } finally {
    await linter.dispose();
    await (await background.getLinter()).dispose();
  }
});

test("confident English bypasses the density guard; uncertain text keeps it", { timeout: 10000 }, async (t) => {
  stubChrome(t);
  const background = await freshBackground();
  const detect = (result: object) =>
    t.mock.method(chrome.i18n, "detectLanguage", (_text: string, cb: (r: object) => void) => cb(result));
  const gibberish = "dsf sdf sdf sdfsdf sdf dsfs ";
  try {
    detect({ isReliable: true, languages: [{ language: "en", percentage: 100 }] });
    assert.ok((await background.lintForIssues(gibberish)).some((i) => i.kind === "spelling"));

    detect({ isReliable: false });
    assert.deepEqual(await background.lintForIssues(gibberish), []);

    detect({ isReliable: true, languages: [{ language: "fr", percentage: 95 }] });
    assert.deepEqual(await background.lintForIssues(gibberish), []);

    // The reported regression: a completed third typo in seven words must
    // still underline, even when language detection is uncertain.
    detect({ isReliable: false });
    const sentence = "i dont hold any power withiin this househodl ";
    const issues = await background.lintForIssues(sentence);
    assert.ok(issues.some((i) => i.kind === "spelling" && sentence.slice(i.start, i.end) === "househodl"));
    assert.ok(issues.some((i) => i.kind === "spelling" && sentence.slice(i.start, i.end) === "withiin"));
  } finally {
    await (await background.getLinter()).dispose();
  }
});

test("a run of consecutive misspellings suppresses romanized text even when detected as English", { timeout: 10000 }, async (t) => {
  stubChrome(t); // detectLanguage stub claims reliable English — the run rule must still fire.
  const background = await freshBackground();
  try {
    // Hinglish/Urdu with five flagged words in a row: bohot shukriya meherbani aap ki.
    assert.deepEqual(await background.lintForIssues("main theek hoon aap kaise hain bohot shukriya meherbani aap ki "), []);
    // English with isolated typos keeps its underlines.
    const sentence = "i dont hold any power withiin this househodl ";
    assert.ok((await background.lintForIssues(sentence)).some((i) => i.kind === "spelling"));
  } finally {
    await (await background.getLinter()).dispose();
  }
});
