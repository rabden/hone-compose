import { test } from "node:test";
import { strict as assert } from "node:assert";
import { getPlainTextMap } from "../src/content/plain-text-dom.ts";

class FakeNode {
  static TEXT_NODE = 3;
  static COMMENT_NODE = 8;
  nodeType: number;
  childNodes: FakeNode[];
  value: string;
  constructor(nodeType: number, children: FakeNode[] = [], value = "") {
    this.nodeType = nodeType;
    this.childNodes = children;
    this.value = value;
  }
  get textContent(): string { return this.nodeType === 3 ? this.value : this.childNodes.map((n) => n.textContent).join(""); }
}
class FakeElement extends FakeNode {
  tagName: string;
  attributes = new Set<string>();
  constructor(tag: string, children: FakeNode[]) { super(1, children); this.tagName = tag.toUpperCase(); }
  hasAttribute(name: string): boolean { return this.attributes.has(name); }
}
const text = (value: string) => new FakeNode(3, [], value);
const el = (tag: string, ...children: FakeNode[]) => new FakeElement(tag, children);
const comment = (value = "") => new FakeNode(8, [], value);

function withFakeDom(t: { after: (fn: () => void) => void }) {
  const oldNode = Object.getOwnPropertyDescriptor(globalThis, "Node");
  const oldElement = Object.getOwnPropertyDescriptor(globalThis, "Element");
  Object.defineProperty(globalThis, "Node", { configurable: true, value: FakeNode });
  Object.defineProperty(globalThis, "Element", { configurable: true, value: FakeElement });
  t.after(() => {
    if (oldNode) Object.defineProperty(globalThis, "Node", oldNode); else Reflect.deleteProperty(globalThis, "Node");
    if (oldElement) Object.defineProperty(globalThis, "Element", oldElement); else Reflect.deleteProperty(globalThis, "Element");
  });
}

function check(root: FakeElement, expected: string) {
  const map = getPlainTextMap(root as unknown as HTMLElement);
  assert.equal(map.text, expected);
  for (let i = 0; i <= expected.length; i++) {
    const point = map.pointAt(i);
    assert.equal(map.offsetAt(point.node, point.offset), i, `round-trip at ${i}`);
    const startPoint = map.pointAt(i, "start");
    assert.equal(map.offsetAt(startPoint.node, startPoint.offset), i, `start round-trip at ${i}`);
    const endPoint = map.pointAt(i, "end");
    assert.equal(map.offsetAt(endPoint.node, endPoint.offset), i, `end round-trip at ${i}`);
  }
  return map;
}

test("canonical DOM text maps block, BR and inline boundaries without layout reads", (t) => {
  withFakeDom(t);
  check(el("div", el("p", text("first")), el("p", text("second"))), "first\nsecond");
  check(el("div", text("first"), el("br"), text("second")), "first\nsecond");
  check(el("div", el("p", text("first")), el("p", el("br")), el("p", text("third"))), "first\n\nthird");
  check(el("div", el("p", el("br")), el("p", text("😀b"))), "\n😀b");
  check(el("div", text("first"), el("div", el("br")), el("div", text("second")), el("div", el("br"))), "first\n\nsecond\n");
  check(el("div", el("span", text("hel")), el("b", text("lo")), text(" "), el("i", text("world"))), "hello world");
  check(el("div", el("blockquote", el("p", text("one")), el("p", text("two"))), el("p", text("three"))), "one\ntwo\nthree");
  check(el("div", el("ul", el("li", text("one")), el("li", text("two")))), "one\ntwo");
  check(el("div", text("one"), el("br"), el("br")), "one\n");
  check(el("div", el("br")), "");
  check(el("div", text("one\n\n")), "one\n\n");
  const zero = el("span", text("\uFEFF"), el("br"));
  zero.attributes.add("data-slate-zero-width");
  const zeroMap = check(el("div", el("p", zero), el("p", text("text"))), "\ntext");
  assert.equal(zeroMap.offsetAt(zero as unknown as Node, 0), 0);
});

