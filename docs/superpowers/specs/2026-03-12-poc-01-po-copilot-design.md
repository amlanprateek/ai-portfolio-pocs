# POC 01 — Purchase Order Copilot: Design Spec

## Overview

A single-page Next.js app that takes a CSV of inventory data and uses Gemini 1.5 Flash to generate structured purchase order recommendations grouped by supplier. Deployed on Vercel (free tier). Fully stateless — no database, no auth.

**Goal:** Demonstrate AI-assisted supply chain decision-making for an ecommerce ops team. Portfolio piece for AI PM interviews.

---

## Architecture & Data Flow

```
User uploads CSV (or clicks "Try Sample Data")
        ↓
Browser parses CSV via papaparse → validates columns + data types → shows preview table
        ↓
User clicks "Generate PO Recommendations"
        ↓
POST /api/generate
Body: { "rows": [ { "sku": "TEE-BLK-M", "product_name": "...", ... }, ... ] }
        ↓
API route validates row count (max 200) → builds prompt → calls Gemini 1.5 Flash
with structured JSON output mode (responseMimeType + responseSchema)
        ↓
Show shimmer/loading state while waiting → parse full JSON response on completion
        ↓
Frontend renders supplier-grouped tables → user can edit quantities / dismiss SKUs
        ↓
User clicks "Download PO" → exports as CSV (combined or per-supplier)
```

### Key Decisions

- CSV parsing happens client-side (no file storage needed, fully stateless)
- Gemini API key stays server-side in the API route (`process.env.GEMINI_API_KEY`)
- Gemini's structured JSON output mode (`responseMimeType: "application/json"` + `responseSchema`) guarantees valid JSON conforming to our schema
- **No streaming of partial results.** Structured output mode returns valid JSON only as a complete response. The UI shows a shimmer/loading state during generation and renders the full result once received. This is simpler and more reliable than attempting to parse partial JSON.
- No database — everything is ephemeral
- **Max 200 rows** per CSV upload. Vercel free tier allows 60-second function timeout for streaming; ~200 SKUs completes well within this limit with Gemini 1.5 Flash.

### API Contract

```
POST /api/generate
Content-Type: application/json

Request Body:
{
  "rows": [
    {
      "sku": "TEE-BLK-M",
      "product_name": "Black Basic Tee - Medium",
      "current_stock": 45,
      "daily_sales_velocity": 12.5,
      "supplier_moq": 100,
      "unit_cost": 8.50,
      "lead_time_days": 14,
      "supplier_name": "Apex Textiles",
      "category": "Tops"
    }
  ]
}

Response (200): JSON body matching the output schema (see Gemini Output Schema section)

Error Response (non-200):
{ "error": "Human-readable error message" }

Status Codes:
  200 — success
  400 — validation error (missing columns, invalid data, row count > 200)
  429 — Gemini rate limit exceeded (forwarded from Gemini API, not locally enforced)
  500 — Gemini API failure or unexpected error

Note: The API route re-validates row count server-side (max 200 rows, returns 400 if exceeded) since client-side checks can be bypassed.
```

---

## Sample Data Schema

### Input CSV (9 columns)

| Column | Type | Example | Validation |
|--------|------|---------|------------|
| `sku` | string | `TEE-BLK-M` | Required, non-empty |
| `product_name` | string | `Black Basic Tee - Medium` | Required, non-empty |
| `current_stock` | int | `45` | Required, >= 0 |
| `daily_sales_velocity` | float | `12.5` | Required, >= 0 |
| `supplier_moq` | int | `100` | Required, > 0 |
| `unit_cost` | float | `8.50` | Required, > 0 |
| `lead_time_days` | int | `14` | Required, > 0 |
| `supplier_name` | string | `Apex Textiles` | Required, non-empty |
| `category` | string | `Tops` | Required, non-empty |

CSV format: comma-delimited, UTF-8 encoding. Papaparse handles BOM markers and common encoding variations automatically.

### Sample Dataset

~20-25 SKUs across 3-4 suppliers in an ecommerce fashion context. Mix of urgency levels:
- Some nearly out of stock (HIGH urgency)
- Some overstocked (LOW urgency)
- Some right at MOQ edge cases
- At least one SKU with `daily_sales_velocity: 0` (new/seasonal item)

`sample-data/sample-inventory.csv` is the canonical sample dataset. `lib/sample-data.ts` imports this data as a parsed array for the "Try Sample Data" button.

