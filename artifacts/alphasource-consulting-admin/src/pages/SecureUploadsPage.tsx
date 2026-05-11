import { useCallback, useEffect, useMemo, useState } from "react";
import { useAuth } from "@/auth/AuthProvider";
import { AdminApiError, createSecureUploadRequest, getSecureUploadFiles } from "@/lib/adminApi";
import type {
  SecureUploadFile,
  SecureUploadFilesQuery,
  SecureUploadFilesResponse,
  SecureUploadRequestMetadata,
} from "@/lib/types";

type SecureUploadFilters = {
  completedOnly: boolean;
  email: string;
  startDate: string;
  endDate: string;
};

const DEFAULT_LIMIT = 50;
const DEFAULT_FILTERS: SecureUploadFilters = {
  completedOnly: true,
  email: "",
  startDate: "",
  endDate: "",
};

function formatNullable(value: string | number | null | undefined): string {
  if (value === null || value === undefined || value === "") {
    return "-";
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

function formatBytes(value: number | null): string {
  if (typeof value !== "number" || Number.isNaN(value)) {
    return "-";
  }
  if (value < 1024) {
    return `${value} B`;
  }
  if (value < 1024 * 1024) {
    return `${(value / 1024).toFixed(1)} KB`;
  }
  return `${(value / (1024 * 1024)).toFixed(1)} MB`;
}

function statusLabel(file: SecureUploadFile): "Completed" | "Incomplete" {
  return file.completedAt ? "Completed" : "Incomplete";
}

function responseFallback(): SecureUploadFilesResponse {
  return {
    ok: true,
    items: [],
    count: 0,
    limit: DEFAULT_LIMIT,
    offset: 0,
    hasMore: false,
  };
}

function WorkflowInfoPanel({
  items,
}: {
  items: Array<{
    title: string;
    lines: string[];
  }>;
}) {
  return (
    <section className="grid gap-4 md:grid-cols-3">
      {items.map((item) => (
        <div key={item.title} className="rounded-2xl border border-[#0A1547]/10 bg-white p-5 shadow-sm">
          <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-[#A380F6]">{item.title}</p>
          <ul className="mt-3 space-y-2 text-sm font-semibold leading-6 text-[#0A1547]/68">
            {item.lines.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
        </div>
      ))}
    </section>
  );
}

export default function SecureUploadsPage() {
  const { permissions, session } = useAuth();
  const token = session?.access_token || "";
  const canWriteSecureUploads = permissions.canWriteSecureUploads;
  const [filters, setFilters] = useState<SecureUploadFilters>(DEFAULT_FILTERS);
  const [appliedFilters, setAppliedFilters] = useState<SecureUploadFilters>(filters);
  const [offset, setOffset] = useState(0);
  const [refreshKey, setRefreshKey] = useState(0);
  const [response, setResponse] = useState<SecureUploadFilesResponse>(responseFallback);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [requestEmail, setRequestEmail] = useState("");
  const [requestSending, setRequestSending] = useState(false);
  const [requestError, setRequestError] = useState("");
  const [requestSuccess, setRequestSuccess] = useState<SecureUploadRequestMetadata | null>(null);

  const query = useMemo<SecureUploadFilesQuery>(() => ({
    completedOnly: appliedFilters.completedOnly,
    email: appliedFilters.email,
    startDate: appliedFilters.startDate,
    endDate: appliedFilters.endDate,
    limit: DEFAULT_LIMIT,
    offset,
  }), [appliedFilters, offset]);

  const loadFiles = useCallback(async (signal?: AbortSignal) => {
    if (!token) {
      return;
    }

    setLoading(true);
    setError("");

    try {
      const filesResponse = await getSecureUploadFiles(token, query, signal);
      setResponse(filesResponse);
    } catch (loadError) {
      if (loadError instanceof DOMException && loadError.name === "AbortError") {
        return;
      }

      if (loadError instanceof AdminApiError) {
        setError(loadError.message);
      } else {
        setError("Secure uploads could not be loaded.");
      }
    } finally {
      if (!signal?.aborted) {
        setLoading(false);
      }
    }
  }, [query, token]);

  useEffect(() => {
    const controller = new AbortController();
    void loadFiles(controller.signal);

    return () => {
      controller.abort();
    };
  }, [loadFiles, refreshKey]);

  const applyFilters = (nextFilters = filters) => {
    setOffset(0);
    setAppliedFilters({ ...nextFilters });
    setRefreshKey((current) => current + 1);
  };

  const clearFilters = () => {
    setFilters(DEFAULT_FILTERS);
    applyFilters(DEFAULT_FILTERS);
  };

  const handleRefresh = () => {
    setRefreshKey((current) => current + 1);
  };

  const handleSendRequest = async () => {
    const clientEmail = requestEmail.trim();
    if (!clientEmail || !token || requestSending || !canWriteSecureUploads) {
      return;
    }

    setRequestSending(true);
    setRequestError("");
    setRequestSuccess(null);

    try {
      const result = await createSecureUploadRequest(token, { clientEmail });
      setRequestSuccess(result.request);
      setRefreshKey((current) => current + 1);
    } catch (sendError) {
      if (sendError instanceof AdminApiError) {
        setRequestError(sendError.message);
      } else {
        setRequestError("Secure upload request could not be sent.");
      }
    } finally {
      setRequestSending(false);
    }
  };

  const canGoBack = response.offset > 0;
  const canGoNext = response.hasMore;

  return (
    <div className="space-y-6">
      <WorkflowInfoPanel
        items={[
          {
            title: "Purpose",
            lines: ["Secure intake and review for files submitted through the secure upload portal."],
          },
          {
            title: "Boundary",
            lines: [
              "Files may contain sensitive or PHI-related information.",
              "Files are not sent to AI analysis or imported into Document Analysis from this page.",
            ],
          },
          {
            title: "Actions",
            lines: [
              "Super/admin-approved users can send upload request emails.",
              "Authorized users can review inbox records and storage metadata.",
            ],
          },
        ]}
      />

      {canWriteSecureUploads ? (
        <section className="admin-card p-5">
          <div className="grid gap-4 lg:grid-cols-[1fr_auto] lg:items-end">
            <div>
              <p className="text-xs font-extrabold uppercase tracking-[0.18em] text-[#A380F6]">Send secure upload request</p>
              <h3 className="mt-2 text-xl font-black text-[#0A1547]">Email an existing client user</h3>
              <p className="mt-2 text-sm font-semibold leading-6 text-[#0A1547]/62">
                This sends the existing secure upload portal email. It only works for an email that already belongs to an existing client.
              </p>
              <label className="mt-4 block">
                <span className="text-xs font-extrabold uppercase tracking-[0.14em] text-[#0A1547]/45">Client email</span>
                <input
                  type="email"
                  value={requestEmail}
                  onChange={(event) => {
                    setRequestEmail(event.target.value);
                    setRequestError("");
                    setRequestSuccess(null);
                  }}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      event.preventDefault();
                      void handleSendRequest();
                    }
                  }}
                  placeholder="client@example.com"
                  className="admin-focus mt-2 w-full rounded-xl border border-[#0A1547]/10 bg-[#F8F9FD] px-4 py-3 text-sm font-bold text-[#0A1547] placeholder:text-[#0A1547]/35"
                />
              </label>
            </div>

            <button
              type="button"
              onClick={() => void handleSendRequest()}
              disabled={requestSending || !requestEmail.trim()}
              className="admin-focus rounded-xl bg-[#0A1547] px-5 py-3 text-sm font-extrabold text-white transition hover:bg-[#1A2460] disabled:cursor-not-allowed disabled:opacity-55"
            >
              {requestSending ? "Sending..." : "Send request"}
            </button>
          </div>

          {requestSuccess && (
            <div className="mt-4 rounded-2xl border border-[#02D99D]/25 bg-[#02D99D]/10 p-4 text-sm font-bold text-[#0A1547]">
              Secure upload request emailed to {requestSuccess.clientEmail}. Link expires {formatDate(requestSuccess.expiresAt)} ({requestSuccess.expiresInMinutes} minutes).
            </div>
          )}

          {requestError && (
            <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-bold text-red-700">
              {requestError}
            </div>
          )}
        </section>
      ) : (
        <section className="rounded-2xl border border-[#A380F6]/25 bg-[#A380F6]/10 p-5">
          <p className="text-sm font-black text-[#0A1547]">Read-only secure uploads access</p>
          <p className="mt-1 text-sm font-semibold leading-6 text-[#0A1547]/62">
            You can inspect secure upload files. Request-email actions are hidden unless your role includes secure uploads write permission.
          </p>
        </section>
      )}

      <section className="admin-card p-5">
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm font-medium text-[#0A1547]/58">
            Change filters, then click Apply filters.
          </p>
          <button
            type="button"
            onClick={handleRefresh}
            disabled={loading}
            className="admin-focus w-fit rounded-xl border border-[#0A1547]/10 bg-white px-4 py-2 text-sm font-extrabold text-[#0A1547] transition hover:border-[#A380F6]/60 disabled:cursor-not-allowed disabled:opacity-55"
          >
            {loading ? "Refreshing..." : "Refresh results"}
          </button>
        </div>
        <div className="grid gap-4 lg:grid-cols-[180px_1fr_180px_180px_auto_auto] lg:items-end">
          <label className="flex items-center gap-3 rounded-xl border border-[#0A1547]/10 bg-[#F8F9FD] px-4 py-3">
            <input
              type="checkbox"
              checked={filters.completedOnly}
              onChange={(event) => setFilters((current) => ({ ...current, completedOnly: event.target.checked }))}
              className="h-4 w-4 accent-[#A380F6]"
            />
            <span className="text-sm font-extrabold text-[#0A1547]">Completed only</span>
          </label>

          <label>
            <span className="text-xs font-extrabold uppercase tracking-[0.14em] text-[#0A1547]/45">Email contains</span>
            <input
              type="search"
              value={filters.email}
              onChange={(event) => setFilters((current) => ({ ...current, email: event.target.value }))}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  applyFilters();
                }
              }}
              placeholder="name@example.com"
              className="admin-focus mt-2 w-full rounded-xl border border-[#0A1547]/10 bg-[#F8F9FD] px-4 py-3 text-sm font-bold text-[#0A1547] placeholder:text-[#0A1547]/35"
            />
          </label>

          <label>
            <span className="text-xs font-extrabold uppercase tracking-[0.14em] text-[#0A1547]/45">Start date</span>
            <input
              type="date"
              value={filters.startDate}
              onChange={(event) => setFilters((current) => ({ ...current, startDate: event.target.value }))}
              className="admin-focus mt-2 w-full rounded-xl border border-[#0A1547]/10 bg-[#F8F9FD] px-4 py-3 text-sm font-bold text-[#0A1547]"
            />
          </label>

          <label>
            <span className="text-xs font-extrabold uppercase tracking-[0.14em] text-[#0A1547]/45">End date</span>
            <input
              type="date"
              value={filters.endDate}
              onChange={(event) => setFilters((current) => ({ ...current, endDate: event.target.value }))}
              className="admin-focus mt-2 w-full rounded-xl border border-[#0A1547]/10 bg-[#F8F9FD] px-4 py-3 text-sm font-bold text-[#0A1547]"
            />
          </label>

          <button
            type="button"
            onClick={() => applyFilters()}
            disabled={loading}
            className="admin-focus rounded-xl bg-[#0A1547] px-4 py-3 text-sm font-extrabold text-white transition hover:bg-[#1A2460] disabled:cursor-not-allowed disabled:opacity-55"
          >
            Apply filters
          </button>

          <button
            type="button"
            onClick={clearFilters}
            disabled={loading}
            className="admin-focus rounded-xl border border-[#0A1547]/10 bg-white px-4 py-3 text-sm font-extrabold text-[#0A1547] transition hover:border-[#A380F6]/60 disabled:cursor-not-allowed disabled:opacity-55"
          >
            Clear filters
          </button>
        </div>
      </section>

      {loading && (
        <div className="admin-card p-8 text-center text-sm font-bold text-[#0A1547]/60">
          Loading secure uploads...
        </div>
      )}

      {error && !loading && (
        <ErrorState message={error} />
      )}

      {!loading && !error && response.items.length === 0 && (
        <EmptyState
          title="No secure uploads found"
          description="Try broadening the date range, email filter, or completed-only setting."
        />
      )}

      {!loading && !error && response.items.length > 0 && (
        <section className="grid gap-4">
          {response.items.map((file) => (
            <SecureUploadCard key={file.id} file={file} />
          ))}
        </section>
      )}

      {!error && (
        <section className="admin-card flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm font-bold text-[#0A1547]/58">
            Showing {response.count} files from offset {response.offset}. {response.hasMore ? "More results are available." : "End of current result set."}
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setOffset(Math.max(0, offset - DEFAULT_LIMIT))}
              disabled={loading || !canGoBack}
              className="admin-focus rounded-xl border border-[#0A1547]/10 bg-white px-4 py-2 text-sm font-extrabold text-[#0A1547] transition hover:border-[#A380F6]/60 disabled:cursor-not-allowed disabled:opacity-55"
            >
              Previous
            </button>
            <button
              type="button"
              onClick={() => setOffset(offset + DEFAULT_LIMIT)}
              disabled={loading || !canGoNext}
              className="admin-focus rounded-xl bg-[#0A1547] px-4 py-2 text-sm font-extrabold text-white transition hover:bg-[#1A2460] disabled:cursor-not-allowed disabled:opacity-55"
            >
              Next
            </button>
          </div>
        </section>
      )}
    </div>
  );
}

