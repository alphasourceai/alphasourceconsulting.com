import { useCallback, useEffect, useMemo, useState } from "react";
import { useAuth } from "@/auth/AuthProvider";
import { AdminApiError, getPdfGeneratorClient, getPdfGeneratorOptions } from "@/lib/adminApi";
import type {
  PdfGeneratorClientOption,
  PdfGeneratorClientResponse,
  PdfGeneratorOpportunity,
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

export default function PDFGeneratorPage() {
  const { session } = useAuth();
  const [options, setOptions] = useState<PdfGeneratorClientOption[]>([]);
  const [selectedEmail, setSelectedEmail] = useState("");
  const [clientData, setClientData] = useState<PdfGeneratorClientResponse | null>(null);
  const [selectedUploadId, setSelectedUploadId] = useState("");
  const [loadingOptions, setLoadingOptions] = useState(true);
  const [loadingClient, setLoadingClient] = useState(false);
  const [optionsError, setOptionsError] = useState("");
  const [clientError, setClientError] = useState("");

  const token = session?.access_token || "";

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
        setOptionsError("PDF Generator clients could not be loaded.");
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
        setClientError("PDF Generator client details could not be loaded.");
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
      return;
    }

    setClientData(null);
    setSelectedUploadId("");

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

  const existingPdfCount = useMemo(() => {
    return clientData?.uploads.filter((upload) => upload.pdf.pdfUrl || upload.pdf.signedUrl).length ?? 0;
  }, [clientData]);

  return (
    <div className="space-y-6">
      <section className="admin-card p-5">
        <div className="grid gap-5 lg:grid-cols-[1fr_360px] lg:items-end">
          <div>
            <p className="text-xs font-extrabold uppercase tracking-[0.2em] text-[#A380F6]">Read-only PDF Generator preview</p>
            <h2 className="mt-3 text-2xl font-black text-[#0A1547]">Review report-ready uploads</h2>
            <p className="mt-2 max-w-3xl text-sm font-semibold leading-6 text-[#0A1547]/62">
              PDF generation will be added in a later step. This page only previews existing analysis data and existing PDF metadata from the Admin API.
            </p>
          </div>

          <label>
            <span className="text-xs font-extrabold uppercase tracking-[0.16em] text-[#0A1547]/45">Client</span>
            <select
              value={selectedEmail}
              onChange={(event) => setSelectedEmail(event.target.value)}
              disabled={loadingOptions || options.length === 0}
              className="admin-focus mt-2 w-full rounded-xl border border-[#0A1547]/10 bg-[#F8F9FD] px-4 py-3 text-sm font-bold text-[#0A1547]"
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
        <div className="admin-card p-8 text-center text-sm font-bold text-[#0A1547]/60">
          Loading PDF Generator options...
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

      {!loadingOptions && !optionsError && options.length > 0 && (
        <section className="grid gap-4 md:grid-cols-3">
          <MetricCard label="Eligible Clients" value={options.length} accent="#A380F6" />
          <MetricCard
            label="Eligible Uploads"
            value={options.reduce((total, option) => total + option.eligibleUploadCount, 0)}
            accent="#02ABE0"
          />
          <MetricCard label="Selected PDFs" value={existingPdfCount} accent="#02D99D" />
        </section>
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
              <div className="admin-card p-8 text-center text-sm font-bold text-[#0A1547]/60">
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
              <UploadDetail upload={selectedUpload} />
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

function MetricCard({ accent, label, value }: { accent: string; label: string; value: string | number }) {
  return (
    <div className="admin-card p-5">
      <div className="h-1.5 w-12 rounded-full" style={{ backgroundColor: accent }} />
      <p className="mt-4 text-xs font-extrabold uppercase tracking-[0.16em] text-[#0A1547]/45">{label}</p>
      <p className="mt-2 break-words text-2xl font-black text-[#0A1547]">{value}</p>
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
          Read-only
        </span>
      </div>

      <dl className="mt-5 grid gap-3 text-sm sm:grid-cols-2">
        <Detail label="Eligible uploads" value={clientData?.count ?? option?.eligibleUploadCount ?? 0} />
        <Detail label="Submissions" value={clientData?.submissions.length ?? option?.submissionCount ?? 0} />
        <Detail label="Latest submitted" value={formatDate(option?.latestSubmittedAt ?? null)} />
        <Detail label="Latest upload" value={formatNullable(option?.latestUploadTime)} />
      </dl>

      {loading && (
        <p className="mt-4 rounded-xl bg-[#F8F9FD] px-4 py-3 text-sm font-bold text-[#0A1547]/58">
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
          <p className="mt-1 text-sm font-semibold text-[#0A1547]/58">
            Existing analysis output only. No report is generated from this view.
          </p>
        </div>
        <span className="rounded-full border border-[#0A1547]/10 bg-[#F8F9FD] px-3 py-1 text-xs font-extrabold text-[#0A1547]/65">
          {uploads.length}
        </span>
      </div>

      <div className="mt-4 grid gap-3">
        {uploads.map((upload) => (
          <button
            key={upload.id}
            type="button"
            onClick={() => onSelect(upload.id)}
            className={`admin-focus rounded-2xl border p-4 text-left transition ${
              upload.id === selectedUploadId
                ? "border-[#A380F6]/70 bg-[#A380F6]/10"
                : "border-[#0A1547]/10 bg-[#F8F9FD] hover:border-[#02ABE0]/40"
            }`}
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="break-words text-sm font-black text-[#0A1547]">{formatNullable(upload.fileName)}</p>
                <p className="mt-1 text-xs font-extrabold uppercase tracking-[0.14em] text-[#0A1547]/45">
                  {formatNullable(upload.toolName)}
                </p>
              </div>
              <span className={`rounded-full border px-3 py-1 text-xs font-extrabold ${upload.paid ? "border-[#02D99D]/30 bg-[#02D99D]/12 text-[#0A1547]" : "border-[#0A1547]/10 bg-white text-[#0A1547]/62"}`}>
                {upload.paid ? "Paid" : "Unpaid"}
              </span>
            </div>

            <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
              <Detail label="Upload time" value={formatNullable(upload.uploadTime)} />
              <Detail label="PDF version" value={upload.pdf.pdfVersion > 0 ? upload.pdf.pdfVersion : "-"} />
              <Detail label="PDF generated" value={formatDate(upload.pdf.pdfGeneratedAt)} />
              <Detail label="Warnings" value={upload.warnings.length} />
            </dl>

            {upload.warnings.length > 0 && (
              <WarningList warnings={upload.warnings} />
            )}
          </button>
        ))}
      </div>
    </section>
  );
}

function UploadDetail({ upload }: { upload: PdfGeneratorUpload }) {
  const openUrl = pdfLink(upload);

  return (
    <article className="admin-card overflow-hidden">
      <div className="border-b border-[#0A1547]/10 p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="text-xs font-extrabold uppercase tracking-[0.18em] text-[#A380F6]">Upload preview</p>
            <h3 className="mt-2 break-words text-2xl font-black text-[#0A1547]">{formatNullable(upload.fileName)}</h3>
            <p className="mt-2 text-sm font-bold text-[#0A1547]/60">{formatNullable(upload.toolName)}</p>
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
        <KeyTrendSection items={upload.analysis.keyTrends} />
        <OpportunitySection items={upload.analysis.opportunities} />
        <TextListSection title="Trends" items={upload.analysis.trends} emptyText="No trends were returned for this upload." />

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
    </article>
  );
}

function KeyTrendSection({ items }: { items: string[] }) {
  return (
    <section>
      <h4 className="text-lg font-black text-[#0A1547]">Key trends</h4>
      {items.length === 0 ? (
        <p className="mt-3 rounded-2xl bg-[#F8F9FD] p-4 text-sm font-bold text-[#0A1547]/56">
          No key trends were returned for this upload.
        </p>
      ) : (
        <div className="mt-3 grid gap-3">
          {items.map((item, index) => (
            <p key={`${item}-${index}`} className="rounded-2xl border border-[#02ABE0]/20 bg-[#02ABE0]/8 px-4 py-3 text-sm font-bold leading-6 text-[#0A1547]">
              {item}
            </p>
          ))}
        </div>
      )}
    </section>
  );
}

function OpportunitySection({ items }: { items: PdfGeneratorOpportunity[] }) {
  return (
    <section>
      <h4 className="text-lg font-black text-[#0A1547]">Opportunities</h4>
      {items.length === 0 ? (
        <p className="mt-3 rounded-2xl bg-[#F8F9FD] p-4 text-sm font-bold text-[#0A1547]/56">
          No opportunities were returned for this upload.
        </p>
      ) : (
        <div className="mt-3 grid gap-3">
          {items.map((item, index) => (
            <article key={`${item.title}-${index}`} className="rounded-2xl border border-[#0A1547]/10 bg-[#F8F9FD] p-4">
              <h5 className="text-sm font-black text-[#0A1547]">{formatNullable(item.title)}</h5>
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

function TextListSection({
  emptyText,
  items,
  title,
}: {
  emptyText: string;
  items: string[];
  title: string;
}) {
  return (
    <section>
      <h4 className="text-lg font-black text-[#0A1547]">{title}</h4>
      {items.length === 0 ? (
        <p className="mt-3 rounded-2xl bg-[#F8F9FD] p-4 text-sm font-bold text-[#0A1547]/56">
          {emptyText}
        </p>
      ) : (
        <ul className="mt-3 grid gap-3">
          {items.map((item, index) => (
            <li key={`${item}-${index}`} className="rounded-2xl border border-[#0A1547]/10 bg-[#F8F9FD] px-4 py-3 text-sm font-bold leading-6 text-[#0A1547]/75">
              {item}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function WarningList({ warnings }: { warnings: string[] }) {
  if (warnings.length === 0) {
    return null;
  }

  return (
    <div className="mt-4 flex flex-wrap gap-2">
      {warnings.map((warning) => (
        <span key={warning} className="rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-extrabold capitalize text-amber-700">
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
      <dd className="mt-1 break-words font-black text-[#0A1547]">{formatNullable(value)}</dd>
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
