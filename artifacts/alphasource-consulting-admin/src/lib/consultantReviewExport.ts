import type {
  AdminAnalysisData,
  StructuredAnalysis,
  StructuredEvidenceItem,
  StructuredProviderStatus,
  StructuredRankedFinding,
} from "@/lib/types";

export type ConsultantReviewExportSection =
  | "executiveSummary"
  | "rankedFindings"
  | "evidence"
  | "operationalImplications"
  | "recommendedActions"
  | "followUpQuestions"
  | "dataQualityNotes"
  | "implementationPriorities"
  | "consultantChecklist"
  | "suggestedReportSections"
  | "providerStructuredStatuses"
  | "rawAiOutputs";

export type ConsultantReviewExportOptions = Record<ConsultantReviewExportSection, boolean>;

export type ConsultantReviewExportContext = {
  clientEmail?: string | null;
  clientName?: string | null;
  fileName?: string | null;
  generatedAt?: string | null;
  sourceFormat?: string | null;
  toolName?: string | null;
  toolType?: string | null;
  uploadTime?: string | null;
};

export type ConsultantReviewExportInput = {
  context?: ConsultantReviewExportContext;
  options: ConsultantReviewExportOptions;
  providerStatuses?: Array<[string, StructuredProviderStatus | null]>;
  rawOutputs?: Array<[string, string]>;
  structuredAnalysis: StructuredAnalysis;
};

export const consultantReviewExportDefaults: ConsultantReviewExportOptions = {
  executiveSummary: true,
  rankedFindings: true,
  evidence: true,
  operationalImplications: true,
  recommendedActions: true,
  followUpQuestions: true,
  dataQualityNotes: true,
  implementationPriorities: true,
  consultantChecklist: true,
  suggestedReportSections: true,
  providerStructuredStatuses: false,
  rawAiOutputs: false,
};

export const consultantReviewExportSections: Array<{ key: ConsultantReviewExportSection; label: string }> = [
  { key: "executiveSummary", label: "Executive Summary" },
  { key: "rankedFindings", label: "Ranked Findings" },
  { key: "evidence", label: "Evidence" },
  { key: "operationalImplications", label: "Operational Implications" },
  { key: "recommendedActions", label: "Recommended Actions" },
  { key: "followUpQuestions", label: "Follow-Up Questions" },
  { key: "dataQualityNotes", label: "Data Quality Notes" },
  { key: "implementationPriorities", label: "Implementation Priorities" },
  { key: "consultantChecklist", label: "Consultant Checklist" },
  { key: "suggestedReportSections", label: "Suggested Report Sections" },
  { key: "providerStructuredStatuses", label: "Provider Structured Statuses" },
  { key: "rawAiOutputs", label: "Raw AI Outputs" },
];

export function openConsultantReviewExport(input: ConsultantReviewExportInput): { ok: true } | { ok: false; message: string } {
  const printWindow = window.open("", "_blank");
  if (!printWindow) {
    return { ok: false, message: "Unable to open the export window. Check popup settings and try again." };
  }

  const html = buildConsultantReviewExportHtml(input);
  printWindow.document.open();
  printWindow.document.write(html);
  printWindow.document.close();
  setTimeout(() => {
    printWindow.focus();
    printWindow.print();
  }, 250);
  return { ok: true };
}

export function consultantReviewContextFromAnalysisData(analysisData: AdminAnalysisData): ConsultantReviewExportContext {
  return {
    generatedAt: analysisData.generatedAt,
    sourceFormat: analysisData.sourceFormat,
    toolType: analysisData.structured_analysis?.toolType || analysisData.toolType,
  };
}

