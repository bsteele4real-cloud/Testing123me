export const DEFAULT_HERMES_BASE_URL = "https://inference-api.nousresearch.com/v1";

export const MODEL_CATALOG = [
  "gpt-6-luna",
  "gpt-6.1-sol",
  "claude-sonnet-5-5",
  "claude-opus-5-5",
  "gemini-4-hydrogen",
  "Hermes-4-70B",
] as const;

const LEGACY_MODEL_ALIASES: Record<string, string> = {
  "gpt-4-turbo": "gpt-6-luna",
  "gpt-4o": "gpt-6-luna",
  "gpt-3.5-turbo": "gpt-6-luna",
  "claude-3-opus": "claude-opus-5-5",
  "claude-3-sonnet": "claude-sonnet-5-5",
  "gemini-1.5-pro": "gemini-4-hydrogen",
  "hermes-2-pro": "Hermes-4-70B",
};

export type ModelProvider = "openai" | "anthropic" | "gemini" | "hermes";

export interface ModelDescription {
  provider: ModelProvider;
  apiKeyEnv: "OPENAI_API_KEY" | "ANTHROPIC_API_KEY" | "GOOGLE_AI_API_KEY" | "HERMES_API_KEY";
  model: string;
}

export function describeModel(model: string): ModelDescription {
  const trimmed = model.trim();
  const resolved = LEGACY_MODEL_ALIASES[trimmed] ?? trimmed;

  if (resolved.startsWith("gpt-")) {
    return { provider: "openai", apiKeyEnv: "OPENAI_API_KEY", model: resolved };
  }

  if (resolved.startsWith("claude-")) {
    return { provider: "anthropic", apiKeyEnv: "ANTHROPIC_API_KEY", model: resolved };
  }

  if (resolved.startsWith("gemini-")) {
    return { provider: "gemini", apiKeyEnv: "GOOGLE_AI_API_KEY", model: resolved };
  }

  if (/^hermes/i.test(resolved)) {
    return { provider: "hermes", apiKeyEnv: "HERMES_API_KEY", model: resolved };
  }

  throw new Error(`Model "${model}" is not configured.`);
}

export function credentialsForModel(
  model: string,
  env: Record<string, string | undefined>,
): ModelDescription & { apiKey: string; baseURL?: string } {
  const described = describeModel(model);
  const apiKey = env[described.apiKeyEnv];

  if (!apiKey) {
    throw new Error(`${described.apiKeyEnv} is required to use this model but is not configured.`);
  }

  if (described.provider === "hermes") {
    return {
      ...described,
      apiKey,
      baseURL: env.HERMES_BASE_URL?.trim() || DEFAULT_HERMES_BASE_URL,
    };
  }

  return { ...described, apiKey };
}
