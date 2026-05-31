/**
 * Map plain-text character spans to viewport rectangles for highlight overlays.
 */

import { domPointFromOffset } from "./plain-text-dom";
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
  mirror.scrollTop = isTextarea ? el.scrollTop : 0;
  mirror.scrollLeft = isTextarea ? el.scrollLeft : 0;
}

function getNativeInputRangeRects(
  el: HTMLInputElement | HTMLTextAreaElement,
  start: number,
  end: number,
): DOMRect[] {
  if (end <= start) return [];

  const cs = getComputedStyle(el);
  const elRect = el.getBoundingClientRect();
  const mirror = getRangeMirror();
  applyNativeMirrorStyles(mirror, el, cs, elRect);

  const value = el.value;
  const mark = document.createElement("mark");
  mark.style.background = "transparent";
  mark.style.color = "inherit";
  mark.style.padding = "0";
  mark.style.margin = "0";
  mark.textContent = value.slice(start, end);

  mirror.replaceChildren(
    document.createTextNode(value.slice(0, start)),
    mark,
    document.createTextNode(value.slice(end)),
  );

  const rects = Array.from(mark.getClientRects()).filter(
    (r) => r.width > 0 && r.height > 0,
  );
  if (rects.length > 0) return rects;

  const fallback = mark.getBoundingClientRect();
  return fallback.width > 0 || fallback.height > 0 ? [fallback] : [];
}

function getContentEditableRangeRects(
  root: HTMLElement,
  start: number,
  end: number,
): DOMRect[] {
  if (end <= start) return [];

  const startPair = domPointFromOffset(root, start);
  const endPair = domPointFromOffset(root, end);
  const range = document.createRange();

  try {
    range.setStart(startPair.node, startPair.offset);
    range.setEnd(endPair.node, endPair.offset);
  } catch {
    return [];
  }

  return Array.from(range.getClientRects()).filter(
    (r) => r.width > 0 && r.height > 0,
  );
}

export function getSpanClientRects(
  adapter: EditableAdapter,
  start: number,
  end: number,
): DOMRect[] {
  const el = adapter.getElement();
  const s = Math.max(0, Math.min(start, end));
  const e = Math.max(s, end);

  if (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement) {
    return getNativeInputRangeRects(el, s, e);
  }

  return getContentEditableRangeRects(el, s, e);
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
