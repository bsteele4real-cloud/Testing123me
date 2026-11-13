export interface HealthReport {
  httpStatus: number;
  body: { status: string };
  error?: unknown;
}

export async function readHealth(ping: () => Promise<void>): Promise<HealthReport> {
  try {
    await ping();
    return { httpStatus: 200, body: { status: "ok" } };
  } catch (error) {
    return { httpStatus: 503, body: { status: "unavailable" }, error };
  }
}
