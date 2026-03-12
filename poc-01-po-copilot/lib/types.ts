import { SchemaType } from "@google/generative-ai";

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