test("Draft.js inline-wrapped BR placeholders and nested empty blocks preserve newline counts", (t) => {
  withFakeDom(t);
  const draftBlock = (...children: FakeNode[]) => el("div", el("div", ...children));
  const draftEmpty = () => draftBlock(el("span", el("br")));
  const draftText = (value: string) => draftBlock(el("span", el("span", text(value))));

  check(el("div", draftEmpty()), "");
  check(el("div", draftText("first"), draftEmpty()), "first\n");
  check(el("div", draftText("first"), draftEmpty(), draftEmpty()), "first\n\n");
  check(el("div", draftEmpty(), draftText("then")), "\nthen");
  check(el("div", draftText("first"), draftEmpty(), draftText("then turned")), "first\n\nthen turned");
  check(el("div", draftText("first"), draftEmpty(), draftEmpty(), draftText("then")), "first\n\n\nthen");

  // Nested empty block inside a wrapper block must still separate from the next block.
  check(el("div", el("blockquote", el("p", text("one")), el("p", el("br"))), el("p", text("two"))), "one\n\ntwo");

  // Non-trailing inline-wrapped BR still emits a newline; trailing empty span/comment doesn't break placeholder.
  check(el("div", el("span", text("a"), el("br")), el("span", text("b"))), "a\nb");
  check(el("div", el("span", el("br")), el("span", text("b"))), "\nb");
  check(el("div", el("span", text("a"), el("br")), el("span"), comment("c")), "a");
});

test("rangePoints keeps span start inside the target text node across empty lines and inline tags", (t) => {
  withFakeDom(t);

  // Draft.js: "first\n\nthen turned"
  const thenText = text("then turned");
  const emptySpan = el("span", el("br"));
  const rootDraft = el(
    "div",
    el("div", el("div", el("span", el("span", text("first"))))),
    el("div", el("div", emptySpan)),
    el("div", el("div", el("span", el("span", thenText)))),
  );
  const draftMap = check(rootDraft, "first\n\nthen turned");
  const draftRange = draftMap.rangePoints(7, 11);
  assert.equal(draftRange.from.node, thenText);
  assert.equal(draftRange.from.offset, 0);
  assert.equal(draftRange.to.node, thenText);
  assert.equal(draftRange.to.offset, 4);
  assert.equal(draftMap.pointAt(7).node, thenText);
  assert.equal(draftMap.pointAt(7).offset, 0);

  // Standard <p><br></p> blocks
  const pThenText = text("then");
  const rootP = el("div", el("p", text("first")), el("p", el("br")), el("p", pThenText));
  const pMap = check(rootP, "first\n\nthen");
  const pRange = pMap.rangePoints(7, 11);
  assert.equal(pRange.from.node, pThenText);
  assert.equal(pRange.from.offset, 0);
  assert.equal(pRange.to.node, pThenText);
  assert.equal(pRange.to.offset, 4);

  // Consecutive <br> line breaks
  const brThenText = text("then");
  const rootBr = el("div", text("first"), el("br"), el("br"), brThenText);
  const brMap = check(rootBr, "first\n\nthen");
  const brRange = brMap.rangePoints(7, 11);
  assert.equal(brRange.from.node, brThenText);
  assert.equal(brRange.from.offset, 0);
  assert.equal(brRange.to.node, brThenText);
  assert.equal(brRange.to.offset, 4);

  // Inline formatting boundary: "Hello " + <b>"world"</b>
  const helloText = text("Hello ");
  const worldText = text("world");
  const rootInline = el("div", el("p", helloText, el("b", worldText)));
  const inlineMap = check(rootInline, "Hello world");
  const worldRange = inlineMap.rangePoints(6, 11);
  assert.equal(worldRange.from.node, worldText);
  assert.equal(worldRange.from.offset, 0);
  assert.equal(worldRange.to.node, worldText);
  assert.equal(worldRange.to.offset, 5);
  const helloRange = inlineMap.rangePoints(0, 6);
  assert.equal(helloRange.from.node, helloText);
  assert.equal(helloRange.from.offset, 0);
  assert.equal(helloRange.to.node, helloText);
  assert.equal(helloRange.to.offset, 6);
});
