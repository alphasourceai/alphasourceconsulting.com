import { useCallback, useEffect, useMemo, useState } from "react";
import { useAuth } from "@/auth/AuthProvider";
import { AdminApiError, generatePdfReport, getPdfGeneratorClient, getPdfGeneratorOptions } from "@/lib/adminApi";
import type {
  GeneratePdfReportRequest,
  PdfGeneratorClientOption,
  PdfGeneratorClientResponse,
  PdfGeneratorMetadata,
  PdfGeneratorStructuredDraft,
  PdfGeneratorStructuredEvidence,
  PdfGeneratorStructuredExecutiveSummary,
  PdfGeneratorStructuredFinding,
  PdfGeneratorUpload,
} from "@/lib/types";

function formatNullable(value: string | number | boolean | null | undefined): string {
  if (value === null || value === undefined || value === "") {
    return "-";
  }

  if (typeof value === "boolean") {
    return value ? "Yes" : "No";
  }

  return String(value);
}

function formatDate(value: string | null): string {
  if (!value) {
    return "-";
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

function warningLabel(value: string): string {
  return value.replaceAll("_", " ");
}

function cleanClientReportText(value: string): string {
  return value
    .trim()
    .replace(/^\s*[-*•]\s+/, "")
    .replace(/^\s*(trend|key trend|data note|implementation priority|report section to consider)\s*:\s*/i, "")
    .replace(/[*_`]+/g, "")
    .replace(/\s{2,}/g, " ")
    .replace(/^[\s-]+|[\s-]+$/g, "");
}

function pdfLink(upload: PdfGeneratorUpload): string {
  return upload.pdf.signedUrl || upload.pdf.pdfUrl || "";
}

function generatedPdfLink(result: PdfGenerationResult | null): string {
  return result?.pdf.signedUrl || result?.pdf.pdfUrl || "";
}

type DraftOpportunity = {
  id: string;
  selected: boolean;
  title: string;
  impact: string;
  recommendation: string;
};

type DraftTextItem = {
  id: string;
  selected: boolean;
  text: string;
};

type DraftExecutiveSummary = {
  selected: boolean;
  summary: string;
  primaryConcern: string;
  recommendedFocus: string;
};

type DraftEvidenceItem = {
  label: string;
  value: string;
  sourceHint: string;
};

type DraftRankedFinding = {
  id: string;
  selected: boolean;
  rank: number;
  title: string;
  category: string;
  severity: string;
  confidence: string;
  estimatedImpactCategory: string;
  implementationDifficulty: string;
  financialValue: string;
  evidence: DraftEvidenceItem[];
  clientFacingSummary: string;
  operationalImplication: string;
  recommendedAction: string;
};

type ReportDraft = {
  source: "legacy" | "structured";
  uploadId: string;
  opportunities: DraftOpportunity[];
  trends: DraftTextItem[];
  keyTrends: DraftTextItem[];
  additionalNotes: string;
  executiveSummary?: DraftExecutiveSummary;
  rankedFindings?: DraftRankedFinding[];
  structuredTrends?: DraftTextItem[];
  actionPlanItems?: DraftTextItem[];
  dataNotes?: DraftTextItem[];
};

type PdfGenerationResult = {
  uploadId: string;
  pdf: PdfGeneratorMetadata;
  warnings: string[];
};

type PdfGenerationError = {
  uploadId: string;
  message: string;
};

function createReportDraft(upload: PdfGeneratorUpload): ReportDraft {
  if (hasStructuredDraft(upload.analysis.structured)) {
    return createStructuredReportDraft(upload);
  }

  return {
    source: "legacy",
    uploadId: upload.id,
    opportunities: upload.analysis.opportunities.map((opportunity, index) => ({
      id: `opportunity-${upload.id}-${index}`,
      selected: false,
      title: opportunity.title || "",
      impact: opportunity.impact || "",
      recommendation: opportunity.recommendation || "",
    })),
    trends: upload.analysis.trends.map((trend, index) => ({
      id: `trend-${upload.id}-${index}`,
      selected: false,
      text: trend,
    })),
    keyTrends: upload.analysis.keyTrends.map((trend, index) => ({
      id: `key-trend-${upload.id}-${index}`,
      selected: false,
      text: trend,
    })),
    additionalNotes: "",
  };
}

function hasStructuredDraft(value: PdfGeneratorStructuredDraft | null | undefined): value is PdfGeneratorStructuredDraft {
  return Boolean(value?.available);
}

function createStructuredReportDraft(upload: PdfGeneratorUpload): ReportDraft {
  const uploadId = upload.id;
  const structured = upload.analysis.structured as PdfGeneratorStructuredDraft;
  const sortedFindings = [...(structured.rankedFindings ?? [])].sort((left, right) => (
    (left.rank ?? Number.MAX_SAFE_INTEGER) - (right.rank ?? Number.MAX_SAFE_INTEGER)
  ));
  const executiveSummary = structured.executiveSummary ?? {};
  const implementationPriorities = structured.implementationPriorities ?? [];
  const structuredTrends = curateStructuredTrends([
    ...(upload.analysis.keyTrends ?? []),
    ...(upload.analysis.trends ?? []),
  ]);

  return {
    source: "structured",
    uploadId,
    opportunities: sortedFindings
      .map((finding, index) => structuredFindingToOpportunity(uploadId, finding, index))
      .filter((item) => item.title || item.impact || item.recommendation),
    trends: [],
    keyTrends: [],
    additionalNotes: "",
    executiveSummary: structuredExecutiveSummary(executiveSummary),
    rankedFindings: sortedFindings.map((finding, index) => structuredFindingToDraftFinding(uploadId, finding, index)),
    structuredTrends: structuredListItems("trend", uploadId, structuredTrends),
    actionPlanItems: structuredListItems("priority", uploadId, implementationPriorities),
    dataNotes: structuredListItems("data-note", uploadId, structured.dataQualityNotes ?? []),
  };
}

function structuredFindingToOpportunity(
  uploadId: string,
  finding: PdfGeneratorStructuredFinding,
  index: number,
): DraftOpportunity {
  const evidenceSummary = structuredEvidenceSummary(finding.evidence ?? []);
  const financialSummary = finding.financialValue ? `Financial value: ${finding.financialValue}` : "";
  return {
    id: `structured-opportunity-${uploadId}-${finding.id || finding.rank || index}`,
    selected: true,
    title: finding.title || `Opportunity ${index + 1}`,
    impact: finding.clientFacingSummary
      || finding.operationalImplication
      || [financialSummary, evidenceSummary].filter(Boolean).join(" | "),
    recommendation: finding.recommendedAction || "",
  };
}

function structuredEvidenceSummary(items: PdfGeneratorStructuredEvidence[]): string {
  return items
    .map((item) => [item.label, item.value, item.sourceHint].filter(Boolean).join(": "))
    .filter(Boolean)
    .join(" | ");
}

function structuredExecutiveSummary(summary: PdfGeneratorStructuredExecutiveSummary): DraftExecutiveSummary {
  const item = {
    selected: Boolean(summary.summary || summary.primaryConcern || summary.recommendedFocus),
    summary: summary.summary?.trim() ?? "",
    primaryConcern: summary.primaryConcern?.trim() ?? "",
    recommendedFocus: summary.recommendedFocus?.trim() ?? "",
  };
  return item;
}

function structuredFindingToDraftFinding(
  uploadId: string,
  finding: PdfGeneratorStructuredFinding,
  index: number,
): DraftRankedFinding {
  return {
    id: `structured-finding-${uploadId}-${finding.id || finding.rank || index}`,
    selected: true,
    rank: finding.rank ?? index + 1,
    title: finding.title?.trim() || `Finding ${index + 1}`,
    category: finding.category?.trim() ?? "",
    severity: finding.severity?.trim() ?? "",
    confidence: finding.confidence?.trim() ?? "",
    estimatedImpactCategory: finding.estimatedImpactCategory?.trim() ?? "",
    implementationDifficulty: finding.implementationDifficulty?.trim() ?? "",
    financialValue: finding.financialValue?.trim() ?? "",
    evidence: (finding.evidence ?? [])
      .map((item) => ({
        label: item.label?.trim() ?? "",
        value: item.value?.trim() ?? "",
        sourceHint: item.sourceHint?.trim() ?? "",
      }))
      .filter((item) => item.label || item.value || item.sourceHint),
    clientFacingSummary: finding.clientFacingSummary?.trim() ?? "",
    operationalImplication: finding.operationalImplication?.trim() ?? "",
    recommendedAction: finding.recommendedAction?.trim() ?? "",
  };
}

function structuredListItems(prefix: string, uploadId: string, values: string[]): DraftTextItem[] {
  return values
    .map((value, index) => cleanClientReportText(value) ? ({
      id: `structured-${prefix}-${uploadId}-${index}`,
      selected: true,
      text: cleanClientReportText(value),
    }) : null)
    .filter((item): item is DraftTextItem => item !== null);
}

function trendTopicKey(value: string): string {
  const normalized = value.toLowerCase().replace(/[^a-z0-9\s]/g, " ").replace(/\s+/g, " ").trim();
  const topics: Array<[string, string[]]> = [
    ["gross production", ["gross", "production"]],
    ["net production", ["net", "production"]],
    ["writeoffs", ["writeoff"]],
    ["adjustments", ["adjustment"]],
    ["collections", ["collection"]],
    ["labor", ["labor"]],
    ["payroll", ["payroll"]],
    ["hygiene", ["hygiene"]],
  ];
  const match = topics.find(([, markers]) => markers.every((marker) => normalized.includes(marker)));
  return match?.[0] ?? normalized.slice(0, 90);
}

function curateStructuredTrends(values: string[]): string[] {
  const seen = new Set<string>();
  const items: string[] = [];
  values.forEach((value) => {
    const text = cleanClientReportText(value);
    const key = trendTopicKey(text);
    if (!text || seen.has(key)) {
      return;
    }
    seen.add(key);
    items.push(text);
  });
  return items.slice(0, 7);
}

function createGeneratePdfPayload(draft: ReportDraft): Omit<GeneratePdfReportRequest, "uploadId"> {
  const payload: Omit<GeneratePdfReportRequest, "uploadId"> = {
    opportunities: draft.opportunities
      .filter((item) => item.selected)
      .map((item) => ({
        title: item.title.trim(),
        impact: item.impact.trim(),
        recommendation: item.recommendation.trim(),
      }))
      .filter((item) => item.title || item.impact || item.recommendation),
    trends: draft.trends
      .filter((item) => item.selected)
      .map((item) => item.text.trim())
      .filter(Boolean),
    keyTrends: draft.keyTrends
      .filter((item) => item.selected)
      .map((item) => item.text.trim())
      .filter(Boolean),
    additionalNotes: draft.additionalNotes.trim(),
  };

  if (draft.source === "structured") {
    const executiveSummary = draft.executiveSummary;
    payload.executiveSummary = executiveSummary?.selected ? {
      summary: executiveSummary.summary.trim(),
      primaryConcern: executiveSummary.primaryConcern.trim(),
      recommendedFocus: executiveSummary.recommendedFocus.trim(),
    } : null;
    payload.rankedFindings = (draft.rankedFindings ?? [])
      .filter((item) => item.selected)
      .map((item, index) => ({
        rank: index + 1,
        title: item.title.trim(),
        category: item.category.trim(),
        severity: item.severity.trim(),
        confidence: item.confidence.trim(),
        estimatedImpactCategory: item.estimatedImpactCategory.trim(),
        implementationDifficulty: item.implementationDifficulty.trim(),
        financialValue: item.financialValue.trim(),
        evidence: item.evidence
          .map((evidence) => ({
            label: evidence.label.trim(),
            value: evidence.value.trim(),
            sourceHint: evidence.sourceHint.trim(),
          }))
          .filter((evidence) => evidence.label || evidence.value || evidence.sourceHint),
        clientFacingSummary: item.clientFacingSummary.trim(),
        operationalImplication: item.operationalImplication.trim(),
        recommendedAction: item.recommendedAction.trim(),
      }))
      .filter((item) => (
        item.title ||
        item.financialValue ||
        item.clientFacingSummary ||
        item.operationalImplication ||
        item.recommendedAction ||
        (item.evidence?.length ?? 0) > 0
      ));
    payload.structuredTrends = (draft.structuredTrends ?? [])
      .filter((item) => item.selected)
      .map((item) => item.text.trim())
      .filter(Boolean);
    payload.actionPlanItems = (draft.actionPlanItems ?? [])
      .filter((item) => item.selected)
      .map((item) => item.text.trim())
      .filter(Boolean);
    payload.dataNotes = (draft.dataNotes ?? [])
      .filter((item) => item.selected)
      .map((item) => item.text.trim())
      .filter(Boolean);
  }

  return payload;
}

function hasGeneratePdfContent(payload: Omit<GeneratePdfReportRequest, "uploadId">): boolean {
  const summary = payload.executiveSummary;
  const hasExecutiveSummary = Boolean(summary && (
    summary.summary ||
    summary.primaryConcern ||
    summary.recommendedFocus
  ));

  return (
    payload.opportunities.length > 0 ||
    payload.trends.length > 0 ||
    payload.keyTrends.length > 0 ||
    hasExecutiveSummary ||
    (payload.rankedFindings?.length ?? 0) > 0 ||
    (payload.structuredTrends?.length ?? 0) > 0 ||
    (payload.actionPlanItems?.length ?? 0) > 0 ||
    (payload.dataNotes?.length ?? 0) > 0 ||
    Boolean(payload.additionalNotes)
  );
}

export default function PDFGeneratorPage() {
  const { permissions, session } = useAuth();
  const [options, setOptions] = useState<PdfGeneratorClientOption[]>([]);
  const [selectedEmail, setSelectedEmail] = useState("");
  const [clientData, setClientData] = useState<PdfGeneratorClientResponse | null>(null);
  const [selectedUploadId, setSelectedUploadId] = useState("");
  const [reportDraft, setReportDraft] = useState<ReportDraft | null>(null);
  const [loadingOptions, setLoadingOptions] = useState(true);
  const [loadingClient, setLoadingClient] = useState(false);
  const [optionsError, setOptionsError] = useState("");
  const [clientError, setClientError] = useState("");
  const [generatingUploadId, setGeneratingUploadId] = useState("");
  const [generationError, setGenerationError] = useState<PdfGenerationError | null>(null);
  const [generationResult, setGenerationResult] = useState<PdfGenerationResult | null>(null);
  const [uploadsExpanded, setUploadsExpanded] = useState(false);

  const token = session?.access_token || "";
  const canGeneratePdf = permissions.canGeneratePdf;

  const loadOptions = useCallback(async (signal?: AbortSignal) => {
    if (!token) {
      return;
    }

    setLoadingOptions(true);
    setOptionsError("");

    try {
      const response = await getPdfGeneratorOptions(token, signal);
      setOptions(response.clients);
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") {
        return;
      }

      if (error instanceof AdminApiError) {
        setOptionsError(error.message);
      } else {
        setOptionsError("PDF Reports clients could not be loaded.");
      }
    } finally {
      if (!signal?.aborted) {
        setLoadingOptions(false);
      }
    }
  }, [token]);

  const loadClient = useCallback(async (email: string, signal?: AbortSignal) => {
    if (!token || !email) {
      return;
    }

    setLoadingClient(true);
    setClientError("");

    try {
      const response = await getPdfGeneratorClient(token, email, signal);
      setClientData(response);
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") {
        return;
      }

      if (error instanceof AdminApiError) {
        setClientError(error.message);
      } else {
        setClientError("PDF Reports client details could not be loaded.");
      }
    } finally {
      if (!signal?.aborted) {
        setLoadingClient(false);
      }
    }
  }, [token]);

  useEffect(() => {
    const controller = new AbortController();
    void loadOptions(controller.signal);

    return () => {
      controller.abort();
    };
  }, [loadOptions]);

  useEffect(() => {
    if (!selectedEmail) {
      setClientData(null);
      setClientError("");
      setSelectedUploadId("");
      setReportDraft(null);
      setGenerationError(null);
      setGenerationResult(null);
      return;
    }

    setClientData(null);
    setSelectedUploadId("");
    setReportDraft(null);
    setGenerationError(null);
    setGenerationResult(null);
    setUploadsExpanded(false);

    const controller = new AbortController();
    void loadClient(selectedEmail, controller.signal);

    return () => {
      controller.abort();
    };
  }, [loadClient, selectedEmail]);

  useEffect(() => {
    const uploads = clientData?.uploads ?? [];
    if (uploads.length === 0) {
      setSelectedUploadId("");
      return;
    }

    if (!uploads.some((upload) => upload.id === selectedUploadId)) {
      setSelectedUploadId(uploads[0].id);
    }
  }, [clientData, selectedUploadId]);

  const selectedUpload = useMemo(() => {
    if (clientData?.clientEmail !== selectedEmail) {
      return null;
    }

    return clientData.uploads.find((upload) => upload.id === selectedUploadId) ?? null;
  }, [clientData, selectedEmail, selectedUploadId]);

  useEffect(() => {
    if (clientData?.clientEmail !== selectedEmail) {
      setReportDraft(null);
      return;
    }

    const upload = clientData?.uploads.find((item) => item.id === selectedUploadId) ?? null;
    setReportDraft(upload ? createReportDraft(upload) : null);
  }, [clientData?.clientEmail, selectedEmail, selectedUploadId]);

  useEffect(() => {
    setGenerationError(null);
    setGenerationResult(null);
  }, [selectedEmail, selectedUploadId]);

  const handleGeneratePdf = useCallback(async () => {
    if (!canGeneratePdf || generatingUploadId || !token || !selectedUpload || !reportDraft || reportDraft.uploadId !== selectedUpload.id) {
      return;
    }

    const draftPayload = createGeneratePdfPayload(reportDraft);
    if (!hasGeneratePdfContent(draftPayload)) {
      setGenerationError({
        uploadId: selectedUpload.id,
        message: "Select at least one report section or add notes before generating.",
      });
      return;
    }

    const uploadId = selectedUpload.id;
    setGeneratingUploadId(uploadId);
    setGenerationError(null);
    setGenerationResult(null);

    try {
      const response = await generatePdfReport(token, {
        uploadId,
        ...draftPayload,
      });

      setClientData((current) => {
        if (!current || current.clientEmail !== selectedEmail) {
          return current;
        }

        return {
          ...current,
          uploads: current.uploads.map((upload) => (
            upload.id === response.upload.id ? response.upload : upload
          )),
        };
      });
      setGenerationResult({
        uploadId: response.upload.id,
        pdf: response.pdf,
        warnings: response.warnings ?? [],
      });
    } catch (error) {
      if (error instanceof AdminApiError) {
        setGenerationError({ uploadId, message: error.message });
      } else {
        setGenerationError({ uploadId, message: "PDF could not be generated. Please try again." });
      }
    } finally {
      setGeneratingUploadId((current) => (current === uploadId ? "" : current));
    }
  }, [canGeneratePdf, generatingUploadId, reportDraft, selectedEmail, selectedUpload, token]);

  return (
    <div className="space-y-6">
      <section className="admin-card p-5">
        <div className="grid gap-4 lg:grid-cols-[1fr_380px] lg:items-end">
          <div>
            <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-[#A380F6]">Client selection</p>
            <h3 className="mt-2 text-lg font-black text-[#0A1547]">Search eligible clients</h3>
            <p className="mt-1 text-sm font-medium leading-6 text-[#0A1547]/60">
              Choose a client with published analysis uploads to edit draft report content.
            </p>
          </div>

          <label>
            <span className="text-xs font-extrabold uppercase tracking-[0.16em] text-[#0A1547]/45">Client</span>
            <select
              value={selectedEmail}
              onChange={(event) => setSelectedEmail(event.target.value)}
              disabled={loadingOptions || options.length === 0}
              className="admin-focus mt-2 w-full rounded-xl border border-[#0A1547]/10 bg-[#F8F9FD] px-4 py-3 text-sm font-semibold text-[#0A1547]"
            >
              <option value="">Select a client</option>
              {options.map((option) => (
                <option key={option.email} value={option.email}>
                  {option.email} ({option.eligibleUploadCount} uploads)
                </option>
              ))}
            </select>
          </label>
        </div>
      </section>

      {loadingOptions && (
        <div className="admin-card p-8 text-center text-sm font-medium text-[#0A1547]/60">
          Loading PDF Reports options...
        </div>
      )}

      {optionsError && !loadingOptions && (
        <ErrorState message={optionsError} />
      )}

      {!loadingOptions && !optionsError && options.length === 0 && (
        <EmptyState
          title="No eligible uploads found"
          description="Published analysis uploads with parsed analysis data will appear here."
        />
      )}

      {selectedEmail && (
        <div className="space-y-6">
          <ClientSummary
            option={options.find((option) => option.email === selectedEmail)}
            clientData={clientData}
            loading={loadingClient}
          />

          {loadingClient && (
            <div className="admin-card p-8 text-center text-sm font-medium text-[#0A1547]/60">
              Loading client uploads...
            </div>
          )}

          {clientError && !loadingClient && (
            <ErrorState message={clientError} />
          )}

          {clientData && !loadingClient && !clientError && clientData.uploads.length === 0 && (
            <EmptyState
              title="No eligible uploads for this client"
              description="The client was found, but no uploads with parsed analysis data were returned."
            />
          )}

          {clientData && !loadingClient && !clientError && clientData.uploads.length > 0 && (
            <UploadList
              expanded={uploadsExpanded}
              onExpandedChange={setUploadsExpanded}
              uploads={clientData.uploads}
              selectedUploadId={selectedUploadId}
              onSelect={setSelectedUploadId}
            />
          )}

          {selectedUpload ? (
            <UploadDetail
              canGeneratePdf={canGeneratePdf}
              upload={selectedUpload}
              draft={reportDraft}
              generationError={generationError?.uploadId === selectedUpload.id ? generationError.message : ""}
              generationResult={generationResult?.uploadId === selectedUpload.id ? generationResult : null}
              generating={Boolean(generatingUploadId)}
              onGeneratePdf={handleGeneratePdf}
              onDraftChange={setReportDraft}
              onResetDraft={() => setReportDraft(createReportDraft(selectedUpload))}
            />
          ) : (
            <EmptyState
              title="Select an upload"
              description="Choose an eligible upload to preview opportunities, trends, and existing PDF metadata."
            />
          )}
        </div>
      )}
    </div>
  );
}

function ClientSummary({
  clientData,
  loading,
  option,
}: {
  clientData: PdfGeneratorClientResponse | null;
  loading: boolean;
  option: PdfGeneratorClientOption | undefined;
}) {
  return (
    <section className="admin-card p-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-[#0A1547]/45">Selected client</p>
          <h3 className="mt-2 break-all text-xl font-black text-[#0A1547]">
            {option?.email ?? clientData?.clientEmail ?? "-"}
          </h3>
        </div>
        <span className="rounded-full border border-[#02ABE0]/20 bg-[#02ABE0]/10 px-3 py-1 text-xs font-extrabold text-[#0A1547]">
          Admin PDF
        </span>
      </div>

      <dl className="mt-5 grid gap-3 text-sm sm:grid-cols-2">
        <Detail label="Eligible uploads" value={clientData?.count ?? option?.eligibleUploadCount ?? 0} />
        <Detail label="Submissions" value={clientData?.submissions.length ?? option?.submissionCount ?? 0} />
        <Detail label="Latest submitted" value={formatDate(option?.latestSubmittedAt ?? null)} />
        <Detail label="Latest upload" value={formatNullable(option?.latestUploadTime)} />
      </dl>

      {loading && (
        <p className="mt-4 rounded-xl bg-[#F8F9FD] px-4 py-3 text-sm font-medium text-[#0A1547]/58">
          Refreshing client records...
        </p>
      )}
    </section>
  );
}

function UploadList({
  expanded,
  onExpandedChange,
  onSelect,
  selectedUploadId,
  uploads,
}: {
  expanded: boolean;
  onExpandedChange: (expanded: boolean) => void;
  onSelect: (uploadId: string) => void;
  selectedUploadId: string;
  uploads: PdfGeneratorUpload[];
}) {
  const visibleUploads = expanded ? uploads : uploads.slice(0, 2);
  const hasMoreUploads = uploads.length > 2;

  return (
    <section className="admin-card p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-lg font-black text-[#0A1547]">Eligible uploads</h3>
          <p className="mt-1 text-sm font-medium text-[#0A1547]/58">
            Choose an upload to edit draft content and generate a stored PDF.
          </p>
        </div>
        <span className="rounded-full border border-[#0A1547]/10 bg-[#F8F9FD] px-3 py-1 text-xs font-extrabold text-[#0A1547]/65">
          {uploads.length}
        </span>
      </div>

      <div className="mt-4 grid gap-3">
        {visibleUploads.map((upload) => (
          <article
            key={upload.id}
            className={`rounded-2xl border text-left transition ${
              upload.id === selectedUploadId
                ? "border-[#A380F6]/70 bg-[#A380F6]/10"
                : "border-[#0A1547]/10 bg-[#F8F9FD] hover:border-[#02ABE0]/40"
            }`}
          >
            <button
              type="button"
              onClick={() => onSelect(upload.id)}
              className="admin-focus grid w-full grid-cols-[minmax(0,1fr)_auto] items-start gap-3 rounded-2xl p-3 text-left"
            >
              <div className="min-w-0 pr-1">
                <p className="break-words text-sm font-black leading-5 text-[#0A1547]">{formatNullable(upload.fileName)}</p>
                <p className="mt-1 truncate text-xs font-semibold uppercase tracking-[0.12em] text-[#0A1547]/45">
                  {formatNullable(upload.toolName)}
                </p>
              </div>
              <span className={`shrink-0 whitespace-nowrap rounded-full border px-3 py-1 text-xs font-extrabold leading-none ${upload.paid ? "border-[#02D99D]/30 bg-[#02D99D]/12 text-[#0A1547]" : "border-[#0A1547]/10 bg-white text-[#0A1547]/62"}`}>
                {upload.paid ? "Paid" : "Unpaid"}
              </span>
            </button>

            <details className="border-t border-[#0A1547]/10 px-3 py-2">
              <summary className="cursor-pointer text-xs font-extrabold uppercase tracking-[0.14em] text-[#0A1547]/45">
                Upload details
              </summary>
              <dl className="mt-3 grid gap-3 text-sm sm:grid-cols-2">
                <Detail label="Upload time" value={formatNullable(upload.uploadTime)} />
                <Detail label="PDF version" value={upload.pdf.pdfVersion > 0 ? upload.pdf.pdfVersion : "-"} />
                <Detail label="PDF generated" value={formatDate(upload.pdf.pdfGeneratedAt)} />
                <Detail label="Warnings" value={upload.warnings.length} />
              </dl>
              {upload.warnings.length > 0 && (
                <WarningList warnings={upload.warnings} />
              )}
            </details>
          </article>
        ))}
      </div>

      {hasMoreUploads && (
        <div className="mt-4 flex justify-end">
          <button
            type="button"
            onClick={() => onExpandedChange(!expanded)}
            className="admin-focus rounded-xl border border-[#0A1547]/10 bg-white px-4 py-2 text-sm font-extrabold text-[#0A1547] transition hover:border-[#A380F6]/60"
          >
            {expanded ? "Show less" : `Show all (${uploads.length})`}
          </button>
        </div>
      )}
    </section>
  );
}

function UploadDetail({
  canGeneratePdf,
  draft,
  generationError,
  generationResult,
  generating,
  onDraftChange,
  onGeneratePdf,
  onResetDraft,
  upload,
}: {
  canGeneratePdf: boolean;
  draft: ReportDraft | null;
  generationError: string;
  generationResult: PdfGenerationResult | null;
  generating: boolean;
  onDraftChange: (draft: ReportDraft) => void;
  onGeneratePdf: () => void;
  onResetDraft: () => void;
  upload: PdfGeneratorUpload;
}) {
  const openUrl = pdfLink(upload);
  const activeDraft = draft?.uploadId === upload.id ? draft : null;
  const [previewOpen, setPreviewOpen] = useState(false);

  useEffect(() => {
    setPreviewOpen(false);
  }, [upload.id]);

  return (
    <article className="admin-card overflow-hidden">
      <div className="border-b border-[#0A1547]/10 p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="text-xs font-extrabold uppercase tracking-[0.18em] text-[#A380F6]">Upload preview</p>
            <h3 className="mt-2 break-words text-2xl font-black text-[#0A1547]">{formatNullable(upload.fileName)}</h3>
            <p className="mt-2 text-sm font-medium text-[#0A1547]/60">{formatNullable(upload.toolName)}</p>
          </div>
          {openUrl && (
            <a
              href={openUrl}
              target="_blank"
              rel="noreferrer"
              className="admin-focus rounded-xl bg-[#0A1547] px-4 py-2 text-sm font-extrabold text-white transition hover:bg-[#1A2460]"
            >
              Open Existing PDF
            </a>
          )}
        </div>

        <dl className="mt-5 grid gap-3 text-sm sm:grid-cols-2 xl:grid-cols-3">
          <Detail label="Upload time" value={formatNullable(upload.uploadTime)} />
          <Detail label="Paid status" value={upload.paid ? "Paid" : "Unpaid"} />
          <Detail label="PDF version" value={upload.pdf.pdfVersion > 0 ? upload.pdf.pdfVersion : "-"} />
          <Detail label="PDF generated" value={formatDate(upload.pdf.pdfGeneratedAt)} />
          <Detail label="Existing PDF URL" value={upload.pdf.pdfUrl ? "Available" : "-"} />
          <Detail label="Signed URL" value={upload.pdf.signedUrl ? "Available" : "-"} />
        </dl>

        {upload.warnings.length > 0 && (
          <WarningList warnings={upload.warnings} />
        )}
      </div>

      <div className="grid gap-5 p-5">
        {activeDraft ? (
          <>
            <DraftBuilder draft={activeDraft} onChange={onDraftChange} onReset={onResetDraft} />
            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => setPreviewOpen(true)}
                className="admin-focus rounded-xl border border-[#02ABE0]/35 bg-white px-4 py-2 text-sm font-extrabold text-[#0A1547] transition hover:border-[#02ABE0]"
              >
                Preview draft
              </button>
            </div>
            {canGeneratePdf ? (
              <GeneratePdfPanel
                draft={activeDraft}
                error={generationError}
                generating={generating}
                onGenerate={onGeneratePdf}
                result={generationResult}
              />
            ) : (
              <section className="rounded-2xl border border-[#A380F6]/25 bg-[#A380F6]/10 p-4">
                <p className="text-sm font-black text-[#0A1547]">Read-only PDF access</p>
                <p className="mt-1 text-sm font-medium leading-6 text-[#0A1547]/62">
                  You can inspect PDF Reports data and draft content. Generate actions are hidden unless your role includes PDF generation permission.
                </p>
              </section>
            )}
          </>
        ) : (
          <p className="rounded-2xl bg-[#F8F9FD] p-4 text-sm font-medium text-[#0A1547]/56">
            Preparing draft builder...
          </p>
        )}

        <details className="rounded-2xl border border-[#0A1547]/10 bg-[#F8F9FD] px-4 py-3">
          <summary className="cursor-pointer text-xs font-extrabold uppercase tracking-[0.16em] text-[#0A1547]/50">
            Technical details
          </summary>
          <dl className="mt-4 grid gap-3 text-sm md:grid-cols-2">
            <Detail label="Upload ID" value={upload.id} />
            <Detail label="Submission ID" value={upload.submissionId} />
            <Detail label="Report path" value={upload.pdf.reportPath} />
            <Detail label="Client email" value={upload.clientEmail} />
          </dl>
        </details>
      </div>

      {activeDraft && previewOpen && (
        <DraftPreviewModal
          draft={activeDraft}
          onClose={() => setPreviewOpen(false)}
          upload={upload}
        />
      )}
    </article>
  );
}

function GeneratePdfPanel({
  draft,
  error,
  generating,
  onGenerate,
  result,
}: {
  draft: ReportDraft;
  error: string;
  generating: boolean;
  onGenerate: () => void;
  result: PdfGenerationResult | null;
}) {
  const payload = createGeneratePdfPayload(draft);
  const canGenerate = hasGeneratePdfContent(payload);
  const openUrl = generatedPdfLink(result);

  return (
    <section className="rounded-2xl border border-[#02D99D]/25 bg-[#02D99D]/8 p-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <p className="text-xs font-extrabold uppercase tracking-[0.18em] text-[#02D99D]">Generate PDF</p>
          <h4 className="mt-2 text-lg font-black text-[#0A1547]">Create stored PDF from draft</h4>
          <p className="mt-1 text-sm font-medium leading-6 text-[#0A1547]/62">
            This updates the upload PDF metadata only. Paid status, email, GHL, and report delivery are untouched.
          </p>
        </div>
        <button
          type="button"
          onClick={onGenerate}
          disabled={!canGenerate || generating}
          className="admin-focus rounded-xl bg-[#0A1547] px-4 py-2 text-sm font-extrabold text-white transition hover:bg-[#1A2460] disabled:cursor-not-allowed disabled:opacity-55"
        >
          {generating ? "Generating PDF…" : "Generate PDF"}
        </button>
      </div>

      {!canGenerate && (
        <p className="mt-4 rounded-xl bg-white px-4 py-3 text-sm font-medium text-[#0A1547]/58">
          Select at least one report section or add notes to generate a PDF.
        </p>
      )}

      {error && (
        <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-700">
          {error}
        </div>
      )}

      {result && (
        <div className="mt-4 rounded-2xl border border-[#02D99D]/25 bg-white p-4">
          <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
            <div>
              <p className="text-sm font-semibold text-[#0A1547]">
                PDF generated and stored. No email, GHL update, or report delivery was triggered.
              </p>
              <dl className="mt-3 grid gap-3 text-sm sm:grid-cols-2">
                <Detail label="PDF version" value={result.pdf.pdfVersion} />
                <Detail label="PDF generated" value={formatDate(result.pdf.pdfGeneratedAt)} />
              </dl>
            </div>
            {openUrl && (
              <a
                href={openUrl}
                target="_blank"
                rel="noreferrer"
                className="admin-focus rounded-xl bg-[#02ABE0] px-4 py-2 text-sm font-extrabold text-white transition hover:bg-[#0096C9]"
              >
                Open PDF
              </a>
            )}
          </div>

          {result.warnings.length > 0 && (
            <WarningList warnings={result.warnings} />
          )}
        </div>
      )}
    </section>
  );
}

function DraftBuilder({
  draft,
  onChange,
  onReset,
}: {
  draft: ReportDraft;
  onChange: (draft: ReportDraft) => void;
  onReset: () => void;
}) {
  if (draft.source === "structured") {
    return (
      <StructuredDraftBuilder
        draft={draft}
        onChange={onChange}
        onReset={onReset}
      />
    );
  }

  const updateOpportunity = (id: string, patch: Partial<DraftOpportunity>) => {
    onChange({
      ...draft,
      opportunities: draft.opportunities.map((item) => (
        item.id === id ? { ...item, ...patch } : item
      )),
    });
  };

  const moveOpportunity = (id: string, direction: -1 | 1) => {
    const currentIndex = draft.opportunities.findIndex((item) => item.id === id);
    const nextIndex = currentIndex + direction;
    if (currentIndex < 0 || nextIndex < 0 || nextIndex >= draft.opportunities.length) {
      return;
    }

    const nextOpportunities = [...draft.opportunities];
    const [item] = nextOpportunities.splice(currentIndex, 1);
    nextOpportunities.splice(nextIndex, 0, item);
    onChange({ ...draft, opportunities: nextOpportunities });
  };

  const updateTextItem = (section: "keyTrends" | "trends", id: string, patch: Partial<DraftTextItem>) => {
    onChange({
      ...draft,
      [section]: draft[section].map((item) => (
        item.id === id ? { ...item, ...patch } : item
      )),
    });
  };

  return (
    <section className="rounded-2xl border border-[#A380F6]/20 bg-[#A380F6]/8 p-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <p className="text-xs font-extrabold uppercase tracking-[0.18em] text-[#A380F6]">Draft builder only</p>
          <h4 className="mt-2 text-lg font-black text-[#0A1547]">Edit report draft content</h4>
          <p className="mt-1 text-sm font-medium leading-6 text-[#0A1547]/62">
            These edits are used for this PDF generation request only and are not saved back to the analysis data.
          </p>
        </div>
        <button
          type="button"
          onClick={onReset}
          className="admin-focus rounded-xl border border-[#0A1547]/10 bg-white px-4 py-2 text-sm font-extrabold text-[#0A1547] transition hover:border-[#A380F6]/60"
        >
          Reset
        </button>
      </div>

      <div className="mt-5 grid gap-5">
        <DraftOpportunityEditor
          items={draft.opportunities}
          onChange={updateOpportunity}
          onMove={moveOpportunity}
        />
        <DraftTextEditor
          emptyText="No key trends were returned for this upload."
          items={draft.keyTrends}
          label="Key trends"
          onChange={(id, patch) => updateTextItem("keyTrends", id, patch)}
        />
        <DraftTextEditor
          emptyText="No trends were returned for this upload."
          items={draft.trends}
          label="Trends"
          onChange={(id, patch) => updateTextItem("trends", id, patch)}
        />
        <label className="block">
          <span className="text-xs font-semibold uppercase tracking-[0.14em] text-[#0A1547]/45">Additional notes</span>
          <textarea
            value={draft.additionalNotes}
            onChange={(event) => onChange({ ...draft, additionalNotes: event.target.value })}
            rows={4}
            placeholder="Add optional notes for this PDF report."
            className="admin-focus mt-2 w-full resize-y rounded-xl border border-[#0A1547]/10 bg-white px-4 py-3 text-sm font-medium leading-6 text-[#0A1547] placeholder:text-[#0A1547]/38"
          />
        </label>
      </div>
    </section>
  );
}

function StructuredDraftBuilder({
  draft,
  onChange,
  onReset,
}: {
  draft: ReportDraft;
  onChange: (draft: ReportDraft) => void;
  onReset: () => void;
}) {
  const updateExecutiveSummary = (patch: Partial<DraftExecutiveSummary>) => {
    const current = draft.executiveSummary ?? {
      selected: false,
      summary: "",
      primaryConcern: "",
      recommendedFocus: "",
    };
    onChange({ ...draft, executiveSummary: { ...current, ...patch } });
  };

  const updateRankedFinding = (id: string, patch: Partial<DraftRankedFinding>) => {
    onChange({
      ...draft,
      rankedFindings: (draft.rankedFindings ?? []).map((item) => (
        item.id === id ? { ...item, ...patch } : item
      )),
    });
  };

  const updateFindingEvidence = (
    findingId: string,
    evidenceIndex: number,
    patch: Partial<DraftEvidenceItem>,
  ) => {
    onChange({
      ...draft,
      rankedFindings: (draft.rankedFindings ?? []).map((finding) => (
        finding.id === findingId
          ? {
              ...finding,
              evidence: finding.evidence.map((evidence, index) => (
                index === evidenceIndex ? { ...evidence, ...patch } : evidence
              )),
            }
          : finding
      )),
    });
  };

  const moveRankedFinding = (id: string, direction: -1 | 1) => {
    const findings = draft.rankedFindings ?? [];
    const currentIndex = findings.findIndex((item) => item.id === id);
    const nextIndex = currentIndex + direction;
    if (currentIndex < 0 || nextIndex < 0 || nextIndex >= findings.length) {
      return;
    }

    const nextFindings = [...findings];
    const [item] = nextFindings.splice(currentIndex, 1);
    nextFindings.splice(nextIndex, 0, item);
    onChange({
      ...draft,
      rankedFindings: nextFindings.map((finding, index) => ({ ...finding, rank: index + 1 })),
    });
  };

  const updateOpportunity = (id: string, patch: Partial<DraftOpportunity>) => {
    onChange({
      ...draft,
      opportunities: draft.opportunities.map((item) => (
        item.id === id ? { ...item, ...patch } : item
      )),
    });
  };

  const moveOpportunity = (id: string, direction: -1 | 1) => {
    const currentIndex = draft.opportunities.findIndex((item) => item.id === id);
    const nextIndex = currentIndex + direction;
    if (currentIndex < 0 || nextIndex < 0 || nextIndex >= draft.opportunities.length) {
      return;
    }

    const nextOpportunities = [...draft.opportunities];
    const [item] = nextOpportunities.splice(currentIndex, 1);
    nextOpportunities.splice(nextIndex, 0, item);
    onChange({ ...draft, opportunities: nextOpportunities });
  };

  const updateStructuredTextItem = (
    section: "structuredTrends" | "actionPlanItems" | "dataNotes",
    id: string,
    patch: Partial<DraftTextItem>,
  ) => {
    onChange({
      ...draft,
      [section]: (draft[section] ?? []).map((item) => (
        item.id === id ? { ...item, ...patch } : item
      )),
    });
  };

  return (
    <section className="rounded-2xl border border-[#A380F6]/20 bg-[#A380F6]/8 p-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <p className="text-xs font-extrabold uppercase tracking-[0.18em] text-[#A380F6]">Structured report draft</p>
          <h4 className="mt-2 text-lg font-black text-[#0A1547]">Edit client-facing report sections</h4>
          <p className="mt-1 text-sm font-medium leading-6 text-[#0A1547]/62">
            This draft was initialized from structured consultant-review output. Review and edit all client-facing language before generating the PDF.
          </p>
          <p className="mt-1 text-xs font-bold leading-5 text-[#0A1547]/48">
            Internal notes, raw AI outputs, provider statuses, and technical metadata are not included.
          </p>
          <div className="mt-3 inline-flex rounded-full border border-[#02D99D]/25 bg-[#02D99D]/10 px-3 py-1 text-xs font-extrabold text-[#0A1547]">
            Structured draft available
          </div>
        </div>
        <button
          type="button"
          onClick={onReset}
          className="admin-focus rounded-xl border border-[#0A1547]/10 bg-white px-4 py-2 text-sm font-extrabold text-[#0A1547] transition hover:border-[#A380F6]/60"
        >
          Reset
        </button>
      </div>

      <div className="mt-5 grid gap-5">
        <StructuredExecutiveSummaryEditor
          item={draft.executiveSummary}
          onChange={updateExecutiveSummary}
        />
        <StructuredRankedFindingsEditor
          items={draft.rankedFindings ?? []}
          onChange={updateRankedFinding}
          onEvidenceChange={updateFindingEvidence}
          onMove={moveRankedFinding}
        />
        <DraftOpportunityEditor
          items={draft.opportunities}
          label="Improvement Opportunities"
          onChange={updateOpportunity}
          onMove={moveOpportunity}
        />
        <DraftTextEditor
          emptyText="No true trend items were returned for this upload."
          itemLabel="Trend"
          items={draft.structuredTrends ?? []}
          label="Key Trends"
          onChange={(id, patch) => updateStructuredTextItem("structuredTrends", id, patch)}
        />
        <DraftTextEditor
          emptyText="No implementation priorities were returned for this upload."
          itemLabel="Action Plan Item"
          items={draft.actionPlanItems ?? []}
          label="30-Day Action Plan"
          onChange={(id, patch) => updateStructuredTextItem("actionPlanItems", id, patch)}
        />
        <DraftTextEditor
          emptyText="No data notes or limitations were returned for this upload."
          itemLabel="Data Note"
          items={draft.dataNotes ?? []}
          label="Data Notes / Limitations"
          onChange={(id, patch) => updateStructuredTextItem("dataNotes", id, patch)}
        />
        <label className="block">
          <span className="text-xs font-semibold uppercase tracking-[0.14em] text-[#0A1547]/45">Additional notes</span>
          <textarea
            value={draft.additionalNotes}
            onChange={(event) => onChange({ ...draft, additionalNotes: event.target.value })}
            rows={4}
            placeholder="Add optional client-facing notes for this PDF report."
            className="admin-focus mt-2 w-full resize-y rounded-xl border border-[#0A1547]/10 bg-white px-4 py-3 text-sm font-medium leading-6 text-[#0A1547] placeholder:text-[#0A1547]/38"
          />
        </label>
      </div>
    </section>
  );
}

function StructuredExecutiveSummaryEditor({
  item,
  onChange,
}: {
  item: DraftExecutiveSummary | undefined;
  onChange: (patch: Partial<DraftExecutiveSummary>) => void;
}) {
  const summary = item ?? {
    selected: false,
    summary: "",
    primaryConcern: "",
    recommendedFocus: "",
  };

  return (
    <section>
      <h5 className="text-sm font-black text-[#0A1547]">Executive Summary</h5>
      <article className="mt-3 rounded-2xl border border-[#0A1547]/10 bg-white p-4">
        <label className="inline-flex items-center gap-2 text-sm font-semibold text-[#0A1547]">
          <input
            type="checkbox"
            checked={summary.selected}
            onChange={(event) => onChange({ selected: event.target.checked })}
            className="h-4 w-4 accent-[#A380F6]"
          />
          Include executive summary
        </label>
        {summary.selected && (
          <div className="mt-3 grid gap-3">
            <DraftTextarea
              label="Summary"
              value={summary.summary}
              onChange={(value) => onChange({ summary: value })}
            />
            <DraftTextarea
              label="Primary concern"
              value={summary.primaryConcern}
              onChange={(value) => onChange({ primaryConcern: value })}
            />
            <DraftTextarea
              label="Recommended focus"
              value={summary.recommendedFocus}
              onChange={(value) => onChange({ recommendedFocus: value })}
            />
          </div>
        )}
      </article>
    </section>
  );
}

function StructuredRankedFindingsEditor({
  items,
  onChange,
  onEvidenceChange,
  onMove,
}: {
  items: DraftRankedFinding[];
  onChange: (id: string, patch: Partial<DraftRankedFinding>) => void;
  onEvidenceChange: (findingId: string, evidenceIndex: number, patch: Partial<DraftEvidenceItem>) => void;
  onMove: (id: string, direction: -1 | 1) => void;
}) {
  return (
    <section>
      <h5 className="text-sm font-black text-[#0A1547]">Ranked Findings</h5>
      {items.length === 0 ? (
        <p className="mt-3 rounded-2xl bg-white p-4 text-sm font-medium text-[#0A1547]/56">
          No ranked findings were returned for this upload.
        </p>
      ) : (
        <div className="mt-3 grid gap-3">
          {items.map((item, index) => (
            <article key={item.id} className="rounded-2xl border border-[#0A1547]/10 bg-white p-3">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                  <label className="inline-flex items-center gap-2 text-sm font-semibold text-[#0A1547]">
                    <input
                      type="checkbox"
                      checked={item.selected}
                      onChange={(event) => onChange(item.id, { selected: event.target.checked })}
                      className="h-4 w-4 accent-[#A380F6]"
                    />
                    Include finding {index + 1}
                  </label>
                  <div className="mt-2 flex flex-wrap gap-2">
                    <DraftBadge label="Category" value={item.category} />
                    <DraftBadge label="Severity" value={item.severity} tone={item.severity} />
                    <DraftBadge label="Confidence" value={item.confidence} />
                    <DraftBadge label="Impact" value={item.estimatedImpactCategory} />
                  </div>
                </div>
                <OpportunityMoveControls
                  disabledDown={index === items.length - 1}
                  disabledUp={index === 0}
                  onMoveDown={() => onMove(item.id, 1)}
                  onMoveUp={() => onMove(item.id, -1)}
                />
              </div>

              {item.selected && (
                <div className="mt-3 grid gap-3">
                  <div className="grid gap-3 md:grid-cols-2">
                    <DraftInput
                      label="Title"
                      value={item.title}
                      onChange={(value) => onChange(item.id, { title: value })}
                    />
                    <DraftInput
                      label="Financial value"
                      value={item.financialValue}
                      onChange={(value) => onChange(item.id, { financialValue: value })}
                    />
                    <DraftInput
                      label="Category"
                      value={item.category}
                      onChange={(value) => onChange(item.id, { category: value })}
                    />
                    <DraftInput
                      label="Severity"
                      value={item.severity}
                      onChange={(value) => onChange(item.id, { severity: value })}
                    />
                    <DraftInput
                      label="Confidence"
                      value={item.confidence}
                      onChange={(value) => onChange(item.id, { confidence: value })}
                    />
                    <DraftInput
                      label="Impact category"
                      value={item.estimatedImpactCategory}
                      onChange={(value) => onChange(item.id, { estimatedImpactCategory: value })}
                    />
                  </div>
                  <DraftTextarea
                    label="Client-facing summary"
                    value={item.clientFacingSummary}
                    onChange={(value) => onChange(item.id, { clientFacingSummary: value })}
                  />
                  <DraftTextarea
                    label="Operational implication"
                    value={item.operationalImplication}
                    onChange={(value) => onChange(item.id, { operationalImplication: value })}
                  />
                  <DraftTextarea
                    label="Recommended action"
                    value={item.recommendedAction}
                    onChange={(value) => onChange(item.id, { recommendedAction: value })}
                  />
                  {item.evidence.length > 0 && (
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#0A1547]/45">Evidence</p>
                      <div className="mt-2 grid gap-2">
                        {item.evidence.map((evidence, evidenceIndex) => (
                          <div key={`${item.id}-evidence-${evidenceIndex}`} className="grid gap-2 rounded-xl bg-[#F8F9FD] p-3 md:grid-cols-3">
                            <DraftInput
                              label="Label"
                              value={evidence.label}
                              onChange={(value) => onEvidenceChange(item.id, evidenceIndex, { label: value })}
                            />
                            <DraftInput
                              label="Value"
                              value={evidence.value}
                              onChange={(value) => onEvidenceChange(item.id, evidenceIndex, { value })}
                            />
                            <DraftInput
                              label="Source"
                              value={evidence.sourceHint}
                              onChange={(value) => onEvidenceChange(item.id, evidenceIndex, { sourceHint: value })}
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </article>
          ))}
        </div>
      )}
    </section>
  );
}

function DraftBadge({ label, tone, value }: { label: string; tone?: string; value: string }) {
  if (!value) {
    return null;
  }
  const toneValue = tone?.toLowerCase() ?? "";
  const className = toneValue.includes("critical") || toneValue.includes("high")
    ? "border-amber-200 bg-amber-50 text-amber-700"
    : toneValue.includes("low")
      ? "border-[#02D99D]/25 bg-[#02D99D]/10 text-[#0A1547]"
      : "border-[#A380F6]/25 bg-[#A380F6]/10 text-[#0A1547]";

  return (
    <span className={`rounded-full border px-2.5 py-1 text-xs font-extrabold capitalize ${className}`}>
      {label}: {warningLabel(value)}
    </span>
  );
}

function DraftOpportunityEditor({
  items,
  label = "Opportunities",
  onChange,
  onMove,
}: {
  items: DraftOpportunity[];
  label?: string;
  onChange: (id: string, patch: Partial<DraftOpportunity>) => void;
  onMove: (id: string, direction: -1 | 1) => void;
}) {
  return (
    <section>
      <h5 className="text-sm font-black text-[#0A1547]">{label}</h5>
      {items.length === 0 ? (
        <p className="mt-3 rounded-2xl bg-white p-4 text-sm font-medium text-[#0A1547]/56">
          No opportunities were returned for this upload.
        </p>
      ) : (
        <div className="mt-3 grid gap-3">
          {items.map((item, index) => (
            <article key={item.id} className="rounded-2xl border border-[#0A1547]/10 bg-white p-3">
              {item.selected ? (
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <label className="inline-flex items-center gap-2 text-sm font-semibold text-[#0A1547]">
                    <input
                      type="checkbox"
                      checked={item.selected}
                      onChange={(event) => onChange(item.id, { selected: event.target.checked })}
                      className="h-4 w-4 accent-[#A380F6]"
                    />
                    Include in draft
                  </label>
                  <OpportunityMoveControls
                    disabledDown={index === items.length - 1}
                    disabledUp={index === 0}
                    onMoveDown={() => onMove(item.id, 1)}
                    onMoveUp={() => onMove(item.id, -1)}
                  />
                </div>
              ) : (
                <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3">
                  <p className="break-words text-sm font-black leading-5 text-[#0A1547]">
                    {formatNullable(item.title)}
                  </p>
                  <div className="flex flex-col items-end gap-2">
                    <label className="inline-flex items-center gap-2 text-sm font-semibold text-[#0A1547]">
                      <input
                        type="checkbox"
                        checked={item.selected}
                        onChange={(event) => onChange(item.id, { selected: event.target.checked })}
                        className="h-4 w-4 accent-[#A380F6]"
                      />
                      Include
                    </label>
                    <OpportunityMoveControls
                      disabledDown={index === items.length - 1}
                      disabledUp={index === 0}
                      onMoveDown={() => onMove(item.id, 1)}
                      onMoveUp={() => onMove(item.id, -1)}
                    />
                  </div>
                </div>
              )}

              {item.selected && (
                <div className="mt-3 grid gap-3">
                  <DraftInput
                    label="Title"
                    value={item.title}
                    onChange={(value) => onChange(item.id, { title: value })}
                  />
                  <DraftTextarea
                    label="Impact"
                    value={item.impact}
                    onChange={(value) => onChange(item.id, { impact: value })}
                  />
                  <DraftTextarea
                    label="Recommendation"
                    value={item.recommendation}
                    onChange={(value) => onChange(item.id, { recommendation: value })}
                  />
                </div>
              )}
            </article>
          ))}
        </div>
      )}
    </section>
  );
}

function OpportunityMoveControls({
  disabledDown,
  disabledUp,
  onMoveDown,
  onMoveUp,
}: {
  disabledDown: boolean;
  disabledUp: boolean;
  onMoveDown: () => void;
  onMoveUp: () => void;
}) {
  return (
    <div className="flex shrink-0 gap-2">
      <button
        type="button"
        onClick={onMoveUp}
        disabled={disabledUp}
        className="admin-focus rounded-lg border border-[#0A1547]/10 bg-[#F8F9FD] px-2.5 py-1 text-xs font-extrabold text-[#0A1547]/70 transition hover:border-[#A380F6]/50 disabled:cursor-not-allowed disabled:opacity-40"
      >
        Move up
      </button>
      <button
        type="button"
        onClick={onMoveDown}
        disabled={disabledDown}
        className="admin-focus rounded-lg border border-[#0A1547]/10 bg-[#F8F9FD] px-2.5 py-1 text-xs font-extrabold text-[#0A1547]/70 transition hover:border-[#A380F6]/50 disabled:cursor-not-allowed disabled:opacity-40"
      >
        Move down
      </button>
    </div>
  );
}

function DraftTextEditor({
  emptyText,
  itemLabel,
  items,
  label,
  onChange,
}: {
  emptyText: string;
  itemLabel?: string;
  items: DraftTextItem[];
  label: string;
  onChange: (id: string, patch: Partial<DraftTextItem>) => void;
}) {
  return (
    <section>
      <h5 className="text-sm font-black text-[#0A1547]">{label}</h5>
      {items.length === 0 ? (
        <p className="mt-3 rounded-2xl bg-white p-4 text-sm font-medium text-[#0A1547]/56">
          {emptyText}
        </p>
      ) : (
        <div className="mt-3 grid gap-3">
          {items.map((item) => (
            <article key={item.id} className="rounded-2xl border border-[#0A1547]/10 bg-white p-4">
              <label className="inline-flex items-center gap-2 text-sm font-semibold text-[#0A1547]">
                <input
                  type="checkbox"
                  checked={item.selected}
                  onChange={(event) => onChange(item.id, { selected: event.target.checked })}
                  className="h-4 w-4 accent-[#A380F6]"
                />
                Include in draft
              </label>
              <DraftTextarea
                label={itemLabel ?? label.slice(0, -1)}
                value={item.text}
                onChange={(value) => onChange(item.id, { text: value })}
              />
            </article>
          ))}
        </div>
      )}
    </section>
  );
}

function DraftPreviewModal({
  draft,
  onClose,
  upload,
}: {
  draft: ReportDraft;
  onClose: () => void;
  upload: PdfGeneratorUpload;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0A1547]/45 p-4">
      <div
        aria-labelledby="draft-preview-title"
        aria-modal="true"
        role="dialog"
        className="max-h-[88vh] w-full max-w-3xl overflow-y-auto rounded-2xl bg-white shadow-2xl"
      >
        <div className="sticky top-0 z-10 flex items-start justify-between gap-4 border-b border-[#0A1547]/10 bg-white px-5 py-4">
          <div className="min-w-0">
            <p className="text-xs font-extrabold uppercase tracking-[0.18em] text-[#02ABE0]">Draft preview</p>
            <h4 id="draft-preview-title" className="mt-1 break-words text-lg font-black text-[#0A1547]">
              {formatNullable(upload.fileName)}
            </h4>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="admin-focus rounded-xl border border-[#0A1547]/10 bg-white px-4 py-2 text-sm font-extrabold text-[#0A1547] transition hover:border-[#A380F6]/60"
          >
            Close
          </button>
        </div>
        <div className="p-5">
          <DraftPreview draft={draft} />
        </div>
      </div>
    </div>
  );
}

function DraftPreview({ draft }: { draft: ReportDraft }) {
  if (draft.source === "structured") {
    return <StructuredDraftPreview draft={draft} />;
  }

  const selectedOpportunities = draft.opportunities.filter((item) => item.selected);
  const selectedKeyTrends = draft.keyTrends.filter((item) => item.selected && item.text.trim());
  const selectedTrends = draft.trends.filter((item) => item.selected && item.text.trim());
  const notes = draft.additionalNotes.trim();

  return (
    <section className="rounded-2xl border border-[#02ABE0]/20 bg-[#02ABE0]/8 p-4">
      <h4 className="mt-2 text-lg font-black text-[#0A1547]">Selected report content</h4>
      <p className="mt-1 text-sm font-medium leading-6 text-[#0A1547]/62">
        Only selected content will be used for the generated PDF. No email, GHL update, or report delivery is triggered.
      </p>

      <PreviewTextList title="Key trends" items={selectedKeyTrends.map((item) => item.text)} />
      <PreviewOpportunities items={selectedOpportunities} />
      <PreviewTextList title="Trends" items={selectedTrends.map((item) => item.text)} />

      {notes && (
        <section className="mt-5">
          <h5 className="text-sm font-black text-[#0A1547]">Additional notes</h5>
          <p className="mt-3 rounded-2xl border border-[#0A1547]/10 bg-white px-4 py-3 text-sm font-medium leading-6 text-[#0A1547]/75">
            {notes}
          </p>
        </section>
      )}
    </section>
  );
}

function StructuredDraftPreview({ draft }: { draft: ReportDraft }) {
  const summary = draft.executiveSummary;
  const selectedSummary = summary?.selected ? summary : null;
  const selectedFindings = (draft.rankedFindings ?? []).filter((item) => item.selected);
  const selectedOpportunities = draft.opportunities.filter((item) => item.selected);
  const selectedTrends = (draft.structuredTrends ?? []).filter((item) => item.selected && item.text.trim());
  const selectedActionItems = (draft.actionPlanItems ?? []).filter((item) => item.selected && item.text.trim());
  const selectedDataNotes = (draft.dataNotes ?? []).filter((item) => item.selected && item.text.trim());
  const notes = draft.additionalNotes.trim();

  return (
    <section className="rounded-2xl border border-[#02ABE0]/20 bg-[#02ABE0]/8 p-4">
      <h4 className="mt-2 text-lg font-black text-[#0A1547]">Selected report content</h4>
      <p className="mt-1 text-sm font-medium leading-6 text-[#0A1547]/62">
        Structured sections below will be sent to the client-facing PDF renderer. No raw AI output, internal notes, email, GHL update, or report delivery is triggered.
      </p>

      {selectedSummary && (
        <section className="mt-5">
          <h5 className="text-sm font-black text-[#0A1547]">Executive Summary</h5>
          <dl className="mt-3 grid gap-3 rounded-2xl border border-[#0A1547]/10 bg-white p-4 text-sm">
            <Detail label="Summary" value={selectedSummary.summary} />
            <Detail label="Primary concern" value={selectedSummary.primaryConcern} />
            <Detail label="Recommended focus" value={selectedSummary.recommendedFocus} />
          </dl>
        </section>
      )}

      <PreviewRankedFindings items={selectedFindings} />
      <PreviewOpportunities items={selectedOpportunities} title="Improvement Opportunities" />
      <PreviewTextList title="Key Trends" items={selectedTrends.map((item) => item.text)} />
      <PreviewTextList title="30-Day Action Plan" items={selectedActionItems.map((item) => item.text)} />
      <PreviewTextList title="Data Notes / Limitations" items={selectedDataNotes.map((item) => item.text)} />

      {notes && (
        <section className="mt-5">
          <h5 className="text-sm font-black text-[#0A1547]">Additional notes</h5>
          <p className="mt-3 rounded-2xl border border-[#0A1547]/10 bg-white px-4 py-3 text-sm font-medium leading-6 text-[#0A1547]/75">
            {notes}
          </p>
        </section>
      )}
    </section>
  );
}

function PreviewRankedFindings({ items }: { items: DraftRankedFinding[] }) {
  return (
    <section className="mt-5">
      <h5 className="text-sm font-black text-[#0A1547]">Ranked Findings</h5>
      {items.length === 0 ? (
        <p className="mt-3 rounded-2xl bg-white p-4 text-sm font-medium text-[#0A1547]/56">
          No ranked findings selected.
        </p>
      ) : (
        <div className="mt-3 grid gap-3">
          {items.map((item, index) => (
            <article key={item.id} className="rounded-2xl border border-[#0A1547]/10 bg-white p-4">
              <h6 className="text-sm font-black text-[#0A1547]">{index + 1}. {formatNullable(item.title)}</h6>
              <div className="mt-2 flex flex-wrap gap-2">
                <DraftBadge label="Category" value={item.category} />
                <DraftBadge label="Severity" value={item.severity} tone={item.severity} />
                <DraftBadge label="Confidence" value={item.confidence} />
                <DraftBadge label="Impact" value={item.estimatedImpactCategory} />
              </div>
              <dl className="mt-3 grid gap-3 text-sm">
                <Detail label="Financial value" value={item.financialValue} />
                <Detail label="Client summary" value={item.clientFacingSummary} />
                <Detail label="Operational implication" value={item.operationalImplication} />
                <Detail label="Recommended action" value={item.recommendedAction} />
              </dl>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}

function PreviewOpportunities({ items, title = "Opportunities" }: { items: DraftOpportunity[]; title?: string }) {
  return (
    <section className="mt-5">
      <h5 className="text-sm font-black text-[#0A1547]">{title}</h5>
      {items.length === 0 ? (
        <p className="mt-3 rounded-2xl bg-white p-4 text-sm font-medium text-[#0A1547]/56">
          No {title.toLowerCase()} selected.
        </p>
      ) : (
        <div className="mt-3 grid gap-3">
          {items.map((item) => (
            <article key={item.id} className="rounded-2xl border border-[#0A1547]/10 bg-white p-4">
              <h6 className="text-sm font-black text-[#0A1547]">{formatNullable(item.title)}</h6>
              <dl className="mt-3 grid gap-3 text-sm">
                <Detail label="Impact" value={item.impact} />
                <Detail label="Recommendation" value={item.recommendation} />
              </dl>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}

function PreviewTextList({ items, title }: { items: string[]; title: string }) {
  return (
    <section className="mt-5">
      <h5 className="text-sm font-black text-[#0A1547]">{title}</h5>
      {items.length === 0 ? (
        <p className="mt-3 rounded-2xl bg-white p-4 text-sm font-medium text-[#0A1547]/56">
          No {title.toLowerCase()} selected.
        </p>
      ) : (
        <ul className="mt-3 grid gap-3">
          {items.map((item, index) => (
            <li key={`${item}-${index}`} className="rounded-2xl border border-[#0A1547]/10 bg-white px-4 py-3 text-sm font-medium leading-6 text-[#0A1547]/75">
              {item}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function DraftInput({ label, onChange, value }: { label: string; onChange: (value: string) => void; value: string }) {
  return (
    <label className="block">
      <span className="text-xs font-semibold uppercase tracking-[0.14em] text-[#0A1547]/45">{label}</span>
      <input
        type="text"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="admin-focus mt-2 w-full rounded-xl border border-[#0A1547]/10 bg-[#F8F9FD] px-4 py-3 text-sm font-medium text-[#0A1547]"
      />
    </label>
  );
}

function DraftTextarea({ label, onChange, value }: { label: string; onChange: (value: string) => void; value: string }) {
  return (
    <label className="block">
      <span className="text-xs font-semibold uppercase tracking-[0.14em] text-[#0A1547]/45">{label}</span>
      <textarea
        value={value}
        onChange={(event) => onChange(event.target.value)}
        rows={3}
        className="admin-focus mt-2 w-full resize-y rounded-xl border border-[#0A1547]/10 bg-[#F8F9FD] px-4 py-3 text-sm font-medium leading-6 text-[#0A1547]"
      />
    </label>
  );
}

function WarningList({ warnings }: { warnings: string[] }) {
  if (warnings.length === 0) {
    return null;
  }

  return (
    <div className="mt-4 flex flex-wrap gap-2">
      {warnings.map((warning) => (
        <span key={warning} className="rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-semibold capitalize text-amber-700">
          {warningLabel(warning)}
        </span>
      ))}
    </div>
  );
}

function Detail({ label, value }: { label: string; value: string | number | boolean | null | undefined }) {
  return (
    <div>
      <dt className="text-xs font-extrabold uppercase tracking-[0.14em] text-[#0A1547]/40">{label}</dt>
      <dd className="mt-1 break-words font-medium text-[#0A1547]">{formatNullable(value)}</dd>
    </div>
  );
}

function ErrorState({ message }: { message: string }) {
  return (
    <div className="rounded-2xl border border-red-200 bg-red-50 p-5 text-sm font-bold text-red-700">
      {message}
    </div>
  );
}

function EmptyState({ description, title }: { description: string; title: string }) {
  return (
    <div className="admin-card p-8 text-center">
      <h3 className="text-lg font-black text-[#0A1547]">{title}</h3>
      <p className="mt-2 text-sm font-medium text-[#0A1547]/60">{description}</p>
    </div>
  );
}
