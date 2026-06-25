import assert from "node:assert/strict";
import test from "node:test";

import { getLinkTarget, isExternalHref } from "../lib/mdx-link-rules.js";

test("external links open in a new tab", () => {
  const { isExternal, target, rel } = getLinkTarget("https://example.com/guide");

  assert.equal(isExternal, true);
  assert.equal(target, "_blank");
  assert.equal(rel, "noreferrer noopener");
});

test("internal links stay internal", () => {
  const { isExternal, target, rel } = getLinkTarget("/curriculum/ai-foundations");

  assert.equal(isExternal, false);
  assert.equal(target, undefined);
  assert.equal(rel, undefined);
});

test("hash links stay internal", () => {
  assert.equal(isExternalHref("#section"), false);
});

test("protocol-relative links open in a new tab", () => {
  const { isExternal, target } = getLinkTarget("//example.com/docs");

  assert.equal(isExternal, true);
  assert.equal(target, "_blank");
});

test("mailto links open in a new tab", () => {
  const { isExternal, target } = getLinkTarget("mailto:ai@foundry.example");

  assert.equal(isExternal, true);
  assert.equal(target, "_blank");
});
