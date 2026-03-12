"use client";

import { useState } from "react";
import ReactMarkdown from "react-markdown";
import { AgentCanvas, CANVAS_SECTION_KEYS, SECTION_LABELS } from "@/lib/types";

interface CanvasTabsProps {
  canvas: AgentCanvas;
}

export default function CanvasTabs({ canvas }: CanvasTabsProps) {
  const [activeTab, setActiveTab] = useState<keyof AgentCanvas>("workflow_steps");

  return (
    <div className="w-full max-w-3xl">
      {/* Tab bar */}
      <div className="flex flex-wrap gap-1 mb-4 border-b border-gray-200">
        {CANVAS_SECTION_KEYS.map((key) => (
          <button
            key={key}
            onClick={() => setActiveTab(key)}
            className={`px-3 py-2 text-sm font-medium rounded-t-lg transition-colors ${
              activeTab === key
                ? "bg-blue-600 text-white"
                : "text-gray-600 hover:text-blue-600 hover:bg-blue-50"
            }`}
          >
            {SECTION_LABELS[key]}
          </button>
        ))}
      </div>

      {/* Active tab content */}
      <div className="prose prose-sm max-w-none bg-white border border-gray-200 rounded-lg p-4">
        <ReactMarkdown>{canvas[activeTab]}</ReactMarkdown>
      </div>
    </div>
  );
}