function buildConsultantReviewExportHtml({
  context,
  options,
  providerStatuses = [],
  rawOutputs = [],
  structuredAnalysis,
}: ConsultantReviewExportInput): string {
  const exportedAt = new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date());
  const includeFindings = Boolean(
    options.rankedFindings
      || options.evidence
      || options.operationalImplications
      || options.recommendedActions
      || options.followUpQuestions,
  );
  const sections = [
    options.executiveSummary ? consultantReviewExecutiveSummaryHtml(structuredAnalysis) : "",
    includeFindings ? consultantReviewFindingsHtml(structuredAnalysis, options) : "",
    options.dataQualityNotes
      ? consultantReviewListHtml("Data Quality Notes", structuredAnalysis.dataQualityNotes || [])
      : "",
    options.implementationPriorities
      ? consultantReviewListHtml("Implementation Priorities", structuredAnalysis.implementationPriorities || [])
      : "",
    options.consultantChecklist
      ? consultantReviewListHtml("Consultant Checklist", structuredAnalysis.consultantChecklist || [], true)
      : "",
    options.suggestedReportSections
      ? consultantReviewListHtml("Suggested Report Sections", structuredAnalysis.suggestedReportSections || [])
      : "",
    options.providerStructuredStatuses
      ? consultantReviewProviderStatusHtml(providerStatuses)
      : "",
    options.rawAiOutputs
      ? consultantReviewRawOutputsHtml(rawOutputs)
      : "",
  ].filter(Boolean).join("\n");

  return `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Internal Consultant Review</title>
  <style>
    :root {
      color: #0A1547;
      background: #F8F9FD;
      font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
    }
    * { box-sizing: border-box; }
    body { margin: 0; background: #F8F9FD; color: #0A1547; }
    .page { max-width: 980px; margin: 0 auto; padding: 36px 28px; }
    .brand { color: #A380F6; font-size: 12px; font-weight: 900; letter-spacing: 0.16em; text-transform: uppercase; }
    h1 { margin: 8px 0 8px; font-size: 30px; line-height: 1.15; color: #0A1547; }
    h2 { margin: 0 0 14px; font-size: 18px; color: #0A1547; }
    h3 { margin: 0; font-size: 15px; color: #0A1547; }
    p { margin: 0; line-height: 1.55; }
    .note { display: inline-block; margin-top: 10px; border: 1px solid rgba(163, 128, 246, 0.28); border-radius: 999px; padding: 7px 12px; background: #fff; font-size: 12px; font-weight: 800; color: rgba(10, 21, 71, 0.72); }
    .meta { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 10px; margin-top: 18px; }
    .meta-item, .card, .finding, .raw-block { border: 1px solid rgba(10, 21, 71, 0.1); border-radius: 14px; background: #fff; }
    .meta-item { padding: 10px 12px; }
    .label { font-size: 10px; font-weight: 900; letter-spacing: 0.12em; text-transform: uppercase; color: rgba(10, 21, 71, 0.45); }
    .value { margin-top: 4px; font-size: 13px; font-weight: 800; overflow-wrap: anywhere; }
    section { margin-top: 22px; }
    .card { padding: 16px; }
    .summary-grid, .fact-grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 10px; }
    .finding { padding: 16px; margin-top: 12px; break-inside: avoid; }
    .pills { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 10px; }
    .pill { border-radius: 999px; border: 1px solid rgba(163, 128, 246, 0.3); background: rgba(163, 128, 246, 0.1); padding: 5px 9px; font-size: 11px; font-weight: 900; }
    .pill.green { border-color: rgba(2, 217, 157, 0.3); background: rgba(2, 217, 157, 0.1); }
    .pill.red { border-color: rgba(220, 38, 38, 0.24); background: rgba(254, 242, 242, 1); color: #991b1b; }
    .text-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px; margin-top: 12px; }
    .evidence-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 10px; margin-top: 10px; }
    ul { margin: 10px 0 0; padding-left: 20px; }
    li { margin: 6px 0; line-height: 1.5; }
    pre { white-space: pre-wrap; overflow-wrap: anywhere; border-radius: 12px; background: #0A1547; color: #fff; padding: 12px; font-size: 11px; line-height: 1.5; }
    .raw-note { margin: 8px 0 10px; color: rgba(10, 21, 71, 0.62); font-size: 12px; font-weight: 700; }
    @media print {
      body { background: #fff; }
      .page { padding: 0; }
      .card, .finding, .raw-block, .meta-item { box-shadow: none; }
      @page { margin: 0.45in; }
    }
    @media (max-width: 720px) {
      .meta, .summary-grid, .fact-grid, .text-grid, .evidence-grid { grid-template-columns: 1fr; }
    }
  </style>
</head>
<body>
  <main class="page">
    <div class="brand">alphaSource Consulting</div>
    <h1>Internal Consultant Review</h1>
    <p class="note">Internal working document. Not a client-facing report.</p>
    <div class="meta">
      ${consultantReviewMetaItemHtml("Client", context?.clientName || context?.clientEmail)}
      ${consultantReviewMetaItemHtml("Tool", context?.toolName || formatStructuredLabel(structuredAnalysis.toolType || context?.toolType))}
      ${consultantReviewMetaItemHtml("Source format", formatStructuredLabel(context?.sourceFormat || "processed"))}
      ${consultantReviewMetaItemHtml("File", context?.fileName)}
      ${consultantReviewMetaItemHtml("Uploaded", formatDate(context?.uploadTime || null))}
      ${consultantReviewMetaItemHtml("Processed at", formatDate(context?.generatedAt || null))}
      ${consultantReviewMetaItemHtml("Exported at", exportedAt)}
    </div>
    ${sections || consultantReviewEmptySectionHtml("No selected export sections contained available review content.")}
  </main>
</body>
</html>`;
}

