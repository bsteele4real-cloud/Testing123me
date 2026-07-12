import { Router } from "express";
import { db } from "@workspace/db";
import { tasksTable, agentsTable, activityTable } from "@workspace/db";
import { eq, desc } from "drizzle-orm";
import {
  CreateTaskBody,
  UpdateTaskBody,
  UpdateTaskParams,
  DeleteTaskParams,
} from "@workspace/api-zod";

const router = Router();

async function enrichTask(task: typeof tasksTable.$inferSelect) {
  let assigneeAgentName = null;
  let assigneeAvatarColor = null;

  if (task.assigneeAgentId) {
    const [agent] = await db.select().from(agentsTable).where(eq(agentsTable.id, task.assigneeAgentId));
    assigneeAgentName = agent?.name ?? null;
    assigneeAvatarColor = agent?.avatarColor ?? null;
  }

  return {
    ...task,
    createdAt: task.createdAt.toISOString(),
    assigneeAgentName,
    assigneeAvatarColor,
  };
}

router.get("/", async (req, res) => {
  const tasks = await db.select().from(tasksTable).orderBy(desc(tasksTable.createdAt));
  const result = await Promise.all(tasks.map(enrichTask));
  res.json(result);
});

router.post("/", async (req, res) => {
  const body = CreateTaskBody.parse(req.body);
  const [task] = await db.insert(tasksTable).values({
    title: body.title,
    status: body.status ?? "todo",
    priority: body.priority ?? "medium",
    assigneeAgentId: body.assigneeAgentId ?? null,
    description: body.description ?? null,
  }).returning();

  await db.insert(activityTable).values({
    type: "task_updated",
    description: `Task "${task.title}" was created`,
    agentId: body.assigneeAgentId ?? null,
  });

  res.status(201).json(await enrichTask(task));
});

router.patch("/:id", async (req, res) => {
  const { id } = UpdateTaskParams.parse({ id: Number(req.params.id) });
  const body = UpdateTaskBody.parse(req.body);

  const [task] = await db.update(tasksTable)
    .set({
      ...(body.title !== undefined && { title: body.title }),
      ...(body.status !== undefined && { status: body.status }),
      ...(body.priority !== undefined && { priority: body.priority }),
      ...(body.assigneeAgentId !== undefined && { assigneeAgentId: body.assigneeAgentId }),
      ...(body.description !== undefined && { description: body.description }),
    })
    .where(eq(tasksTable.id, id))
    .returning();

  if (!task) return res.status(404).json({ error: "Task not found" });

  await db.insert(activityTable).values({
    type: "task_updated",
    description: `Task "${task.title}" updated`,
    agentId: task.assigneeAgentId ?? null,
  });

  res.json(await enrichTask(task));
});

router.delete("/:id", async (req, res) => {
  const { id } = DeleteTaskParams.parse({ id: Number(req.params.id) });
  await db.delete(tasksTable).where(eq(tasksTable.id, id));
  res.status(204).send();
});

export default router;
