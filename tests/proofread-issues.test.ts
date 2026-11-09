/**
 * Tests for Harper lint → ProofreadIssue conversion (markview-style rules:
 * spelling wins overlaps, suggestions become labeled fixes, messages lose
 * their Markdown).
 * Run: npm test (Node's built-in test runner with native TS stripping)
 */
import { test } from "node:test";
import { strict as assert } from "node:assert";
import {
  harperLintsToIssues,
  hasConsecutiveSpellingErrors,
  ignoreKey,
  looksLikeNonEnglish,
  plainMessage,
  type RawLint,
} from "../src/content/proofread-issues.ts";

function lint(over: Partial<RawLint>): RawLint {
  return {
    span: { start: 0, end: 0 },
    lintKind: "Spelling",
    message: "",
    problemText: "",
    suggestions: [],
    ...over,
  };
}

test("misspellings map to fixes with the flagged text", () => {
  const text = "This is a tset of the checker.";
  const issues = harperLintsToIssues(
    [lint({
      span: { start: 10, end: 14 },
      lintKind: "Spelling",
      problemText: "tset",
      suggestions: [{ kind: 0, replacementText: "test" }],
      contextHash: "3245033106691971774",
    })],
    text,
  );

  assert.equal(issues.length, 1);
  assert.equal(issues[0].kind, "spelling");
  assert.equal(issues[0].category, "Spelling");
  assert.equal(issues[0].contextHash, "3245033106691971774");
  assert.equal(text.slice(issues[0].start, issues[0].end), "tset");
  assert.deepEqual(issues[0].fixes, [{ label: "test", replacement: "test" }]);
});

test("spelling lints win when rules flag the same span", () => {
  const text = "an test";
  const issues = harperLintsToIssues(
    [
      lint({
        span: { start: 0, end: 2 },
        lintKind: "Agreement",
        message: "Did you mean `a`?",
        suggestions: [{ kind: 0, replacementText: "a" }],
      }),
      lint({
        span: { start: 0, end: 2 },
        lintKind: "Spelling",
        suggestions: [{ kind: 0, replacementText: "a" }],
      }),
    ],
    text,
  );

  assert.equal(issues.length, 1);
  assert.equal(issues[0].kind, "spelling");
});

test("overlapping grammar lints keep the first and drop the rest", () => {
  const text = "there are many problems here";
  const issues = harperLintsToIssues(
    [
      lint({
        span: { start: 0, end: 8 },
        lintKind: "WordChoice",
        message: "Consider `their are`.",
        suggestions: [],
      }),
      lint({
        span: { start: 5, end: 11 },
        lintKind: "Grammar",
        message: "",
        suggestions: [],
      }),
    ],
    text,
  );

  assert.equal(issues.length, 1);
  assert.equal(issues[0].start, 0);
  assert.equal(issues[0].end, 8);
});

test("suggestion kinds map to labels: replace, insert-after, remove", () => {
  const text = "Because of this";
  const issues = harperLintsToIssues(
    [lint({
      span: { start: 0, end: 7 },
      lintKind: "Punctuation",
      message: "",
      suggestions: [
        { kind: 0, replacementText: "Because of:" },
        { kind: 2, replacementText: " this" },
      ],
    })],
    text,
  );

  assert.deepEqual(issues[0].fixes, [
    { label: "Because of:", replacement: "Because of:" },
    { label: "Because this", replacement: "Because this" },
  ]);

  const removed = harperLintsToIssues(
    [lint({
      span: { start: 0, end: 7 },
      lintKind: "Redundancy",
      message: "",
      suggestions: [{ kind: 1, replacementText: "" }],
    })],
    text,
  );
  assert.deepEqual(removed[0].fixes, [
    { label: `Remove \u201CBecause\u201D`, replacement: "" },
  ]);

  // Whitespace-only removals get a readable label instead of `Remove ""`
  const spaced = harperLintsToIssues(
    [lint({
      span: { start: 2, end: 3 },
      lintKind: "Formatting",
      message: "",
      suggestions: [{ kind: 1, replacementText: "" }],
    })],
    "hi .",
  );
  assert.deepEqual(spaced[0].fixes, [
    { label: "Remove the space", replacement: "" },
  ]);
});

