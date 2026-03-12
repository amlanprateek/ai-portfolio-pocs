import { GoogleGenerativeAI, GenerativeModel } from "@google/generative-ai";
import { geminiResponseSchema } from "./types";

let model: GenerativeModel | null = null;

function getModel(): GenerativeModel {
  if (model) return model;

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY environment variable is not set");
  }

  const genAI = new GoogleGenerativeAI(apiKey);
  model = genAI.getGenerativeModel({
    model: "gemini-1.5-flash",
    generationConfig: {
      responseMimeType: "application/json",
      responseSchema: geminiResponseSchema,
    },
  });

  return model;
}

export async function generatePORecommendations(
  systemPrompt: string,
  userPrompt: string
): Promise<string> {
  const geminiModel = getModel();

  const result = await geminiModel.generateContent({
    contents: [{ role: "user", parts: [{ text: userPrompt }] }],
    systemInstruction: { role: "system", parts: [{ text: systemPrompt }] },
  });

  const response = result.response;
  return response.text();
}
