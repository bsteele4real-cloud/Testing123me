import Anthropic from "@anthropic-ai/sdk";
import { GoogleGenerativeAI } from "@google/generative-ai";
import OpenAI from "openai";

const MAX_TOKENS = 1_024;

function requireEnvironmentVariable(name: string): string {
  const value = process.env[name];

  if (!value) {
    throw new Error(`${name} is required to use this model but is not configured.`);
  }

  return value;
}

function requireTextResponse(content: string | null | undefined, provider: string): string {
  const text = content?.trim();

  if (!text) {
    throw new Error(`${provider} returned an empty response.`);
  }

  return text;
}

export async function getAIResponse(model: string, userMessage: string): Promise<string> {
  if (model.startsWith("gpt-")) {
    const client = new OpenAI({
      apiKey: requireEnvironmentVariable("OPENAI_API_KEY"),
    });
    const completion = await client.chat.completions.create({
      model,
      messages: [{ role: "user", content: userMessage }],
    });

    return requireTextResponse(completion.choices[0]?.message.content, "OpenAI");
  }

  if (model.startsWith("claude-")) {
    const client = new Anthropic({
      apiKey: requireEnvironmentVariable("ANTHROPIC_API_KEY"),
    });
    const message = await client.messages.create({
      model,
      max_tokens: MAX_TOKENS,
      messages: [{ role: "user", content: userMessage }],
    });
    const text = message.content
      .filter((block) => block.type === "text")
      .map((block) => block.text)
      .join("")
      .trim();

    return requireTextResponse(text, "Anthropic");
  }

  if (model.startsWith("gemini-")) {
    const client = new GoogleGenerativeAI(
      requireEnvironmentVariable("GOOGLE_AI_API_KEY"),
    );
    const result = await client.getGenerativeModel({ model }).generateContent(userMessage);

    return requireTextResponse(result.response.text(), "Google Gemini");
  }

  if (model === "hermes-2-pro") {
    const client = new OpenAI({
      apiKey: requireEnvironmentVariable("OPENAI_API_KEY"),
      baseURL: requireEnvironmentVariable("HERMES_BASE_URL"),
    });
    const completion = await client.chat.completions.create({
      model,
      messages: [{ role: "user", content: userMessage }],
    });

    return requireTextResponse(completion.choices[0]?.message.content, "Hermes");
  }

  throw new Error(`Model "${model}" is not configured.`);
}