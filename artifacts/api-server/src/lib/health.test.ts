import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { readHealth } from "./health.ts";

describe("readHealth", () => {
  it("reports ok only after the database ping succeeds", async () => {
    const healthy = await readHealth(async () => {});
    assert.deepEqual(healthy, { httpStatus: 200, body: { status: "ok" } });

    const down = await readHealth(async () => {
      throw new Error("connection refused");
    });
    assert.equal(down.httpStatus, 503);
    assert.equal(down.body.status, "unavailable");
    assert.equal(JSON.stringify(down.body).includes("connection refused"), false);
  });
});
