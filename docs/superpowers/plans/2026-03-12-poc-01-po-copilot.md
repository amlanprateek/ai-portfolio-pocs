# POC 01 — Purchase Order Copilot: Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a single-page Next.js app that takes CSV inventory data and uses Gemini 1.5 Flash to generate structured PO recommendations grouped by supplier.

**Architecture:** Next.js 14 App Router with one API route (`/api/generate`) that proxies to Gemini API. CSV parsing client-side via papaparse. Structured JSON output mode for reliable responses. No database, no auth — fully stateless.

**Tech Stack:** Next.js 14, TypeScript, Tailwind CSS, `@google/generative-ai`, `papaparse`

**Spec:** `docs/superpowers/specs/2026-03-12-poc-01-po-copilot-design.md`

---

## Chunk 1: Project Setup, Types, and Data Layer

### Task 1: Scaffold Next.js project

**Files:**
- Create: `poc-01-po-copilot/package.json` (via create-next-app)
- Create: `poc-01-po-copilot/.env.example`
- Create: `poc-01-po-copilot/.env` (local only, gitignored)

- [ ] **Step 1: Initialize Next.js project with Tailwind**

```bash
cd E:/claude_pocs
npx create-next-app@14 poc-01-po-copilot --typescript --tailwind --eslint --app --src-dir=no --import-alias="@/*" --use-npm
```

Note: Run from the parent directory since `poc-01-po-copilot` already has placeholder files. Move/merge any existing files (`.env.example`, `prompts/`, `sample-data/`) after scaffolding. This creates `app/`, `tailwind.config.ts`, `tsconfig.json`, `package.json`.

- [ ] **Step 2: Install additional dependencies**

```bash
cd E:/claude_pocs/poc-01-po-copilot
npm install @google/generative-ai papaparse
npm install -D @types/papaparse
```

- [ ] **Step 3: Set up environment files**

Write `.env.example`:
```
GEMINI_API_KEY=your_key_here
```

Write `.env` (local only — already gitignored):
```
GEMINI_API_KEY=<user's actual key>
```

- [ ] **Step 4: Verify the app runs**

```bash
cd E:/claude_pocs/poc-01-po-copilot
npm run dev
```

Expected: Next.js dev server starts on `http://localhost:3000`, default page loads.

- [ ] **Step 5: Remove boilerplate**

Clean out the default Next.js content from `app/page.tsx` (replace with a simple `<h1>Purchase Order Copilot</h1>`). Clean `app/globals.css` to keep only Tailwind directives.

- [ ] **Step 6: Commit**

```bash
cd E:/claude_pocs/poc-01-po-copilot
git add package.json package-lock.json tsconfig.json tailwind.config.ts next.config.mjs postcss.config.mjs .env.example app/ public/
git commit -m "chore: scaffold Next.js 14 project with Tailwind and Gemini SDK"
```

---

### Task 2: Define TypeScript types and Gemini responseSchema

**Files:**
- Create: `poc-01-po-copilot/lib/types.ts`

- [ ] **Step 1: Write types and schema**

Create `lib/types.ts` with:

