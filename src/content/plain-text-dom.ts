/** One newline-aware offset model for editor text, selections and highlights. */

type DomPoint = { node: Node; offset: number };
type TextRun = { start: number; end: number; from: DomPoint; to: DomPoint; text: boolean };

const BLOCK_TAGS = new Set([
  "ADDRESS", "ARTICLE", "ASIDE", "BLOCKQUOTE", "DIV", "DL", "DT", "DD",
  "FIGCAPTION", "FIGURE", "FOOTER", "H1", "H2", "H3", "H4", "H5", "H6",
  "HEADER", "LI", "MAIN", "NAV", "OL", "P", "PRE", "SECTION", "UL",
]);

export function getPlainTextMap(root: HTMLElement) {
  const chunks: string[] = [];
  const runs: TextRun[] = [];
  const offsets = new Map<Node, number[]>();
  let length = 0;
  let lastChar = "";

  function append(value: string, from: DomPoint, to: DomPoint, text = false) {
    if (!value) return;
    chunks.push(value);
    runs.push({ start: length, end: length + value.length, from, to, text });
    length += value.length;
    lastChar = value.at(-1)!;
  }

  function ignored(node: Node): boolean {
    return node instanceof Element && (
      ["SCRIPT", "STYLE", "TEMPLATE"].includes(node.tagName) ||
      node.hasAttribute("hidden") ||
      node.hasAttribute("data-slate-zero-width") ||
      node.hasAttribute("data-slate-placeholder")
    );
  }

  function walk(node: Node): void {
    if (node.nodeType === Node.TEXT_NODE) {
      offsets.set(node, [length]);
      const value = node.textContent ?? "";
      append(value, { node, offset: 0 }, { node, offset: value.length }, true);
      return;
    }
    const children = Array.from(node.childNodes);
    const boundaries: number[] = [];
    offsets.set(node, boundaries);
    let previous: Node | null = null;
    let previousBlock = false;
    let previousEmpty = false;
    for (let i = 0; i < children.length; i++) {
      const child = children[i];
      boundaries[i] = length;
      if (ignored(child) || child.nodeType === Node.COMMENT_NODE) continue;
      const block = child instanceof Element && BLOCK_TAGS.has(child.tagName);
      if (previous && (block || previousBlock) && (lastChar !== "\n" || previousEmpty)) {
        const from = previousEmpty
          ? { node: previous, offset: previous.childNodes.length }
          : runs.at(-1)!.to;
        append("\n", from, { node: child, offset: 0 });
      }
      boundaries[i] = length;
      const before = length;
      if (child instanceof Element && child.tagName === "BR") {
        // Editors keep a final BR as a caret placeholder, not another line.
        const placeholder = i === children.length - 1 &&
          (node === root || node instanceof Element && BLOCK_TAGS.has(node.tagName));
        offsets.set(child, [length]);
        if (!placeholder) append("\n", { node, offset: i }, { node, offset: i + 1 });
      } else {
        walk(child);
      }
      if (block || length > before) {
        previous = child;
        previousBlock = block;
        previousEmpty = length === before;
      }
    }
    boundaries[children.length] = length;
  }
  walk(root);

  function pointAt(index: number): DomPoint {
    const target = Math.max(0, Math.min(index, length));
    let lo = 0;
    let hi = runs.length - 1;
    while (lo <= hi) {
      const mid = (lo + hi) >>> 1;
      if (runs[mid].end < target) lo = mid + 1;
      else hi = mid - 1;
    }
    const run = runs[lo];
    if (!run) return { node: root, offset: root.childNodes.length };
    if (run.text) return { node: run.from.node, offset: target - run.start };
    return target <= run.start ? run.from : run.to;
  }

  function offsetAt(node: Node, offset: number): number {
    const values = offsets.get(node);
    if (!values) throw new Error("Point is outside the editor text");
    if (node.nodeType === Node.TEXT_NODE) {
      return values[0] + Math.max(0, Math.min(offset, node.textContent?.length ?? 0));
    }
    return values[Math.max(0, Math.min(offset, values.length - 1))] ?? 0;
  }

  return { text: chunks.join(""), pointAt, offsetAt };
}

export function extractPlainText(root: HTMLElement): string {
  return getPlainTextMap(root).text;
}

export function offsetFromDomPoint(root: HTMLElement, node: Node, offset: number): number {
  return getPlainTextMap(root).offsetAt(node, offset);
}

export function domPointFromOffset(root: HTMLElement, charIndex: number): DomPoint {
  return getPlainTextMap(root).pointAt(charIndex);
}

export function setDomSelectionByOffsets(
  root: HTMLElement,
  start: number,
  end: number,
  options?: { focus?: boolean },
): boolean {
  const map = getPlainTextMap(root);
  if (start < 0 || end < start || end > map.text.length) return false;
  const s = map.pointAt(start);
  const e = map.pointAt(end);
  try {
    if (options?.focus !== false) root.focus({ preventScroll: true });
    const range = document.createRange();
    range.setStart(s.node, s.offset);
    range.setEnd(e.node, e.offset);
    const selection = window.getSelection();
    if (!selection) return false;
    selection.removeAllRanges();
    selection.addRange(range);
    return true;
  } catch {
    return false;
  }
}

export function selectPlainTextRange(
  root: HTMLElement,
  start: number,
  end: number,
  expectedSlice: string,
  options?: { focus?: boolean },
): boolean {
  if (extractPlainText(root).slice(start, end) !== expectedSlice) return false;
  return setDomSelectionByOffsets(root, start, end, options);
}

export function plainTextContains(root: HTMLElement, fragment: string): boolean {
  return extractPlainText(root).includes(fragment);
}
