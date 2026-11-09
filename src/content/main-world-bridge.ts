/**
 * Runs in the page Main World — direct access to React fibers and trusted execCommand.
 */

import {
  domPointFromOffset,
  extractPlainText,
  offsetFromDomPoint,
  selectPlainTextRange,
} from "./plain-text-dom";
import {
  expectedTextAfterReplace,
  isCurrentTextTransaction,
  isValidTextTransaction,
  normalizeReplacementText,
  verifyTextReplacement,
  type TextTransaction,
} from "./transaction-text";

type FiberNode = {
  memoizedProps?: Record<string, unknown>;
  child?: FiberNode;
  sibling?: FiberNode;
  return?: FiberNode;
};

type SlateTextNode = {
  text: string;
};

type SlateElementNode = {
  children?: SlateNode[];
};

type SlateNode = SlateTextNode | SlateElementNode;

type SlateLeaf = {
  path: number[];
  textNode: SlateTextNode;
  startOffset: number;
  endOffset: number;
};

type SlatePoint = {
  path: number[];
  offset: number;
};

type SlateSelection = { anchor: SlatePoint; focus: SlatePoint };
type SlateEditor = {
  children: SlateNode[];
  selection?: SlateSelection | null;
  apply?: (operation: {
    type: "set_selection";
    properties: SlateSelection | null;
    newProperties: SlateSelection;
  }) => void;
  focus?: () => void;
  deleteFragment?: () => void;
  insertText: (text: string) => void;
  insertData?: (data: DataTransfer) => void;
  insertBreak?: () => void;
  withoutNormalizing?: (fn: () => void) => void;
  withNewBatch?: (fn: () => void) => void;
  onChange?: () => void;
};

function getReactFiber(dom: Element): FiberNode | null {
  const el = dom as unknown as Record<string, unknown>;
  const key = Object.keys(el).find(
    (k) =>
      k.startsWith("__reactFiber$") ||
      k.startsWith("__reactInternalInstance$"),
  );
  return key ? (el[key] as FiberNode) : null;
}

function delay(ms = 16): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function verifyRenderedText(read: () => string, tx: TextTransaction): Promise<boolean> {
  const startedAt = performance.now();
  do {
    await delay();
    const after = read();
    if (after !== tx.beforeText) {
      if (!verifyTextReplacement(tx, after)) return false;
      await delay();
      return verifyTextReplacement(tx, read());
    }
  } while (performance.now() - startedAt < 650);
  return false;
}

function selectionMatches(root: HTMLElement, tx: TextTransaction): boolean {
  if (!root.isConnected || !isCurrentTextTransaction(tx, extractPlainText(root))) return false;
  const selection = window.getSelection();
  if (!selection || selection.rangeCount !== 1 || !root.contains(document.activeElement)) return false;
  try {
    const range = selection.getRangeAt(0);
    return root.contains(range.startContainer) && root.contains(range.endContainer) &&
      offsetFromDomPoint(root, range.startContainer, range.startOffset) === tx.start &&
      offsetFromDomPoint(root, range.endContainer, range.endOffset) === tx.end;
  } catch {
    return false;
  }
}

async function prepareDomSelection(root: HTMLElement, tx: TextTransaction): Promise<boolean> {
  if (!isCurrentTextTransaction(tx, extractPlainText(root))) return false;
  root.focus({ preventScroll: true });
  if (!isCurrentTextTransaction(tx, extractPlainText(root)) ||
      !selectPlainTextRange(root, tx.start, tx.end, tx.expectedSlice, { focus: false })) return false;
  document.dispatchEvent(new Event("selectionchange"));
  if (!selectionMatches(root, tx)) return false;
  await delay(30);
  return selectionMatches(root, tx);
}

function getStaticTargetRange(
  root: HTMLElement,
  start: number,
  end: number,
): StaticRange[] {
  if (typeof StaticRange === "undefined") return [];

  try {
    const startPair = domPointFromOffset(root, Math.max(0, start));
    const endPair = domPointFromOffset(root, Math.max(0, end));
    return [
      new StaticRange({
        startContainer: startPair.node,
        startOffset: startPair.offset,
        endContainer: endPair.node,
        endOffset: endPair.offset,
      }),
    ];
  } catch {
    return [];
  }
}

function pastePlainText(root: HTMLElement, text: string): void {
  const dt = new DataTransfer();
  dt.setData("text/plain", text);
  root.dispatchEvent(new ClipboardEvent("paste", {
    bubbles: true,
    cancelable: true,
    clipboardData: dt,
  }));
}

