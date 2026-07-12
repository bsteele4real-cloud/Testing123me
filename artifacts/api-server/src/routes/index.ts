import { Router, type IRouter } from "express";
import healthRouter from "./health";
import agentsRouter from "./agents";
import sessionsRouter from "./sessions";
import messagesRouter from "./messages";
import tasksRouter from "./tasks";
import statsRouter from "./stats";

const router: IRouter = Router();

router.use(healthRouter);
router.use("/agents", agentsRouter);
router.use("/sessions", sessionsRouter);
router.use("/sessions/:id/messages", messagesRouter);
router.use("/tasks", tasksRouter);
router.use("/stats", statsRouter);

export default router;
