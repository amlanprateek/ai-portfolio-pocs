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
                    {col === "unit_cost"
                      ? `$${(row[col] as number).toFixed(2)}`
                      : String(row[col])}
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
