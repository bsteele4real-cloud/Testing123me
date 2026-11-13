import { Router, type IRouter } from "express";
import { sql } from "drizzle-orm";
import { db } from "@workspace/db";
import { HealthCheckResponse } from "@workspace/api-zod";
import { readHealth } from "../lib/health";

const router: IRouter = Router();

router.get("/healthz", async (req, res) => {
  const report = await readHealth(async () => {
    await db.execute(sql`select 1`);
  });

  if (report.error) {
    req.log.error({ err: report.error }, "Health check failed");
  }

  res.status(report.httpStatus).json(HealthCheckResponse.parse(report.body));
});

export default router;
