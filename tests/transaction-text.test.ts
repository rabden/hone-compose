import { test } from "node:test";
import { strict as assert } from "node:assert";
import {
  expectedTextAfterReplace,
  isCurrentTextTransaction,
  isValidTextTransaction,
  locateTextSpan,
  normalizeReplacementText,
  verifyTextReplacement,
  type TextTransaction,
} from "../src/content/transaction-text.ts";

function transaction(beforeText: string, start: number, end: number, replacement: string): TextTransaction {
  return { beforeText, start, end, replacement, expectedSlice: beforeText.slice(start, end) };
}

test("exact live offsets work, including an explicitly selected duplicate", () => {
  assert.deepEqual(locateTextSpan("cat cat", 4, 7, "cat"), { start: 4, end: 7 });
  assert.deepEqual(locateTextSpan("first\nsecond", 6, 12, "second"), { start: 6, end: 12 });
  assert.deepEqual(locateTextSpan("abc", 1, 1, ""), { start: 1, end: 1 });
});

test("invalid offsets are rejected instead of clamped", () => {
  for (const [start, end] of [[-1, 2], [1, 4], [2, 1], [0.5, 2], [NaN, 2], [1, Infinity]]) {
    assert.equal(locateTextSpan("abc", start, end), null);
    assert.equal(isValidTextTransaction(transaction("abc", start, end, "x")), false);
  }
});

test("missing targets and stale offsets cannot fall back to a live span", () => {
  assert.equal(locateTextSpan("edited target", 0, 6, "before"), null);
  assert.equal(locateTextSpan("prefix target", 0, 6, "target"), null);
  assert.equal(locateTextSpan("x target target", 0, 6, "target"), null);
});

test("snapshot target must match at its original offsets", () => {
  assert.equal(locateTextSpan("target other", 0, 6, "target", "other target"), null);
  assert.equal(locateTextSpan("target", 0, 6, "target", ""), null);
  assert.equal(locateTextSpan("target", 0, 99, "target", "target"), null);
});

test("unique unchanged context relocates past edits outside the target", () => {
  const snapshot = "earlier content: " + "a".repeat(40) + " target " + "b".repeat(40);
  const start = snapshot.indexOf("target");
  const current = "new heading\n" + snapshot;
  assert.deepEqual(locateTextSpan(current, start, start + 6, "target", snapshot), {
    start: start + 12,
    end: start + 18,
  });
  assert.deepEqual(locateTextSpan(current, start, start + 6, undefined, snapshot), {
    start: start + 12,
    end: start + 18,
  });
});

test("a relocated transaction is based on current text, not the snapshot", () => {
  const snapshot = "a".repeat(40) + " target " + "b".repeat(40);
  const current = "prefix\n" + snapshot;
  const start = snapshot.indexOf("target");
  const located = locateTextSpan(current, start, start + 6, "target", snapshot)!;
  const tx = transaction(current, located.start, located.end, "new\ntext");
  assert.equal(isCurrentTextTransaction(tx, current), true);
  assert.equal(isCurrentTextTransaction(tx, snapshot), false);
  assert.equal(verifyTextReplacement(tx, current.replace("target", "new\ntext")), true);
});

test("ambiguous current or original context is never resolved to the first match", () => {
  const context = "a".repeat(40) + "target" + "b".repeat(40);
  assert.equal(locateTextSpan(context + "\n" + context, 40, 46, "target", context), null);
  const snapshot = context + "\n" + context;
  assert.equal(locateTextSpan("prefix " + snapshot, 40, 46, "target", snapshot), null);
});

test("edited targets cannot jump to another occurrence", () => {
  const snapshot = "fix target here; keep target there";
  const current = "fix edited here; keep target there";
  assert.equal(locateTextSpan(current, 4, 10, "target", snapshot), null);
  assert.equal(locateTextSpan("other target", 0, 6, "target", "target"), null);
});

test("changed snapshots do not relocate an empty insertion point or whole-field target", () => {
  assert.equal(locateTextSpan("xabc", 1, 1, "", "abc"), null);
  assert.equal(locateTextSpan("abc\n", 0, 3, "abc", "abc"), null);
  assert.equal(locateTextSpan("abc", 0, 0, "", ""), null);
});

test("newline-only changes require an actual exact change", () => {
  const tx = transaction("first second", 0, 12, "first\nsecond");
  assert.equal(verifyTextReplacement(tx, "first second"), false);
  assert.equal(verifyTextReplacement(tx, "firstsecond"), false);
  assert.equal(verifyTextReplacement(tx, "first\nsecond"), true);
});

test("blank lines and trailing newlines are significant", () => {
  const tx = transaction("before", 0, 6, "first\n\nsecond\n");
  assert.equal(verifyTextReplacement(tx, "first\nsecond"), false);
  assert.equal(verifyTextReplacement(tx, "first\n\nsecond"), false);
  assert.equal(verifyTextReplacement(tx, "first\n\nsecond\n"), true);
});

test("single-space deletion requires exactly that deletion", () => {
  const tx = transaction("one  two", 3, 4, "");
  assert.equal(verifyTextReplacement(tx, "one  two"), false);
  assert.equal(verifyTextReplacement(tx, "one two"), true);
  assert.equal(verifyTextReplacement(tx, "one"), false);
});

test("deletion cannot be accepted for unrelated shortening", () => {
  const tx = transaction("delete this; keep that", 0, 7, "");
  assert.equal(verifyTextReplacement(tx, "delete this"), false);
  assert.equal(verifyTextReplacement(tx, "this; keep that"), true);
});

test("partial prefix, appended replacement, and unrelated suffix edits fail", () => {
  const replacement = "a".repeat(60) + "\ncomplete ending";
  const tx = transaction("old tail", 0, 3, replacement);
  assert.equal(verifyTextReplacement(tx, replacement.slice(0, 48) + " tail"), false);
  assert.equal(verifyTextReplacement(tx, "old tail" + replacement), false);
  assert.equal(verifyTextReplacement(tx, replacement + " changed tail"), false);
  assert.equal(verifyTextReplacement(tx, replacement + " tail"), true);
});

test("noops and empty zero-width replacements are never deletion transactions", () => {
  for (const tx of [transaction("abc", 1, 1, ""), transaction("abc", 0, 3, "abc")]) {
    assert.equal(isValidTextTransaction(tx), false);
    assert.equal(verifyTextReplacement(tx, tx.beforeText), false);
    assert.equal(verifyTextReplacement(tx, "ac"), false);
  }
  assert.equal(isValidTextTransaction(transaction("", 0, 0, "\n")), true);
});

test("verifier also validates the expected original slice", () => {
  const tx = { ...transaction("abc", 0, 1, "x"), expectedSlice: "b" };
  assert.equal(isCurrentTextTransaction(tx, "abc"), false);
  assert.equal(verifyTextReplacement(tx, "xbc"), false);
});

test("CRLF normalization preserves blank lines, trailing newlines, and spaces", () => {
  assert.equal(normalizeReplacementText(" first\r\n\r\nsecond \r\n"), " first\n\nsecond \n");
  assert.equal(normalizeReplacementText("a\rb"), "a\nb");
  const tx = transaction("old", 0, 3, normalizeReplacementText("a\r\nb\r\n"));
  assert.equal(expectedTextAfterReplace(tx), "a\nb\n");
  assert.equal(verifyTextReplacement(tx, "a\r\nb\r\n"), false);
});
