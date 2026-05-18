import { useState } from "react";
import {
  consultantReviewExportDefaults,
  consultantReviewExportSections,
  openConsultantReviewExport,
  type ConsultantReviewExportContext,
  type ConsultantReviewExportOptions,
  type ConsultantReviewExportSection,
} from "@/lib/consultantReviewExport";
import type { StructuredAnalysis, StructuredProviderStatus } from "@/lib/types";

type ConsultantReviewExportControlsProps = {
  buttonLabel?: string;
  context?: ConsultantReviewExportContext;
  providerStatuses?: Array<[string, StructuredProviderStatus | null]>;
  rawOutputs?: Array<[string, string]>;
  structuredAnalysis: StructuredAnalysis;
};

export function ConsultantReviewExportControls({
  buttonLabel = "Export consultant review",
  context,
  providerStatuses = [],
  rawOutputs = [],
  structuredAnalysis,
}: ConsultantReviewExportControlsProps) {
  const [exportOpen, setExportOpen] = useState(false);
  const [exportOptions, setExportOptions] = useState<ConsultantReviewExportOptions>(
    () => ({ ...consultantReviewExportDefaults }),
  );
  const [exportError, setExportError] = useState("");
  const selectedExportCount = Object.values(exportOptions).filter(Boolean).length;

  function updateExportOption(key: ConsultantReviewExportSection, checked: boolean) {
    setExportError("");
    setExportOptions((current) => ({ ...current, [key]: checked }));
  }

  function setAllExportOptions(checked: boolean) {
    setExportError("");
    setExportOptions(
      consultantReviewExportSections.reduce(
        (next, section) => ({ ...next, [section.key]: checked }),
        {} as ConsultantReviewExportOptions,
      ),
    );
  }

  function resetExportOptions() {
    setExportError("");
    setExportOptions({ ...consultantReviewExportDefaults });
  }

  function exportConsultantReview() {
    if (selectedExportCount === 0) {
      setExportError("Select at least one section before exporting.");
      return;
    }

    const result = openConsultantReviewExport({
      context,
      options: exportOptions,
      providerStatuses,
      rawOutputs,
      structuredAnalysis,
    });
    if (!result.ok) {
      setExportError(result.message);
    }
  }

  return (
    <div>
      <button
        type="button"
        onClick={() => {
          setExportError("");
          setExportOpen((open) => !open);
        }}
        className="admin-focus w-fit rounded-xl border border-[#A380F6]/30 bg-white px-3 py-2 text-xs font-extrabold text-[#0A1547] transition hover:border-[#A380F6]/60 hover:bg-[#A380F6]/10"
      >
        {buttonLabel}
      </button>

      {exportOpen && (
        <div className="mt-4 rounded-2xl border border-[#A380F6]/20 bg-[#F8F9FD] p-4">
          <div className="flex flex-col gap-2 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <p className="text-sm font-black text-[#0A1547]">Export options</p>
              <p className="mt-1 text-sm font-semibold leading-6 text-[#0A1547]/62">
                Choose which sections to include in the internal consultant review export.
              </p>
              <p className="mt-1 text-xs font-bold leading-5 text-[#0A1547]/48">
                Raw AI outputs are internal-only and excluded by default.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setAllExportOptions(true)}
                className="admin-focus rounded-lg border border-[#0A1547]/10 bg-white px-3 py-1.5 text-xs font-extrabold text-[#0A1547] hover:bg-[#A380F6]/10"
              >
                Select all
              </button>
              <button
                type="button"
                onClick={() => setAllExportOptions(false)}
                className="admin-focus rounded-lg border border-[#0A1547]/10 bg-white px-3 py-1.5 text-xs font-extrabold text-[#0A1547] hover:bg-[#A380F6]/10"
              >
                Clear all
              </button>
              <button
                type="button"
                onClick={resetExportOptions}
                className="admin-focus rounded-lg border border-[#0A1547]/10 bg-white px-3 py-1.5 text-xs font-extrabold text-[#0A1547] hover:bg-[#A380F6]/10"
              >
                Reset defaults
              </button>
            </div>
          </div>

          <div className="mt-4 grid gap-2 md:grid-cols-2 lg:grid-cols-3">
            {consultantReviewExportSections.map((section) => (
              <label
                key={section.key}
                className="flex cursor-pointer items-center gap-3 rounded-xl border border-[#0A1547]/10 bg-white px-3 py-2 text-sm font-bold text-[#0A1547]/72"
              >
                <input
                  type="checkbox"
                  checked={exportOptions[section.key]}
                  onChange={(event) => updateExportOption(section.key, event.target.checked)}
                  className="h-4 w-4 rounded border-[#0A1547]/20 text-[#A380F6]"
                />
                <span>{section.label}</span>
              </label>
            ))}
          </div>

          {exportError && (
            <p className="mt-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-700">
              {exportError}
            </p>
          )}

          <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={() => {
                setExportError("");
                setExportOpen(false);
              }}
              className="admin-focus rounded-xl border border-[#0A1547]/10 bg-white px-4 py-2 text-sm font-extrabold text-[#0A1547] transition hover:bg-white"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={exportConsultantReview}
              className="admin-focus rounded-xl bg-[#0A1547] px-4 py-2 text-sm font-extrabold text-white transition hover:bg-[#1A2460]"
            >
              Export
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
