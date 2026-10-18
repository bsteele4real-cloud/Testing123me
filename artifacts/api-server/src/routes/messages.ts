import { Router } from "express";
import { db } from "@workspace/db";
import { messagesTable, sessionsTable, agentsTable, activityTable } from "@workspace/db";
import { eq, asc } from "drizzle-orm";
import {
  ListMessagesParams,
  CreateMessageParams,
  CreateMessageBody,
} from "@workspace/api-zod";
import { getAIResponse } from "../lib/aiProviders";

const router = Router({ mergeParams: true });

router.get("/", async (req, res) => {
  const { id } = ListMessagesParams.parse({ id: Number(req.params.id) });
  const messages = await db.select().from(messagesTable)
    .where(eq(messagesTable.sessionId, id))
    .orderBy(asc(messagesTable.createdAt));

  res.json(messages.map((m) => ({ ...m, createdAt: m.createdAt.toISOString() })));
});

router.post("/", async (req, res) => {
  const { id } = CreateMessageParams.parse({ id: Number(req.params.id) });
  const body = CreateMessageBody.parse(req.body);

  const [session] = await db.select().from(sessionsTable).where(eq(sessionsTable.id, id));
  if (!session) return res.status(404).json({ error: "Session not found" });

  const [agent] = await db.select().from(agentsTable).where(eq(agentsTable.id, session.agentId));

  const [userMsg] = await db.insert(messagesTable).values({
    sessionId: id,
    role: "user",
    content: body.content,
  }).returning();

  let agentReply: string;
  try {
    agentReply = await getAIResponse(agent?.model ?? "", body.content);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to generate an AI response.";
    req.log.error({ err: error, model: agent?.model }, "AI provider request failed");
    return res.status(500).json({ error: message });
  }

  const [assistantMsg] = await db.insert(messagesTable).values({
    sessionId: id,
    role: "assistant",
    content: agentReply,
  }).returning();

  await db.update(sessionsTable).set({ lastMessageAt: new Date() }).where(eq(sessionsTable.id, id));

  await db.insert(activityTable).values({
    type: "message_sent",
    description: `Message sent in session #${id}`,
    agentId: agent?.id ?? null,
  });

  res.status(201).json([
    { ...userMsg, createdAt: userMsg.createdAt.toISOString() },
    { ...assistantMsg, createdAt: assistantMsg.createdAt.toISOString() },
  ]);
});

export default router;