function SecureUploadCard({ file }: { file: SecureUploadFile }) {
  const status = statusLabel(file);

  return (
    <article className="admin-card p-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <p className="text-xs font-extrabold uppercase tracking-[0.18em] text-[#A380F6]">Secure upload file</p>
          <h3 className="mt-1 break-words text-lg font-black text-[#0A1547]">
            {formatNullable(file.originalFilename)}
          </h3>
          <p className="mt-1 break-all text-sm font-medium text-[#0A1547]/62">
            {formatNullable(file.userEmail)}
          </p>
          <p className="mt-1 text-xs font-medium text-[#0A1547]/52">
            Created {formatDate(file.createdAt)} / Completed {formatDate(file.completedAt)}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className={`rounded-full border px-3 py-1 text-xs font-extrabold ${status === "Completed" ? "border-[#02D99D]/30 bg-[#02D99D]/12 text-[#0A1547]" : "border-amber-200 bg-amber-50 text-amber-700"}`}>
            {status}
          </span>
          {file.consoleUrl && (
            <a
              href={file.consoleUrl}
              target="_blank"
              rel="noreferrer"
              className="admin-focus rounded-xl bg-[#02ABE0] px-4 py-2 text-sm font-extrabold text-white transition hover:bg-[#0096C9]"
            >
              Open in Console
            </a>
          )}
        </div>
      </div>

      <div className="mt-3">
        <details className="rounded-xl border border-[#0A1547]/10 bg-[#F8F9FD] px-4 py-3">
          <summary className="cursor-pointer text-xs font-extrabold uppercase tracking-[0.16em] text-[#0A1547]/50">
            Technical and storage details
          </summary>
          <dl className="mt-3 grid gap-3 text-sm md:grid-cols-2">
            <Detail label="Content type" value={file.contentType} />
            <Detail label="File size" value={formatBytes(file.byteSize)} />
            <Detail label="GS path" value={file.gsPath} />
            <Detail label="GCS bucket" value={file.gcsBucket} />
            <Detail label="Object name" value={file.objectName} />
            <Detail label="Request ID" value={file.requestId} />
            <Detail label="Session ID" value={file.sessionId} />
            <Detail label="User ID" value={file.userId} />
            <Detail label="File ID" value={file.id} />
          </dl>
        </details>
      </div>
    </article>
  );
}

function Detail({ label, value }: { label: string; value: string | number | null | undefined }) {
  return (
    <div>
      <dt className="text-xs font-extrabold uppercase tracking-[0.14em] text-[#0A1547]/40">{label}</dt>
      <dd className="mt-1 break-words font-semibold text-[#0A1547]">{formatNullable(value)}</dd>
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
