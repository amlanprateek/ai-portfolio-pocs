# AI Portfolio — POC Tracker

> Public portfolio of AI Agent & Automation POCs. Built with free-tier tools to demonstrate AI product thinking.

## Status Legend
- `planned` — Idea defined, not started
- `in-progress` — Actively building
- `deployed` — Live and accessible
- `polished` — README, GIF, sample data all complete

---

## POCs

| # | Name | Stack | Status | Live Link | Repo |
|---|------|-------|--------|-----------|------|
| 1 | Purchase Order Copilot | Next.js + Claude API → Vercel | `planned` | — | — |
| 2 | Marketplace Listing Localizer | Next.js + Claude API → Vercel | `planned` | — | — |
| 3 | AI Use-Case Prioritization Scorer | Next.js + Claude API → Vercel | `planned` | — | — |
| 4 | RAG-Based Ecommerce Ops Assistant | Next.js + Claude API + Supabase pgvector → Vercel | `planned` | — | — |
| 5 | Dynamic Pricing Advisor | Streamlit + Claude API → Streamlit Cloud | `planned` | — | — |
| 6 | Agent Use-Case Canvas Generator | Next.js + Claude API → Vercel | `planned` | — | — |

---

## POC Details

### POC 1 — Purchase Order Copilot
**Problem**: Manual PO creation is slow and error-prone for ecommerce ops teams.
**Solution**: Upload CSV of SKUs (stock, velocity, MOQ) → Claude generates structured PO recommendations with per-SKU justification.
**Key Features**: CSV upload, structured table output, downloadable results, prompt templates visible.
**Interview Angle**: Mirrors enterprise supply chain transformation work.

### POC 2 — Marketplace Listing Localizer
**Problem**: Expanding product listings across markets requires cultural/regulatory adaptation.
**Solution**: Paste a listing, select target market (India/UAE/SEA) → get localized version with side-by-side diff.
**Key Features**: Market selection, diff view showing what changed and why, compliance language adaptation.
**Interview Angle**: Cross-border ecommerce depth + prompt engineering judgment.

### POC 3 — AI Use-Case Prioritization Scorer
**Problem**: Teams struggle to identify which workflows benefit most from AI automation.
**Solution**: Describe a business workflow → scored across 5 axes (frequency, effort, AI fit, data availability, ROI) → prioritized recommendation + one-pager brief.
**Key Features**: Multi-axis scoring, exportable brief, framework-driven output.
**Interview Angle**: Most transferable POC — shows frameworks, not just code.

### POC 4 — RAG-Based Ecommerce Ops Assistant
**Problem**: Ops teams repeatedly search through SOPs and policy docs for answers.
**Solution**: Upload mock SOPs → Q&A agent answers with source citations using pgvector RAG.
**Key Features**: Document upload, vector search, cited answers, Supabase pgvector backend.
**Interview Angle**: Demonstrates RAG architecture — the most deployed enterprise GenAI pattern.

### POC 5 — Dynamic Pricing Advisor
**Problem**: Pricing decisions require balancing MAP rules, margins, and competitor data.
**Solution**: Input product category + competitor prices → Claude analyzes MAP compliance, margin impact → recommendation with visible reasoning.
**Key Features**: CSV/manual input, step-by-step reasoning display, MAP rule checking.
**Interview Angle**: Reasoning transparency shows understanding of AI trust/adoption dynamics.

### POC 6 — Agent Use-Case Canvas Generator
**Problem**: Organizations need structured frameworks to evaluate where AI agents add value.
**Solution**: Input a job function → Claude generates Agent Canvas (workflow steps, AI intervention points, tools, guardrails, success metrics).
**Key Features**: Structured canvas output, PDF/Markdown export, role-specific generation.
**Interview Angle**: Literally the output format AI PM JDs ask for — shows internalized methodology.

---

## Changelog
- **2026-03-12**: Portfolio initialized with 6 POC ideas. Structure and CLAUDE.md created.
