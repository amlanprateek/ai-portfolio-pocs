# AI Portfolio — POC Tracker

> Public portfolio of AI Agent & Automation POCs. Built entirely on free-tier tools (Gemini API, Vercel, Streamlit, Supabase) to demonstrate AI product thinking.

## Status Legend
- `planned` — Idea defined, not started
- `in-progress` — Actively building
- `deployed` — Live and accessible
- `polished` — README, GIF, sample data all complete

---

## POCs

| # | Name | Stack | Status | Live Link | Repo |
|---|------|-------|--------|-----------|------|
| 1 | Purchase Order Copilot | Next.js + Gemini API → Vercel | `deployed` | [Live](https://ai-portfolio-pocs.vercel.app/) | [Repo](https://github.com/amlanprateek/ai-portfolio-pocs) |
| 2 | Marketplace Listing Localizer | Next.js + Gemini API → Vercel | `planned` | — | — |
| 3 | AI Use-Case Prioritization Scorer | Next.js + Gemini API → Vercel | `planned` | — | — |
| 4 | RAG-Based Ecommerce Ops Assistant | Next.js + Gemini API + Supabase pgvector → Vercel | `planned` | — | — |
| 5 | Dynamic Pricing Advisor | Streamlit + Gemini API → Streamlit Cloud | `planned` | — | — |
| 6 | Agent Use-Case Canvas Generator | Next.js + Gemini API → Vercel | `planned` | — | — |

---

## POC Details

### POC 1 — Purchase Order Copilot
**Problem**: Manual PO creation is slow and error-prone for ecommerce ops teams.
**Solution**: Upload CSV of SKUs (stock, velocity, MOQ) → Gemini generates structured PO recommendations with per-SKU justification.
**Key Features**: CSV upload, structured table output, downloadable results, prompt templates visible.
**Gemini Advantage**: Gemini 1.5 Flash handles large CSV context extremely well — better than most free alternatives for tabular reasoning.
**Use Case**: Enterprise supply chain automation for ecommerce operations.

### POC 2 — Marketplace Listing Localizer
**Problem**: Expanding product listings across markets requires cultural/regulatory adaptation.
**Solution**: Paste a listing, select target market (India/UAE/SEA) → get localized version with side-by-side diff showing what changed and why.
**Key Features**: Market selection, diff view, compliance language adaptation, cultural reference swaps.
**Gemini Advantage**: Trained heavily on multilingual and Indian market data — naturally stronger for India/SEA localization than most models.
**Use Case**: Cross-border ecommerce expansion and marketplace compliance.

### POC 3 — AI Use-Case Prioritization Scorer
**Problem**: Teams struggle to identify which workflows benefit most from AI automation.
**Solution**: Describe a business workflow → scored across 5 axes (frequency, effort, AI fit, data availability, ROI) → prioritized recommendation + one-pager brief exportable as markdown.
**Key Features**: Multi-axis scoring, exportable brief, framework-driven output.
**Gemini Advantage**: Gemini's structured JSON output mode makes the scoring table reliable and consistent.
**Use Case**: Helps teams evaluate which business workflows are best suited for AI automation.

### POC 4 — RAG-Based Ecommerce Ops Assistant
**Problem**: Ops teams repeatedly search through SOPs and policy docs for answers.
**Solution**: Upload mock SOPs → Q&A agent answers with source citations using Supabase pgvector RAG.
**Key Features**: Document upload, vector search, cited answers, Supabase pgvector backend.
**Gemini Advantage**: Gemini Embedding API is free and high quality — pairs cleanly with Supabase pgvector without any paid embedding service.
**Use Case**: AI-powered knowledge base for operations teams with source-cited answers.

### POC 5 — Dynamic Pricing Advisor
**Problem**: Pricing decisions require balancing MAP rules, margins, and competitor data.
**Solution**: Input product category + competitor prices (CSV or manual) → Gemini checks MAP compliance, analyzes margin impact → recommendation with step-by-step reasoning shown inline.
**Key Features**: CSV/manual input, chain-of-thought reasoning display, MAP rule checking.
**Gemini Advantage**: Gemini 2.0 Flash Thinking shows chain-of-thought reasoning natively — perfect for building user trust in pricing decisions.
**Use Case**: Transparent AI-assisted pricing with visible chain-of-thought reasoning.

### POC 6 — Agent Use-Case Canvas Generator
**Problem**: Organizations need structured frameworks to evaluate where AI agents add value.
**Solution**: Input a job function (e.g., "Purchasing Manager at a fashion ecommerce brand") → Gemini generates Agent Canvas: workflow steps, repetitive tasks, AI intervention points, suggested tools, data sources, guardrails, and success metrics. Exportable as markdown or PDF.
**Key Features**: Structured canvas output, PDF/Markdown export, role-specific generation.
**Gemini Advantage**: Gemini's long output quality is strong — canvas documents are verbose and structured, where Flash 1.5 performs well without hitting token limits.
**Use Case**: Structured framework for evaluating AI agent opportunities across any job function.

---

## Changelog
- **2026-03-13**: POC 1 deployed to Vercel. Live at https://ai-portfolio-pocs.vercel.app/ — pending GIF recording to reach `polished`.
- **2026-03-12**: Switched stack from Claude API to Gemini API (free tier, no credit card). Updated all POC descriptions with Gemini-specific advantages.
- **2026-03-12**: Portfolio initialized with 6 POC ideas. Structure and CLAUDE.md created.
