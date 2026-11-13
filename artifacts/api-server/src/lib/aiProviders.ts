import Anthropic from "@anthropic-ai/sdk";
import { GoogleGenerativeAI } from "@google/generative-ai";
import OpenAI from "openai";
import type { ChatTurn } from "./chatContext.ts";
import { credentialsForModel } from "./models.ts";

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
  const credentials = credentialsForModel(request.model, process.env);

  if (credentials.provider === "openai" || credentials.provider === "hermes") {
    const client = new OpenAI({
      apiKey: credentials.apiKey,
      ...(credentials.baseURL ? { baseURL: credentials.baseURL } : {}),
    });
    const completion = await client.chat.completions.create({
      model: credentials.model,
      messages: [
        { role: "system", content: request.systemPrompt },
        ...messages,
      ],
    });

    return requireTextResponse(
      completion.choices[0]?.message.content,
      credentials.provider === "hermes" ? "Hermes" : "OpenAI",
    );
  }

  if (credentials.provider === "anthropic") {
    const client = new Anthropic({ apiKey: credentials.apiKey });
    const message = await client.messages.create({
      model: credentials.model,
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

  const client = new GoogleGenerativeAI(credentials.apiKey);
  const generative = client.getGenerativeModel({
    model: credentials.model,
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
