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
