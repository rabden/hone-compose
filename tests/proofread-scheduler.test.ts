import { test } from "node:test";
import { strict as assert } from "node:assert";
import { ProofreadScheduler, invalidateLintCache, proofreadParagraphs, rebaseIssues } from "../src/content/proofread-scheduler.ts";
import type { ProofreadIssue } from "../src/content/proofread-issues.ts";

const issue: ProofreadIssue = { start: 0, end: 3, kind: "spelling", category: "Spelling", message: "typo", fixes: [] };
const flush = async () => { for (let i = 0; i < 12; i++) await Promise.resolve(); };

test("only whitespace completes the last token; paragraph offsets preserve blank lines and emoji", () => {
  assert.deepEqual(proofreadParagraphs("teh"), [{ start: 0, text: "teh", lintText: "" }]);
  assert.equal(proofreadParagraphs("the tset.")[0].lintText, "the ");
  assert.equal(proofreadParagraphs("the tset. ")[0].lintText, "the tset. ");
  assert.deepEqual(proofreadParagraphs("😀 one\n\nlast word"), [
    { start: 0, text: "😀 one\n", lintText: "😀 one\n" },
    { start: 7, text: "\n", lintText: "\n" },
    { start: 8, text: "last word", lintText: "last " },
  ]);
});

test("debounce restarts on every edit and never checks an unfinished word", async (t) => {
  invalidateLintCache();
  t.mock.timers.enable({ apis: ["setTimeout"] });
  const calls: string[] = [];
  const scheduler = new ProofreadScheduler(async (text) => { calls.push(text); return []; }, () => {});
  t.after(() => scheduler.stop());
  scheduler.update("the t");
  t.mock.timers.tick(400);
  scheduler.update("the tset");
  t.mock.timers.tick(499);
  assert.deepEqual(calls, []);
  t.mock.timers.tick(1);
  await flush();
  assert.deepEqual(calls, ["the "]);
  scheduler.update("the tset ");
  t.mock.timers.tick(500);
  await flush();
  assert.deepEqual(calls, ["the ", "the tset "]);
});

test("unchanged paragraphs are reused and their issues shift when an earlier paragraph changes", async (t) => {
  invalidateLintCache();
  t.mock.timers.enable({ apis: ["setTimeout"] });
  const calls: string[] = [];
  let published: ProofreadIssue[] = [];
  const scheduler = new ProofreadScheduler(async (text) => { calls.push(text); return [issue]; }, (_, issues) => { published = issues; });
  t.after(() => scheduler.stop());
  scheduler.update("teh first\nteh second\nteh third ");
  t.mock.timers.tick(500);
  await flush();
  assert.equal(calls.length, 3);
  scheduler.update("teh longer first\nteh second\nteh third ");
  // The untouched "teh" in the edited paragraph keeps its underline.
  assert.deepEqual(published.map((i) => i.start), [0, 17, 28]);
  t.mock.timers.tick(500);
  await flush();
  assert.deepEqual(calls, ["teh first\n", "teh second\n", "teh third ", "teh longer first\n"]);
  assert.deepEqual(published.map((i) => i.start), [0, 17, 28]);
});

test("an in-flight lint is invalidated on input and the next check still waits for debounce", async (t) => {
  invalidateLintCache();
  t.mock.timers.enable({ apis: ["setTimeout"] });
  const calls: string[] = [];
  let resolve!: (issues: ProofreadIssue[]) => void;
  let published: ProofreadIssue[] = [];
  const scheduler = new ProofreadScheduler((text) => { calls.push(text); return new Promise((r) => { resolve = r; }); }, (_, issues) => { published = issues; });
  t.after(() => scheduler.stop());
  scheduler.update("teh old ");
  t.mock.timers.tick(500);
  scheduler.update("teh new ");
  resolve([issue]);
  await flush();
  assert.deepEqual(published, []);
  assert.deepEqual(calls, ["teh old "]);
  t.mock.timers.tick(500);
  assert.deepEqual(calls, ["teh old ", "teh new "]);
  resolve([issue]);
  await flush();
  assert.equal(published.length, 1);
});

test("only one lint runs at once, even when the next debounce expires", async (t) => {
  invalidateLintCache();
  t.mock.timers.enable({ apis: ["setTimeout"] });
  const calls: string[] = [];
  let resolve!: (issues: ProofreadIssue[]) => void;
  const scheduler = new ProofreadScheduler((text) => { calls.push(text); return new Promise((r) => { resolve = r; }); }, () => {});
  t.after(() => scheduler.stop());
  scheduler.update("first ");
  t.mock.timers.tick(500);
  scheduler.update("second ");
  t.mock.timers.tick(500);
  assert.equal(calls.length, 1);
  resolve([]);
  await flush();
  assert.deepEqual(calls, ["first ", "second "]);
  resolve([]);
});

test("IME composition cancels pending checks and resumes with a full debounce", async (t) => {
  invalidateLintCache();
  t.mock.timers.enable({ apis: ["setTimeout"] });
  const calls: string[] = [];
  const scheduler = new ProofreadScheduler(async (text) => { calls.push(text); return []; }, () => {});
  t.after(() => scheduler.stop());
  scheduler.update("one ");
  scheduler.pause();
  scheduler.update("composition ");
  t.mock.timers.tick(1000);
  assert.deepEqual(calls, []);
  scheduler.resume("complete ");
  t.mock.timers.tick(499);
  assert.deepEqual(calls, []);
  t.mock.timers.tick(1);
  await flush();
  assert.deepEqual(calls, ["complete "]);
});

