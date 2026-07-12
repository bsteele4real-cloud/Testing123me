import { Router } from "express";
import { db } from "@workspace/db";
import { messagesTable, sessionsTable, agentsTable, activityTable } from "@workspace/db";
import { eq, asc } from "drizzle-orm";
import {
  ListMessagesParams,
  CreateMessageParams,
  CreateMessageBody,
} from "@workspace/api-zod";

const AGENT_RESPONSES: Record<string, string[]> = {
  default: [
    "I understand your request. Let me process that for you.",
    "That's an interesting point. Based on my analysis, I would suggest proceeding with the outlined approach.",
    "I've reviewed the information. Here's my assessment: the proposed strategy aligns well with your objectives.",
    "Understood. I can handle that task. Initiating the workflow now.",
    "Great question. The optimal solution here involves a multi-step approach.",
  ],
};

function getAgentResponse(_agentModel: string, _userMessage: string): string {
  const responses = AGENT_RESPONSES.default;
  return responses[Math.floor(Math.random() * responses.length)];
}

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

  const agentReply = getAgentResponse(agent?.model ?? "default", body.content);
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
