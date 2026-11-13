import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { AIChatRequest } from "./aiProviders.ts";
import {
  createSessionReply,
  type ReplyStore,
  type StoredMessage,
} from "./sessionReply.ts";

function memoryStore(): ReplyStore & { messages: StoredMessage[]; touched: boolean; activity: number } {
  const messages: StoredMessage[] = [
    {
      id: 1,
      sessionId: 7,
      role: "user",
      content: "earlier question",
      createdAt: new Date("2026-01-01T00:00:00Z"),
    },
    {
      id: 2,
      sessionId: 7,
      role: "assistant",
      content: "earlier answer",
      createdAt: new Date("2026-01-01T00:00:01Z"),
    },
  ];
  let nextId = 3;
  const state = { messages, touched: false, activity: 0 };

  return {
    ...state,
    get messages() {
      return state.messages;
    },
    get touched() {
      return state.touched;
    },
    get activity() {
      return state.activity;
    },
    async findSession(id) {
      return id === 7 ? { id, agentId: 3 } : null;
    },
    async findAgent(id) {
      return id === 3
        ? { id, name: "Scout", model: "gpt-6-luna", description: "Watch the queue" }
        : null;
    },
    async listMessages(sessionId) {
      return state.messages.filter((message) => message.sessionId === sessionId);
    },
    async insertMessage(input) {
      const row: StoredMessage = {
        id: nextId,
        sessionId: input.sessionId,
        role: input.role,
        content: input.content,
        createdAt: new Date(),
      };
      nextId += 1;
      state.messages.push(row);
      return row;
    },
    async deleteMessage(id) {
      state.messages = state.messages.filter((message) => message.id !== id);
    },
    async touchSession() {
      state.touched = true;
    },
    async logActivity() {
      state.activity += 1;
    },
  };
}

describe("createSessionReply", () => {
  it("sends purpose and prior turns, and keeps both messages on success", async () => {
    const store = memoryStore();
    let seen: AIChatRequest | undefined;
    const result = await createSessionReply(
      store,
      async (request) => {
        seen = request;
        return "new answer";
      },
      7,
      "  new question  ",
    );

    assert.equal(result.ok, true);
    assert.match(seen?.systemPrompt ?? "", /Purpose: Watch the queue/);
    assert.equal(seen?.systemPrompt.includes("new question"), false);
    assert.deepEqual(
      seen?.messages.map((message) => message.content),
      ["earlier question", "earlier answer", "new question"],
    );
    assert.equal(store.messages.length, 4);
    assert.equal(store.touched, true);
    assert.equal(store.activity, 1);
  });

  it("removes the user message when the model call fails", async () => {
    const store = memoryStore();
    const result = await createSessionReply(
      store,
      async () => {
        throw new Error("OPENAI_API_KEY is required to use this model but is not configured.");
      },
      7,
      "new question",
    );

    assert.deepEqual(result, {
      ok: false,
      status: 500,
      error: "OPENAI_API_KEY is required to use this model but is not configured.",
    });
    assert.deepEqual(
      store.messages.map((message) => message.content),
      ["earlier question", "earlier answer"],
    );
    assert.equal(store.touched, false);
    assert.equal(store.activity, 0);
  });

  it("does not return provider secrets when the model call fails", async () => {
    const store = memoryStore();
    const result = await createSessionReply(
      store,
      async () => {
        throw new Error("401 Incorrect API key sk-live-secret");
      },
      7,
      "new question",
    );

    assert.equal(result.ok, false);
    if (!result.ok) {
      assert.equal(result.error.includes("sk-live-secret"), false);
      assert.equal(result.error.includes("Incorrect API key"), false);
    }
    assert.equal(store.messages.some((message) => message.content === "new question"), false);
  });

  it("removes the user message when saving the reply fails", async () => {
    const store = memoryStore();
    const insert = store.insertMessage.bind(store);
    let calls = 0;
    store.insertMessage = async (input) => {
      calls += 1;
      if (calls > 1) throw new Error("disk full");
      return insert(input);
    };
    const result = await createSessionReply(store, async () => "new answer", 7, "new question");

    assert.equal(result.ok, false);
    assert.equal(store.messages.some((message) => message.content === "new question"), false);
    assert.equal(store.activity, 0);
  });

  it("removes the assistant row when a later save step fails", async () => {
    const store = memoryStore();
    store.touchSession = async () => {
      throw new Error("clock skew");
    };
    const result = await createSessionReply(store, async () => "new answer", 7, "new question");

    assert.equal(result.ok, false);
    assert.equal(store.messages.some((message) => message.content === "new question"), false);
    assert.equal(store.messages.some((message) => message.content === "new answer"), false);
    assert.equal(store.activity, 0);
  });
});
