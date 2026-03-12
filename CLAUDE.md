# AI Portfolio POCs - Claude Code Guidelines

## Purpose
This is a public portfolio of AI Agent / AI Automation POC projects for interview preparation and learning. Each POC demonstrates practical AI product thinking with working deployments on free-tier infrastructure.

## Free Stack
- **Claude API** — LLM backbone (pay-as-you-go, cheap for POCs)
- **Vercel** — Free hosting for Next.js/React apps
- **Streamlit Community Cloud** — Free Python app hosting
- **Supabase** — Free Postgres + pgvector + storage (500MB)
- **n8n Cloud** — Free tier (5 workflows)
- **GitHub** — Repo + README portfolio

## Project Structure
```
claude_pocs/
├── CLAUDE.md                  # This file - project guidelines
├── PORTFOLIO.md               # Master tracker of all POCs (status, links, notes)
├── poc-01-po-copilot/         # Purchase Order Copilot
├── poc-02-listing-localizer/  # Marketplace Listing Localizer
├── poc-03-usecase-scorer/     # AI Use-Case Prioritization Scorer
├── poc-04-rag-ops-assistant/  # RAG-Based Ecommerce Ops Assistant
├── poc-05-pricing-advisor/    # Dynamic Pricing Advisor
├── poc-06-agent-canvas/       # Agent Use-Case Canvas Generator
└── shared/                    # Shared utilities, prompt templates, components
```

## Per-POC Repo Standards
Every POC folder must include:
- `README.md` — with live Vercel/Streamlit link, 60-second screen recording GIF, sample input data, architecture diagram
- `prompts/` — core prompt templates (visible, not hidden in code)
- `sample-data/` — example CSVs, JSONs, or mock documents
- `.env.example` — required env vars (never commit actual keys)
- Clean UI — every POC should look polished, not hacky

## Conventions
- **Naming**: `poc-NN-short-name/` (zero-padded number + kebab-case)
- **Tech**: Next.js + TypeScript for Vercel apps, Python for Streamlit apps
- **Styling**: Tailwind CSS for Next.js projects
- **API keys**: Always use environment variables, never hardcode
- **Commits**: Conventional commits (`feat:`, `fix:`, `docs:`, `chore:`)
- **Branching**: Work on `main` for each POC (they're independent projects)

## Build Order (Recommended)
1. **#3 AI Use-Case Prioritization Scorer** — fastest to build, highest interview ROI, pure Claude API + Vercel
2. **#1 Purchase Order Copilot** — mirrors enterprise transformation background
3. **#6 Agent Use-Case Canvas Generator** — strong differentiator for AI PM roles
4. **#2 Marketplace Listing Localizer** — shows cross-border ecommerce depth
5. **#4 RAG-Based Ecommerce Ops Assistant** — demonstrates RAG architecture
6. **#5 Dynamic Pricing Advisor** — Streamlit variant, reasoning transparency

## When Starting a New POC
1. Check `PORTFOLIO.md` for current status of all POCs
2. Create the POC folder following the naming convention
3. Initialize with the standard structure (README, prompts/, sample-data/, .env.example)
4. Build iteratively — get a working version first, then polish
5. Deploy to Vercel/Streamlit and add the live link to README
6. Record a 60-second GIF walkthrough
7. Update `PORTFOLIO.md` with status and links

## Interview Framing
Each POC should tell a story:
- **Problem**: What real business pain does this solve?
- **Why AI**: Why is Claude/LLM the right tool here?
- **Architecture**: What decisions did you make and why?
- **Tradeoffs**: What would you do differently at scale?
