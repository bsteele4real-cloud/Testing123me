import { Router } from "express";
import { db } from "@workspace/db";
import { agentsTable, sessionsTable, messagesTable, activityTable } from "@workspace/db";
import { eq, count, sql } from "drizzle-orm";
import {
  CreateAgentBody,
  UpdateAgentBody,
  UpdateAgentParams,
  DeleteAgentParams,
  GetAgentParams,
} from "@workspace/api-zod";

const router = Router();

router.get("/", async (req, res) => {
  const agents = await db.select().from(agentsTable).orderBy(agentsTable.createdAt);

  const result = await Promise.all(
    agents.map(async (agent) => {
      const [sessionCount] = await db
        .select({ count: count() })
        .from(sessionsTable)
        .where(eq(sessionsTable.agentId, agent.id));

      const [msgCount] = await db
        .select({ count: count() })
        .from(messagesTable)
        .leftJoin(sessionsTable, eq(messagesTable.sessionId, sessionsTable.id))
        .where(eq(sessionsTable.agentId, agent.id));

      return {
        ...agent,
        createdAt: agent.createdAt.toISOString(),
        totalSessions: sessionCount?.count ?? 0,
        totalMessages: msgCount?.count ?? 0,
      };
    })
  );

  res.json(result);
});

router.post("/", async (req, res) => {
  const body = CreateAgentBody.parse(req.body);
  const [agent] = await db.insert(agentsTable).values({
    name: body.name,
    model: body.model,
    description: body.description ?? null,
    avatarColor: body.avatarColor,
    status: "offline",
  }).returning();

  await db.insert(activityTable).values({
    type: "agent_status_changed",
    description: `Agent ${agent.name} was created`,
    agentId: agent.id,
  });

  res.status(201).json({ ...agent, createdAt: agent.createdAt.toISOString(), totalSessions: 0, totalMessages: 0 });
});

router.get("/:id", async (req, res) => {
  const { id } = GetAgentParams.parse({ id: Number(req.params.id) });
  const [agent] = await db.select().from(agentsTable).where(eq(agentsTable.id, id));
  if (!agent) return res.status(404).json({ error: "Agent not found" });

  const [sessionCount] = await db.select({ count: count() }).from(sessionsTable).where(eq(sessionsTable.agentId, id));
  const [msgCount] = await db
    .select({ count: count() })
    .from(messagesTable)
    .leftJoin(sessionsTable, eq(messagesTable.sessionId, sessionsTable.id))
    .where(eq(sessionsTable.agentId, id));

  res.json({ ...agent, createdAt: agent.createdAt.toISOString(), totalSessions: sessionCount?.count ?? 0, totalMessages: msgCount?.count ?? 0 });
});

router.patch("/:id", async (req, res) => {
  const { id } = UpdateAgentParams.parse({ id: Number(req.params.id) });
  const body = UpdateAgentBody.parse(req.body);

  const [agent] = await db.update(agentsTable)
    .set({
      ...(body.name !== undefined && { name: body.name }),
      ...(body.model !== undefined && { model: body.model }),
      ...(body.status !== undefined && { status: body.status }),
      ...(body.description !== undefined && { description: body.description }),
      ...(body.avatarColor !== undefined && { avatarColor: body.avatarColor }),
    })
    .where(eq(agentsTable.id, id))
    .returning();

  if (!agent) return res.status(404).json({ error: "Agent not found" });

  if (body.status) {
    await db.insert(activityTable).values({
      type: "agent_status_changed",
      description: `Agent ${agent.name} status changed to ${body.status}`,
      agentId: agent.id,
    });
  }

  const [sessionCount] = await db.select({ count: count() }).from(sessionsTable).where(eq(sessionsTable.agentId, id));
  const [msgCount] = await db.select({ count: count() }).from(messagesTable).leftJoin(sessionsTable, eq(messagesTable.sessionId, sessionsTable.id)).where(eq(sessionsTable.agentId, id));

  res.json({ ...agent, createdAt: agent.createdAt.toISOString(), totalSessions: sessionCount?.count ?? 0, totalMessages: msgCount?.count ?? 0 });
});

router.delete("/:id", async (req, res) => {
  const { id } = DeleteAgentParams.parse({ id: Number(req.params.id) });
  await db.delete(agentsTable).where(eq(agentsTable.id, id));
  res.status(204).send();
});

export default router;
