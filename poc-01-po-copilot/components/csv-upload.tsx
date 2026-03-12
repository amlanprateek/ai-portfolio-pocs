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

      // Reset so same file can be re-uploaded
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    },
    [onDataLoaded, onError]
  );

  const handleDrop = useCallback(
    async (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      const file = e.dataTransfer.files?.[0];
      if (!file) return;
      if (!file.name.endsWith(".csv")) {
        onError("Please upload a .csv file.");
        return;
      }
      const result = await parseAndValidateCsv(file);
      if (result.success) {
        onDataLoaded(result.data);
      } else {
        onError(result.error);
      }
    },
    [onDataLoaded, onError]
  );

  const handleSampleData = useCallback(() => {
    onDataLoaded(sampleData);
  }, [onDataLoaded]);

  return (
    <div className="flex flex-col items-center gap-6 w-full max-w-lg">
      <div
        onDrop={handleDrop}
        onDragOver={(e) => e.preventDefault()}
        onClick={() => fileInputRef.current?.click()}
        className="w-full border-2 border-dashed border-gray-300 rounded-xl p-12 text-center cursor-pointer hover:border-blue-400 hover:bg-blue-50 transition-colors"
      >
        <div className="text-gray-400 text-4xl mb-3">↑</div>
        <p className="text-gray-600 font-medium">Drop your CSV here or click to upload</p>
        <p className="text-gray-400 text-sm mt-1">Max 200 rows</p>
      </div>
      <div className="flex items-center gap-4 w-full">
        <div className="flex-1 border-t border-gray-200" />
        <span className="text-gray-400 text-sm">or</span>
        <div className="flex-1 border-t border-gray-200" />
      </div>
      <button
        onClick={handleSampleData}
        className="w-full px-6 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors font-medium border border-gray-300"
      >
        Try with Sample Data
      </button>
      <input
        ref={fileInputRef}
        type="file"
        accept=".csv"
        onChange={handleFileChange}
        className="hidden"
      />
      <p className="text-xs text-gray-400 text-center">
        Required columns: sku, product_name, current_stock, daily_sales_velocity,
        supplier_moq, unit_cost, lead_time_days, supplier_name, category
      </p>
    </div>
  );
}
