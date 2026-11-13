import { Router, type Request, type Response } from "express";
import { db } from "@workspace/db";
import { messagesTable, sessionsTable, agentsTable, activityTable } from "@workspace/db";
import { eq, asc } from "drizzle-orm";
import { ListMessagesParams, CreateMessageParams, CreateMessageBody } from "@workspace/api-zod";
import { getAIResponse } from "../lib/aiProviders";
import { createSessionReply, type ReplyStore, type StoredMessage } from "../lib/sessionReply";
import { requirePositiveInt } from "../lib/errorHandler";

const router = Router({ mergeParams: true });

const store: ReplyStore = {
  async findSession(id) {
    const [session] = await db.select().from(sessionsTable).where(eq(sessionsTable.id, id));
    return session ? { id: session.id, agentId: session.agentId } : null;
  },
  async findAgent(id) {
    const [agent] = await db.select().from(agentsTable).where(eq(agentsTable.id, id));
    return agent
      ? {
          id: agent.id,
          name: agent.name,
          model: agent.model,
          description: agent.description,
        }
      : null;
  },
  async listMessages(sessionId) {
    const rows = await db.select().from(messagesTable)
      .where(eq(messagesTable.sessionId, sessionId))
      .orderBy(asc(messagesTable.createdAt));
    return rows.map(toStoredMessage);
  },
  async insertMessage(input) {
    const [row] = await db.insert(messagesTable).values(input).returning();
    if (!row) {
      throw new Error("Failed to save the message.");
    }
    return toStoredMessage(row);
  },
  async deleteMessage(id) {
    await db.delete(messagesTable).where(eq(messagesTable.id, id));
  },
  async touchSession(sessionId, at) {
    await db.update(sessionsTable).set({ lastMessageAt: at }).where(eq(sessionsTable.id, sessionId));
  },
  async logActivity(input) {
    await db.insert(activityTable).values({
      type: "message_sent",
      description: input.description,
      agentId: input.agentId,
    });
  },
};

function toStoredMessage(row: {
  id: number;
  sessionId: number;
  role: string;
  content: string;
  createdAt: Date;
}): StoredMessage {
  const role = row.role === "assistant" ? "assistant" : "user";
  return {
    id: row.id,
    sessionId: row.sessionId,
    role,
    content: row.content,
    createdAt: row.createdAt,
  };
}

router.get("/", async (req: Request<{ id: string }>, res: Response) => {
  const { id: rawId } = ListMessagesParams.parse({ id: Number(req.params.id) });
  const id = requirePositiveInt(rawId);
  const messages = await db.select().from(messagesTable)
    .where(eq(messagesTable.sessionId, id))
    .orderBy(asc(messagesTable.createdAt));

  res.json(messages.map((message) => ({ ...message, createdAt: message.createdAt.toISOString() })));
});

router.post("/", async (req: Request<{ id: string }>, res: Response) => {
  const { id: rawId } = CreateMessageParams.parse({ id: Number(req.params.id) });
  const id = requirePositiveInt(rawId);
  const body = CreateMessageBody.parse(req.body);
  const result = await createSessionReply(store, getAIResponse, id, body.content);

  if (!result.ok) {
    if (result.status === 500) {
      req.log.error({ err: result.error }, "AI provider request failed");
    }
    res.status(result.status).json({ error: result.error });
    return;
  }

  res.status(201).json([
    { ...result.user, createdAt: result.user.createdAt.toISOString() },
    { ...result.assistant, createdAt: result.assistant.createdAt.toISOString() },
  ]);
});

export default router;
