/**
 * Rich-editor replace — delegates to transaction-engine for framework commits.
 */

import { resolveEditorRoot } from "./editor-detection";
import { extractPlainText, setDomSelectionByOffsets } from "./plain-text-dom";
import { locateTextSpan, normalizeReplacementText } from "./transaction-text";
import {
  applyEditorTransaction,
  buildTransactionContext,
  type TransactionResult,
} from "./transaction-engine";

export type { TransactionResult } from "./transaction-engine";
export { copyForManualPaste } from "./transaction-engine";

export interface ReplaceInEditorOptions {
  expectedText?: string;
  fieldSnapshot?: string;
}

export { locateTextSpan as locatePlainTextSpan } from "./transaction-text";

export async function replaceInContentEditable(
  element: HTMLElement,
  start: number,
  end: number,
  replacement: string,
  options?: ReplaceInEditorOptions,
): Promise<TransactionResult> {
  const root = resolveEditorRoot(element);
  const currentText = extractPlainText(root);
  const resolved = locateTextSpan(
    currentText,
    start,
    end,
    options?.expectedText,
    options?.fieldSnapshot,
  );

  if (!resolved) {
    return {
      committed: false,
      confidence: 0,
      suggestClipboardPaste: true,
    };
  }

  const ctx = buildTransactionContext(
    root,
    resolved.start,
    resolved.end,
    normalizeReplacementText(replacement),
    currentText,
    currentText.slice(resolved.start, resolved.end),
  );

  return await applyEditorTransaction(ctx);
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function notifyEditorChange(_element: HTMLElement): void {
}

export { extractPlainText, setDomSelectionByOffsets };