async function runLexicalTransaction(root: HTMLElement, tx: TextTransaction): Promise<boolean> {
  if (!(await prepareDomSelection(root, tx)) || !selectionMatches(root, tx)) return false;
  if (tx.replacement === "") {
    document.execCommand("delete");
  } else if (tx.replacement.includes("\n")) {
    // Let Lexical create paragraph/linebreak nodes instead of a multiline text node.
    pastePlainText(root, tx.replacement);
  } else {
    const targetRanges = getStaticTargetRange(root, tx.start, tx.end);
    const eventInit: InputEventInit & { targetRanges?: StaticRange[] } = {
      bubbles: true,
      cancelable: true,
      inputType: "insertReplacementText",
      data: tx.replacement,
      targetRanges,
    };
    root.dispatchEvent(new InputEvent("beforeinput", eventInit));
  }
  document.dispatchEvent(new Event("selectionchange"));
  return true;
}

function resolveTwitterEditable(host: HTMLElement): HTMLElement {
  const ce = host.getAttribute("contenteditable");
  if (host.isContentEditable || ce === "true" || ce === "") {
    return host;
  }

  const inner = host.querySelector(
    '[contenteditable="true"], [contenteditable=""]',
  ) as HTMLElement | null;
  if (inner) return inner;

  const textbox = host.querySelector('[role="textbox"]');
  if (textbox instanceof HTMLElement && textbox.isContentEditable) {
    return textbox;
  }

  return host;
}

function isSlateTextNode(node: SlateNode): node is SlateTextNode {
  return typeof (node as { text?: unknown }).text === "string";
}

function getSlateTextLeaves(root: HTMLElement, editor: SlateEditor): SlateLeaf[] | null {
  const internal: Array<{ path: number[]; textNode: SlateTextNode }> = [];
  function visit(nodes: SlateNode[], path: number[]): void {
    nodes.forEach((node, index) => {
      const nextPath = [...path, index];
      if (isSlateTextNode(node)) {
        internal.push({ path: nextPath, textNode: node });
      } else if (Array.isArray(node.children)) {
        visit(node.children, nextPath);
      }
    });
  }
  visit(editor.children, []);
  const domLeaves = Array.from(root.querySelectorAll<HTMLElement>('[data-slate-node="text"]'));
  if (internal.length === 0 || internal.length !== domLeaves.length) return null;
  const text = extractPlainText(root);
  const leaves: SlateLeaf[] = [];
  let previousEnd = 0;
  for (let i = 0; i < internal.length; i++) {
    const domLeaf = domLeaves[i];
    const startOffset = offsetFromDomPoint(root, domLeaf, 0);
    const endOffset = offsetFromDomPoint(root, domLeaf, domLeaf.childNodes.length);
    const leaf = internal[i];
    if (startOffset < previousEnd || endOffset < startOffset ||
        endOffset - startOffset !== leaf.textNode.text.length ||
        text.slice(startOffset, endOffset) !== leaf.textNode.text ||
        !/^\n*$/.test(text.slice(previousEnd, startOffset))) return null;
    leaves.push({ ...leaf, startOffset, endOffset });
    previousEnd = endOffset;
  }
  if (!/^\n*$/.test(text.slice(previousEnd))) return null;
  return leaves;
}

function getSlatePointFromOffset(leaves: SlateLeaf[], offset: number): SlatePoint | null {
  for (const leaf of leaves) {
    if (offset >= leaf.startOffset && offset <= leaf.endOffset) {
      return { path: leaf.path, offset: offset - leaf.startOffset };
    }
  }
  return null;
}

