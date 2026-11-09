/** Commits AI text into framework editors as a transaction, not raw DOM writes. */

import {
  detectEditorFramework,
  isXHost,
  resolveEditorRoot,
  resolveTwitterComposeRoot,
} from "./editor-detection";
import {
  extractPlainText,
  offsetFromDomPoint,
  selectPlainTextRange,
} from "./plain-text-dom";
import {
  isCurrentTextTransaction,
  verifyTextReplacement,
  type TextTransaction,
} from "./transaction-text";

export interface TransactionContext extends TextTransaction {
  root: HTMLElement;
  framework: ReturnType<typeof detectEditorFramework>;
}

export interface TransactionResult {
  committed: boolean;
  /** 0–1 — low means DOM looks ok but commit may not persist (e.g. Discord) */
  confidence: number;
  /** Copy to clipboard and ask user to Ctrl+V */
  suggestClipboardPaste: boolean;
}

type Attempt = { verified: boolean; stop: boolean };
type Strategy = (ctx: TransactionContext) => Promise<Attempt>;
const activeRoots = new WeakSet<HTMLElement>();

function syncSelectionChange(): void {
  document.dispatchEvent(new Event("selectionchange"));
}

function delayForSelectionSync(ms = 30): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function verifyDomReplace(ctx: TransactionContext, maxWaitMs = 180): Promise<boolean> {
  const startedAt = performance.now();
  do {
    // Check after a renderer flush, even when the edit appeared synchronous.
    await delayForSelectionSync(16);
    const after = extractPlainText(ctx.root);
    if (after !== ctx.beforeText) {
      if (!verifyTextReplacement(ctx, after)) return false;
      await delayForSelectionSync(16);
      return verifyTextReplacement(ctx, extractPlainText(ctx.root));
    }
  } while (performance.now() - startedAt < maxWaitMs);
  return false;
}

function selectionMatches(ctx: TransactionContext): boolean {
  if (!ctx.root.isConnected ||
      !isCurrentTextTransaction(ctx, extractPlainText(ctx.root))) return false;
  const selection = window.getSelection();
  if (!selection || selection.rangeCount !== 1 ||
      !ctx.root.contains(document.activeElement)) return false;
  try {
    const range = selection.getRangeAt(0);
    return ctx.root.contains(range.startContainer) &&
      ctx.root.contains(range.endContainer) &&
      offsetFromDomPoint(ctx.root, range.startContainer, range.startOffset) === ctx.start &&
      offsetFromDomPoint(ctx.root, range.endContainer, range.endOffset) === ctx.end;
  } catch {
    return false;
  }
}

function prepareDomSelection(ctx: TransactionContext): boolean {
  if (!isCurrentTextTransaction(ctx, extractPlainText(ctx.root))) return false;
  ctx.root.focus({ preventScroll: true });
  if (!isCurrentTextTransaction(ctx, extractPlainText(ctx.root)) ||
      !selectPlainTextRange(ctx.root, ctx.start, ctx.end, ctx.expectedSlice, { focus: false })) {
    return false;
  }
  syncSelectionChange();
  return selectionMatches(ctx);
}

async function prepareSyncedSelection(ctx: TransactionContext): Promise<boolean> {
  if (!prepareDomSelection(ctx)) return false;
  await delayForSelectionSync();
  return selectionMatches(ctx);
}

async function commitViaMainWorld(ctx: TransactionContext, type: string): Promise<Attempt> {
  if (!(await prepareSyncedSelection(ctx)) || !selectionMatches(ctx)) {
    return { verified: false, stop: true };
  }
  if (!ctx.root.id) ctx.root.id = `hone-editor-${crypto.randomUUID()}`;
  const requestId = crypto.randomUUID();
  const targetId = ctx.root.id;

  const acknowledged = await new Promise<boolean>((resolve) => {
    const finish = (success: boolean) => {
      clearTimeout(timeout);
      window.removeEventListener("message", handleResult);
      resolve(success);
    };
    const handleResult = (event: MessageEvent) => {
      const data = event.data;
      if (event.source !== window || data?.type !== "HONE_TRANSACTION_RESULT" ||
          data.requestId !== requestId || data.targetId !== targetId ||
          data.beforeText !== ctx.beforeText || data.expectedSlice !== ctx.expectedSlice) return;
      finish(data.success === true);
    };
    const timeout = setTimeout(() => finish(false), 1200);
    window.addEventListener("message", handleResult);
    window.postMessage({
      type,
      requestId,
      targetId,
      replacement: ctx.replacement,
      start: ctx.start,
      end: ctx.end,
      beforeText: ctx.beforeText,
      expectedSlice: ctx.expectedSlice,
    }, "*");
  });

  // A timeout can leave a host transaction in flight. Never retry it elsewhere.
  return {
    verified: acknowledged && await verifyDomReplace(ctx),
    stop: true,
  };
}

