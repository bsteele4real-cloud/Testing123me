import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { credentialsForModel, describeModel, MODEL_CATALOG } from "./models.ts";

describe("describeModel", () => {
  it("maps retired catalog ids onto current provider models", () => {
    assert.equal(describeModel("claude-3-opus").model, "claude-opus-5-5");
    assert.equal(describeModel("claude-3-sonnet").model, "claude-sonnet-5-5");
    assert.equal(describeModel("gemini-1.5-pro").model, "gemini-4-hydrogen");
    assert.equal(describeModel("gpt-3.5-turbo").model, "gpt-6-luna");
    assert.equal(describeModel("hermes-2-pro").model, "Hermes-4-70B");
  });

  it("keeps current catalog ids", () => {
    for (const model of MODEL_CATALOG) {
      assert.equal(describeModel(model).model, model);
    }
  });
});

describe("credentialsForModel", () => {
  it("uses HERMES_API_KEY for Hermes and never the OpenAI key", () => {
    const credentials = credentialsForModel("hermes-2-pro", {
      OPENAI_API_KEY: "openai-secret",
      HERMES_API_KEY: "hermes-secret",
    });

    assert.equal(credentials.provider, "hermes");
    assert.equal(credentials.apiKeyEnv, "HERMES_API_KEY");
    assert.equal(credentials.apiKey, "hermes-secret");
    assert.notEqual(credentials.apiKey, "openai-secret");
    assert.equal(credentials.baseURL, "https://inference-api.nousresearch.com/v1");
  });

  it("honors HERMES_BASE_URL when it is set", () => {
    const credentials = credentialsForModel("Hermes-4-70B", {
      HERMES_API_KEY: "hermes-secret",
      HERMES_BASE_URL: "https://example.test/v1",
    });

    assert.equal(credentials.baseURL, "https://example.test/v1");
  });

  it("fails closed when the Hermes key is missing", () => {
    assert.throws(
      () => credentialsForModel("Hermes-4-70B", { OPENAI_API_KEY: "openai-secret" }),
      /HERMES_API_KEY/,
    );
  });
});
