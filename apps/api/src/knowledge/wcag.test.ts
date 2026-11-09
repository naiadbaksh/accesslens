import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { searchWcag } from "./wcag";

describe("searchWcag", () => {
  assert.equal(searchWcag("1.1.1")[0].title, "Non-text Content");
});
it("finds a criteria by number", () => {
  assert.equal(searchWcag("1.1.1")[0].title, "Non-text Content");
});
it("finds criteria by keywords", () => {
  const ids = searchWcag("input has no label, only a placeholder").map(
    (c) => c.id,
  );
  assert.ok(ids.includes("3.3.2"), ids.join("."));
});