async function commitViaBeforeInput(ctx: TransactionContext): Promise<Attempt> {
  if (!(await prepareSyncedSelection(ctx)) || !selectionMatches(ctx)) {
    return { verified: false, stop: true };
  }
  try {
    const removing = ctx.replacement.length === 0;
    const evt = new InputEvent("beforeinput", removing
      ? { bubbles: true, cancelable: true, inputType: "deleteByCut" }
      : {
          bubbles: true,
          cancelable: true,
          inputType: "insertReplacementText",
          data: ctx.replacement,
        });
    ctx.root.dispatchEvent(evt);
    syncSelectionChange();
    return {
      verified: await verifyDomReplace(ctx),
      stop: evt.defaultPrevented,
    };
  } catch {
    return { verified: false, stop: true };
  }
}

async function commitViaPasteEvent(ctx: TransactionContext): Promise<Attempt> {
  if (!(await prepareSyncedSelection(ctx)) || !selectionMatches(ctx)) {
    return { verified: false, stop: true };
  }
  try {
    const dt = new DataTransfer();
    dt.setData("text/plain", ctx.replacement);
    ctx.root.dispatchEvent(new ClipboardEvent("paste", {
      bubbles: true,
      cancelable: true,
      clipboardData: dt,
    }));
    syncSelectionChange();
    return { verified: await verifyDomReplace(ctx), stop: true };
  } catch {
    return { verified: false, stop: true };
  }
}

async function commitViaExecCommand(ctx: TransactionContext): Promise<Attempt> {
  if (!(await prepareSyncedSelection(ctx)) || !selectionMatches(ctx)) {
    return { verified: false, stop: true };
  }
  const events: Event[] = [];
  const trackInput = (event: Event) => events.push(event);
  ctx.root.addEventListener("beforeinput", trackInput, true);
  try {
    if (ctx.replacement.length > 0) {
      document.execCommand("insertText", false, ctx.replacement);
    } else {
      // A valid transaction with empty replacement always has an expanded range.
      document.execCommand("delete");
    }
    syncSelectionChange();
    return {
      verified: await verifyDomReplace(ctx),
      stop: events.some((event) => event.defaultPrevented),
    };
  } catch {
    return { verified: false, stop: true };
  } finally {
    ctx.root.removeEventListener("beforeinput", trackInput, true);
  }
}

async function runStrategies(
  ctx: TransactionContext,
  strategies: Array<[Strategy, number]>,
): Promise<TransactionResult> {
  const failure = { committed: false, confidence: 0, suggestClipboardPaste: true };
  let mutated = false;
  const observer = new MutationObserver(() => { mutated = true; });
  observer.observe(ctx.root, { subtree: true, childList: true, characterData: true });
  try {
    for (const [strategy, confidence] of strategies) {
      if (mutated || observer.takeRecords().length > 0 ||
          !isCurrentTextTransaction(ctx, extractPlainText(ctx.root))) return failure;
      const attempt = await strategy(ctx);
      if (attempt.verified && verifyTextReplacement(ctx, extractPlainText(ctx.root))) {
        return { committed: true, confidence, suggestClipboardPaste: false };
      }
      if (attempt.stop || mutated || observer.takeRecords().length > 0 ||
          extractPlainText(ctx.root) !== ctx.beforeText) return failure;
    }
    return failure;
  } finally {
    observer.disconnect();
  }
}

export async function applyEditorTransaction(ctx: TransactionContext): Promise<TransactionResult> {
  if (activeRoots.has(ctx.root) || !ctx.root.isConnected ||
      !isCurrentTextTransaction(ctx, extractPlainText(ctx.root))) {
    return { committed: false, confidence: 0, suggestClipboardPaste: true };
  }
  activeRoots.add(ctx.root);
  try {
    if (ctx.framework === "slate" || ctx.framework === "lexical" ||
        ctx.framework === "twitter" || ctx.framework === "draftjs") {
      const type = ctx.framework === "slate" ? "HONE_RUN_SLATE_TRANSACTION"
        : ctx.framework === "lexical" ? "HONE_RUN_LEXICAL_TRANSACTION"
        : "HONE_RUN_TWITTER_TRANSACTION";
      return await runStrategies(ctx, [[(tx) => commitViaMainWorld(tx, type), 0.95]]);
    }

    const strategies: Array<[Strategy, number]> = ctx.replacement.length > 0
      ? [[commitViaBeforeInput, 0.9], [commitViaExecCommand, 0.7]]
      : [[commitViaExecCommand, 0.7], [commitViaBeforeInput, 0.9]];
    if (ctx.framework !== "prosemirror" && ctx.replacement.length > 0) {
      strategies.push([commitViaPasteEvent, 0.7]);
    }
    return await runStrategies(ctx, strategies);
  } finally {
    activeRoots.delete(ctx.root);
  }
}

export async function copyForManualPaste(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    try {
      const ta = document.createElement("textarea");
      ta.value = text;
      ta.style.cssText = "position:fixed;left:-9999px";
      document.body.appendChild(ta);
      ta.select();
      const ok = document.execCommand("copy");
      document.body.removeChild(ta);
      return ok;
    } catch {
      return false;
    }
  }
}

export function buildTransactionContext(
  element: HTMLElement,
  start: number,
  end: number,
  replacement: string,
  beforeText: string,
  expectedSlice: string,
): TransactionContext {
  const root =
    (isXHost() ? resolveTwitterComposeRoot(element) : null) ??
    resolveEditorRoot(element);
  return {
    root,
    replacement,
    start,
    end,
    beforeText,
    expectedSlice,
    framework: detectEditorFramework(element),
  };
}