test("state changes invalidate caches and late responses, including unchanged paragraphs", async (t) => {
  invalidateLintCache();
  t.mock.timers.enable({ apis: ["setTimeout"] });
  let resolve!: (issues: ProofreadIssue[]) => void;
  let calls = 0;
  let published: ProofreadIssue[] = [];
  const scheduler = new ProofreadScheduler(() => { calls++; return new Promise((r) => { resolve = r; }); }, (_, issues) => { published = issues; });
  t.after(() => scheduler.stop());
  scheduler.update("teh text ");
  t.mock.timers.tick(500);
  invalidateLintCache();
  t.mock.timers.tick(0);
  resolve([issue]);
  await flush();
  assert.equal(calls, 2);
  assert.deepEqual(published, []);
  resolve([]);
  await flush();
  assert.deepEqual(published, []);
});

test("stop cancels pending and in-flight publication", async (t) => {
  invalidateLintCache();
  t.mock.timers.enable({ apis: ["setTimeout"] });
  let resolve!: (issues: ProofreadIssue[]) => void;
  let published: ProofreadIssue[] = [];
  const scheduler = new ProofreadScheduler(() => new Promise((r) => { resolve = r; }), (_, issues) => { published = issues; });
  scheduler.update("teh text ");
  t.mock.timers.tick(500);
  scheduler.stop();
  resolve([issue]);
  await flush();
  assert.deepEqual(published, []);
});

test("a long paragraph does not disable checking other paragraphs", async (t) => {
  invalidateLintCache();
  t.mock.timers.enable({ apis: ["setTimeout"] });
  const calls: string[] = [];
  const scheduler = new ProofreadScheduler(async (text) => { calls.push(text); return []; }, () => {});
  t.after(() => scheduler.stop());
  scheduler.update(`${"a".repeat(8001)}\nshort paragraph `);
  t.mock.timers.tick(500);
  await flush();
  assert.deepEqual(calls, ["short paragraph "]);
});

test("rebaseIssues keeps prefix spans, shifts suffix spans, and drops edited spans", () => {
  const at = (start: number, end: number): ProofreadIssue => ({ ...issue, start, end });
  const issues = [at(0, 3), at(8, 11)];
  assert.deepEqual(
    rebaseIssues(issues, "teh aaa teh", "teh longer aaa teh"),
    [at(0, 3), at(15, 18)],
  );
  assert.deepEqual(rebaseIssues([at(4, 7)], "xxx teh", "teh"), [at(0, 3)]);
  assert.deepEqual(rebaseIssues([at(0, 3)], "teh", "txh"), []);
  assert.deepEqual(rebaseIssues([at(0, 3)], "teh", "teh"), [at(0, 3)]);
  assert.deepEqual(rebaseIssues([], "teh", "anything"), []);
});

test("painted issues survive typing until the new check lands", async (t) => {
  invalidateLintCache();
  t.mock.timers.enable({ apis: ["setTimeout"] });
  const calls: string[] = [];
  let published: ProofreadIssue[] = [];
  const scheduler = new ProofreadScheduler(async (text) => { calls.push(text); return [issue]; }, (_, issues) => { published = issues; });
  t.after(() => scheduler.stop());
  scheduler.update("teh ");
  t.mock.timers.tick(500);
  await flush();
  assert.deepEqual(published, [issue]);
  // Completing words changes lintText; the existing underline must not blink out.
  scheduler.update("teh word ");
  assert.deepEqual(published, [issue]);
  scheduler.update("teh word more ");
  assert.deepEqual(published, [issue]);
  assert.deepEqual(calls, ["teh "]);
  t.mock.timers.tick(500);
  await flush();
  assert.deepEqual(calls, ["teh ", "teh word more "]);
  assert.deepEqual(published, [issue]);
});

test("an edit inside a flagged word drops its underline immediately", async (t) => {
  invalidateLintCache();
  t.mock.timers.enable({ apis: ["setTimeout"] });
  let published: ProofreadIssue[] = [];
  const scheduler = new ProofreadScheduler(async () => [issue], (_, issues) => { published = issues; });
  t.after(() => scheduler.stop());
  scheduler.update("teh ");
  t.mock.timers.tick(500);
  await flush();
  assert.deepEqual(published, [issue]);
  scheduler.update("txeh ");
  assert.deepEqual(published, []);
});

test("issues after an insertion shift and stay painted", async (t) => {
  invalidateLintCache();
  t.mock.timers.enable({ apis: ["setTimeout"] });
  let published: ProofreadIssue[] = [];
  const later = { ...issue, start: 3, end: 6 };
  const scheduler = new ProofreadScheduler(async () => [later], (_, issues) => { published = issues; });
  t.after(() => scheduler.stop());
  scheduler.update("aa teh ");
  t.mock.timers.tick(500);
  await flush();
  assert.deepEqual(published, [later]);
  scheduler.update("bb aa teh ");
  assert.deepEqual(published, [{ ...issue, start: 6, end: 9 }]);
});
