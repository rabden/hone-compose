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

function check(root: FakeElement, expected: string) {
  const map = getPlainTextMap(root as unknown as HTMLElement);
  assert.equal(map.text, expected);
  for (let i = 0; i <= expected.length; i++) {
    const point = map.pointAt(i);
    assert.equal(map.offsetAt(point.node, point.offset), i, `round-trip at ${i}`);
  }
  return map;
}

test("canonical DOM text maps block, BR and inline boundaries without layout reads", (t) => {
  const oldNode = Object.getOwnPropertyDescriptor(globalThis, "Node");
  const oldElement = Object.getOwnPropertyDescriptor(globalThis, "Element");
  Object.defineProperty(globalThis, "Node", { configurable: true, value: FakeNode });
  Object.defineProperty(globalThis, "Element", { configurable: true, value: FakeElement });
  t.after(() => {
    if (oldNode) Object.defineProperty(globalThis, "Node", oldNode); else Reflect.deleteProperty(globalThis, "Node");
    if (oldElement) Object.defineProperty(globalThis, "Element", oldElement); else Reflect.deleteProperty(globalThis, "Element");
  });
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
  check(el("div", el("p", zero), el("p", text("text"))), "\ntext");
});
