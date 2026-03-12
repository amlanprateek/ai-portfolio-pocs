# Purchase Order Copilot

AI-powered purchase order recommendations for ecommerce inventory management. Upload your inventory CSV and get structured PO recommendations grouped by supplier, with per-SKU urgency scoring and natural language justification.

## Live Demo

**https://ai-portfolio-pocs.vercel.app/**

## How It Works

1. **Upload** your inventory CSV (or click "Try with Sample Data")
2. **Generate** — Gemini 1.5 Flash analyzes stock levels, sales velocity, lead times, and MOQs
3. **Review & Edit** — adjust quantities inline, dismiss SKUs, read AI justifications
4. **Download** — export as CSV per supplier or combined

## Architecture

```
Browser (CSV parsing + UI)
        ↓
Next.js API Route /api/generate
        ↓
Gemini 1.5 Flash (structured JSON output mode)
        ↓
Supplier-grouped recommendation tables
```

- **Frontend:** Next.js 14 (App Router) + TypeScript + Tailwind CSS
- **AI:** Gemini 1.5 Flash with structured JSON output mode for reliable schema-conformant responses
- **CSV Parsing:** PapaParse (client-side, no file upload to server)
- **Hosting:** Vercel (free tier)
- **Database:** None — fully stateless

## CSV Format

| Column | Type | Description |
|--------|------|-------------|
| `sku` | string | Unique SKU identifier |
| `product_name` | string | Product display name |
| `current_stock` | number | Current inventory quantity |
| `daily_sales_velocity` | number | Average daily units sold |
| `supplier_moq` | number | Minimum order quantity from supplier |
| `unit_cost` | number | Cost per unit ($) |
| `lead_time_days` | number | Supplier lead time in days |
| `supplier_name` | string | Supplier name |
| `category` | string | Product category |

A sample CSV with 25 SKUs across 4 suppliers is in `sample-data/sample-inventory.csv`.

## Prompt Templates

Prompt templates are in `prompts/` — fully visible for transparency:

- `prompts/system.md` — defines PO reasoning rules (urgency thresholds, MOQ handling, 30-day coverage horizon)
- `prompts/user.md` — user prompt template

## Setup

```bash
npm install
cp .env.example .env
# Add your Gemini API key to .env
npm run dev
```

Get a free Gemini API key (no credit card required) at [Google AI Studio](https://aistudio.google.com/apikey).

## Deploying to Vercel

1. Push this folder to a GitHub repo
2. Import the repo in [Vercel](https://vercel.com)
3. Add `GEMINI_API_KEY` under **Settings → Environment Variables**
4. Deploy

## Tech Stack

- Next.js 14 (App Router + TypeScript)
- Tailwind CSS
- Gemini 1.5 Flash via `@google/generative-ai`
- PapaParse
