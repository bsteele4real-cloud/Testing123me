import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { errorHandler } from "./errorHandler.ts";

function mockResponse() {
  const state = { statusCode: 0, body: undefined as unknown, headersSent: false };
  const res = {
    get headersSent() {
      return state.headersSent;
    },
    status(code: number) {
      state.statusCode = code;
      return this;
    },
    json(body: unknown) {
      state.body = body;
    },
  };
  return { state, res };
}

describe("errorHandler", () => {
  it("returns the validation message for Zod errors and hides other failures", () => {
    const zod = new Error("schema");
    zod.name = "ZodError";
    Object.assign(zod, { issues: [{ message: "Expected number, received nan" }] });
    const invalid = mockResponse();
    errorHandler(zod, { log: { error() {} } } as never, invalid.res as never, () => {});
    assert.equal(invalid.state.statusCode, 400);
    assert.deepEqual(invalid.state.body, { error: "Expected number, received nan" });

    const leaked = new Error("connect ECONNREFUSED password=secret");
    const failed = mockResponse();
    let logged = false;
    errorHandler(
      leaked,
      { log: { error() { logged = true; } } } as never,
      failed.res as never,
      () => {},
    );
    assert.equal(failed.state.statusCode, 500);
    assert.deepEqual(failed.state.body, { error: "Internal server error" });
    assert.equal(JSON.stringify(failed.state.body).includes("secret"), false);
    assert.equal(logged, true);
  });
});
