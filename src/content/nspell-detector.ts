import nspell from "nspell";
import aff from "./dictionaries/en.aff?raw";
import dic from "./dictionaries/en.dic?raw";

type NSpell = {
  correct(word: string): boolean;
  add(word: string): void;
};

let spell: NSpell | null = null;

const COMMON_ALLOWED_WORDS = [
  "api",
  "apis",
  "app",
  "apps",
  "browser",
  "cardonly",
  "codex",
  "config",
  "css",
  "dom",
  "github",
  "html",
  "javascript",
  "json",
  "npm",
  "openai",
  "react",
  "typescript",
  "ui",
  "url",
  "wasm",
];

function getSpell(): NSpell {
  if (spell) return spell;

  const instance = nspell(aff, dic) as NSpell;
  for (const word of COMMON_ALLOWED_WORDS) {
    instance.add(word);
  }
  spell = instance;
  return instance;
}

function extractWords(text: string): string[] {
  return text.match(/[A-Za-z][A-Za-z'-]{1,}/g) ?? [];
}

export function nspellHasSpellingErrors(
  text: string,
  maxWords = 500,
): boolean | null {
  const words = extractWords(text);
  if (words.length === 0) return false;
  if (words.length > maxWords) return null;

  const checker = getSpell();
  const uniqueWords = new Set(words.map((word) => word.toLowerCase()));

  for (const word of uniqueWords) {
    if (word.includes("'") || word.includes("-")) continue;
    if (!checker.correct(word)) {
      return true;
    }
  }

  return false;
}