// ============================================================================
// TWITTER/X (DRAFT.JS) TRANSACTION HANDLER
// ============================================================================
// IMPORTANT: This simple paste-event approach is the ONLY working solution for Twitter/X.
//
// WHY COMPLEX APPROACHES FAILED:
// 1. React Fiber traversal (invokeReactTextHandlers): Draft.js stores state handlers on
//    ancestor components 2-6 levels up the tree. Traversing up caused state corruption,
//    while immediate-node-only checks found no handlers at all.
//
// 2. Direct Slate-like selection mapping: Twitter uses Draft.js, not Slate. Attempting to
//    map offsets to internal paths was incompatible with Draft.js's immutable EditorState.
//
// 3. selectNodeContents(root): When selecting entire text, this selected the entire HTML
//    structure including Draft.js's internal blocks and spans. execCommand then obliterated
//    all spans, leaving raw text nodes and corrupting the editor state completely.
//
// WHY THIS SIMPLE APPROACH WORKS:
// - Draft.js was explicitly designed to intercept and handle browser-native paste events
// - It integrates paste content into its immutable state machine automatically
// - No manual state synchronization or React handler invocation is needed
// - Preserves Draft.js's internal block and span structure
//
// DO NOT CHANGE THIS APPROACH unless you have a deep understanding of Draft.js internals.
// Any attempt to manually manipulate Draft.js state will likely break it.
// ============================================================================
async function runTwitterTransaction(root: HTMLElement, tx: TextTransaction): Promise<boolean> {
  if (!(await prepareDomSelection(root, tx)) || !selectionMatches(root, tx)) return false;
  if (tx.replacement === "") {
    document.execCommand("delete");
  } else {
    pastePlainText(root, tx.replacement);
  }
  document.dispatchEvent(new Event("selectionchange"));
  return true;
}

function findSlateEditorInFiber(fiber: FiberNode): SlateEditor | null {
  const queue: FiberNode[] = [fiber];
  const seen = new Set<FiberNode>();

  while (queue.length > 0) {
    const node = queue.shift()!;
    if (!node || seen.has(node)) continue;
    seen.add(node);

    const props = node.memoizedProps;
    const editor =
      props?.editor ??
      (props?.children as { props?: { editor?: unknown } } | undefined)?.props
        ?.editor;

    if (editor && typeof editor === "object") {
      const candidate = editor as Partial<SlateEditor>;
      if (
        typeof candidate.insertText === "function" &&
        Array.isArray(candidate.children)
      ) {
        return candidate as SlateEditor;
      }
    }

    if (node.child) queue.push(node.child);
    if (node.sibling) queue.push(node.sibling);
    if (node.return) queue.push(node.return);
  }
  return null;
}

async function runSlateTransaction(root: HTMLElement, tx: TextTransaction): Promise<boolean> {
  const fiber = getReactFiber(root);
  const editor = fiber && findSlateEditorInFiber(fiber);
  if (!editor) return false;
  const multiline = tx.replacement.includes("\n");
  const useData = multiline && typeof editor.insertData === "function";
  const needsDelete = tx.replacement === "" ||
    (multiline && !useData && tx.replacement.startsWith("\n") && tx.end > tx.start);
  if ((multiline && !useData && typeof editor.insertBreak !== "function") ||
      (needsDelete && typeof editor.deleteFragment !== "function")) return false;
  const dt = useData ? new DataTransfer() : null;
  dt?.setData("text/plain", tx.replacement);

  editor.focus?.();
  if (!(await prepareDomSelection(root, tx)) || !selectionMatches(root, tx)) return false;
  const leaves = getSlateTextLeaves(root, editor);
  if (!leaves) return false;
  const anchor = getSlatePointFromOffset(leaves, tx.start);
  const focus = getSlatePointFromOffset(leaves, tx.end);
  if (!anchor || !focus) return false;
  const selection = { anchor, focus };
  if (typeof editor.apply === "function") {
    editor.apply({ type: "set_selection", properties: editor.selection ?? null, newProperties: selection });
  } else {
    editor.selection = selection;
  }
  const samePoint = (a: SlatePoint | undefined, b: SlatePoint) => a?.offset === b.offset &&
    a.path.length === b.path.length && a.path.every((part, index) => part === b.path[index]);
  if (!isCurrentTextTransaction(tx, extractPlainText(root)) ||
      !samePoint(editor.selection?.anchor, anchor) || !samePoint(editor.selection?.focus, focus)) return false;

  const insert = () => {
    if (dt) {
      editor.insertData!(dt);
    } else if (tx.replacement === "") {
      editor.deleteFragment!();
    } else if (multiline) {
      const lines = tx.replacement.split("\n");
      if (needsDelete) editor.deleteFragment!();
      if (lines[0]) editor.insertText(lines[0]);
      for (let i = 1; i < lines.length; i++) {
        editor.insertBreak!();
        if (lines[i]) editor.insertText(lines[i]);
      }
    } else {
      // Slate insertText replaces an expanded selection itself.
      editor.insertText(tx.replacement);
    }
  };
  const normalize = () => {
    if (typeof editor.withoutNormalizing === "function") editor.withoutNormalizing(insert);
    else insert();
  };
  if (typeof editor.withNewBatch === "function") editor.withNewBatch(normalize);
  else normalize();
  editor.onChange?.();
  document.dispatchEvent(new Event("selectionchange"));
  return true;
}

