"use client";

import { Recommendation } from "@/lib/types";

interface PoTableRowProps {
  recommendation: Recommendation;
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
  recommendation: r,
  dismissed,
  onQtyChange,
  onDismiss,
}: PoTableRowProps) {
  return (
    <tr className={`${dismissed ? "opacity-40" : ""} hover:bg-gray-50`}>
      <td className="px-3 py-2 font-mono text-sm">
        <span className={dismissed ? "line-through" : ""}>{r.sku}</span>
      </td>
      <td className="px-3 py-2 text-sm">
        <span className={dismissed ? "line-through" : ""}>{r.product_name}</span>
      </td>
      <td className="px-3 py-2 text-sm text-right">
        {r.days_of_stock_remaining < 0 ? "N/A" : r.days_of_stock_remaining.toFixed(1)}
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
            if (!isNaN(val) && val >= 0) onQtyChange(r.sku, val);
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
          className="text-xs text-gray-400 hover:text-red-500 transition-colors whitespace-nowrap"
        >
          {dismissed ? "Restore" : "Dismiss"}
        </button>
      </td>
    </tr>
  );
}
