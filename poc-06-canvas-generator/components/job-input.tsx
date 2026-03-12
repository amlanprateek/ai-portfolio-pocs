"use client";

import { ALLOWED_INDUSTRIES, Industry } from "@/lib/types";

interface JobInputProps {
  jobFunction: string;
  industry: Industry;
  onJobFunctionChange: (value: string) => void;
  onIndustryChange: (value: Industry) => void;
  onSubmit: () => void;
  isSubmitting: boolean;
}

export default function JobInput({
  jobFunction,
  industry,
  onJobFunctionChange,
  onIndustryChange,
  onSubmit,
  isSubmitting,
}: JobInputProps) {
  const trimmed = jobFunction.trim();
  const tooLong = trimmed.length > 200;
  const isEmpty = trimmed.length === 0;
  const isDisabled = isEmpty || isSubmitting;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (tooLong || isDisabled) return;
    onSubmit();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 w-full max-w-2xl">
      <div>
        <label htmlFor="job-function" className="block text-sm font-medium text-gray-700 mb-1">
          Job Function
        </label>
        <input
          id="job-function"
          type="text"
          value={jobFunction}
          onChange={(e) => onJobFunctionChange(e.target.value)}
          placeholder="e.g. Purchasing Manager at a fashion ecommerce brand"
          maxLength={200}
          className="w-full border border-gray-300 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        {tooLong && (
          <p className="mt-1 text-xs text-red-600">
            Job function must be 200 characters or fewer.
          </p>
        )}
      </div>

      <div>
        <label htmlFor="industry" className="block text-sm font-medium text-gray-700 mb-1">
          Industry
        </label>
        <select
          id="industry"
          value={industry}
          onChange={(e) => onIndustryChange(e.target.value as Industry)}
          className="w-full border border-gray-300 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          {ALLOWED_INDUSTRIES.map((ind) => (
            <option key={ind} value={ind}>
              {ind}
            </option>
          ))}
        </select>
      </div>

      <button
        type="submit"
        disabled={isDisabled || tooLong}
        className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-semibold py-2 px-6 rounded-lg transition-colors"
      >
        Generate Canvas
      </button>
    </form>
  );
}
