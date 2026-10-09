/**
 * Regression tests for sensitive-field detection.
 * Run: npm test  (uses Node's built-in test runner with native TS stripping)
 *
 * Contract: Hone must NEVER adapt password, payment, or one-time-code inputs —
 * the trigger dot, action menu, and shortcuts stay fully disabled on them, so
 * secrets can never be captured or sent to AI providers.
 */
import { test } from "node:test";
import { strict as assert } from "node:assert";
import {
  isSensitiveFieldDescriptor,
  isSensitiveField,
} from "../src/content/sensitive-fields.ts";

function fakeInput(
  attrs: Record<string, string | null>,
): Element {
  return {
    tagName: "input",
    getAttribute: (name: string) => attrs[name] ?? null,
  } as unknown as Element;
}

test("input type=password is sensitive regardless of case", () => {
  assert.equal(isSensitiveFieldDescriptor({ type: "password" }), true);
  assert.equal(isSensitiveFieldDescriptor({ type: "PASSWORD" }), true);
  assert.equal(isSensitiveFieldDescriptor({ type: "Password" }), true);
});

test("autocomplete tokens mark secret fields even with type=text", () => {
  for (const token of [
    "current-password",
    "new-password",
    "one-time-code",
    "otp",
    "cc-number",
    "cc-csc",
  ]) {
    assert.equal(
      isSensitiveFieldDescriptor({ type: "text", autocomplete: token }),
      true,
      `autocomplete=${token}`,
    );
  }
});

test("autocomplete is matched per token, not as a substring", () => {
  assert.equal(
    isSensitiveFieldDescriptor({
      type: "text",
      autocomplete: "email",
    }),
    false,
  );
  assert.equal(
    isSensitiveFieldDescriptor({
      type: "text",
      autocomplete: "off current-password",
    }),
    true,
  );
});

test("password-like names, ids, and placeholders are sensitive", () => {
  const sensitiveValues = [
    "password",
    "Password",
    "confirm-password",
    "user_password",
    "passwd",
    "pwd",
    "pass",
    "pin",
    "pincode",
    "cvv",
    "cvc",
    "otp",
    "cardNumber",
    "card-number",
    "creditcard",
    "credit_card",
    "securitycode",
  ];
  for (const value of sensitiveValues) {
    assert.equal(
      isSensitiveFieldDescriptor({ type: "text", name: value }),
      true,
      `name=${value}`,
    );
    assert.equal(
      isSensitiveFieldDescriptor({ type: "text", id: value }),
      true,
      `id=${value}`,
    );
    assert.equal(
      isSensitiveFieldDescriptor({ type: "text", placeholder: `Enter ${value}` }),
      true,
      `placeholder=${value}`,
    );
    assert.equal(
      isSensitiveFieldDescriptor({ type: "text", ariaLabel: value }),
      true,
      `ariaLabel=${value}`,
    );
  }
});

test("word boundaries prevent false positives", () => {
  // "shipping" contains "pin", "bypass" contains "pass", "pinned"/"pineapple"
  // contain "pin" followed by a letter — none of these are secrets.
  const safeValues = [
    "shipping",
    "shippingAddress",
    "bypass",
    "pinned",
    "pineapple",
    "compass",
    "username",
    "user",
    "email",
    "message",
    "search",
    "comment",
    "title",
    "body",
  ];
  for (const value of safeValues) {
    assert.equal(
      isSensitiveFieldDescriptor({ type: "text", name: value }),
      false,
      `name=${value}`,
    );
    assert.equal(
      isSensitiveFieldDescriptor({ type: "text", placeholder: value }),
      false,
      `placeholder=${value}`,
    );
  }
});

test("empty or missing attributes are not sensitive", () => {
  assert.equal(isSensitiveFieldDescriptor({}), false);
  assert.equal(
    isSensitiveFieldDescriptor({
      type: "text",
      name: null,
      id: "",
      placeholder: null,
      ariaLabel: null,
      title: null,
    }),
    false,
  );
});

test("regular text/email/search inputs are not sensitive", () => {
  for (const type of ["text", "email", "search", "url", "tel", "number"]) {
    assert.equal(isSensitiveFieldDescriptor({ type }), false, `type=${type}`);
  }
});

test("DOM wrapper: password input is rejected", () => {
  const el = fakeInput({ type: "password" });
  assert.equal(isSensitiveField(el), true);
});

test("DOM wrapper: text input labeled as password is rejected", () => {
  const el = fakeInput({ type: "text", name: "user_password" });
  assert.equal(isSensitiveField(el), true);
});

test("DOM wrapper: OTP autocomplete is rejected", () => {
  const el = fakeInput({ type: "text", autocomplete: "one-time-code" });
  assert.equal(isSensitiveField(el), true);
});

test("DOM wrapper: normal inputs and non-inputs are allowed", () => {
  assert.equal(
    isSensitiveField(fakeInput({ type: "text", name: "comment" })),
    false,
  );
  assert.equal(
    isSensitiveField(fakeInput({ name: "password", type: null })),
    true,
  );
  const contenteditable = {
    tagName: "div",
    getAttribute: () => null,
  } as unknown as Element;
  assert.equal(isSensitiveField(contenteditable), false);
  assert.equal(isSensitiveField(null), false);
});
