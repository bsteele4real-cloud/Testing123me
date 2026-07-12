import { Router } from "express";
import { db } from "@workspace/db";
import { agentsTable, sessionsTable, messagesTable, tasksTable, activityTable } from "@workspace/db";
import { count, eq, desc } from "drizzle-orm";

const router = Router();

router.get("/dashboard", async (req, res) => {
  const [{ totalAgents }] = await db.select({ totalAgents: count() }).from(agentsTable);
  const [{ onlineAgents }] = await db.select({ onlineAgents: count() }).from(agentsTable).where(eq(agentsTable.status, "online"));
  const [{ totalSessions }] = await db.select({ totalSessions: count() }).from(sessionsTable);
  const [{ totalMessages }] = await db.select({ totalMessages: count() }).from(messagesTable);
  const [{ totalTasks }] = await db.select({ totalTasks: count() }).from(tasksTable);

  const [{ todo }] = await db.select({ todo: count() }).from(tasksTable).where(eq(tasksTable.status, "todo"));
  const [{ in_progress }] = await db.select({ in_progress: count() }).from(tasksTable).where(eq(tasksTable.status, "in_progress"));
  const [{ review }] = await db.select({ review: count() }).from(tasksTable).where(eq(tasksTable.status, "review"));
  const [{ done }] = await db.select({ done: count() }).from(tasksTable).where(eq(tasksTable.status, "done"));

  res.json({
    totalAgents,
    onlineAgents,
    totalSessions,
    totalMessages,
    totalTasks,
    tasksByStatus: { todo, in_progress, review, done },
  });
});

router.get("/activity", async (req, res) => {
  const activities = await db.select().from(activityTable).orderBy(desc(activityTable.createdAt)).limit(20);

  const result = await Promise.all(
    activities.map(async (a) => {
      let agentName = null;
      let agentAvatarColor = null;

      if (a.agentId) {
        const [agent] = await db.select().from(agentsTable).where(eq(agentsTable.id, a.agentId));
        agentName = agent?.name ?? null;
        agentAvatarColor = agent?.avatarColor ?? null;
      }

      return {
        ...a,
        createdAt: a.createdAt.toISOString(),
        agentName,
        agentAvatarColor,
      };
    })
  );

  res.json(result);
});

export default router;
