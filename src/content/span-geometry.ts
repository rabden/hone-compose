/**
 * Map plain-text character spans to viewport rectangles for highlight overlays.
 */

import { getPlainTextMap } from "./plain-text-dom";
import type { EditableAdapter } from "./adapters";

let rangeMirror: HTMLDivElement | null = null;

function getRangeMirror(): HTMLDivElement {
  if (!rangeMirror) {
    rangeMirror = document.createElement("div");
    rangeMirror.setAttribute("aria-hidden", "true");
    rangeMirror.style.cssText =
      "position:fixed;overflow:hidden;visibility:hidden;pointer-events:none;z-index:-1;box-sizing:border-box;margin:0;";
    document.body.appendChild(rangeMirror);
  }
  return rangeMirror;
}

function applyNativeMirrorStyles(
  mirror: HTMLDivElement,
  el: HTMLInputElement | HTMLTextAreaElement,
  cs: CSSStyleDeclaration,
  elRect: DOMRect,
) {
  const isTextarea = el instanceof HTMLTextAreaElement;
  mirror.style.font = cs.font;
  mirror.style.fontFamily = cs.fontFamily;
  mirror.style.fontSize = cs.fontSize;
  mirror.style.fontWeight = cs.fontWeight;
  mirror.style.fontStyle = cs.fontStyle;
  mirror.style.fontVariant = cs.fontVariant;
  mirror.style.lineHeight = cs.lineHeight;
  mirror.style.letterSpacing = cs.letterSpacing;
  mirror.style.wordSpacing = cs.wordSpacing;
  mirror.style.textTransform = cs.textTransform;
  mirror.style.textIndent = cs.textIndent;
  mirror.style.padding = cs.padding;
  mirror.style.border = `${cs.borderWidth} solid transparent`;
  mirror.style.boxSizing = cs.boxSizing;
  mirror.style.top = `${elRect.top}px`;
  mirror.style.left = `${elRect.left}px`;
  mirror.style.width = `${elRect.width}px`;
  mirror.style.height = `${elRect.height}px`;
  mirror.style.whiteSpace = isTextarea ? "pre-wrap" : "pre";
  mirror.style.wordBreak = cs.wordBreak;
  mirror.style.overflowWrap = cs.overflowWrap as string;
  mirror.style.overflow = "hidden";
}

export function getSpansClientRects(
  adapter: EditableAdapter,
  spans: { start: number; end: number }[],
): DOMRect[][] {
  if (!spans.length) return [];
  const el = adapter.getElement();
  const native = el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement;
  let map: ReturnType<typeof getPlainTextMap>;
  let clip: DOMRect | undefined;
  if (native) {
    const mirror = getRangeMirror();
    clip = el.getBoundingClientRect();
    applyNativeMirrorStyles(mirror, el, getComputedStyle(el), clip);
    mirror.textContent = el.value;
    mirror.scrollTop = el.scrollTop;
    mirror.scrollLeft = el.scrollLeft;
    map = getPlainTextMap(mirror);
  } else {
    map = getPlainTextMap(el);
  }
  // All writes happen before the first range read, avoiding per-issue layout.
  return spans.map(({ start, end }) => {
    if (end <= start || start < 0 || end > map.text.length) return [];
    const s = map.pointAt(start);
    const e = map.pointAt(end);
    const range = document.createRange();
    range.setStart(s.node, s.offset);
    range.setEnd(e.node, e.offset);
    return Array.from(range.getClientRects()).flatMap((rect) => {
      const left = Math.max(rect.left, clip?.left ?? rect.left);
      const right = Math.min(rect.right, clip?.right ?? rect.right);
      if (right <= left || rect.height <= 0 || clip && (rect.bottom > clip.bottom || rect.top < clip.top)) return [];
      return [new DOMRect(left, rect.top, right - left, rect.height)];
    });
  });
}

export function getSpanClientRects(adapter: EditableAdapter, start: number, end: number): DOMRect[] {
  return getSpansClientRects(adapter, [{ start, end }])[0];
}

/**
 * Marker-yellow highlights inferred from text color:
 * dark text → light page bg → lemon marker (text stays dark)
 * light text → dark page bg → deep amber (keeps white text readable)
 */
export function getAdaptiveHighlightColors(element: HTMLElement): {
  idle: string;
  onDarkField: boolean;
} {
  const color = getComputedStyle(element).color;
  const rgb = parseCssColor(color);
  const lum = rgb
    ? 0.2126 * (rgb.r / 255) + 0.7152 * (rgb.g / 255) + 0.0722 * (rgb.b / 255)
    : 0.2;

  if (lum > 0.62) {
    return {
      idle: "rgba(120, 83, 18, 0.72)",
      onDarkField: true,
    };
  }

  return {
    idle: "rgba(180, 140, 40, 0.78)",
    onDarkField: false,
  };
}

function parseCssColor(
  value: string,
): { r: number; g: number; b: number } | null {
  if (!value) return null;
  const m = value.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
  if (m) {
    return { r: +m[1], g: +m[2], b: +m[3] };
  }
  return null;
}