function runNativeInputTransaction(
  element: HTMLInputElement | HTMLTextAreaElement,
  tx: TextTransaction,
): boolean {
  const textarea = element instanceof HTMLTextAreaElement;
  if (!element.isConnected || document.activeElement !== element ||
      element.selectionStart !== tx.start || element.selectionEnd !== tx.end ||
      !isCurrentTextTransaction(tx, element.value) ||
      tx.replacement !== normalizeReplacementText(tx.replacement) ||
      (!textarea && /[\r\n]/.test(expectedTextAfterReplace(tx)))) return false;
  const prototype = textarea ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
  const setter = Object.getOwnPropertyDescriptor(prototype, "value")?.set;
  if (!setter) return false;
  // No await or host callback may occur between this check and the setter.
  if (!isCurrentTextTransaction(tx, element.value)) return false;
  setter.call(element, expectedTextAfterReplace(tx));
  const tracker = (element as typeof element & { _valueTracker?: { setValue: (value: string) => void } })._valueTracker;
  tracker?.setValue(tx.beforeText);
  const caret = tx.start + tx.replacement.length;
  element.setSelectionRange(caret, caret);
  element.dispatchEvent(new Event("input", { bubbles: true }));
  element.dispatchEvent(new Event("change", { bubbles: true }));
  return true;
}

function readTransaction(data: Record<string, unknown>): TextTransaction | null {
  if (typeof data.beforeText !== "string" || typeof data.expectedSlice !== "string" ||
      typeof data.replacement !== "string" || typeof data.start !== "number" ||
      typeof data.end !== "number") return null;
  const tx = {
    beforeText: data.beforeText,
    expectedSlice: data.expectedSlice,
    replacement: data.replacement,
    start: data.start,
    end: data.end,
  };
  return isValidTextTransaction(tx) ? tx : null;
}

const requestTypes = new Set([
  "HONE_RUN_SLATE_TRANSACTION",
  "HONE_RUN_LEXICAL_TRANSACTION",
  "HONE_RUN_TWITTER_TRANSACTION",
  "HONE_RUN_REACT_INPUT_TRANSACTION",
]);
const activeRoots = new WeakSet<HTMLElement>();

window.addEventListener("message", async (event) => {
  const data = event.data;
  if (event.source !== window || !data || !requestTypes.has(data.type) ||
      typeof data.requestId !== "string" || typeof data.targetId !== "string") return;
  const { requestId, targetId, beforeText, expectedSlice } = data;
  const reply = (success: boolean, changed: boolean) => window.postMessage({
    type: "HONE_TRANSACTION_RESULT", requestId, targetId, beforeText, expectedSlice, success, changed,
  }, "*");
  const tx = readTransaction(data);
  const element = document.getElementById(targetId);
  if (!element || !tx) {
    reply(false, false);
    return;
  }
  const native = data.type === "HONE_RUN_REACT_INPUT_TRANSACTION";
  if (native && !(element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement)) {
    reply(false, false);
    return;
  }
  const root = data.type === "HONE_RUN_TWITTER_TRANSACTION" ? resolveTwitterEditable(element) : element;
  const read = native
    ? () => (element as HTMLInputElement | HTMLTextAreaElement).value
    : () => extractPlainText(root);
  if (activeRoots.has(root) || !isCurrentTextTransaction(tx, read())) {
    reply(false, read() !== tx.beforeText);
    return;
  }
  activeRoots.add(root);
  let mutated = false;
  const observer = new MutationObserver(() => { mutated = true; });
  observer.observe(root, { subtree: true, childList: true, characterData: true });
  let success = false;
  try {
    const attempted = native
      ? runNativeInputTransaction(element as HTMLInputElement | HTMLTextAreaElement, tx)
      : data.type === "HONE_RUN_SLATE_TRANSACTION" ? await runSlateTransaction(root, tx)
      : data.type === "HONE_RUN_LEXICAL_TRANSACTION" ? await runLexicalTransaction(root, tx)
      : await runTwitterTransaction(root, tx);
    success = attempted && await verifyRenderedText(read, tx);
  } catch {
    // A failed host operation is not retried, even if it already mutated text.
  } finally {
    mutated ||= observer.takeRecords().length > 0;
    observer.disconnect();
    activeRoots.delete(root);
    reply(success, mutated || read() !== tx.beforeText);
  }
});