```typescript
// --- Input types ---

export interface InventoryRow {
  sku: string;
  product_name: string;
  current_stock: number;
  daily_sales_velocity: number;
  supplier_moq: number;
  unit_cost: number;
  lead_time_days: number;
  supplier_name: string;
  category: string;
}

export const REQUIRED_COLUMNS: (keyof InventoryRow)[] = [
  "sku",
  "product_name",
  "current_stock",
  "daily_sales_velocity",
  "supplier_moq",
  "unit_cost",
  "lead_time_days",
  "supplier_name",
  "category",
];

// --- Output types ---

export type Urgency = "HIGH" | "MEDIUM" | "LOW";

export interface Recommendation {
  sku: string;
  product_name: string;
  days_of_stock_remaining: number;
  urgency: Urgency;
  recommended_order_qty: number;
  estimated_cost: number;
  justification: string;
}

export interface SupplierSummary {
  total_skus: number;
  total_order_cost: number;
  moq_met: boolean;
}

export interface SupplierPO {
  supplier_name: string;
  summary: SupplierSummary;
  recommendations: Recommendation[];
}

export interface GenerateResponse {
  purchase_orders: SupplierPO[];
}

// --- Gemini responseSchema (uses SchemaType enum from SDK) ---

import { SchemaType } from "@google/generative-ai";

export const geminiResponseSchema = {
  type: SchemaType.OBJECT,
  properties: {
    purchase_orders: {
      type: SchemaType.ARRAY,
      items: {
        type: SchemaType.OBJECT,
        properties: {
          supplier_name: { type: SchemaType.STRING },
          summary: {
            type: SchemaType.OBJECT,
            properties: {
              total_skus: { type: SchemaType.NUMBER },
              total_order_cost: { type: SchemaType.NUMBER },
              moq_met: { type: SchemaType.BOOLEAN },
            },
            required: ["total_skus", "total_order_cost", "moq_met"],
          },
          recommendations: {
            type: SchemaType.ARRAY,
            items: {
              type: SchemaType.OBJECT,
              properties: {
                sku: { type: SchemaType.STRING },
                product_name: { type: SchemaType.STRING },
                days_of_stock_remaining: { type: SchemaType.NUMBER },
                urgency: {
                  type: SchemaType.STRING,
                  enum: ["HIGH", "MEDIUM", "LOW"],
                },
                recommended_order_qty: { type: SchemaType.NUMBER },
                estimated_cost: { type: SchemaType.NUMBER },
                justification: { type: SchemaType.STRING },
              },
              required: [
                "sku",
                "product_name",
                "days_of_stock_remaining",
                "urgency",
                "recommended_order_qty",
                "estimated_cost",
                "justification",
              ],
            },
          },
        },
        required: ["supplier_name", "summary", "recommendations"],
      },
    },
  },
  required: ["purchase_orders"],
};
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd E:/claude_pocs/poc-01-po-copilot
npx tsc --noEmit
```

Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add lib/types.ts
git commit -m "feat: add TypeScript types and Gemini responseSchema for PO output"
```

---

### Task 3: Create sample data

**Files:**
- Create: `poc-01-po-copilot/sample-data/sample-inventory.csv`
- Create: `poc-01-po-copilot/lib/sample-data.ts`

- [ ] **Step 1: Write sample CSV**

Create `sample-data/sample-inventory.csv` with ~25 SKUs across 4 suppliers. Include:
- 4 suppliers: Apex Textiles, Sole Brothers Footwear, Urban Accessories Co, Pacific Denim
- Mix of HIGH urgency (stock < lead time), MEDIUM, and LOW
- One SKU with `daily_sales_velocity` of 0 (seasonal item)
- One SKU right at MOQ boundary edge case
- Categories: Tops, Bottoms, Footwear, Accessories

```csv
sku,product_name,current_stock,daily_sales_velocity,supplier_moq,unit_cost,lead_time_days,supplier_name,category
TEE-BLK-M,Black Basic Tee - Medium,45,12.5,100,8.50,14,Apex Textiles,Tops
TEE-BLK-L,Black Basic Tee - Large,30,10.0,100,8.50,14,Apex Textiles,Tops
TEE-WHT-S,White Basic Tee - Small,120,5.0,100,8.50,14,Apex Textiles,Tops
POLO-NVY-M,Navy Polo Shirt - Medium,8,4.0,50,14.00,14,Apex Textiles,Tops
POLO-NVY-L,Navy Polo Shirt - Large,60,3.5,50,14.00,14,Apex Textiles,Tops
TANK-GRY-M,Grey Tank Top - Medium,200,2.0,100,6.00,14,Apex Textiles,Tops
SNK-WHT-10,White Sneakers - Size 10,12,3.0,30,32.00,21,Sole Brothers Footwear,Footwear
SNK-WHT-11,White Sneakers - Size 11,5,2.5,30,32.00,21,Sole Brothers Footwear,Footwear
SNK-BLK-9,Black Sneakers - Size 9,90,1.5,30,32.00,21,Sole Brothers Footwear,Footwear
BOOT-BRN-10,Brown Chelsea Boot - Size 10,25,1.0,20,55.00,28,Sole Brothers Footwear,Footwear
BOOT-BRN-11,Brown Chelsea Boot - Size 11,0,0.8,20,55.00,28,Sole Brothers Footwear,Footwear
SNDL-TAN-8,Tan Sandals - Size 8,150,0,20,18.00,21,Sole Brothers Footwear,Footwear
BLT-BLK-M,Black Leather Belt - Medium,35,2.0,40,12.00,10,Urban Accessories Co,Accessories
BLT-BLK-L,Black Leather Belt - Large,18,1.8,40,12.00,10,Urban Accessories Co,Accessories
BLT-BRN-M,Brown Leather Belt - Medium,50,1.5,40,12.00,10,Urban Accessories Co,Accessories
CAP-NVY,Navy Baseball Cap,10,3.0,60,7.50,10,Urban Accessories Co,Accessories
CAP-BLK,Black Baseball Cap,75,2.5,60,7.50,10,Urban Accessories Co,Accessories
SCF-RED,Red Silk Scarf,40,0.5,25,22.00,10,Urban Accessories Co,Accessories
JNS-BLU-32,Blue Slim Jeans - 32,22,4.0,50,28.00,18,Pacific Denim,Bottoms
JNS-BLU-34,Blue Slim Jeans - 34,15,3.5,50,28.00,18,Pacific Denim,Bottoms
JNS-BLK-32,Black Slim Jeans - 32,55,3.0,50,28.00,18,Pacific Denim,Bottoms
JNS-BLK-34,Black Slim Jeans - 34,8,2.8,50,28.00,18,Pacific Denim,Bottoms
SRT-KHK-M,Khaki Shorts - Medium,100,1.0,40,18.00,18,Pacific Denim,Bottoms
SRT-KHK-L,Khaki Shorts - Large,42,1.2,40,18.00,18,Pacific Denim,Bottoms
SRT-NVY-M,Navy Shorts - Medium,48,1.5,40,18.00,18,Pacific Denim,Bottoms
```

- [ ] **Step 2: Write sample-data.ts**

Create `lib/sample-data.ts`:

```typescript
import { InventoryRow } from "./types";

