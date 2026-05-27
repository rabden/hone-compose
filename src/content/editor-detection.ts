/** Editor fingerprinting for transaction routing. */

export type EditorFramework =
  | "native"
  | "lexical"
  | "slate"
  | "prosemirror"
  | "twitter"
  | "contenteditable";

export function resolveEditorRoot(element: HTMLElement): HTMLElement {
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

  let node: HTMLElement | null = null;
  if (element.isContentEditable) {
    node = element;
  } else {
    node = element.closest(
      '[contenteditable="true"], [contenteditable=""]',
    ) as HTMLElement | null;
  }

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

  if (
    window.location.hostname.includes("twitter.com") ||
    window.location.hostname.includes("x.com")
  ) {
    return "twitter";
  }

  const root = resolveEditorRoot(element);
  if (root.closest('[data-lexical-editor="true"]')) return "lexical";
  if (root.closest("[data-slate-editor='true']")) return "slate";
  if (root.closest(".ProseMirror")) return "prosemirror";

  return "contenteditable";
}
