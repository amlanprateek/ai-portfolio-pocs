"use client";

import { useState } from "react";
import JobInput from "@/components/job-input";
import CanvasTabs from "@/components/canvas-tabs";
import ExportBar from "@/components/export-bar";
import { AgentCanvas, Industry } from "@/lib/types";

type AppState = "input" | "generating" | "canvas" | "error";

export default function Home() {
  const [jobFunction, setJobFunction] = useState("");
  const [industry, setIndustry] = useState<Industry>("Ecommerce");
  const [appState, setAppState] = useState<AppState>("input");
  const [canvas, setCanvas] = useState<AgentCanvas | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleGenerate() {
    setAppState("generating");
    setError(null);

    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jobFunction, industry }),
      });

      if (!res.ok) {
        let errMsg = "Something went wrong. Please try again.";
        try {
          const data = await res.json();
          if (data.error) errMsg = data.error;
        } catch {
          // no JSON body (e.g. 504 timeout)
          if (res.status === 504) {
            errMsg = "Request timed out. Please try again.";
          }
        }
        setError(errMsg);
        setAppState("error");
        return;
      }

      const data = await res.json();
      setCanvas(data.canvas);
      setAppState("canvas");
    } catch {
      setError("Request timed out. Please try again.");
      setAppState("error");
    }
  }

  function handleReset() {
    setAppState("input");
    setCanvas(null);
    setError(null);
  }

  function handleTryAgain() {
    setAppState("input");
    setError(null);
    // preserves jobFunction and industry
  }

  return (
    <main className="min-h-screen bg-gray-50 flex flex-col items-center py-16 px-4">
      <div className="w-full max-w-3xl">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Agent Use-Case Canvas Generator
        </h1>
        <p className="text-gray-500 mb-8">
          Enter a job function and industry to generate a structured AI Agent Use-Case Canvas.
        </p>

        {appState === "input" && (
          <JobInput
            jobFunction={jobFunction}
            industry={industry}
            onJobFunctionChange={setJobFunction}
            onIndustryChange={setIndustry}
            onSubmit={handleGenerate}
            isSubmitting={false}
          />
        )}

        {appState === "generating" && (
          <div className="w-full max-w-3xl space-y-3">
            <p className="text-sm text-gray-500 font-medium">Generating your Agent Canvas...</p>
            {Array.from({ length: 8 }).map((_, i) => (
              <div
                key={i}
                className="h-10 bg-gray-200 rounded-lg animate-pulse"
              />
            ))}
          </div>
        )}

        {appState === "canvas" && canvas && (
          <div className="w-full">
            <CanvasTabs key={JSON.stringify(canvas)} canvas={canvas} />
            <ExportBar canvas={canvas} />
            <button
              onClick={handleReset}
              className="mt-6 px-4 py-2 text-sm font-medium text-blue-600 border border-blue-600 rounded-lg hover:bg-blue-50 transition-colors"
            >
              Generate Another
            </button>
          </div>
        )}

        {appState === "error" && (
          <div className="w-full max-w-2xl">
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
              <p className="text-red-700 text-sm">
                {error ?? "Something went wrong. Please try again."}
              </p>
            </div>
            <button
              onClick={handleTryAgain}
              className="px-4 py-2 text-sm font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Try Again
            </button>
          </div>
        )}
      </div>
    </main>
  );
}
