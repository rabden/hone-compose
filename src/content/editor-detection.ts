/** Editor fingerprinting for transaction routing. */

export type EditorFramework =
  | "native"
  | "lexical"
  | "slate"
  | "prosemirror"
  | "twitter"
  | "contenteditable";

export function isXHost(): boolean {
  const host = window.location.hostname.toLowerCase();
  return (
    host === "x.com" ||
    host.endsWith(".x.com") ||
    host === "twitter.com" ||
    host.endsWith(".twitter.com")
  );
}

/** X compose/reply: tweetTextarea_* wrapper with nested contenteditable. */
export function resolveTwitterComposeRoot(
  element: HTMLElement,
): HTMLElement | null {
  const host = element.closest(
    '[data-testid^="tweetTextarea"]',
  ) as HTMLElement | null;
  if (!host) return null;

  let editable: HTMLElement | null;
  const ce = host.getAttribute("contenteditable");
  if (host.isContentEditable || ce === "true" || ce === "") {
    editable = host;
  } else {
    const inner = host.querySelector(
      '[contenteditable="true"], [contenteditable=""]',
    ) as HTMLElement | null;
    if (inner) {
      editable = inner;
    } else {
      const textbox = host.querySelector('[role="textbox"]');
      if (textbox instanceof HTMLElement && textbox.isContentEditable) {
        editable = textbox;
      } else {
        editable = null;
      }
    }
  }

  if (!editable) return null;

  while (
    editable.parentElement?.isContentEditable &&
    host.contains(editable.parentElement)
  ) {
    editable = editable.parentElement;
  }

  return editable;
}

export function resolveEditorRoot(element: HTMLElement): HTMLElement {
  if (isXHost()) {
    const twitterRoot = resolveTwitterComposeRoot(element);
    if (twitterRoot) return twitterRoot;
  }
  const lexical = element.closest(
    '[data-lexical-editor="true"]',
  ) as HTMLElement | null;
  if (lexical) return lexical;

  const slate = element.closest(
    "[data-slate-editor='true']",
  ) as HTMLElement | null;
  if (slate) return slate;

  const proseMirror = element.closest(
    ".ProseMirror",
  ) as HTMLElement | null;
  if (proseMirror) return proseMirror;

  let node: HTMLElement | null = element.isContentEditable
    ? element
    : element.closest(
        '[contenteditable="true"], [contenteditable=""]',
      ) as HTMLElement | null;

  if (!node) return element;

  const ce = node.getAttribute("contenteditable");
  if (ce !== "true" && ce !== "") return element;

  while (node.parentElement?.isContentEditable) {
    node = node.parentElement;
  }

  return node;
}

export function detectEditorFramework(element: HTMLElement): EditorFramework {
  const tag = element.tagName.toLowerCase();
  if (tag === "textarea" || tag === "input") return "native";

  if (isXHost()) {
    return "twitter";
  }

  const root = resolveEditorRoot(element);
  if (root.closest('[data-lexical-editor="true"]')) return "lexical";
  if (root.closest("[data-slate-editor='true']")) return "slate";
  if (root.closest(".ProseMirror")) return "prosemirror";

  return "contenteditable";
}
