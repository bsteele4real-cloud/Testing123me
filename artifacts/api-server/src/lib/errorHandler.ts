import type { ErrorRequestHandler } from "express";

type Issue = { message?: unknown };

export function isZodError(err: unknown): err is Error & { issues: Issue[] } {
  if (!(err instanceof Error) || err.name !== "ZodError") return false;
  const issues = (err as { issues?: unknown }).issues;
  return Array.isArray(issues);
}

export const errorHandler: ErrorRequestHandler = (err, req, res, next) => {
  if (res.headersSent) {
    next(err);
    return;
  }

  if (isZodError(err)) {
    const message = err.issues.find((issue) => typeof issue.message === "string")?.message ?? "Invalid request";
    res.status(400).json({ error: message });
    return;
  }

  req.log.error({ err }, "Unhandled error");
  res.status(500).json({ error: "Internal server error" });
};
