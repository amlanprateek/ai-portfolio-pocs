# POC 6 — Agent Use-Case Canvas Generator: Design Spec

## Overview

**Problem:** Organizations need structured frameworks to evaluate where AI agents add value across job functions.

**Solution:** Input a job function (free text) + industry (dropdown) → Gemini generates an 8-section Agent Use-Case Canvas with actionable, role-specific content. Exportable as Markdown.

**Stack:** Next.js 14 App Router + TypeScript + Tailwind CSS + Gemini 1.5 Flash → Vercel

---

## Architecture

```
Browser
  └── Job function input (free text) + Industry dropdown
          ↓
  Next.js API Route /api/generate
          ↓
  Gemini 1.5 Flash (JSON envelope, markdown-per-section)
          ↓
  { canvas: AgentCanvas } — 8 keys, each a markdown string
          ↓
  8-tab canvas UI + Markdown export
```

- Stateless — no database, no auth
- `export const maxDuration = 60` on API route (Vercel Hobby plan hard ceiling — Gemini calls exceeding 60s return a 504 with no JSON body; the `error` state catches this as a network error)
- Same Gemini SDK pattern as POC 1: `responseMimeType: "application/json"` + `responseSchema`

---

## Data Schema

```typescript
interface AgentCanvas {
  workflow_steps: string;
  repetitive_tasks: string;
  ai_intervention_points: string;
  suggested_tools: string;
  data_sources: string;
  guardrails: string;
  success_metrics: string;
  quick_wins: string;
}

interface GenerateRequest {
  jobFunction: string;
  industry: string;
}

interface GenerateResponse {
  canvas: AgentCanvas;
}
// Error response shape: { error: string }
```

**`ALLOWED_INDUSTRIES` constant** (defined in `lib/types.ts`, shared by frontend dropdown and server validation):
```typescript
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
```

**Gemini `responseSchema`** (in `lib/types.ts`, typed as `Schema` from `@google/generative-ai`):
```typescript
import { SchemaType, Schema } from "@google/generative-ai";

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
```

**Canonical tab order** — defined as an ordered array in `lib/types.ts`; this is the authoritative order for tabs and export:
```typescript
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
```

**Section label mapping** (lookup by key — do not rely on object key order for UI ordering; use `CANVAS_SECTION_KEYS` instead):
```typescript
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
```

---

## File Structure

```
poc-06-canvas-generator/
  app/
    page.tsx                — owns all state: jobFunction, industry, appState, canvas
    layout.tsx              — title="Agent Canvas Generator", description="Generate an AI Agent Use-Case Canvas for any job function."
    globals.css
    api/generate/route.ts   — validates input, builds prompt, calls Gemini, returns { canvas }
  components/
    job-input.tsx           — free text field + industry dropdown + "Generate Canvas" button
    canvas-tabs.tsx         — 8-tab display; owns activeTab state internally; renders via react-markdown
    export-bar.tsx          — assembles .md, "Copy Markdown" + "Download .md" buttons
  lib/
    types.ts                — all types, constants, and schema
    gemini.ts               — singleton GenerativeModel instantiated at module load (per cold-start); reads process.env.GEMINI_API_KEY
  prompts/
    system.md               — static documentation artifact only; never imported at runtime.
                              route.ts is the source of truth; these may drift.
  .env                      — GEMINI_API_KEY=<real key> (gitignored)
  .env.example              — GEMINI_API_KEY=your_key_here (committed)
  .gitignore
```

---

## UI Flow

**App states:** `input → generating → canvas → error`

### `input` state
- Full-width text field:
  - placeholder: "e.g. Purchasing Manager at a fashion ecommerce brand"
  - `maxLength={200}` attribute on `<input>`
  - Max length: 200 characters inclusive (≤ 200). No character counter displayed. On submit, if `jobFunction.trim().length > 200`, show inline error: "Job function must be 200 characters or fewer." Do not silently truncate.
- Industry dropdown populated from `ALLOWED_INDUSTRIES`; default selection: "Ecommerce"
- "Generate Canvas" button:
  - Disabled if `jobFunction.trim()` is empty
  - On click: immediately disabled (prevent double-submit) then transitions to `generating` state
- Accessibility: out of scope for this POC

### `generating` state
- Shimmer skeleton (8 blocks representing the tab area)
- "Generating your Agent Canvas..." label

