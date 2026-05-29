/**
 * Highlights the active AI target span on the actual text (not overlay boxes).
 * - contenteditable: CSS Custom Highlight API (::highlight)
 * - input/textarea: native selection + per-field ::selection CSS
 * Loading shimmer is handled separately in highlight-shimmer.tsx
 */

import { domPointFromOffset } from "./plain-text-dom";
import { getAdaptiveHighlightColors } from "./span-geometry";
import type { EditableAdapter } from "./adapters";

export type TargetHighlightMode = "idle" | "loading";

const STYLE_ID = "hone-text-highlight-styles";
const HIGHLIGHT_NAME = "hone-target";
const FIELD_ATTR = "data-hone-highlight-field";

let fieldCounter = 0;
let activeFieldId: string | null = null;
let activeNativeEl: HTMLInputElement | HTMLTextAreaElement | null = null;

function supportsCssHighlights(): boolean {
  return typeof CSS !== "undefined" && "highlights" in CSS;
}

function injectGlobalStyles() {
  if (document.getElementById(STYLE_ID)) return;

  const style = document.createElement("style");
  style.id = STYLE_ID;
  style.textContent = `
    ::highlight(${HIGHLIGHT_NAME}) {
      background-color: var(--hone-hl-bg, rgba(253, 224, 71, 0.78));
      color: inherit;
    }
  `;
  document.head.appendChild(style);
}

function setHighlightCssVar(element: HTMLElement) {
  const { idle } = getAdaptiveHighlightColors(element);
  document.documentElement.style.setProperty("--hone-hl-bg", idle);
}

function clearHighlightCssVar() {
  document.documentElement.style.removeProperty("--hone-hl-bg");
}

function createRange(root: HTMLElement, start: number, end: number): Range | null {
  try {
    const startPair = domPointFromOffset(root, Math.max(0, start));
    const endPair = domPointFromOffset(root, Math.max(0, end));
    const range = document.createRange();
    range.setStart(startPair.node, startPair.offset);
    range.setEnd(endPair.node, endPair.offset);
    return range;
  } catch {
    return null;
  }
}

function applyCssHighlight(
  root: HTMLElement,
  start: number,
  end: number,
): boolean {
  if (!supportsCssHighlights()) return false;

  const range = createRange(root, start, end);
  if (!range || range.collapsed) return false;

  CSS.highlights.set(HIGHLIGHT_NAME, new Highlight(range));
  return true;
}

function clearCssHighlights() {
  if (!supportsCssHighlights()) return;
  CSS.highlights.delete(HIGHLIGHT_NAME);
}

function tagNativeField(
  el: HTMLInputElement | HTMLTextAreaElement,
): string {
  let id = el.getAttribute(FIELD_ATTR);
  if (!id) {
    id = `hone-hl-${++fieldCounter}`;
    el.setAttribute(FIELD_ATTR, id);
  }
  return id;
}

function injectFieldSelectionStyles(
  fieldId: string,
  idle: string,
) {
  const fieldStyleId = `${STYLE_ID}-${fieldId}`;
  let style = document.getElementById(fieldStyleId) as HTMLStyleElement | null;
  if (!style) {
    style = document.createElement("style");
    style.id = fieldStyleId;
    document.head.appendChild(style);
  }

  style.textContent = `
    [${FIELD_ATTR}="${fieldId}"]::selection {
      background-color: var(--hone-hl-bg, ${idle}) !important;
      color: inherit;
    }
  `;
}

function removeFieldSelectionStyles(fieldId: string | null) {
  if (!fieldId) return;
  document.getElementById(`${STYLE_ID}-${fieldId}`)?.remove();
}

function applyNativeSelectionHighlight(
  el: HTMLInputElement | HTMLTextAreaElement,
  start: number,
  end: number,
) {
  const fieldId = tagNativeField(el);
  activeFieldId = fieldId;
  activeNativeEl = el;

  const { idle } = getAdaptiveHighlightColors(el);
  injectFieldSelectionStyles(fieldId, idle);

  el.classList.remove("hone-hl-loading");
  el.focus({ preventScroll: true });
  el.setSelectionRange(start, end);
}

function clearNativeSelectionHighlight() {
  if (activeNativeEl) {
    activeNativeEl.classList.remove("hone-hl-loading");
  }
  removeFieldSelectionStyles(activeFieldId);
  activeFieldId = null;
  activeNativeEl = null;
}

export function clearTargetTextHighlight() {
  clearHighlightCssVar();
  clearCssHighlights();
  clearNativeSelectionHighlight();
}

export function applyTargetTextHighlight(
  adapter: EditableAdapter,
  start: number,
  end: number,
  _mode: TargetHighlightMode = "idle",
): void {
  void _mode;
  clearTargetTextHighlight();

  const s = Math.max(0, Math.min(start, end));
  const e = Math.max(s, end);
  if (e <= s) return;

  const el = adapter.getElement();
  injectGlobalStyles();
  setHighlightCssVar(el);

  if (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement) {
    applyNativeSelectionHighlight(el, s, e);
    return;
  }

  if (applyCssHighlight(el, s, e)) {
    return;
  }

  try {
    adapter.selectRange(s, e);
  } catch {
    /* ignore */
  }
}

export function getHighlightFieldTheme(
  adapter: EditableAdapter,
): boolean {
  return getAdaptiveHighlightColors(adapter.getElement()).onDarkField;
}
