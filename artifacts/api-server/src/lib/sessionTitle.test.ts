import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { MAX_SESSION_TITLE, resolveSessionTitle } from "./sessionTitle.ts";

describe("resolveSessionTitle", () => {
  it("keeps a caller-provided title", () => {
    assert.equal(resolveSessionTitle("  Project brainstorm  ", "Scout"), "Project brainstorm");
  });

  it("falls back to the agent name when the title is blank", () => {
    assert.equal(resolveSessionTitle("   ", "Scout"), "Session with Scout");
    assert.equal(resolveSessionTitle(undefined, "Scout"), "Session with Scout");
    assert.equal(resolveSessionTitle("New Session", "Scout"), "Session with Scout");
  });

  it("bounds very long titles", () => {
    const title = resolveSessionTitle("x".repeat(MAX_SESSION_TITLE + 20), "Scout");
    assert.equal(title.length, MAX_SESSION_TITLE);
  });
});