### Gemini Output Schema (per supplier group)

```json
{
  "purchase_orders": [
    {
      "supplier_name": "Apex Textiles",
      "summary": {
        "total_skus": 5,
        "total_order_cost": 4250.00,
        "moq_met": true
      },
      "recommendations": [
        {
          "sku": "TEE-BLK-M",
          "product_name": "Black Basic Tee - Medium",
          "days_of_stock_remaining": 3.6,
          "urgency": "HIGH",
          "recommended_order_qty": 200,
          "estimated_cost": 1700.00,
          "justification": "3.6 days of stock at current velocity. Lead time is 14 days — will stock out in ~10 days before replenishment arrives. Ordering 200 units covers 16 days of sales beyond lead time."
        }
      ]
    }
  ]
}
```

`moq_met` is `true` when every SKU's `recommended_order_qty` meets or exceeds that SKU's `supplier_moq`.

### Gemini responseSchema

`lib/types.ts` defines both the TypeScript types and exports a `responseSchema` object compatible with the Gemini SDK's `responseSchema` parameter (subset of OpenAPI 3.0 schema format). The schema enforces the exact structure above with typed enums for `urgency` (`HIGH`, `MEDIUM`, `LOW`).

---

## UI Layout & Components

### Single page, three states:

**State 1 — Upload**
- Hero section: title "Purchase Order Copilot", one-line subtitle
- Two CTAs side by side: "Upload CSV" (file picker) and "Try with Sample Data" (loads built-in dataset)
- After upload/selection: preview table showing raw CSV data (scrollable, max 10 rows visible with "Showing 10 of N rows" indicator)
- "Generate PO Recommendations" button below the preview

**State 2 — Generating**
- Preview table collapses/dims
- Shimmer/skeleton cards shown in the results area (one per anticipated supplier if known, otherwise 3 generic)
- No partial content rendering — wait for full Gemini response

**State 3 — Results & Edit**
- Grouped by supplier, each group is a card:
  - **Supplier header**: name, total SKUs, total cost, MOQ status badge (Met / Not Met)
  - **Table rows**: SKU, product name, days remaining, urgency tag (color-coded + text label), recommended qty (editable input), estimated cost, justification text
  - **Dismiss button** per row (strikes through, excludes from download)
- Editing qty recalculates row cost (`qty * unit_cost`) and supplier total. Input accepts positive integers only. No MOQ re-validation (user override is intentional).
- Sticky bottom bar: "Download All as CSV" and "Download per Supplier" buttons
- "Start Over" link to reset

**Styling:** Tailwind CSS, clean/minimal, light color scheme. Urgency tags use both color and text: red + "HIGH", amber + "MEDIUM", green + "LOW" (accessible without relying on color alone).

### Download CSV Format

**Columns:** `supplier_name`, `sku`, `product_name`, `urgency`, `recommended_order_qty`, `estimated_cost`, `justification`

**Filenames:**
- Combined: `PO_all_YYYY-MM-DD.csv`
- Per-supplier: `PO_{supplier_name}_YYYY-MM-DD.csv`

Dismissed rows are excluded from downloads.

---

## Prompt Design

### System Prompt

```
You are a purchasing operations assistant for an ecommerce company.
Given inventory data, generate purchase order recommendations grouped by supplier.

Rules:
- Calculate days_of_stock_remaining = current_stock / daily_sales_velocity
- If daily_sales_velocity is 0, set urgency to LOW and recommended_order_qty to 0 (no sales to deplete stock)
- Flag HIGH urgency if days_of_stock_remaining < lead_time_days
- Flag MEDIUM if days_of_stock_remaining < lead_time_days * 1.5
- Flag LOW otherwise
- Recommended order qty must meet or exceed supplier MOQ
- Order enough to cover at least 30 days of sales beyond lead time
- Group recommendations by supplier_name
- Include per-SKU justification explaining the reasoning

Respond ONLY with valid JSON matching the provided schema.
```

### User Prompt

```
Here is the current inventory data:

{csv_data_as_markdown_table}

Generate purchase order recommendations as JSON using this schema:
{output_schema}
```

