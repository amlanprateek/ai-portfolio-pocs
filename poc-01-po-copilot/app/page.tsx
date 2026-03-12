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
  // Lifted state shared between PoResults and DownloadBar
  const [editedQtys, setEditedQtys] = useState<Record<string, number>>({});
  const [dismissedSkus, setDismissedSkus] = useState<Set<string>>(new Set());

  const handleQtyChange = useCallback((sku: string, qty: number) => {
    setEditedQtys((prev) => ({ ...prev, [sku]: qty }));
  }, []);

  const handleDismiss = useCallback((sku: string) => {
    setDismissedSkus((prev) => {
      const next = new Set(prev);
      if (next.has(sku)) { next.delete(sku); } else { next.add(sku); }
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

  const showPreview = state === "preview" || (state === "error" && inventoryData.length > 0);
  const showUpload = state === "upload" || (state === "error" && inventoryData.length === 0);

  return (
    <main className="min-h-screen bg-white">
      <div className="border-b border-gray-200 bg-white">
        <div className="max-w-6xl mx-auto px-6 py-6">
          <h1 className="text-2xl font-bold text-gray-900">Purchase Order Copilot</h1>
          <p className="text-gray-500 mt-1">
            Upload inventory data and get AI-powered purchase order recommendations grouped by supplier.
          </p>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 py-8">
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm flex justify-between items-start">
            <span>{error}</span>
            <button
              onClick={() => {
                setError("");
                setState(inventoryData.length > 0 ? "preview" : "upload");
              }}
              className="text-red-400 hover:text-red-600 ml-4 flex-shrink-0"
            >
              Dismiss
            </button>
          </div>
        )}

        {showUpload && (
          <div className="flex flex-col items-center justify-center py-16">
            <CsvUpload onDataLoaded={handleDataLoaded} onError={handleError} />
          </div>
        )}

        {showPreview && (
          <div className="space-y-6">
            <DataPreview data={inventoryData} />
            <div className="flex gap-4 items-center">
              <button
                onClick={handleGenerate}
                className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
              >
                Generate PO Recommendations
              </button>
              <button
                onClick={handleStartOver}
                className="text-sm text-gray-500 hover:text-gray-700"
              >
                Start Over
              </button>
            </div>
          </div>
        )}

        {state === "generating" && (
          <div className="space-y-6">
            <DataPreview data={inventoryData} dimmed />
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="border border-gray-200 rounded-lg p-6 animate-pulse">
                  <div className="h-5 bg-gray-200 rounded w-48 mb-3" />
                  <div className="h-4 bg-gray-100 rounded w-32 mb-4" />
                  <div className="space-y-2">
                    {[1, 2, 3].map((j) => (
                      <div key={j} className="h-3 bg-gray-100 rounded" />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

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
