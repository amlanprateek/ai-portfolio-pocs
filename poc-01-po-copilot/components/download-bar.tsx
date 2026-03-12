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

  const unitCostMap: Record<string, number> = {};
  inventoryData.forEach((row) => { unitCostMap[row.sku] = row.unit_cost; });

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
      const safeName = po.supplier_name.replace(/[^a-zA-Z0-9]/g, "_");
      downloadFile(
        buildCsvContent(recs.map((rec) => ({ supplier_name: po.supplier_name, rec }))),
        `PO_${safeName}_${date}.csv`
      );
    });
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 px-6 py-3 flex items-center justify-between shadow-lg z-10">
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
