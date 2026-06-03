/**
 * Runs in the page Main World — direct access to React fibers and trusted execCommand.
 */

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

type SlateEditor = {
  children: SlateNode[];
  selection?: {
    anchor: SlatePoint;
    focus: SlatePoint;
  };
  focus?: () => void;
  deleteFragment?: () => void;
  insertText?: (text: string) => void;
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

function extractPlainText(root: HTMLElement): string {
  const range = document.createRange();
  try {
    range.selectNodeContents(root);
    return range.toString();
  } catch {
    return root.innerText || root.textContent || "";
  }
}

function normalizePlain(s: string): string {
  return s.replace(/\s+/g, " ").trim();
}

function expectedTextAfterReplace(
  beforeText: string,
  start: number,
  end: number,
  replacement: string,
): string {
  return (
    beforeText.substring(0, start) +
    replacement +
    beforeText.substring(end)
  );
}

function looksLikeExpectedReplace(
  text: string,
  beforeText: string,
  start: number,
  end: number,
  replacement: string,
  expectedSlice: string,
): boolean {
  const expected = expectedTextAfterReplace(beforeText, start, end, replacement);
  if (text === expected || normalizePlain(text) === normalizePlain(expected)) {
    return true;
  }

  const probe = replacement.trim().slice(0, Math.min(48, replacement.length));
  if (!probe) return true;

  return text.includes(probe) && (!expectedSlice || !text.includes(expectedSlice));
}

function domPointFromOffset(
  root: HTMLElement,
  charIndex: number,
): { node: Node; offset: number } {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  let node: Node | null = walker.nextNode();
  let last: Text | null = null;
  const range = document.createRange();
  range.setStart(root, 0);

  while (node) {
    const textNode = node as Text;
    range.setEnd(textNode, textNode.data.length);
    if (range.toString().length >= charIndex) {
      range.setEnd(textNode, 0);
      const lengthBeforeNode = range.toString().length;
      const offsetInNode = charIndex - lengthBeforeNode;
      return {
        node: textNode,
        offset: Math.max(0, Math.min(offsetInNode, textNode.data.length)),
      };
    }
    last = textNode;
    node = walker.nextNode();
  }

  if (last) return { node: last, offset: last.data.length };
  return { node: root, offset: 0 };
}

function setDomSelectionByOffsets(
  root: HTMLElement,
  start: number,
  end: number,
): boolean {
  const startPair = domPointFromOffset(root, Math.max(0, start));
  const endPair = domPointFromOffset(root, Math.max(0, end));
  const range = document.createRange();
  try {
    range.setStart(startPair.node, startPair.offset);
    range.setEnd(endPair.node, endPair.offset);
  } catch {
    return false;
  }

  const sel = window.getSelection();
  if (!sel) return false;
  sel.removeAllRanges();
  sel.addRange(range);
  root.focus({ preventScroll: true });
  return true;
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

async function verifyLexicalReplace(
  root: HTMLElement,
  beforeText: string,
  start: number,
  end: number,
  replacement: string,
  expectedSlice: string,
  maxWaitMs = 650,
): Promise<boolean> {
  const startedAt = performance.now();
  while (performance.now() - startedAt < maxWaitMs) {
    const after = extractPlainText(root);
    if (
      looksLikeExpectedReplace(
        after,
        beforeText,
        start,
        end,
        replacement,
        expectedSlice,
      )
    ) {
      return true;
    }
    await new Promise((resolve) => setTimeout(resolve, 16));
  }
  return false;
}

async function runLexicalTransaction(
  root: HTMLElement,
  replacement: string,
  start: number,
  end: number,
  beforeTextArg?: string,
  expectedSliceArg?: string,
): Promise<{ success: boolean; changed: boolean }> {
  const currentText = extractPlainText(root);
  const beforeText = beforeTextArg || currentText;
  const len = beforeText.length;
  const s = Math.max(0, Math.min(start, len));
  const e = Math.max(s, Math.min(end, len));
  const expectedSlice = expectedSliceArg ?? beforeText.substring(s, e);

  root.focus({ preventScroll: true });
  setDomSelectionByOffsets(root, s, e);
  document.dispatchEvent(new Event("selectionchange"));

  const targetRanges = getStaticTargetRange(root, s, e);
  const eventInit: InputEventInit = {
    bubbles: true,
    cancelable: true,
    inputType: "insertReplacementText",
    data: replacement,
  };

  if (targetRanges.length > 0) {
    (eventInit as InputEventInit & { targetRanges: StaticRange[] }).targetRanges =
      targetRanges;
  }

  root.dispatchEvent(new InputEvent("beforeinput", eventInit));
  document.dispatchEvent(new Event("selectionchange"));

  const success = await verifyLexicalReplace(
    root,
    beforeText,
    s,
    e,
    replacement,
    expectedSlice,
  );
  return {
    success,
    changed: extractPlainText(root) !== currentText,
  };
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

function getSlateTextLeaves(nodes: SlateNode[]): SlateLeaf[] {
  const leaves: SlateLeaf[] = [];
  let currentOffset = 0;

  function dfs(nodeList: SlateNode[], path: number[]) {
    if (!nodeList || !Array.isArray(nodeList)) return;
    for (let i = 0; i < nodeList.length; i++) {
      const node = nodeList[i];
      if (!node) continue;
      const nextPath = [...path, i];
      if (isSlateTextNode(node)) {
        leaves.push({
          path: nextPath,
          textNode: node,
          startOffset: currentOffset,
          endOffset: currentOffset + node.text.length
        });
        currentOffset += node.text.length;
      } else if (Array.isArray(node.children)) {
        dfs(node.children, nextPath);
      }
    }
  }

  dfs(nodes, []);
  return leaves;
}

function getSlatePointFromOffset(
  leaves: SlateLeaf[],
  charIdx: number,
): SlatePoint | null {
  if (leaves.length === 0) return null;
  const maxOffset = leaves[leaves.length - 1].endOffset;
  const target = Math.max(0, Math.min(charIdx, maxOffset));

  for (const leaf of leaves) {
    if (target >= leaf.startOffset && target <= leaf.endOffset) {
      return {
        path: leaf.path,
        offset: target - leaf.startOffset
      };
    }
  }

  const last = leaves[leaves.length - 1];
  return {
    path: last.path,
    offset: last.textNode.text.length
  };
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
async function runTwitterTransaction(
  host: HTMLElement,
  replacement: string,
  start: number,
  end: number,
): Promise<boolean> {
  const root = resolveTwitterEditable(host);
  const beforeText = extractPlainText(root);
  const len = beforeText.length;
  const s = Math.max(0, Math.min(start, len));
  const e = Math.max(s, Math.min(end, len));

  root.focus({ preventScroll: true });

  // Set selection using text node offsets (preserves Draft.js span structure)
  setDomSelectionByOffsets(root, s, e);

  document.dispatchEvent(new Event("selectionchange"));

  // Small delay to let Draft.js process selection before paste
  await new Promise((resolve) => setTimeout(resolve, 10));

  // Use simple paste event - Draft.js handles this natively and correctly
  try {
    const dt = new DataTransfer();
    dt.setData("text/plain", replacement);
    root.dispatchEvent(
      new ClipboardEvent("paste", {
        bubbles: true,
        cancelable: true,
        clipboardData: dt,
      }),
    );
  } catch {
    // Fallback to execCommand if paste event fails (rare)
    try {
      document.execCommand("insertText", false, replacement);
    } catch {
      return false;
    }
  }

  const after = extractPlainText(root);
  const newText = beforeText.substring(0, s) + replacement + beforeText.substring(e);
  const probe = replacement.trim().slice(0, Math.min(32, replacement.length));
  if (after === newText) return true;
  if (probe && after.includes(probe)) return true;
  return false;
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

window.addEventListener("message", async (event) => {
  if (event.source !== window) {
    return;
  }

  if (event.data?.type === "HONE_RUN_SLATE_TRANSACTION") {
    const { targetId, replacement, start, end } = event.data;
    const element = document.getElementById(targetId);

    if (!element) {
      window.postMessage(
        { type: "HONE_TRANSACTION_RESULT", success: false, error: "Element not found" },
        "*",
      );
      return;
    }

    try {
      const s = typeof start === "number" ? start : Number(start) || 0;
      const e = typeof end === "number" ? end : Number(end) || 0;

      const fiber = getReactFiber(element);
      if (!fiber) {
        window.postMessage(
          {
            type: "HONE_TRANSACTION_RESULT",
            success: false,
            error: "React Fiber not found",
          },
          "*",
        );
        return;
      }

      const editor = findSlateEditorInFiber(fiber);
      if (editor) {
        if (typeof editor.focus === "function") {
          editor.focus();
        }

        // Map offsets directly to Slate internal paths & offsets
        const leaves = getSlateTextLeaves(editor.children);
        const anchor = getSlatePointFromOffset(leaves, s);
        const focus = getSlatePointFromOffset(leaves, e);

        if (anchor && focus) {
          editor.selection = { anchor, focus };
        } else {
          setDomSelectionByOffsets(element as HTMLElement, s, e);
          document.dispatchEvent(new Event("selectionchange"));
          await new Promise((resolve) => setTimeout(resolve, 15)); 
        }
        
        if (typeof editor.deleteFragment === "function") {
          editor.deleteFragment();
        }
        if (typeof editor.insertText === "function") {
          editor.insertText(replacement);
        }
        if (typeof editor.onChange === "function") {
          editor.onChange();
        }

        window.postMessage({ type: "HONE_TRANSACTION_RESULT", success: true }, "*");
      } else {
        window.postMessage(
          {
            type: "HONE_TRANSACTION_RESULT",
            success: false,
            error: "Slate editor not found in fiber",
          },
          "*",
        );
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      window.postMessage(
        { type: "HONE_TRANSACTION_RESULT", success: false, error: message },
        "*",
      );
    }
  } else if (event.data?.type === "HONE_RUN_LEXICAL_TRANSACTION") {
    const {
      requestId,
      targetId,
      replacement,
      start,
      end,
      beforeText,
      expectedSlice,
    } = event.data;
    const element = document.getElementById(targetId) as HTMLElement | null;

    if (!element) {
      window.postMessage(
        {
          type: "HONE_TRANSACTION_RESULT",
          requestId,
          success: false,
          changed: false,
          error: "Element not found",
        },
        "*",
      );
      return;
    }

    try {
      const result = await runLexicalTransaction(
        element,
        String(replacement ?? ""),
        Number(start) || 0,
        Number(end) || 0,
        typeof beforeText === "string" ? beforeText : undefined,
        typeof expectedSlice === "string" ? expectedSlice : undefined,
      );
      window.postMessage(
        {
          type: "HONE_TRANSACTION_RESULT",
          requestId,
          success: result.success,
          changed: result.changed,
        },
        "*",
      );
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      window.postMessage(
        {
          type: "HONE_TRANSACTION_RESULT",
          requestId,
          success: false,
          changed: false,
          error: message,
        },
        "*",
      );
    }
  } else if (event.data?.type === "HONE_RUN_TWITTER_TRANSACTION") {
    const { targetId, replacement, start, end } = event.data;
    const element = document.getElementById(targetId) as HTMLElement | null;

    if (!element) {
      window.postMessage(
        { type: "HONE_TRANSACTION_RESULT", success: false, error: "Element not found" },
        "*",
      );
      return;
    }

    try {
      const ok = await runTwitterTransaction(
        element,
        String(replacement ?? ""),
        Number(start) || 0,
        Number(end) || 0,
      );
      window.postMessage({ type: "HONE_TRANSACTION_RESULT", success: ok }, "*");
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      window.postMessage(
        { type: "HONE_TRANSACTION_RESULT", success: false, error: message },
        "*",
      );
    }
  } else if (event.data?.type === "HONE_RUN_REACT_INPUT_TRANSACTION") {
    const { targetId, newValue } = event.data;
    const element = document.getElementById(targetId) as
      | HTMLInputElement
      | HTMLTextAreaElement
      | null;

    if (!element) {
      window.postMessage(
        { type: "HONE_TRANSACTION_RESULT", success: false, error: "Element not found" },
        "*",
      );
      return;
    }

    try {
      const prototype =
        element instanceof HTMLTextAreaElement
          ? window.HTMLTextAreaElement.prototype
          : window.HTMLInputElement.prototype;
      const valueSetter = Object.getOwnPropertyDescriptor(prototype, "value")?.set;
      if (valueSetter) {
        valueSetter.call(element, newValue);
      } else {
        element.value = newValue;
      }

      const fiber = getReactFiber(element);
      if (fiber) {
        let node: FiberNode | undefined = fiber;
        while (node) {
          const props = node.memoizedProps;
          if (props) {
            if (typeof props.onChangeText === "function") {
              (props.onChangeText as (text: string) => void)(newValue);
              break;
            }
            if (typeof props.onChange === "function") {
              (props.onChange as (e: { target: HTMLInputElement }) => void)({
                target: element,
                currentTarget: element,
                preventDefault() {},
                stopPropagation() {},
              } as unknown as { target: HTMLInputElement });
              break;
            }
            if (typeof props.onInput === "function") {
              (props.onInput as (e: { target: HTMLInputElement }) => void)({
                target: element,
                currentTarget: element,
                preventDefault() {},
                stopPropagation() {},
              } as unknown as { target: HTMLInputElement });
              break;
            }
          }
          node = node.return;
        }
      }

      window.postMessage({ type: "HONE_TRANSACTION_RESULT", success: true }, "*");
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      window.postMessage(
        { type: "HONE_TRANSACTION_RESULT", success: false, error: message },
        "*",
      );
    }
  }
});
