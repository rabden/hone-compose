import { LocalLinter, Dialect, createBinaryModuleFromUrl } from "harper.js";

let linterInstance: LocalLinter | null = null;
let initPromise: Promise<LocalLinter> | null = null;

function getWasmUrl(): string {
  return chrome.runtime.getURL("harper_wasm_bg.wasm");
}

export async function getLinter(): Promise<LocalLinter> {
  if (linterInstance) return linterInstance;
  if (initPromise) return initPromise;

  initPromise = (async () => {
    const wasmUrl = getWasmUrl();
    const binary = createBinaryModuleFromUrl(wasmUrl);
    const linter = new LocalLinter({
      binary,
      dialect: Dialect.American,
    });
    await linter.setup();
    linterInstance = linter;
    return linter;
  })();

  return initPromise;
}

async function isEnglishText(text: string): Promise<boolean> {
  if (!text || text.trim().length < 5) return true;

  return new Promise((resolve) => {
    chrome.i18n.detectLanguage(text, (result) => {
      if (!result || !result.isReliable) {
        resolve(true);
        return;
      }

      const primary = result.languages[0];
      if (primary && primary.language === "en" && primary.percentage >= 75) {
        resolve(true);
      } else {
        resolve(false);
      }
    });
  });
}

export async function checkGrammarAndSpelling(text: string): Promise<string> {
  if (!text || !text.trim()) {
    return text;
  }

  try {
    const isEnglish = await isEnglishText(text);
    if (!isEnglish) {
      return text;
    }

    const linter = await getLinter();
    const lints = await linter.lint(text);

    if (!lints || lints.length === 0) {
      return text;
    }

    const words = text.split(/\s+/).filter(w => w.length > 1);
    if (words.length >= 3) {
      let spellingErrors = 0;
      for (const lint of lints) {
        const kind = lint.lint_kind().toLowerCase();
        const msg = lint.message().toLowerCase();
        if (
          kind.includes("spelling") ||
          msg.includes("typo") ||
          msg.includes("did you mean")
        ) {
          spellingErrors++;
        }
      }

      if (spellingErrors / words.length > 0.35) {
        return text;
      }
    }

    const sortedLints = [...lints].sort((a, b) => b.span().start - a.span().start);

    let corrected = text;
    for (const lint of sortedLints) {
      const suggestions = lint.suggestions();
      if (suggestions && suggestions.length > 0) {
        const replacement = suggestions[0].get_replacement_text();
        const span = lint.span();

        if (
          span.start >= 0 &&
          span.end <= text.length &&
          span.start <= span.end
        ) {
          corrected =
            corrected.slice(0, span.start) +
            replacement +
            corrected.slice(span.end);
        }
      }
    }

    return corrected;
  } catch (error) {
    console.error("Local grammar check failed, returning original text.", error);
    return text;
  }
}