function consultantReviewExecutiveSummaryHtml(structuredAnalysis: StructuredAnalysis): string {
  const summary = structuredAnalysis.executiveSummary || {};
  if (!summary.summary && !summary.primaryConcern && !summary.recommendedFocus) {
    return consultantReviewEmptySectionHtml("No executive summary is available.", "Executive Summary");
  }

  return `<section>
    <h2>Executive Summary</h2>
    <div class="summary-grid">
      ${consultantReviewCardHtml("Summary", summary.summary)}
      ${consultantReviewCardHtml("Primary concern", summary.primaryConcern)}
      ${consultantReviewCardHtml("Recommended focus", summary.recommendedFocus)}
    </div>
  </section>`;
}

function consultantReviewFindingsHtml(
  structuredAnalysis: StructuredAnalysis,
  options: ConsultantReviewExportOptions,
): string {
  const findings = (structuredAnalysis.rankedFindings || []).filter(hasFindingContent);
  if (findings.length === 0) {
    return consultantReviewEmptySectionHtml("No ranked findings are available.", "Ranked Findings");
  }

  return `<section>
    <h2>Ranked Findings</h2>
    ${findings.map((finding, index) => consultantReviewFindingHtml(finding, index + 1, options)).join("\n")}
  </section>`;
}

function consultantReviewFindingHtml(
  finding: StructuredRankedFinding,
  fallbackRank: number,
  options: ConsultantReviewExportOptions,
): string {
  const rank = finding.rank || fallbackRank;
  const detailCards = options.rankedFindings
    ? `<div class="fact-grid">
        ${consultantReviewCardHtml("Category", formatStructuredLabel(finding.category))}
        ${consultantReviewCardHtml("Severity", formatStructuredLabel(finding.severity))}
        ${consultantReviewCardHtml("Confidence", formatStructuredLabel(finding.confidence))}
        ${consultantReviewCardHtml("Impact category", formatStructuredLabel(finding.estimatedImpactCategory))}
        ${consultantReviewCardHtml("Difficulty", formatStructuredLabel(finding.implementationDifficulty))}
        ${consultantReviewCardHtml("Financial value", finding.financialValue)}
      </div>`
    : "";
  const evidenceHtml = options.evidence ? consultantReviewEvidenceHtml(finding.evidence || []) : "";
  const textBlocks = [
    options.operationalImplications
      ? consultantReviewTextBlockHtml("Operational implication", finding.operationalImplication)
      : "",
    options.recommendedActions
      ? consultantReviewTextBlockHtml("Recommended action", finding.recommendedAction)
      : "",
    options.followUpQuestions
      ? consultantReviewTextBlockHtml("Follow-up question", finding.followUpQuestion)
      : "",
  ].filter(Boolean).join("\n");
  const clientSummary = options.rankedFindings && finding.clientFacingSummary
    ? consultantReviewTextBlockHtml("Client-facing summary", finding.clientFacingSummary)
    : "";
  const internalNotes = options.rankedFindings && finding.internalReviewerNotes
    ? consultantReviewTextBlockHtml("Internal reviewer notes", finding.internalReviewerNotes)
    : "";

  return `<article class="finding">
    <p class="label">Finding ${escapeHtml(String(rank))}</p>
    <h3>${exportText(finding.title)}</h3>
    ${detailCards}
    ${evidenceHtml}
    ${(textBlocks || clientSummary || internalNotes) ? `<div class="text-grid">${textBlocks}${clientSummary}${internalNotes}</div>` : ""}
  </article>`;
}

function consultantReviewEvidenceHtml(items: StructuredEvidenceItem[]): string {
  if (items.length === 0) {
    return "";
  }

  return `<div style="margin-top: 12px;">
    <p class="label">Evidence</p>
    <div class="evidence-grid">
      ${items.map((item) => consultantReviewCardHtml(
        item.label || "Evidence",
        [item.value, item.sourceHint].filter(Boolean).join(" · "),
      )).join("\n")}
    </div>
  </div>`;
}

