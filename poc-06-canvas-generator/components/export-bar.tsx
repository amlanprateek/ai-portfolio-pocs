"use client";

import { AgentCanvas, CANVAS_SECTION_KEYS, SECTION_LABELS } from "@/lib/types";

interface ExportBarProps {
  canvas: AgentCanvas;
}

function assembleMarkdown(canvas: AgentCanvas): string {
  return CANVAS_SECTION_KEYS.map(
    (key) => `## ${SECTION_LABELS[key]}\n\n${canvas[key]}`
  ).join("\n\n");
}

export default function ExportBar({ canvas }: ExportBarProps) {
  async function handleCopy() {
    const md = assembleMarkdown(canvas);
    await navigator.clipboard.writeText(md);
  }

  function handleDownload() {
    const md = assembleMarkdown(canvas);
    const blob = new Blob([md], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "agent-canvas.md";
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="flex gap-3 mt-4">
      <button
        onClick={handleCopy}
        className="px-4 py-2 text-sm font-medium border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
      >
        Copy Markdown
      </button>
      <button
        onClick={handleDownload}
        className="px-4 py-2 text-sm font-medium bg-gray-800 text-white rounded-lg hover:bg-gray-700 transition-colors"
      >
        Download .md
      </button>
    </div>
  );
}
