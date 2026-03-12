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
  const unitCostMap = useMemo(() => {
    const map: Record<string, number> = {};
    inventoryData.forEach((row) => { map[row.sku] = row.unit_cost; });
    return map;
  }, [inventoryData]);

  const getEffectiveRecommendation = (r: Recommendation): Recommendation => {
    if (r.sku in editedQtys) {
      const qty = editedQtys[r.sku];
      const unitCost =
        unitCostMap[r.sku] ??
        (r.recommended_order_qty > 0 ? r.estimated_cost / r.recommended_order_qty : 0);
      return { ...r, recommended_order_qty: qty, estimated_cost: qty * unitCost };
    }
    return r;
  };

  return (
    <div className="space-y-6">
      {purchaseOrders.map((po) => {
        const effectiveRecs = po.recommendations.map(getEffectiveRecommendation);
        const activeRecs = effectiveRecs.filter((r) => !dismissedSkus.has(r.sku));
        const totalCost = activeRecs.reduce((sum, r) => sum + r.estimated_cost, 0);
        const allMoqMet = activeRecs.every((r) => {
          const inv = inventoryData.find((i) => i.sku === r.sku);
          return !inv || r.recommended_order_qty >= inv.supplier_moq || r.recommended_order_qty === 0;
        });

        return (
          <div key={po.supplier_name} className="border border-gray-200 rounded-lg overflow-hidden">
            <div className="bg-gray-50 px-4 py-3 flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-gray-900">{po.supplier_name}</h3>
                <p className="text-sm text-gray-500">
                  {activeRecs.length} SKUs &middot; Total: ${totalCost.toFixed(2)}
                </p>
              </div>
              <span
                className={`px-2 py-1 rounded text-xs font-medium ${
                  allMoqMet ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
                }`}
              >
                MOQ {allMoqMet ? "Met" : "Not Met"}
              </span>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="bg-white border-b border-gray-200">
                  <tr>
                    {["SKU", "Product", "Days Left", "Urgency", "Order Qty", "Est. Cost", "Justification", ""].map((h) => (
                      <th key={h} className="px-3 py-2 text-left font-medium text-gray-600 whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {effectiveRecs.map((rec) => (
                    <PoTableRow
                      key={rec.sku}
                      recommendation={rec}
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
