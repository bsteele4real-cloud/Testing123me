import { useHealthCheck, getHealthCheckQueryKey } from "@workspace/api-client-react";
import { Link } from "wouter";

const PROVIDERS = [
  { name: "OpenAI", env: "OPENAI_API_KEY", models: "gpt-6-luna, gpt-6.1-sol" },
  { name: "Anthropic", env: "ANTHROPIC_API_KEY", models: "claude-sonnet-5-5, claude-opus-5-5" },
  { name: "Google Gemini", env: "GOOGLE_AI_API_KEY", models: "gemini-4-hydrogen" },
  { name: "Hermes", env: "HERMES_API_KEY", models: "Hermes-4-70B" },
];

export default function SettingsPage() {
  const health = useHealthCheck({
    query: { queryKey: getHealthCheckQueryKey(), refetchInterval: 30_000 },
  });
  const healthLabel = health.isPending
    ? "Checking"
    : health.isError || health.data?.status !== "ok"
      ? "Unavailable"
      : "Nominal";

  return (
    <div className="flex-1 overflow-auto p-4 md:p-8 bg-background">
      <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
      <p className="text-sm text-muted-foreground mt-1 max-w-2xl">
        Local studio configuration. Secret values stay in the server environment and are not shown here.
      </p>

      <section className="mt-8 max-w-2xl border border-border/50 rounded-md bg-card p-4">
        <h2 className="font-mono text-sm">SYSTEM</h2>
        <p className="mt-2 text-sm">
          Health check: <span className="font-mono">{healthLabel}</span>
        </p>
        <p className="mt-1 text-sm text-muted-foreground">
          Database: <span className="font-mono">DATABASE_URL</span>
        </p>
      </section>

      <section className="mt-6 max-w-2xl border border-border/50 rounded-md bg-card p-4">
        <h2 className="font-mono text-sm">MODEL PROVIDERS</h2>
        <ul className="mt-3 space-y-3">
          {PROVIDERS.map((provider) => (
            <li key={provider.env} className="text-sm">
              <div className="font-medium">{provider.name}</div>
              <div className="font-mono text-muted-foreground">{provider.env}</div>
              <div className="text-muted-foreground">{provider.models}</div>
            </li>
          ))}
        </ul>
        <p className="mt-4 text-sm text-muted-foreground">
          Hermes can override its endpoint with <span className="font-mono">HERMES_BASE_URL</span>.
          When that variable is unset, the server uses the Nous inference API.
        </p>
        <Link href="/agents" className="inline-block mt-4 text-sm text-primary underline">
          Deploy an agent
        </Link>
      </section>
    </div>
  );
}
