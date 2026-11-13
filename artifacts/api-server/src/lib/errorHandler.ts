import type { ErrorRequestHandler } from "express";

type Issue = { message?: unknown };

export class ClientError extends Error {
  readonly status = 400;

  constructor(message: string) {
    super(message);
    this.name = "ClientError";
  }
}

export function requirePositiveInt(value: number, label = "id"): number {
  if (!Number.isInteger(value) || value <= 0) {
    throw new ClientError(`${label} must be a positive integer`);
  }
  return value;
}

function clientErrorMessage(err: unknown): string | undefined {
  if (err instanceof ClientError) return err.message;
  if (typeof err !== "object" || err === null) return undefined;
  const record = err as { status?: unknown; statusCode?: unknown; type?: unknown };
  const status = typeof record.status === "number"
    ? record.status
    : typeof record.statusCode === "number"
      ? record.statusCode
      : undefined;
  if (status === 400 || record.type === "entity.parse.failed") return "Invalid JSON body.";
  return undefined;
}

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

  const clientMessage = clientErrorMessage(err);
  if (clientMessage) {
    res.status(400).json({ error: clientMessage });
    return;
  }

  req.log.error({ err }, "Unhandled error");
  res.status(500).json({ error: "Internal server error" });
};