function consultantReviewListHtml(title: string, items: string[], checklist = false): string {
  if (items.length === 0) {
    return consultantReviewEmptySectionHtml(`No ${title.toLowerCase()} are available.`, title);
  }

  return `<section>
    <h2>${escapeHtml(title)}</h2>
    <div class="card">
      <ul>
        ${items.map((item) => `<li>${checklist ? "☐ " : ""}${exportText(item)}</li>`).join("\n")}
      </ul>
    </div>
  </section>`;
}

function consultantReviewProviderStatusHtml(providerStatuses: Array<[string, StructuredProviderStatus | null]>): string {
  if (providerStatuses.length === 0) {
    return consultantReviewEmptySectionHtml("No structured provider statuses are available.", "Provider Structured Statuses");
  }

  return `<section>
    <h2>Provider Structured Statuses</h2>
    <div class="card">
      <div class="pills">
        ${providerStatuses.map(([provider, status]) => (
          `<span class="pill ${status?.status === "parsed" ? "green" : ""}">${escapeHtml(formatProviderName(provider))}: ${exportText(formatStructuredLabel(status?.status || "missing"))}</span>`
        )).join("\n")}
      </div>
    </div>
  </section>`;
}

function consultantReviewRawOutputsHtml(rawOutputs: Array<[string, string]>): string {
  if (rawOutputs.length === 0) {
    return consultantReviewEmptySectionHtml("No raw AI outputs are available.", "Raw AI Outputs");
  }

  return `<section>
    <h2>Raw AI Outputs</h2>
    <p class="raw-note">Internal-only raw AI output. Review carefully before using any language outside the team.</p>
    ${rawOutputs.map(([provider, output]) => (
      `<div class="raw-block" style="padding: 14px; margin-top: 10px;">
        <h3>${escapeHtml(formatProviderName(provider))}</h3>
        <pre>${exportText(output)}</pre>
      </div>`
    )).join("\n")}
  </section>`;
}

function consultantReviewMetaItemHtml(label: string, value: string | null | undefined): string {
  return `<div class="meta-item">
    <p class="label">${escapeHtml(label)}</p>
    <p class="value">${exportText(value)}</p>
  </div>`;
}

function consultantReviewCardHtml(label: string, value: string | null | undefined): string {
  return `<div class="card">
    <p class="label">${escapeHtml(label)}</p>
    <p class="value">${exportText(value)}</p>
  </div>`;
}

function consultantReviewTextBlockHtml(label: string, value: string | null | undefined): string {
  if (!value) {
    return "";
  }

  return `<div>
    <p class="label">${escapeHtml(label)}</p>
    <p>${exportText(value)}</p>
  </div>`;
}

function consultantReviewEmptySectionHtml(message: string, title?: string): string {
  return `<section>
    ${title ? `<h2>${escapeHtml(title)}</h2>` : ""}
    <div class="card">
      <p>${escapeHtml(message)}</p>
    </div>
  </section>`;
}

function hasFindingContent(finding: StructuredRankedFinding): boolean {
  return Boolean(
    finding.title
      || finding.operationalImplication
      || finding.recommendedAction
      || finding.clientFacingSummary
      || finding.internalReviewerNotes,
  );
}

function formatDate(value: string | null): string {
  if (!value) {
    return "—";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function formatProviderName(value: string): string {
  if (value.toLowerCase() === "xai") {
    return "xAI";
  }

  return value
    .replace(/_/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function formatStructuredLabel(value: string | null | undefined): string {
  if (!value) {
    return "—";
  }

  return value
    .replace(/_/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function exportText(value: string | number | null | undefined): string {
  if (value === null || value === undefined || value === "") {
    return "—";
  }

  return escapeHtml(redactExportText(String(value)));
}

function redactExportText(value: string): string {
  const sensitivePattern = /\b(signed[_\s-]?url|checkout[_\s-]?url|token|secret|api[_\s-]?key|password|gcs[_\s-]?path|gs[_\s-]?path|object[_\s-]?name|storage\/v1\/object)\b|gs:\/\/|https?:\/\/\S+/i;
  return value
    .split(/\r?\n/)
    .map((line) => (sensitivePattern.test(line) ? "[redacted sensitive/internal value]" : line))
    .join("\n");
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
