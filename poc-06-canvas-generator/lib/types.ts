import { SchemaType, Schema } from "@google/generative-ai";

export interface AgentCanvas {
  workflow_steps: string;
  repetitive_tasks: string;
  ai_intervention_points: string;
  suggested_tools: string;
  data_sources: string;
  guardrails: string;
  success_metrics: string;
  quick_wins: string;
}

export interface GenerateRequest {
  jobFunction: string;
  industry: string;
}

export interface GenerateResponse {
  canvas: AgentCanvas;
}

export const ALLOWED_INDUSTRIES = [
  "Ecommerce",
  "Retail",
  "Logistics",
  "Manufacturing",
  "Healthcare",
  "Finance",
  "HR/People Ops",
  "Marketing",
  "Customer Support",
  "Other",
] as const;

export type Industry = typeof ALLOWED_INDUSTRIES[number];

export const geminiCanvasSchema: Schema = {
  type: SchemaType.OBJECT,
  properties: {
    workflow_steps:          { type: SchemaType.STRING },
    repetitive_tasks:        { type: SchemaType.STRING },
    ai_intervention_points:  { type: SchemaType.STRING },
    suggested_tools:         { type: SchemaType.STRING },
    data_sources:            { type: SchemaType.STRING },
    guardrails:              { type: SchemaType.STRING },
    success_metrics:         { type: SchemaType.STRING },
    quick_wins:              { type: SchemaType.STRING },
  },
  required: [
    "workflow_steps", "repetitive_tasks", "ai_intervention_points",
    "suggested_tools", "data_sources", "guardrails",
    "success_metrics", "quick_wins",
  ],
};

export const CANVAS_SECTION_KEYS: (keyof AgentCanvas)[] = [
  "workflow_steps",
  "repetitive_tasks",
  "ai_intervention_points",
  "suggested_tools",
  "data_sources",
  "guardrails",
  "success_metrics",
  "quick_wins",
];

export const SECTION_LABELS: Record<keyof AgentCanvas, string> = {
  workflow_steps:         "Workflow Steps",
  repetitive_tasks:       "Repetitive Tasks",
  ai_intervention_points: "AI Intervention Points",
  suggested_tools:        "Suggested Tools",
  data_sources:           "Data Sources",
  guardrails:             "Guardrails",
  success_metrics:        "Success Metrics",
  quick_wins:             "Quick Wins",
};
