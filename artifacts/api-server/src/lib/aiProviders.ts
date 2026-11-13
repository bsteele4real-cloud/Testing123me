import Anthropic from "@anthropic-ai/sdk";
import { GoogleGenerativeAI } from "@google/generative-ai";
import OpenAI from "openai";
import type { ChatTurn } from "./chatContext";

const MAX_TOKENS = 1_024;

export interface AIChatRequest {
  model: string;
  systemPrompt: string;
  messages: ChatTurn[];
}

function requireTextResponse(content: string | null | undefined, provider: string): string {
  const text = content?.trim();

  if (!text) {
    throw new Error(`${provider} returned an empty response.`);
  }

  return text;
}

function requireUserEnding(messages: ChatTurn[]): ChatTurn[] {
  const last = messages[messages.length - 1];

  if (!last || last.role !== "user") {
    throw new Error("Chat request must end with a user message.");
  }

  return messages;
}

export async function getAIResponse(request: AIChatRequest): Promise<string> {
  const messages = requireUserEnding(request.messages);
  const model = request.model;

  if (model.startsWith("gpt-")) {
    const client = new OpenAI({
      apiKey: requireEnvironmentVariable("OPENAI_API_KEY"),
    });
    const completion = await client.chat.completions.create({
      model,
      messages: [
        { role: "system", content: request.systemPrompt },
        ...messages,
      ],
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
      system: request.systemPrompt,
      messages,
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
    const generative = client.getGenerativeModel({
      model,
      systemInstruction: request.systemPrompt,
    });
    const prior = messages.slice(0, -1);
    const latest = messages[messages.length - 1]?.content ?? "";
    const result =
      prior.length === 0
        ? await generative.generateContent(latest)
        : await generative
            .startChat({
              history: prior.map((turn) => ({
                role: turn.role === "assistant" ? "model" : "user",
                parts: [{ text: turn.content }],
              })),
            })
            .sendMessage(latest);

    return requireTextResponse(result.response.text(), "Google Gemini");
  }

  if (model === "hermes-2-pro") {
    const client = new OpenAI({
      apiKey: requireEnvironmentVariable("OPENAI_API_KEY"),
      baseURL: requireEnvironmentVariable("HERMES_BASE_URL"),
    });
    const completion = await client.chat.completions.create({
      model,
      messages: [
        { role: "system", content: request.systemPrompt },
        ...messages,
      ],
    });

    return requireTextResponse(completion.choices[0]?.message.content, "Hermes");
  }

  throw new Error(`Model "${model}" is not configured.`);
}

function requireEnvironmentVariable(name: string): string {
  const value = process.env[name];

  if (!value) {
    throw new Error(`${name} is required to use this model but is not configured.`);
  }

  return value;
}