export const sampleData: InventoryRow[] = [
  { sku: "TEE-BLK-M", product_name: "Black Basic Tee - Medium", current_stock: 45, daily_sales_velocity: 12.5, supplier_moq: 100, unit_cost: 8.50, lead_time_days: 14, supplier_name: "Apex Textiles", category: "Tops" },
  { sku: "TEE-BLK-L", product_name: "Black Basic Tee - Large", current_stock: 30, daily_sales_velocity: 10.0, supplier_moq: 100, unit_cost: 8.50, lead_time_days: 14, supplier_name: "Apex Textiles", category: "Tops" },
  { sku: "TEE-WHT-S", product_name: "White Basic Tee - Small", current_stock: 120, daily_sales_velocity: 5.0, supplier_moq: 100, unit_cost: 8.50, lead_time_days: 14, supplier_name: "Apex Textiles", category: "Tops" },
  { sku: "POLO-NVY-M", product_name: "Navy Polo Shirt - Medium", current_stock: 8, daily_sales_velocity: 4.0, supplier_moq: 50, unit_cost: 14.00, lead_time_days: 14, supplier_name: "Apex Textiles", category: "Tops" },
  { sku: "POLO-NVY-L", product_name: "Navy Polo Shirt - Large", current_stock: 60, daily_sales_velocity: 3.5, supplier_moq: 50, unit_cost: 14.00, lead_time_days: 14, supplier_name: "Apex Textiles", category: "Tops" },
  { sku: "TANK-GRY-M", product_name: "Grey Tank Top - Medium", current_stock: 200, daily_sales_velocity: 2.0, supplier_moq: 100, unit_cost: 6.00, lead_time_days: 14, supplier_name: "Apex Textiles", category: "Tops" },
  { sku: "SNK-WHT-10", product_name: "White Sneakers - Size 10", current_stock: 12, daily_sales_velocity: 3.0, supplier_moq: 30, unit_cost: 32.00, lead_time_days: 21, supplier_name: "Sole Brothers Footwear", category: "Footwear" },
  { sku: "SNK-WHT-11", product_name: "White Sneakers - Size 11", current_stock: 5, daily_sales_velocity: 2.5, supplier_moq: 30, unit_cost: 32.00, lead_time_days: 21, supplier_name: "Sole Brothers Footwear", category: "Footwear" },
  { sku: "SNK-BLK-9", product_name: "Black Sneakers - Size 9", current_stock: 90, daily_sales_velocity: 1.5, supplier_moq: 30, unit_cost: 32.00, lead_time_days: 21, supplier_name: "Sole Brothers Footwear", category: "Footwear" },
  { sku: "BOOT-BRN-10", product_name: "Brown Chelsea Boot - Size 10", current_stock: 25, daily_sales_velocity: 1.0, supplier_moq: 20, unit_cost: 55.00, lead_time_days: 28, supplier_name: "Sole Brothers Footwear", category: "Footwear" },
  { sku: "BOOT-BRN-11", product_name: "Brown Chelsea Boot - Size 11", current_stock: 0, daily_sales_velocity: 0.8, supplier_moq: 20, unit_cost: 55.00, lead_time_days: 28, supplier_name: "Sole Brothers Footwear", category: "Footwear" },
  { sku: "SNDL-TAN-8", product_name: "Tan Sandals - Size 8", current_stock: 150, daily_sales_velocity: 0, supplier_moq: 20, unit_cost: 18.00, lead_time_days: 21, supplier_name: "Sole Brothers Footwear", category: "Footwear" },
  { sku: "BLT-BLK-M", product_name: "Black Leather Belt - Medium", current_stock: 35, daily_sales_velocity: 2.0, supplier_moq: 40, unit_cost: 12.00, lead_time_days: 10, supplier_name: "Urban Accessories Co", category: "Accessories" },
  { sku: "BLT-BLK-L", product_name: "Black Leather Belt - Large", current_stock: 18, daily_sales_velocity: 1.8, supplier_moq: 40, unit_cost: 12.00, lead_time_days: 10, supplier_name: "Urban Accessories Co", category: "Accessories" },
  { sku: "BLT-BRN-M", product_name: "Brown Leather Belt - Medium", current_stock: 50, daily_sales_velocity: 1.5, supplier_moq: 40, unit_cost: 12.00, lead_time_days: 10, supplier_name: "Urban Accessories Co", category: "Accessories" },
  { sku: "CAP-NVY", product_name: "Navy Baseball Cap", current_stock: 10, daily_sales_velocity: 3.0, supplier_moq: 60, unit_cost: 7.50, lead_time_days: 10, supplier_name: "Urban Accessories Co", category: "Accessories" },
  { sku: "CAP-BLK", product_name: "Black Baseball Cap", current_stock: 75, daily_sales_velocity: 2.5, supplier_moq: 60, unit_cost: 7.50, lead_time_days: 10, supplier_name: "Urban Accessories Co", category: "Accessories" },
  { sku: "SCF-RED", product_name: "Red Silk Scarf", current_stock: 40, daily_sales_velocity: 0.5, supplier_moq: 25, unit_cost: 22.00, lead_time_days: 10, supplier_name: "Urban Accessories Co", category: "Accessories" },
  { sku: "JNS-BLU-32", product_name: "Blue Slim Jeans - 32", current_stock: 22, daily_sales_velocity: 4.0, supplier_moq: 50, unit_cost: 28.00, lead_time_days: 18, supplier_name: "Pacific Denim", category: "Bottoms" },
  { sku: "JNS-BLU-34", product_name: "Blue Slim Jeans - 34", current_stock: 15, daily_sales_velocity: 3.5, supplier_moq: 50, unit_cost: 28.00, lead_time_days: 18, supplier_name: "Pacific Denim", category: "Bottoms" },
  { sku: "JNS-BLK-32", product_name: "Black Slim Jeans - 32", current_stock: 55, daily_sales_velocity: 3.0, supplier_moq: 50, unit_cost: 28.00, lead_time_days: 18, supplier_name: "Pacific Denim", category: "Bottoms" },
  { sku: "JNS-BLK-34", product_name: "Black Slim Jeans - 34", current_stock: 8, daily_sales_velocity: 2.8, supplier_moq: 50, unit_cost: 28.00, lead_time_days: 18, supplier_name: "Pacific Denim", category: "Bottoms" },
  { sku: "SRT-KHK-M", product_name: "Khaki Shorts - Medium", current_stock: 100, daily_sales_velocity: 1.0, supplier_moq: 40, unit_cost: 18.00, lead_time_days: 18, supplier_name: "Pacific Denim", category: "Bottoms" },
  { sku: "SRT-KHK-L", product_name: "Khaki Shorts - Large", current_stock: 42, daily_sales_velocity: 1.2, supplier_moq: 40, unit_cost: 18.00, lead_time_days: 18, supplier_name: "Pacific Denim", category: "Bottoms" },
  { sku: "SRT-NVY-M", product_name: "Navy Shorts - Medium", current_stock: 48, daily_sales_velocity: 1.5, supplier_moq: 40, unit_cost: 18.00, lead_time_days: 18, supplier_name: "Pacific Denim", category: "Bottoms" },
];
```

- [ ] **Step 3: Verify TypeScript compiles**

```bash
cd E:/claude_pocs/poc-01-po-copilot
npx tsc --noEmit
```

Expected: No errors.

- [ ] **Step 4: Commit**

```bash
git add sample-data/sample-inventory.csv lib/sample-data.ts
git commit -m "feat: add sample inventory dataset (25 SKUs across 4 suppliers)"
```

---

### Task 4: Build CSV parser with validation

**Files:**
- Create: `poc-01-po-copilot/lib/csv-parser.ts`

- [ ] **Step 1: Write CSV parser**

Create `lib/csv-parser.ts`:

```typescript
import Papa from "papaparse";
import { InventoryRow, REQUIRED_COLUMNS } from "./types";

export interface ParseResult {
  success: true;
  data: InventoryRow[];
}

export interface ParseError {
  success: false;
  error: string;
}

export type CsvParseResult = ParseResult | ParseError;

const MAX_ROWS = 200;

const NUMERIC_COLUMNS: (keyof InventoryRow)[] = [
  "current_stock",
  "daily_sales_velocity",
  "supplier_moq",
  "unit_cost",
  "lead_time_days",
];

const NON_NEGATIVE_COLUMNS: (keyof InventoryRow)[] = [
  "current_stock",
  "daily_sales_velocity",
];

