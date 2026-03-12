import { NextRequest, NextResponse } from "next/server";
import { geminiModel } from "@/lib/gemini";
import { AgentCanvas, GenerateRequest, ALLOWED_INDUSTRIES, geminiCanvasSchema } from "@/lib/types";

export const maxDuration = 60;

const SYSTEM_PROMPT = `You are an AI Agent strategist. Given a job function and industry, generate a structured Agent Use-Case Canvas. For each section, provide actionable, specific bullet points — not generic advice. Tailor everything to the exact role and industry provided. Use markdown bullet lists within each section.`;

export async function POST(req: NextRequest) {
  let body: GenerateRequest;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const { jobFunction, industry } = body;

  if (!jobFunction || typeof jobFunction !== "string" || jobFunction.trim().length === 0 || jobFunction.trim().length > 200) {
    return NextResponse.json(
      { error: "Job function is required and must be 200 characters or fewer." },
      { status: 400 }
    );
  }

  if (!ALLOWED_INDUSTRIES.includes(industry as typeof ALLOWED_INDUSTRIES[number])) {
    return NextResponse.json({ error: "Invalid industry value." }, { status: 400 });
  }

  const userPrompt = `Job Function: ${jobFunction.trim()}
Industry: ${industry}

Generate an Agent Use-Case Canvas with these 8 sections:
1. Workflow Steps — key steps in this person's typical workday/week
2. Repetitive Tasks — manual, time-consuming tasks ripe for automation
3. AI Intervention Points — specific moments where an AI agent adds value
4. Suggested Tools — specific AI tools/platforms suited to this role
5. Data Sources — data inputs the AI agent would need access to
6. Guardrails — risks, ethical limits, and human-in-the-loop requirements
7. Success Metrics — how to measure if the AI agent is working
8. Quick Wins — 2-3 low-effort, high-impact starting points`;

  try {
    const result = await geminiModel.generateContent({
      systemInstruction: SYSTEM_PROMPT,
      contents: [{ role: "user", parts: [{ text: userPrompt }] }],
      generationConfig: {
        responseMimeType: "application/json",
        responseSchema: geminiCanvasSchema,
      },
    });

    const text = result.response.text();
    const canvas: AgentCanvas = JSON.parse(text);

    return NextResponse.json({ canvas });
  } catch (err) {
    console.error("Gemini error:", err);
    return NextResponse.json(
      { error: "Failed to generate canvas. Please try again." },
      { status: 500 }
    );
  }
}
