/**
 * Runs in the page Main World — direct access to React fibers and trusted execCommand.
 */

type FiberNode = {
  memoizedProps?: Record<string, unknown>;
  child?: FiberNode;
  sibling?: FiberNode;
  return?: FiberNode;
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

function invokeReactTextHandlers(
  root: HTMLElement,
  newText: string,
): boolean {
  const fiber = getReactFiber(root);
  if (!fiber) return false;

  const queue: FiberNode[] = [fiber];
  const seen = new Set<FiberNode>();
  let invoked = false;

  while (queue.length > 0) {
    const node = queue.shift()!;
    if (!node || seen.has(node)) continue;
    seen.add(node);
    if (seen.size > 600) break;

    const props = node.memoizedProps;
    if (props) {
      if (typeof props.onChangeText === "function") {
        (props.onChangeText as (text: string) => void)(newText);
        invoked = true;
      }
      if (typeof props.onInput === "function") {
        (props.onInput as (e: unknown) => void)({
          target: root,
          currentTarget: root,
          type: "input",
          preventDefault() {},
          stopPropagation() {},
        });
        invoked = true;
      }
      if (typeof props.onChange === "function") {
        (props.onChange as (e: { target: { value: string } }) => void)({
          target: { value: newText },
          currentTarget: root,
          preventDefault() {},
          stopPropagation() {},
        } as { target: { value: string }; currentTarget: HTMLElement });
        invoked = true;
      }
    }

    if (node.child) queue.push(node.child);
    if (node.sibling) queue.push(node.sibling);
    if (node.return) queue.push(node.return);
  }

  return invoked;
}

function runTwitterTransaction(
  host: HTMLElement,
  replacement: string,
  start: number,
  end: number,
): boolean {
  const root = resolveTwitterEditable(host);
  const beforeText = extractPlainText(root);
  const len = beforeText.length;
  const s = Math.max(0, Math.min(start, len));
  const e = Math.max(s, Math.min(end, len));
  const newText =
    beforeText.substring(0, s) + replacement + beforeText.substring(e);

  root.focus({ preventScroll: true });

  if (s === 0 && e === len && len > 0) {
    const sel = window.getSelection();
    const range = document.createRange();
    range.selectNodeContents(root);
    sel?.removeAllRanges();
    sel?.addRange(range);
  } else {
    setDomSelectionByOffsets(root, s, e);
  }

  document.dispatchEvent(new Event("selectionchange"));

  let inserted = false;
  try {
    inserted = document.execCommand("insertText", false, replacement);
  } catch {
    inserted = false;
  }

  if (!inserted) {
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
      inserted = true;
    } catch {
      inserted = false;
    }
  }

  invokeReactTextHandlers(root, newText);

  const after = extractPlainText(root);
  const probe = replacement.trim().slice(0, Math.min(32, replacement.length));
  if (after === newText) return true;
  if (probe && after.includes(probe)) return true;
  return inserted;
}

function findSlateEditorInFiber(fiber: FiberNode): Record<string, unknown> | null {
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

    if (
      editor &&
      typeof editor === "object" &&
      typeof (editor as { insertText?: unknown }).insertText === "function" &&
      Array.isArray((editor as { children?: unknown }).children)
    ) {
      return editor as Record<string, unknown>;
    }

    if (node.child) queue.push(node.child);
    if (node.sibling) queue.push(node.sibling);
    if (node.return) queue.push(node.return);
  }
  return null;
}

window.addEventListener("message", (event) => {
  if (event.source !== window) {
    return;
  }

  if (event.data?.type === "HONE_RUN_SLATE_TRANSACTION") {
    const { targetId, replacement } = event.data;
    const element = document.getElementById(targetId);

    if (!element) {
      window.postMessage(
        { type: "HONE_TRANSACTION_RESULT", success: false, error: "Element not found" },
        "*",
      );
      return;
    }

    try {
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
        if (typeof editor.deleteFragment === "function") {
          (editor.deleteFragment as () => void)();
        }
        (editor.insertText as (text: string) => void)(replacement);
        if (typeof editor.onChange === "function") {
          (editor.onChange as () => void)();
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
      const ok = runTwitterTransaction(
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

      // Don't dispatch additional events - React handlers already handle state updates
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