const POSITIVE_COLUMNS: (keyof InventoryRow)[] = [
  "supplier_moq",
  "unit_cost",
  "lead_time_days",
];

export function parseAndValidateCsv(file: File): Promise<CsvParseResult> {
  return new Promise((resolve) => {
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete(results) {
        resolve(validateParsedData(results.data as Record<string, string>[]));
      },
      error(err: Error) {
        resolve({ success: false, error: `Failed to parse CSV: ${err.message}` });
      },
    });
  });
}

export function validateParsedData(
  rawRows: Record<string, string>[]
): CsvParseResult {
  if (rawRows.length === 0) {
    return { success: false, error: "No data found in CSV." };
  }

  if (rawRows.length > MAX_ROWS) {
    return {
      success: false,
      error: `CSV exceeds ${MAX_ROWS} rows (found ${rawRows.length}). Please reduce your dataset.`,
    };
  }

  // Check required columns
  const headers = Object.keys(rawRows[0]);
  const missingColumns = REQUIRED_COLUMNS.filter(
    (col) => !headers.includes(col)
  );
  if (missingColumns.length > 0) {
    return {
      success: false,
      error: `Missing required columns: ${missingColumns.join(", ")}`,
    };
  }

  // Validate and convert each row
  const rows: InventoryRow[] = [];
  for (let i = 0; i < rawRows.length; i++) {
    const raw = rawRows[i];
    const rowNum = i + 2; // +2 for 1-indexed + header row

    // Check string fields are non-empty
    for (const col of ["sku", "product_name", "supplier_name", "category"] as const) {
      if (!raw[col] || raw[col].trim() === "") {
        return {
          success: false,
          error: `Row ${rowNum}: "${col}" is empty.`,
        };
      }
    }

    // Parse and validate numeric fields
    const numericValues: Partial<Record<keyof InventoryRow, number>> = {};
    for (const col of NUMERIC_COLUMNS) {
      const val = parseFloat(raw[col]);
      if (isNaN(val)) {
        return {
          success: false,
          error: `Row ${rowNum}: "${col}" must be a number (got "${raw[col]}").`,
        };
      }
      numericValues[col] = val;
    }

    // Check non-negative
    for (const col of NON_NEGATIVE_COLUMNS) {
      if ((numericValues[col] as number) < 0) {
        return {
          success: false,
          error: `Row ${rowNum}: "${col}" must be >= 0 (got ${numericValues[col]}).`,
        };
      }
    }

    // Check positive
    for (const col of POSITIVE_COLUMNS) {
      if ((numericValues[col] as number) <= 0) {
        return {
          success: false,
          error: `Row ${rowNum}: "${col}" must be > 0 (got ${numericValues[col]}).`,
        };
      }
    }

    rows.push({
      sku: raw.sku.trim(),
      product_name: raw.product_name.trim(),
      current_stock: numericValues.current_stock as number,
      daily_sales_velocity: numericValues.daily_sales_velocity as number,
      supplier_moq: numericValues.supplier_moq as number,
      unit_cost: numericValues.unit_cost as number,
      lead_time_days: numericValues.lead_time_days as number,
      supplier_name: raw.supplier_name.trim(),
      category: raw.category.trim(),
    });
  }

  return { success: true, data: rows };
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd E:/claude_pocs/poc-01-po-copilot
npx tsc --noEmit
```

Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add lib/csv-parser.ts
git commit -m "feat: add CSV parser with column and data validation"
```

---

### Task 5: Create prompt templates

**Files:**
- Create: `poc-01-po-copilot/prompts/system.md`
- Create: `poc-01-po-copilot/prompts/user.md`

- [ ] **Step 1: Write system prompt**

Create `prompts/system.md`:

```markdown
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

- [ ] **Step 2: Write user prompt template**

Create `prompts/user.md`:

```markdown
Here is the current inventory data:

{csv_data}

Generate purchase order recommendations grouped by supplier.
```

- [ ] **Step 3: Commit**

```bash
git add prompts/system.md prompts/user.md
git commit -m "feat: add system and user prompt templates"
```

---

### Task 6: Build Gemini client and API route

**Files:**
- Create: `poc-01-po-copilot/lib/gemini.ts`
- Create: `poc-01-po-copilot/app/api/generate/route.ts`

- [ ] **Step 1: Write Gemini client helper**

Create `lib/gemini.ts`:

```typescript
import {
  GoogleGenerativeAI,
  GenerativeModel,
} from "@google/generative-ai";
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
```

- [ ] **Step 2: Write API route**

Create `app/api/generate/route.ts`:

```typescript
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
        const val = row[col];
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

    const responseText = await generatePORecommendations(
      SYSTEM_PROMPT,
      userPrompt
    );

    const parsed = JSON.parse(responseText);
    return NextResponse.json(parsed);
  } catch (error) {
    console.error("Generate API error:", error);

    const message = error instanceof Error ? error.message : "Unknown error";

    if (message.includes("429") || message.includes("rate")) {
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
```

- [ ] **Step 3: Verify TypeScript compiles**

```bash
cd E:/claude_pocs/poc-01-po-copilot
npx tsc --noEmit
```

Expected: No errors.

- [ ] **Step 4: Commit**

```bash
git add lib/gemini.ts app/api/generate/route.ts
git commit -m "feat: add Gemini client and /api/generate route"
```

---

## Chunk 2: UI Components

### Task 7: Build CSV upload component

**Files:**
- Create: `poc-01-po-copilot/components/csv-upload.tsx`

- [ ] **Step 1: Write CSV upload component**

Create `components/csv-upload.tsx`:

```tsx
"use client";

import { useCallback, useRef } from "react";
import { InventoryRow } from "@/lib/types";
import { parseAndValidateCsv } from "@/lib/csv-parser";
import { sampleData } from "@/lib/sample-data";

interface CsvUploadProps {
  onDataLoaded: (data: InventoryRow[]) => void;
  onError: (error: string) => void;
}

export function CsvUpload({ onDataLoaded, onError }: CsvUploadProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      const result = await parseAndValidateCsv(file);
      if (result.success) {
        onDataLoaded(result.data);
      } else {
        onError(result.error);
      }

      // Reset input so same file can be re-uploaded
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    },
    [onDataLoaded, onError]
  );

  const handleSampleData = useCallback(() => {
    onDataLoaded(sampleData);
  }, [onDataLoaded]);

  return (
    <div className="flex flex-col items-center gap-6">
      <div className="flex gap-4">
        <button
          onClick={() => fileInputRef.current?.click()}
          className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
        >
          Upload CSV
        </button>
        <button
          onClick={handleSampleData}
          className="px-6 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors font-medium border border-gray-300"
        >
          Try with Sample Data
        </button>
      </div>
      <input
        ref={fileInputRef}
        type="file"
        accept=".csv"
        onChange={handleFileChange}
        className="hidden"
      />
      <p className="text-sm text-gray-500">
        Upload a CSV with columns: sku, product_name, current_stock,
        daily_sales_velocity, supplier_moq, unit_cost, lead_time_days,
        supplier_name, category
      </p>
    </div>
  );
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd E:/claude_pocs/poc-01-po-copilot
npx tsc --noEmit
```

- [ ] **Step 3: Commit**

```bash
git add components/csv-upload.tsx
git commit -m "feat: add CSV upload component with sample data button"
```

---

### Task 8: Build data preview component

**Files:**
- Create: `poc-01-po-copilot/components/data-preview.tsx`

- [ ] **Step 1: Write data preview table**

Create `components/data-preview.tsx`:

```tsx
"use client";

import { InventoryRow, REQUIRED_COLUMNS } from "@/lib/types";

interface DataPreviewProps {
  data: InventoryRow[];
  dimmed?: boolean;
}

const MAX_VISIBLE_ROWS = 10;

const COLUMN_LABELS: Record<keyof InventoryRow, string> = {
  sku: "SKU",
  product_name: "Product",
  current_stock: "Stock",
  daily_sales_velocity: "Daily Sales",
  supplier_moq: "MOQ",
  unit_cost: "Unit Cost",
  lead_time_days: "Lead Time",
  supplier_name: "Supplier",
  category: "Category",
};

export function DataPreview({ data, dimmed = false }: DataPreviewProps) {
  const visibleRows = data.slice(0, MAX_VISIBLE_ROWS);

  return (
    <div className={`transition-opacity ${dimmed ? "opacity-40" : ""}`}>
      <div className="flex justify-between items-center mb-2">
        <h3 className="text-sm font-medium text-gray-700">Data Preview</h3>
        <span className="text-sm text-gray-500">
          Showing {Math.min(MAX_VISIBLE_ROWS, data.length)} of {data.length} rows
        </span>
      </div>
      <div className="overflow-x-auto border border-gray-200 rounded-lg">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              {REQUIRED_COLUMNS.map((col) => (
                <th
                  key={col}
                  className="px-3 py-2 text-left font-medium text-gray-600 whitespace-nowrap"
                >
                  {COLUMN_LABELS[col]}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {visibleRows.map((row, i) => (
              <tr key={i} className="hover:bg-gray-50">
                {REQUIRED_COLUMNS.map((col) => (
                  <td key={col} className="px-3 py-2 whitespace-nowrap">
                    {typeof row[col] === "number"
                      ? col === "unit_cost"
                        ? `$${row[col].toFixed(2)}`
                        : row[col]
                      : row[col]}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd E:/claude_pocs/poc-01-po-copilot
npx tsc --noEmit
```

- [ ] **Step 3: Commit**

```bash
git add components/data-preview.tsx
git commit -m "feat: add data preview table component"
```

---

### Task 9: Build PO results components

**Files:**
- Create: `poc-01-po-copilot/components/po-table-row.tsx`
- Create: `poc-01-po-copilot/components/po-results.tsx`

- [ ] **Step 1: Write PO table row component**

Create `components/po-table-row.tsx`:

```tsx
"use client";

import { Recommendation } from "@/lib/types";

interface PoTableRowProps {
  recommendation: Recommendation;
  unitCost: number;
  dismissed: boolean;
  onQtyChange: (sku: string, qty: number) => void;
  onDismiss: (sku: string) => void;
}

const URGENCY_STYLES = {
  HIGH: "bg-red-100 text-red-700",
  MEDIUM: "bg-amber-100 text-amber-700",
  LOW: "bg-green-100 text-green-700",
};

export function PoTableRow({
  recommendation,
  unitCost,
  dismissed,
  onQtyChange,
  onDismiss,
}: PoTableRowProps) {
  const r = recommendation;

  return (
    <tr className={`${dismissed ? "opacity-40 line-through" : ""} hover:bg-gray-50`}>
      <td className="px-3 py-2 font-mono text-sm">{r.sku}</td>
      <td className="px-3 py-2 text-sm">{r.product_name}</td>
      <td className="px-3 py-2 text-sm text-right">
        {r.days_of_stock_remaining < 0
          ? "N/A"
          : r.days_of_stock_remaining.toFixed(1)}
      </td>
      <td className="px-3 py-2">
        <span
          className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${URGENCY_STYLES[r.urgency]}`}
        >
          {r.urgency}
        </span>
      </td>
      <td className="px-3 py-2">
        <input
          type="number"
          min="0"
          step="1"
          value={r.recommended_order_qty}
          onChange={(e) => {
            const val = parseInt(e.target.value, 10);
            if (!isNaN(val) && val >= 0) {
              onQtyChange(r.sku, val);
            }
          }}
          disabled={dismissed}
          className="w-20 px-2 py-1 border border-gray-300 rounded text-sm text-right disabled:bg-gray-100"
        />
      </td>
      <td className="px-3 py-2 text-sm text-right">
        ${r.estimated_cost.toFixed(2)}
      </td>
      <td className="px-3 py-2 text-sm text-gray-600 max-w-xs">
        {r.justification}
      </td>
      <td className="px-3 py-2">
        <button
          onClick={() => onDismiss(r.sku)}
          className="text-xs text-gray-400 hover:text-red-500 transition-colors"
          title={dismissed ? "Restore" : "Dismiss"}
        >
          {dismissed ? "Restore" : "Dismiss"}
        </button>
      </td>
    </tr>
  );
}
```

- [ ] **Step 2: Write PO results component**

Create `components/po-results.tsx`:

Note: All edit/dismiss state is owned by `page.tsx` and passed down as props. This ensures `DownloadBar` (sibling component) has access to the same state.

```tsx
"use client";

import { useMemo } from "react";
import { SupplierPO, Recommendation, InventoryRow } from "@/lib/types";
import { PoTableRow } from "./po-table-row";

interface PoResultsProps {
  purchaseOrders: SupplierPO[];
  inventoryData: InventoryRow[];
  editedQtys: Record<string, number>;
  dismissedSkus: Set<string>;
  onQtyChange: (sku: string, qty: number) => void;
  onDismiss: (sku: string) => void;
}

export function PoResults({
  purchaseOrders,
  inventoryData,
  editedQtys,
  dismissedSkus,
  onQtyChange,
  onDismiss,
}: PoResultsProps) {
  // Build a lookup for unit costs from the original inventory data
  const unitCostMap = useMemo(() => {
    const map: Record<string, number> = {};
    inventoryData.forEach((row) => {
      map[row.sku] = row.unit_cost;
    });
    return map;
  }, [inventoryData]);

  // Apply edits to a recommendation
  const getEffectiveRecommendation = (r: Recommendation): Recommendation => {
    if (r.sku in editedQtys) {
      const qty = editedQtys[r.sku];
      const unitCost =
        unitCostMap[r.sku] ??
        (r.recommended_order_qty > 0
          ? r.estimated_cost / r.recommended_order_qty
          : 0);
      return {
        ...r,
        recommended_order_qty: qty,
        estimated_cost: qty * unitCost,
      };
    }
    return r;
  };

  return (
    <div className="space-y-6">
      {purchaseOrders.map((po) => {
        const effectiveRecs = po.recommendations.map(getEffectiveRecommendation);
        const activeRecs = effectiveRecs.filter(
          (r) => !dismissedSkus.has(r.sku)
        );

        const totalCost = activeRecs.reduce(
          (sum, r) => sum + r.estimated_cost,
          0
        );
        const allMoqMet = activeRecs.every((r) => {
          const inv = inventoryData.find((i) => i.sku === r.sku);
          return (
            !inv ||
            r.recommended_order_qty >= inv.supplier_moq ||
            r.recommended_order_qty === 0
          );
        });

        return (
          <div
            key={po.supplier_name}
            className="border border-gray-200 rounded-lg overflow-hidden"
          >
            {/* Supplier header */}
            <div className="bg-gray-50 px-4 py-3 flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-gray-900">
                  {po.supplier_name}
                </h3>
                <p className="text-sm text-gray-500">
                  {activeRecs.length} SKUs &middot; Total: $
                  {totalCost.toFixed(2)}
                </p>
              </div>
              <span
                className={`px-2 py-1 rounded text-xs font-medium ${
                  allMoqMet
                    ? "bg-green-100 text-green-700"
                    : "bg-red-100 text-red-700"
                }`}
              >
                MOQ {allMoqMet ? "Met" : "Not Met"}
              </span>
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="bg-white border-b border-gray-200">
                  <tr>
                    <th className="px-3 py-2 text-left font-medium text-gray-600">SKU</th>
                    <th className="px-3 py-2 text-left font-medium text-gray-600">Product</th>
                    <th className="px-3 py-2 text-right font-medium text-gray-600">Days Left</th>
                    <th className="px-3 py-2 text-left font-medium text-gray-600">Urgency</th>
                    <th className="px-3 py-2 text-left font-medium text-gray-600">Order Qty</th>
                    <th className="px-3 py-2 text-right font-medium text-gray-600">Est. Cost</th>
                    <th className="px-3 py-2 text-left font-medium text-gray-600">Justification</th>
                    <th className="px-3 py-2 text-left font-medium text-gray-600"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {effectiveRecs.map((rec) => (
                    <PoTableRow
                      key={rec.sku}
                      recommendation={rec}
                      unitCost={unitCostMap[rec.sku] ?? 0}
                      dismissed={dismissedSkus.has(rec.sku)}
                      onQtyChange={onQtyChange}
                      onDismiss={onDismiss}
                    />
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        );
      })}
    </div>
  );
}
```

- [ ] **Step 3: Verify TypeScript compiles**

```bash
cd E:/claude_pocs/poc-01-po-copilot
npx tsc --noEmit
```

- [ ] **Step 4: Commit**

```bash
git add components/po-table-row.tsx components/po-results.tsx
git commit -m "feat: add PO results and editable table row components"
```

---

### Task 10: Build download bar component

**Files:**
- Create: `poc-01-po-copilot/components/download-bar.tsx`

- [ ] **Step 1: Write download bar**

Create `components/download-bar.tsx`:

Note: This component receives `editedQtys` and `inventoryData` so downloads reflect user edits, not just the original Gemini output.

```tsx
"use client";

import { SupplierPO, Recommendation, InventoryRow } from "@/lib/types";

interface DownloadBarProps {
  purchaseOrders: SupplierPO[];
  inventoryData: InventoryRow[];
  editedQtys: Record<string, number>;
  dismissedSkus: Set<string>;
  onStartOver: () => void;
}

function formatDate(): string {
  return new Date().toISOString().split("T")[0];
}

function buildCsvContent(rows: { supplier_name: string; rec: Recommendation }[]): string {
  const header = "supplier_name,sku,product_name,urgency,recommended_order_qty,estimated_cost,justification";
  const lines = rows.map(
    ({ supplier_name, rec }) =>
      `"${supplier_name}","${rec.sku}","${rec.product_name}","${rec.urgency}",${rec.recommended_order_qty},${rec.estimated_cost.toFixed(2)},"${rec.justification.replace(/"/g, '""')}"`
  );
  return [header, ...lines].join("\n");
}

function downloadFile(content: string, filename: string) {
  const blob = new Blob([content], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

export function DownloadBar({
  purchaseOrders,
  inventoryData,
  editedQtys,
  dismissedSkus,
  onStartOver,
}: DownloadBarProps) {
  const date = formatDate();

  // Build unit cost lookup
  const unitCostMap: Record<string, number> = {};
  inventoryData.forEach((row) => {
    unitCostMap[row.sku] = row.unit_cost;
  });

  // Apply edits to a recommendation for download
  const applyEdits = (r: Recommendation): Recommendation => {
    if (r.sku in editedQtys) {
      const qty = editedQtys[r.sku];
      const unitCost = unitCostMap[r.sku] ?? 0;
      return { ...r, recommended_order_qty: qty, estimated_cost: qty * unitCost };
    }
    return r;
  };

  const handleDownloadAll = () => {
    const rows = purchaseOrders.flatMap((po) =>
      po.recommendations
        .filter((r) => !dismissedSkus.has(r.sku))
        .map((rec) => ({ supplier_name: po.supplier_name, rec: applyEdits(rec) }))
    );
    if (rows.length === 0) return;
    downloadFile(buildCsvContent(rows), `PO_all_${date}.csv`);
  };

  const handleDownloadPerSupplier = () => {
    purchaseOrders.forEach((po) => {
      const recs = po.recommendations
        .filter((r) => !dismissedSkus.has(r.sku))
        .map(applyEdits);
      if (recs.length === 0) return;
      const rows = recs.map((rec) => ({
        supplier_name: po.supplier_name,
        rec,
      }));
      const safeName = po.supplier_name.replace(/[^a-zA-Z0-9]/g, "_");
      downloadFile(buildCsvContent(rows), `PO_${safeName}_${date}.csv`);
    });
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 px-6 py-3 flex items-center justify-between shadow-lg">
      <button
        onClick={onStartOver}
        className="text-sm text-gray-500 hover:text-gray-700 underline"
      >
        Start Over
      </button>
      <div className="flex gap-3">
        <button
          onClick={handleDownloadPerSupplier}
          className="px-4 py-2 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 border border-gray-300"
        >
          Download per Supplier
        </button>
        <button
          onClick={handleDownloadAll}
          className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          Download All as CSV
        </button>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd E:/claude_pocs/poc-01-po-copilot
npx tsc --noEmit
```

- [ ] **Step 3: Commit**

```bash
git add components/download-bar.tsx
git commit -m "feat: add download bar with per-supplier and combined CSV export"
```

---

## Chunk 3: Main Page, Layout, and Polish

### Task 11: Wire up main page

**Files:**
- Modify: `poc-01-po-copilot/app/page.tsx`
- Modify: `poc-01-po-copilot/app/layout.tsx`
- Modify: `poc-01-po-copilot/app/globals.css`

- [ ] **Step 1: Write globals.css**

Replace `app/globals.css` with:

```css
@tailwind base;
@tailwind components;
@tailwind utilities;
```

- [ ] **Step 2: Write layout.tsx**

Replace `app/layout.tsx` with:

```tsx
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Purchase Order Copilot",
  description:
    "AI-powered purchase order recommendations for ecommerce inventory management",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={inter.className}>{children}</body>
    </html>
  );
}
```

- [ ] **Step 3: Write main page**

Replace `app/page.tsx` with:

```tsx
"use client";

import { useState, useCallback } from "react";
import { InventoryRow, GenerateResponse } from "@/lib/types";
import { CsvUpload } from "@/components/csv-upload";
import { DataPreview } from "@/components/data-preview";
import { PoResults } from "@/components/po-results";
import { DownloadBar } from "@/components/download-bar";

type AppState = "upload" | "preview" | "generating" | "results" | "error";

export default function Home() {
  const [state, setState] = useState<AppState>("upload");
  const [inventoryData, setInventoryData] = useState<InventoryRow[]>([]);
  const [result, setResult] = useState<GenerateResponse | null>(null);
  const [error, setError] = useState<string>("");
  // Edit/dismiss state lifted here so both PoResults and DownloadBar share it
  const [editedQtys, setEditedQtys] = useState<Record<string, number>>({});
  const [dismissedSkus, setDismissedSkus] = useState<Set<string>>(new Set());

  const handleQtyChange = useCallback((sku: string, qty: number) => {
    setEditedQtys((prev) => ({ ...prev, [sku]: qty }));
  }, []);

  const handleDismiss = useCallback((sku: string) => {
    setDismissedSkus((prev) => {
      const next = new Set(prev);
      if (next.has(sku)) {
        next.delete(sku);
      } else {
        next.add(sku);
      }
      return next;
    });
  }, []);

  const handleDataLoaded = (data: InventoryRow[]) => {
    setInventoryData(data);
    setError("");
    setState("preview");
  };

  const handleError = (err: string) => {
    setError(err);
    setState("error");
  };

  const handleGenerate = async () => {
    setState("generating");
    setError("");

    try {
      const response = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rows: inventoryData }),
      });

      if (!response.ok) {
        const errBody = await response.json();
        throw new Error(errBody.error || "Failed to generate recommendations.");
      }

      const data: GenerateResponse = await response.json();
      setResult(data);
      setEditedQtys({});
      setDismissedSkus(new Set());
      setState("results");
    } catch (err) {
      setError(err instanceof Error ? err.message : "An unexpected error occurred.");
      setState("error");
    }
  };

  const handleStartOver = () => {
    setInventoryData([]);
    setResult(null);
    setError("");
    setEditedQtys({});
    setDismissedSkus(new Set());
    setState("upload");
  };

  return (
    <main className="min-h-screen bg-white">
      {/* Header */}
      <div className="border-b border-gray-200 bg-white">
        <div className="max-w-6xl mx-auto px-6 py-6">
          <h1 className="text-2xl font-bold text-gray-900">
            Purchase Order Copilot
          </h1>
          <p className="text-gray-500 mt-1">
            Upload inventory data and get AI-powered purchase order
            recommendations grouped by supplier.
          </p>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 py-8">
        {/* Error banner */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm flex justify-between items-start">
            <span>{error}</span>
            <button
              onClick={() => {
                setError("");
                setState(inventoryData.length > 0 ? "preview" : "upload");
              }}
              className="text-red-400 hover:text-red-600 ml-4"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Upload state */}
        {(state === "upload" || state === "error") && inventoryData.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20">
            <CsvUpload onDataLoaded={handleDataLoaded} onError={handleError} />
          </div>
        )}

        {/* Preview state */}
        {(state === "preview" || state === "error") && inventoryData.length > 0 && (
          <div className="space-y-6">
            <DataPreview data={inventoryData} />
            <div className="flex gap-4">
              <button
                onClick={handleGenerate}
                className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
              >
                Generate PO Recommendations
              </button>
              <button
                onClick={handleStartOver}
                className="px-6 py-3 text-gray-500 hover:text-gray-700 text-sm"
              >
                Start Over
              </button>
            </div>
          </div>
        )}

        {/* Generating state */}
        {state === "generating" && (
          <div className="space-y-6">
            <DataPreview data={inventoryData} dimmed />
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="border border-gray-200 rounded-lg p-6 animate-pulse"
                >
                  <div className="h-5 bg-gray-200 rounded w-48 mb-3"></div>
                  <div className="h-4 bg-gray-100 rounded w-32 mb-4"></div>
                  <div className="space-y-2">
                    {[1, 2, 3].map((j) => (
                      <div key={j} className="h-3 bg-gray-100 rounded"></div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Results state */}
        {state === "results" && result && (
          <div className="pb-20">
            <PoResults
              purchaseOrders={result.purchase_orders}
              inventoryData={inventoryData}
              editedQtys={editedQtys}
              dismissedSkus={dismissedSkus}
              onQtyChange={handleQtyChange}
              onDismiss={handleDismiss}
            />
            <DownloadBar
              purchaseOrders={result.purchase_orders}
              inventoryData={inventoryData}
              editedQtys={editedQtys}
              dismissedSkus={dismissedSkus}
              onStartOver={handleStartOver}
            />
          </div>
        )}
      </div>
    </main>
  );
}
```

- [ ] **Step 4: Verify the app compiles and renders**

```bash
cd E:/claude_pocs/poc-01-po-copilot
npm run dev
```

Expected: App loads at `http://localhost:3000`. Shows hero + upload/sample buttons. Clicking "Try with Sample Data" shows preview table.

- [ ] **Step 5: Commit**

```bash
git add app/page.tsx app/layout.tsx app/globals.css
git commit -m "feat: wire up main page with all states (upload, preview, generating, results)"
```

---

### Task 12: End-to-end test with Gemini API

**Files:** No new files. This is a manual verification task.

- [ ] **Step 1: Ensure `.env` has a valid Gemini API key**

```
GEMINI_API_KEY=<your actual key from Google AI Studio>
```

- [ ] **Step 2: Start dev server and test full flow**

```bash
cd E:/claude_pocs/poc-01-po-copilot
npm run dev
```

Test sequence:
1. Open `http://localhost:3000`
2. Click "Try with Sample Data" → verify preview table renders with 25 rows
3. Click "Generate PO Recommendations" → verify shimmer shows, then results appear
4. Verify results are grouped by supplier (Apex Textiles, Sole Brothers, Urban Accessories, Pacific Denim)
5. Verify urgency tags are color-coded (HIGH=red, MEDIUM=amber, LOW=green)
6. Edit a quantity → verify cost recalculates
7. Dismiss a row → verify it's struck through
8. Click "Download All as CSV" → verify CSV downloads with correct columns
9. Click "Start Over" → verify app resets

- [ ] **Step 3: Fix any issues found during testing**

Address any rendering bugs, API errors, or type mismatches discovered during manual testing.

- [ ] **Step 4: Verify production build**

```bash
cd E:/claude_pocs/poc-01-po-copilot
npm run build
```

Expected: Build succeeds with no errors.

- [ ] **Step 5: Commit any fixes**

```bash
git add -A
git commit -m "fix: address issues found during end-to-end testing"
```

---

### Task 13: README and final polish

**Files:**
- Create: `poc-01-po-copilot/README.md`

- [ ] **Step 1: Write README**

Create `poc-01-po-copilot/README.md`:

```markdown
# Purchase Order Copilot

AI-powered purchase order recommendations for ecommerce inventory management. Upload your inventory CSV and get structured PO recommendations grouped by supplier, with per-SKU urgency scoring and justification.

## Live Demo

> [Deploy link will go here after Vercel deployment]

## How It Works

1. **Upload** your inventory CSV (or try the built-in sample data)
2. **Generate** — Gemini 1.5 Flash analyzes stock levels, sales velocity, lead times, and MOQs
3. **Review & Edit** — adjust quantities, dismiss SKUs, review AI justifications
4. **Download** — export PO recommendations as CSV (combined or per-supplier)

## Architecture

```
Browser (CSV parsing + UI) → Next.js API Route → Gemini 1.5 Flash → Structured JSON → Editable Tables
```

- **Frontend:** Next.js 14 (App Router) + Tailwind CSS
- **AI:** Gemini 1.5 Flash with structured JSON output mode
- **CSV Parsing:** PapaParse (client-side)
- **Hosting:** Vercel (free tier)
- **Database:** None (fully stateless)

## CSV Format

Your CSV needs these columns:

| Column | Type | Description |
|--------|------|-------------|
| `sku` | string | Unique SKU identifier |
| `product_name` | string | Product display name |
| `current_stock` | number | Current inventory quantity |
| `daily_sales_velocity` | number | Average daily units sold |
| `supplier_moq` | number | Minimum order quantity |
| `unit_cost` | number | Cost per unit ($) |
| `lead_time_days` | number | Supplier lead time in days |
| `supplier_name` | string | Supplier name |
| `category` | string | Product category |

A sample CSV with 25 SKUs is included in `sample-data/`.

## Prompt Templates

The AI prompt templates are in `prompts/` — fully visible for transparency:

- `prompts/system.md` — defines PO reasoning rules (urgency thresholds, MOQ handling, coverage horizon)
- `prompts/user.md` — user prompt template

## Setup

```bash
npm install
cp .env.example .env
# Add your Gemini API key to .env
npm run dev
```

Get a free Gemini API key at [Google AI Studio](https://aistudio.google.com/apikey).

## Tech Stack

- Next.js 14 (App Router + TypeScript)
- Tailwind CSS
- Gemini 1.5 Flash (`@google/generative-ai`)
- PapaParse (CSV parsing)
```

- [ ] **Step 2: Commit**

```bash
git add poc-01-po-copilot/README.md
git commit -m "docs: add README with architecture, setup, and CSV format docs"
```

- [ ] **Step 3: Update PORTFOLIO.md status**

Edit `PORTFOLIO.md` — change POC 1 status from `planned` to `deployed` (or `in-progress` if not yet on Vercel).

```bash
git add PORTFOLIO.md
git commit -m "docs: update POC 1 status in portfolio tracker"
```