### Prompt Decisions
- Explicit calculation rules so Gemini's reasoning is auditable (not a black box)
- Zero-velocity edge case handled explicitly in prompt rules
- 30-day coverage horizon — sensible ecommerce default
- JSON-only response keeps parsing reliable
- Structured output mode enforced via Gemini SDK config (`responseMimeType` + `responseSchema`)
- Prompts stored in `prompts/system.md` and `prompts/user.md` for portfolio visibility

---

## Error Handling

Minimal, covering only what would break the demo:

| Scenario | Behavior |
|----------|----------|
| Missing CSV columns | Inline error listing missing columns. Don't call Gemini. |
| Empty CSV | "No data found" message. Don't call Gemini. |
| Invalid data values (negative numbers, non-numeric) | Inline error on specific rows/columns. Don't call Gemini. |
| CSV exceeds 200 rows | "CSV exceeds 200 rows. Please reduce your dataset." Don't call Gemini. |
| Gemini API failure | Toast/banner: "Failed to generate recommendations. Please try again." + retry button. |
| Malformed JSON response | Catch parse error, show "Unexpected response format" + retry option. |
| Rate limiting (15 RPM free tier) | "Rate limit reached, please wait a moment." |

No auth, no session management, no data persistence.

---

## File Structure

```
poc-01-po-copilot/
├── app/
│   ├── layout.tsx              # Root layout, fonts, metadata
│   ├── page.tsx                # Main single-page app
│   ├── api/
│   │   └── generate/
│   │       └── route.ts        # POST handler — validates, builds prompt, calls Gemini
│   └── globals.css             # Tailwind base styles
├── components/
│   ├── csv-upload.tsx          # File picker + drag-and-drop + "Try Sample Data" button
│   ├── data-preview.tsx        # Raw CSV preview table
│   ├── po-results.tsx          # Supplier-grouped recommendation cards
│   ├── po-table-row.tsx        # Single SKU row with editable qty + dismiss
│   └── download-bar.tsx        # Sticky bottom bar with export buttons
├── lib/
│   ├── gemini.ts               # Gemini client setup
│   ├── csv-parser.ts           # Parse + validate CSV columns and data types
│   ├── sample-data.ts          # Re-exports sample-inventory.csv as parsed array
│   └── types.ts                # TypeScript types + Gemini responseSchema object
├── prompts/
│   ├── system.md               # System prompt (visible in repo)
│   └── user.md                 # User prompt template
├── sample-data/
│   └── sample-inventory.csv    # Canonical sample dataset (downloadable)
├── public/
│   └── demo.gif                # Placeholder for 60-second recording
├── .env.example                # GEMINI_API_KEY=your_key_here
├── package.json
├── tailwind.config.ts
├── tsconfig.json
├── next.config.ts
└── README.md
```

### Dependencies
- `next@14` (App Router)
- `@google/generative-ai` (Gemini SDK)
- `papaparse` (CSV parsing) + `@types/papaparse`
- `tailwindcss` + `postcss` + `autoprefixer`
- No other external libraries

---

## Deployment

- **Hosting:** Vercel free tier (Hobby plan)
- **Timeout:** Vercel Hobby tier requires explicit `maxDuration` config. Add `export const maxDuration = 60;` in `app/api/generate/route.ts`. Typical response time for ~200 SKUs with Gemini 1.5 Flash is 5-15 seconds.
- **API key:** Set `GEMINI_API_KEY` in Vercel dashboard → Environment Variables
- **Build:** Standard `next build` — no special config needed
- **Domain:** Default Vercel subdomain (e.g., `po-copilot.vercel.app`)

---

## Security

- `.env` is in `.gitignore` — API keys never committed
- `.env.example` contains only placeholder values
- API key accessed server-side only via `process.env.GEMINI_API_KEY` in the API route
- No user data persisted anywhere
- CSV data sent to Gemini API but not stored

---

## Interview Talking Points

- **Problem framing:** Manual PO creation in ecommerce is slow, error-prone, and doesn't adapt to velocity changes
- **Why AI:** The LLM's value is twofold: (1) natural language justifications that explain reasoning to non-technical buyers, and (2) handling edge cases and nuanced prioritization beyond what explicit rules cover. A deterministic algorithm could compute urgency, but couldn't generate contextual explanations or adapt to ambiguous scenarios.
- **Architecture choices:** Stateless design, structured output for reliability, editable results for human-in-the-loop
- **Scale considerations:** At production scale, would add batch processing for large catalogs, historical velocity trends, integration with ERP/WMS APIs, and approval workflows
