import { useCallback, useEffect, useMemo, useState } from "react";
import { useAuth } from "@/auth/AuthProvider";
import { AdminApiError, generatePdfReport, getPdfGeneratorClient, getPdfGeneratorOptions } from "@/lib/adminApi";
import type {
  GeneratePdfReportRequest,
  PdfGeneratorClientOption,
  PdfGeneratorClientResponse,
  PdfGeneratorMetadata,
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

type ReportDraft = {
  uploadId: string;
  opportunities: DraftOpportunity[];
  trends: DraftTextItem[];
  keyTrends: DraftTextItem[];
  additionalNotes: string;
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
  return {
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

function createGeneratePdfPayload(draft: ReportDraft): Omit<GeneratePdfReportRequest, "uploadId"> {
  return {
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
}

function hasGeneratePdfContent(payload: Omit<GeneratePdfReportRequest, "uploadId">): boolean {
  return (
    payload.opportunities.length > 0 ||
    payload.trends.length > 0 ||
    payload.keyTrends.length > 0 ||
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
        message: "Select at least one opportunity, trend, key trend, or add notes before generating.",
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
              Choose a client with promoted analysis uploads to edit draft report content.
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
          description="Promoted analysis uploads with parsed analysis data will appear here."
        />
      )}

      {selectedEmail && (
        <section className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
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
                uploads={clientData.uploads}
                selectedUploadId={selectedUploadId}
                onSelect={setSelectedUploadId}
              />
            )}
          </div>

          <div>
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
        </section>
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
  onSelect,
  selectedUploadId,
  uploads,
}: {
  onSelect: (uploadId: string) => void;
  selectedUploadId: string;
  uploads: PdfGeneratorUpload[];
}) {
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
        {uploads.map((upload) => (
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
          Select at least one opportunity, trend, key trend, or add notes to generate a PDF.
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
  const updateOpportunity = (id: string, patch: Partial<DraftOpportunity>) => {
    onChange({
      ...draft,
      opportunities: draft.opportunities.map((item) => (
        item.id === id ? { ...item, ...patch } : item
      )),
    });
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
        <DraftOpportunityEditor items={draft.opportunities} onChange={updateOpportunity} />
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
            placeholder="Add admin-only draft notes for the future report."
            className="admin-focus mt-2 w-full resize-y rounded-xl border border-[#0A1547]/10 bg-white px-4 py-3 text-sm font-medium leading-6 text-[#0A1547] placeholder:text-[#0A1547]/38"
          />
        </label>
      </div>
    </section>
  );
}

function DraftOpportunityEditor({
  items,
  onChange,
}: {
  items: DraftOpportunity[];
  onChange: (id: string, patch: Partial<DraftOpportunity>) => void;
}) {
  return (
    <section>
      <h5 className="text-sm font-black text-[#0A1547]">Opportunities</h5>
      {items.length === 0 ? (
        <p className="mt-3 rounded-2xl bg-white p-4 text-sm font-medium text-[#0A1547]/56">
          No opportunities were returned for this upload.
        </p>
      ) : (
        <div className="mt-3 grid gap-3">
          {items.map((item) => (
            <article key={item.id} className="rounded-2xl border border-[#0A1547]/10 bg-white p-3">
              {item.selected ? (
                <label className="inline-flex items-center gap-2 text-sm font-semibold text-[#0A1547]">
                  <input
                    type="checkbox"
                    checked={item.selected}
                    onChange={(event) => onChange(item.id, { selected: event.target.checked })}
                    className="h-4 w-4 accent-[#A380F6]"
                  />
                  Include in draft
                </label>
              ) : (
                <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3">
                  <p className="break-words text-sm font-black leading-5 text-[#0A1547]">
                    {formatNullable(item.title)}
                  </p>
                  <label className="inline-flex items-center gap-2 text-sm font-semibold text-[#0A1547]">
                    <input
                      type="checkbox"
                      checked={item.selected}
                      onChange={(event) => onChange(item.id, { selected: event.target.checked })}
                      className="h-4 w-4 accent-[#A380F6]"
                    />
                    Include
                  </label>
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

function DraftTextEditor({
  emptyText,
  items,
  label,
  onChange,
}: {
  emptyText: string;
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
                label={label.slice(0, -1)}
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

function PreviewOpportunities({ items }: { items: DraftOpportunity[] }) {
  return (
    <section className="mt-5">
      <h5 className="text-sm font-black text-[#0A1547]">Opportunities</h5>
      {items.length === 0 ? (
        <p className="mt-3 rounded-2xl bg-white p-4 text-sm font-medium text-[#0A1547]/56">
          No opportunities selected.
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
