import type { AIChatRequest } from "./aiProviders.ts";
import { boundChatMessages, buildSystemPrompt, validateMessageContent } from "./chatContext.ts";

export interface StoredMessage {
  id: number;
  sessionId: number;
  role: "user" | "assistant";
  content: string;
  createdAt: Date;
}

export interface ReplySession {
  id: number;
  agentId: number;
}

export interface ReplyAgent {
  id: number;
  name: string;
  model: string;
  description: string | null;
}

export interface ReplyStore {
  findSession(id: number): Promise<ReplySession | null>;
  findAgent(id: number): Promise<ReplyAgent | null>;
  listMessages(sessionId: number): Promise<StoredMessage[]>;
  insertMessage(input: {
    sessionId: number;
    role: "user" | "assistant";
    content: string;
  }): Promise<StoredMessage>;
  deleteMessage(id: number): Promise<void>;
  touchSession(sessionId: number, at: Date): Promise<void>;
  logActivity(input: { description: string; agentId: number | null }): Promise<void>;
}

const PUBLIC_REPLY_ERROR =
  /is required to use this model|is not configured|returned an empty response|must end with a user message|Message exceeds|Message content is required/;

export function publicReplyError(error: unknown): string {
  const message = error instanceof Error ? error.message : "";
  if (/sk-|bearer |password|secret/i.test(message)) {
    return "The agent could not reply. Try again.";
  }
  if (PUBLIC_REPLY_ERROR.test(message)) return message;
  return "The agent could not reply. Try again.";
}

async function deleteQuietly(store: ReplyStore, id: number): Promise<void> {
  try {
    await store.deleteMessage(id);
  } catch {
    // Keep the original failure. A failed cleanup must not replace it.
  }
}

export type ReplyOutcome =
  | { ok: true; user: StoredMessage; assistant: StoredMessage }
  | { ok: false; status: 400 | 404 | 500; error: string };

export async function createSessionReply(
  store: ReplyStore,
  complete: (request: AIChatRequest) => Promise<string>,
  sessionId: number,
  rawContent: string,
): Promise<ReplyOutcome> {
  const content = validateMessageContent(rawContent);
  if (!content.ok) {
    return { ok: false, status: 400, error: content.error };
  }

  const session = await store.findSession(sessionId);
  if (!session) {
    return { ok: false, status: 404, error: "Session not found" };
  }

  const agent = await store.findAgent(session.agentId);
  if (!agent) {
    return { ok: false, status: 404, error: "Agent not found" };
  }

  const prior = await store.listMessages(sessionId);
  const user = await store.insertMessage({
    sessionId,
    role: "user",
    content: content.content,
  });

  const request: AIChatRequest = {
    model: agent.model,
    systemPrompt: buildSystemPrompt(agent),
    messages: boundChatMessages([
      ...prior.map((message) => ({ role: message.role, content: message.content })),
      { role: "user", content: content.content },
    ]),
  };

  let agentReply: string;
  try {
    agentReply = await complete(request);
  } catch (error) {
    await deleteQuietly(store, user.id);
    return { ok: false, status: 500, error: publicReplyError(error) };
  }

  try {
    const assistant = await store.insertMessage({
      sessionId,
      role: "assistant",
      content: agentReply,
    });
    await store.touchSession(sessionId, new Date());
    await store.logActivity({
      description: `Message sent in session #${sessionId}`,
      agentId: agent.id,
    });
    return { ok: true, user, assistant };
  } catch {
    await deleteQuietly(store, user.id);
    return { ok: false, status: 500, error: "The agent could not reply. Try again." };
  }
}