### `canvas` state
- Tabs rendered in `CANVAS_SECTION_KEYS` order using `SECTION_LABELS` for display
- `canvas-tabs.tsx` owns `activeTab` state internally (default: `"workflow_steps"`)
- On "Generate Another" reset, the component unmounts and remounts, naturally resetting to the default tab
- Active tab content rendered via `react-markdown`
- Export bar at bottom:
  - "Copy Markdown": copies assembled markdown to clipboard
  - "Download .md": downloads file named `agent-canvas.md`
  - Assembly format: sections joined by `\n\n`, each section as `## {SECTION_LABELS[key]}\n\n{canvas[key]}`
- "Generate Another" button: resets `appState` to `input`, clears `canvas`

### `error` state
- Display the `error` string from the API response if available; otherwise show generic fallback: "Something went wrong. Please try again."
- For network-level failures (e.g., 504 timeout with no JSON body): show "Request timed out. Please try again."
- "Try Again" button resets to `input` state (preserves the jobFunction and industry values the user entered)

---

## Prompt Design

**System prompt** (inlined as `SYSTEM_PROMPT` constant in `route.ts`; text also copied to `prompts/system.md` for portfolio transparency — `route.ts` is source of truth and these may drift):

> You are an AI Agent strategist. Given a job function and industry, generate a structured Agent Use-Case Canvas. For each section, provide actionable, specific bullet points — not generic advice. Tailor everything to the exact role and industry provided. Use markdown bullet lists within each section.

**User prompt template:**
```
Job Function: {jobFunction}
Industry: {industry}

Generate an Agent Use-Case Canvas with these 8 sections:
1. Workflow Steps — key steps in this person's typical workday/week
2. Repetitive Tasks — manual, time-consuming tasks ripe for automation
3. AI Intervention Points — specific moments where an AI agent adds value
4. Suggested Tools — specific AI tools/platforms suited to this role
5. Data Sources — data inputs the AI agent would need access to
6. Guardrails — risks, ethical limits, and human-in-the-loop requirements
7. Success Metrics — how to measure if the AI agent is working
8. Quick Wins — 2-3 low-effort, high-impact starting points
```

---

## API Route

**`POST /api/generate`**

Request body: `{ jobFunction: string; industry: string }`

Server-side validation (manual — no Zod or validation library):
- `jobFunction`: non-empty after trim, ≤ 200 characters → `400 { error: "Job function is required and must be 200 characters or fewer." }`
- `industry`: must be a value in `ALLOWED_INDUSTRIES` (strict match, no silent fallback) → `400 { error: "Invalid industry value." }`
- Input passed to Gemini prompt after trim; no HTML escaping needed (never rendered as HTML server-side; `react-markdown` safely renders Gemini output on the client)

On success: `200 { canvas: AgentCanvas }`
On validation error: `400 { error: "..." }`
On Gemini error: `500 { error: "..." }`

---

## Security & Deployment

- `GEMINI_API_KEY` in `.env` (gitignored); set as Vercel environment variable for production
- `.env.example` contains only `GEMINI_API_KEY=your_key_here`
- No user data stored — fully stateless
- Gemini output rendered via `react-markdown` — safe by default, no `dangerouslySetInnerHTML`
- Rate limiting: none (acceptable for a POC; Gemini free tier quota is the natural throttle)
- `export const maxDuration = 60` — Vercel Hobby hard ceiling; 504s have no JSON body and are caught as network errors → `error` state

---

## Key Decisions

| Decision | Choice | Reason |
|----------|--------|--------|
| Output format | JSON envelope + markdown-per-section | Reliable parsing + rich per-section formatting |
| Streaming | No | Mutually exclusive with structured JSON in Gemini SDK |
| Loading state | Shimmer skeleton | Consistent with POC 1 pattern |
| Markdown renderer | `react-markdown` | Safe by default, no `dangerouslySetInnerHTML`, lightweight |
| Tab ordering | `CANVAS_SECTION_KEYS` array | Explicit, not reliant on object key insertion order |
| Export | Markdown only (`agent-canvas.md`) | Zero dependencies; browser print covers PDF use case |
| Input | Free text + industry dropdown | Gives Gemini enough context without over-constraining user |
| Prompt location | Inlined in `route.ts` | `fs.readFileSync` fails on Vercel serverless; `prompts/system.md` for visibility only |
| Validation library | None (manual) | No Zod or equivalent — simple checks only |
| Invalid industry on server | Return 400 | Strict, no silent fallback |
| Gemini singleton | Module-level (per cold-start) | Fine for a stateless POC; no connection pooling needed |
| Accessibility | Out of scope | Portfolio POC |