test("fixes that change nothing are dropped and duplicates collapse", () => {
  const text = "teh word";
  const issues = harperLintsToIssues(
    [lint({
      span: { start: 0, end: 3 },
      lintKind: "Spelling",
      suggestions: [
        { kind: 0, replacementText: "teh" },
        { kind: 0, replacementText: "the" },
        { kind: 0, replacementText: "the" },
      ],
    })],
    text,
  );

  assert.deepEqual(issues[0].fixes, [{ label: "the", replacement: "the" }]);
});

test("messages lose markdown and spans are clamped to the text", () => {
  assert.equal(plainMessage("Did you mean `the`?"), "Did you mean \u201Cthe\u201D?");

  const issues = harperLintsToIssues(
    [lint({ span: { start: 5, end: 99 }, lintKind: "Grammar", message: "**Bad**" })],
    "hi",
  );
  assert.equal(issues.length, 0);
});

test("ignore keys separate spelling words from grammar phrases", () => {
  const word = ignoreKey({ kind: "spelling", message: "" }, "Tset");
  const grammar = ignoreKey({ kind: "grammar", message: "msg" }, "Tset");
  assert.equal(word, "w:tset");
  assert.equal(grammar, "g:tset:msg");
});

test("non-English text trips the spelling density guard", () => {
  const text = "dsf sdf sdf sdfsdf sdf dsfs";
  const issues = Array.from({ length: 6 }, (_, i) =>
    lint({
      span: { start: i * 4, end: i * 4 + 3 },
      lintKind: "Spelling",
    }),
  );
  const converted = harperLintsToIssues(issues, text);
  assert.equal(looksLikeNonEnglish(converted, text), true);

  const english = "the quick brown fox jumps over";
  assert.equal(
    looksLikeNonEnglish(
      harperLintsToIssues(
        [lint({ span: { start: 0, end: 3 }, lintKind: "Spelling" })],
        english,
      ),
      english,
    ),
    false,
  );
});

test("typo-heavy English keeps its underlines; short samples never trip the guard", () => {
  // Completing a third typo in seven words must not wipe every issue.
  const text = "i dont hold any power withiin this househodl ";
  const flagged = ["dont", "withiin", "househodl"].map((word) =>
    lint({
      span: { start: text.indexOf(word), end: text.indexOf(word) + word.length },
      lintKind: "Spelling",
    }),
  );
  assert.equal(looksLikeNonEnglish(harperLintsToIssues(flagged, text), text), false);

  // Every word flagged, but too few words to conclude the text is non-English.
  const short = "teh bron jumpped";
  const all = harperLintsToIssues(
    short.split(" ").map((word) =>
      lint({
        span: { start: short.indexOf(word), end: short.indexOf(word) + word.length },
        lintKind: "Spelling",
      }),
    ),
    short,
  );
  assert.equal(looksLikeNonEnglish(all, short), false);
});

function spellingForWords(text: string, words: string[]) {
  return harperLintsToIssues(
    words.map((w) =>
      lint({
        span: { start: text.indexOf(w), end: text.indexOf(w) + w.length },
        lintKind: "Spelling",
      }),
    ),
    text,
  );
}

test("five consecutive misspelled words suppress; English typo runs never do", () => {
  const roman = "bohot shukriya meherbani aap ki";
  assert.equal(
    hasConsecutiveSpellingErrors(spellingForWords(roman, ["bohot", "shukriya", "meherbani", "aap", "ki"]), roman),
    true,
  );

  const four = "bohot shukriya meherbani aap";
  assert.equal(
    hasConsecutiveSpellingErrors(spellingForWords(four, ["bohot", "shukriya", "meherbani", "aap"]), four),
    false,
  );

  // Correct function words break the run, as in real English prose.
  const english = "teh quick bron fox jumpped over teh lazy dg";
  assert.equal(
    hasConsecutiveSpellingErrors(spellingForWords(english, ["teh", "bron", "jumpped", "dg"]), english),
    false,
  );

  const isolated = "i dont hold any power withiin this househodl";
  assert.equal(
    hasConsecutiveSpellingErrors(spellingForWords(isolated, ["dont", "withiin", "househodl"]), isolated),
    false,
  );
});

test("consecutive-run detection counts a word flagged through attached punctuation", () => {
  const text = "wo worda wordb wordc wordd worde, next";
  const issues = spellingForWords(text, ["worda", "wordb", "wordc", "wordd", "worde"]);
  assert.equal(hasConsecutiveSpellingErrors(issues, text), true);
  assert.equal(hasConsecutiveSpellingErrors(issues, text, 6), false);
});
