import React, { useState } from "react";
import { createRoot } from "react-dom/client";
import contentCss from "../src/content/content.css?inline";

const worker = new Worker(new URL("./proofread-browser-worker.ts", import.meta.url), { type: "module" });
const stored = JSON.parse(localStorage.getItem("hone-test-state") ?? "{}");
worker.postMessage({ type: "init", values: stored });
const listeners = new Set<(changes: unknown, area: string) => void>();
const requests = new Map<number, (response: unknown) => void>();
const lintCalls: { text: string; at: number }[] = [];
let sequence = 0;
worker.onmessage = ({ data }) => {
  if (data.type === "storage") {
    Object.assign(stored, data.values);
    localStorage.setItem("hone-test-state", JSON.stringify(stored));
    for (const callback of listeners) callback(data.values, "local");
  } else {
    requests.get(data.id)?.(data);
    requests.delete(data.id);
  }
};
worker.onerror = (error) => { document.getElementById("status")!.textContent = error.message; };
Object.defineProperty(globalThis, "chrome", {
  configurable: true,
  value: {
    runtime: {
      sendMessage: (message: { type: string; text?: string }, callback?: (response: unknown) => void) => {
        if (message.type === "LINT_TEXT") lintCalls.push({ text: message.text!, at: performance.now() });
        return new Promise((resolve) => {
          const id = ++sequence;
          requests.set(id, (response) => { callback?.(response); resolve(response); });
          worker.postMessage({ id, message });
        });
      },
    },
    storage: {
      onChanged: { addListener: (fn: typeof listeners extends Set<infer T> ? T : never) => listeners.add(fn), removeListener: (fn: typeof listeners extends Set<infer T> ? T : never) => listeners.delete(fn) },
      local: { get: async () => stored },
    },
  },
});

const { LiveProofreader } = await import("../src/content/live-proofread.ts");
const { createAdapter } = await import("../src/content/adapters.ts");
const { SuggestionCard } = await import("../src/content/suggestion-card.tsx");
const geometry = await import("../src/content/span-geometry.ts");
const plain = await import("../src/content/plain-text-dom.ts");
await import("../src/content/main-world-bridge.ts");
const host = document.createElement("div");
document.body.append(host);
const shadow = host.attachShadow({ mode: "open" });
const style = document.createElement("style");
style.textContent = contentCss;
shadow.append(style);
const mount = document.createElement("div");
shadow.append(mount);
const cardRoot = createRoot(mount);
const strips = document.createElement("div");
shadow.append(strips);
let controller: InstanceType<typeof LiveProofreader> | null = null;
let adapter: ReturnType<typeof createAdapter> = null;
let issues: import("../src/content/proofread-issues.ts").ProofreadIssue[] = [];
let lastResult: unknown;
const cardRef = (element: HTMLElement | null) => controller?.setCardElement(element);
function measure() {
  strips.replaceChildren();
  if (!adapter || !(adapter.getElement() instanceof HTMLTextAreaElement || adapter.getElement() instanceof HTMLInputElement)) return;
  geometry.getSpansClientRects(adapter, issues).forEach((rects, i) => rects.forEach((r) => {
    const strip = document.createElement("div");
    strip.style.cssText = `position:fixed;pointer-events:none;left:${r.left}px;top:${r.bottom - 2}px;width:${r.width}px;height:3px`;
    strip.className = `hone-squiggle hone-squiggle--${issues[i].kind}`;
    strips.append(strip);
  }));
}
function attach(element: Element) {
  const next = createAdapter(element);
  if (!next || next.getElement() === adapter?.getElement()) return;
  controller?.stop();
  adapter = next;
  controller = new LiveProofreader({
    adapter,
    onIssues: (value) => { issues = value; measure(); document.getElementById("status")!.textContent = `${issues.length} issues; ${lintCalls.length} paragraph checks`; },
    onHoverCard: (card) => {
      cardRoot.render(card ? <SuggestionCard issue={card.issue} flagged={card.flagged} top={card.anchor.bottom + 6} left={card.anchor.left}
        cardRef={cardRef} onPointerEnterCard={() => controller?.cardPointerEntered()} onPointerLeaveCard={() => controller?.cardPointerLeft()}
        onApplyFix={(fix) => { void controller?.applyFix(card.issue, fix).then((value) => { lastResult = value; }); }}
        onIgnore={() => { void controller?.ignoreIssue(card.issue); }} onAddToDictionary={() => { void controller?.addToDictionary(card.issue); }} /> : null);
    },
  });
  controller.start();
}
document.addEventListener("focusin", (event) => { if (event.target instanceof Element && event.target !== host) attach(event.target); });
window.addEventListener("scroll", measure, true);
window.addEventListener("resize", measure);
export function ControlledField() {
  const [value, setValue] = useState("");
  return <><label htmlFor="controlled">React-controlled textarea</label><textarea id="controlled" spellCheck={false} value={value} onChange={(event) => setValue(event.target.value)} /><output id="controlled-state">{value}</output></>;
}
createRoot(document.getElementById("react-field")!).render(<ControlledField />);
Object.assign(window, { honeTest: {
  lintCalls, plain, geometry, createAdapter,
  get issues() { return issues; },
  get controller() { return controller; },
  get adapter() { return adapter; },
  get lastResult() { return lastResult; },
  stored,
} });
document.getElementById("status")!.textContent = "Ready";
