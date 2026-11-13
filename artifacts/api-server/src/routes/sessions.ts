import { Router } from "express";
import { db } from "@workspace/db";
import { sessionsTable, agentsTable, messagesTable, activityTable } from "@workspace/db";
import { eq, count, desc } from "drizzle-orm";
import {
  CreateSessionBody,
  GetSessionParams,
  DeleteSessionParams,
} from "@workspace/api-zod";
import { resolveSessionTitle } from "../lib/sessionTitle";
import { requirePositiveInt } from "../lib/errorHandler";

const router = Router();

router.get("/", async (req, res) => {
  const sessions = await db.select().from(sessionsTable).orderBy(desc(sessionsTable.createdAt));

  const result = await Promise.all(
    sessions.map(async (session) => {
      const [agent] = await db.select().from(agentsTable).where(eq(agentsTable.id, session.agentId));
      const [msgCount] = await db.select({ count: count() }).from(messagesTable).where(eq(messagesTable.sessionId, session.id));

      return {
        ...session,
        createdAt: session.createdAt.toISOString(),
        lastMessageAt: session.lastMessageAt ? session.lastMessageAt.toISOString() : null,
        agentName: agent?.name ?? "Unknown",
        agentModel: agent?.model ?? "Unknown",
        agentAvatarColor: agent?.avatarColor ?? "#888",
        messageCount: msgCount?.count ?? 0,
      };
    })
  );

  res.json(result);
});

router.post("/", async (req, res) => {
  const body = CreateSessionBody.parse(req.body);
  const [agent] = await db.select().from(agentsTable).where(eq(agentsTable.id, body.agentId));
  if (!agent) {
    res.status(404).json({ error: "Agent not found" });
    return;
  }

  const title = resolveSessionTitle(body.title, agent.name);
  const [session] = await db.insert(sessionsTable).values({
    title,
    agentId: body.agentId,
  }).returning();

  await db.insert(activityTable).values({
    type: "session_created",
    description: `New session started with ${agent.name}`,
    agentId: agent.id,
  });

  res.status(201).json({
    ...session,
    createdAt: session.createdAt.toISOString(),
    lastMessageAt: null,
    agentName: agent.name,
    agentModel: agent.model,
    agentAvatarColor: agent.avatarColor,
    messageCount: 0,
  });
});

router.get("/:id", async (req, res) => {
  const { id: rawId } = GetSessionParams.parse({ id: Number(req.params.id) });
  const id = requirePositiveInt(rawId);
  const [session] = await db.select().from(sessionsTable).where(eq(sessionsTable.id, id));
  if (!session) {
    res.status(404).json({ error: "Session not found" });
    return;
  }

  const [agent] = await db.select().from(agentsTable).where(eq(agentsTable.id, session.agentId));
  const [msgCount] = await db.select({ count: count() }).from(messagesTable).where(eq(messagesTable.sessionId, session.id));

  res.json({
    ...session,
    createdAt: session.createdAt.toISOString(),
    lastMessageAt: session.lastMessageAt ? session.lastMessageAt.toISOString() : null,
    agentName: agent?.name ?? "Unknown",
    agentModel: agent?.model ?? "Unknown",
    agentAvatarColor: agent?.avatarColor ?? "#888",
    messageCount: msgCount?.count ?? 0,
  });
});

router.delete("/:id", async (req, res) => {
  const { id: rawId } = DeleteSessionParams.parse({ id: Number(req.params.id) });
  const id = requirePositiveInt(rawId);
  await db.delete(sessionsTable).where(eq(sessionsTable.id, id));
  res.status(204).send();
});

export default router;
