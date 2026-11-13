export const MAX_SESSION_TITLE = 120;

export function resolveSessionTitle(requested: string | undefined, agentName: string): string {
  const title = requested?.trim();
  if (!title) return `Session with ${agentName}`;
  return title.slice(0, MAX_SESSION_TITLE);
}
