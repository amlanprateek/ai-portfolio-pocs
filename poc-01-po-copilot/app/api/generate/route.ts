import { NextRequest, NextResponse } from "next/server";
import { generatePORecommendations } from "@/lib/gemini";
import { InventoryRow, REQUIRED_COLUMNS } from "@/lib/types";

export const maxDuration = 60;

const MAX_ROWS = 200;

// Inlined to avoid fs.readFileSync issues on Vercel serverless.
// Canonical version also stored in prompts/system.md for portfolio visibility.
const SYSTEM_PROMPT = `You are a purchasing operations assistant for an ecommerce company.
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

Respond ONLY with valid JSON matching the provided schema.`;

const NUMERIC_FIELDS = new Set([
  "current_stock",
  "daily_sales_velocity",
  "supplier_moq",
  "unit_cost",
  "lead_time_days",
]);

function validateRows(rows: unknown): rows is InventoryRow[] {
  if (!Array.isArray(rows) || rows.length === 0) return false;
  return rows.every(
    (row) =>
      typeof row === "object" &&
      row !== null &&
      REQUIRED_COLUMNS.every((col) => {
        const val = (row as Record<string, unknown>)[col];
        if (val === null || val === undefined) return false;
        if (NUMERIC_FIELDS.has(col) && typeof val !== "number") return false;
        return true;
      })
  );
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { rows } = body;

    if (!rows || !validateRows(rows)) {
      return NextResponse.json(
        { error: "Invalid or missing inventory data." },
        { status: 400 }
      );
    }

    if (rows.length > MAX_ROWS) {
      return NextResponse.json(
        { error: `CSV exceeds ${MAX_ROWS} rows. Please reduce your dataset.` },
        { status: 400 }
      );
    }

    // Build markdown table from rows
    const headers = REQUIRED_COLUMNS.join(" | ");
    const separator = REQUIRED_COLUMNS.map(() => "---").join(" | ");
    const tableRows = rows
      .map(
        (row) =>
          `| ${REQUIRED_COLUMNS.map((col) => String(row[col])).join(" | ")} |`
      )
      .join("\n");
    const csvTable = `| ${headers} |\n| ${separator} |\n${tableRows}`;

    const userPrompt = `Here is the current inventory data:\n\n${csvTable}\n\nGenerate purchase order recommendations grouped by supplier.`;

    const responseText = await generatePORecommendations(SYSTEM_PROMPT, userPrompt);
    const parsed = JSON.parse(responseText);
    return NextResponse.json(parsed);
  } catch (error) {
    console.error("Generate API error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";

    if (message.includes("429") || message.toLowerCase().includes("rate")) {
      return NextResponse.json(
        { error: "Rate limit reached, please wait a moment." },
        { status: 429 }
      );
    }

    return NextResponse.json(
      { error: "Failed to generate recommendations. Please try again." },
      { status: 500 }
    );
  }
}
