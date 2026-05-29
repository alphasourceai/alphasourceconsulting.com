import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { useAuth } from "@/auth/AuthProvider";
import { AdminApiError, createSecureUploadDownloadUrl, createSecureUploadRequest, getSecureUploadFiles } from "@/lib/adminApi";
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
type IconName = "cloud" | "download" | "file" | "filter" | "lock" | "mail" | "refresh" | "upload";
type IconTone = "secure" | "analysis" | "neutral" | "lilac";

const DEFAULT_LIMIT = 50;
const DEFAULT_FILTERS: SecureUploadFilters = {
  completedOnly: true,
  email: "",
  startDate: "",
  endDate: "",
};
const sectionClassName = "rounded-lg border border-[#0A1547]/10 bg-white shadow-[0_12px_28px_rgba(10,21,71,0.05)]";
const inputClassName = "admin-focus mt-2 h-11 w-full rounded-lg border border-[#0A1547]/10 bg-[#F8F9FD] px-4 text-sm font-medium text-[#0A1547] placeholder:text-[#0A1547]/38";
const labelClassName = "text-[11px] font-medium uppercase tracking-[0.12em] text-[#0A1547]/38";

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

function statusTone(file: SecureUploadFile): string {
  return file.completedAt
    ? "border-[#02D99D]/30 bg-[#02D99D]/12 text-[#0A1547]/80"
    : "border-amber-200 bg-amber-50 text-amber-700/90";
}

function SectionHeader({
  action,
  description,
  icon,
  iconTone,
  title,
}: {
  action?: ReactNode;
  description?: string;
  icon: IconName;
  iconTone: IconTone;
  title: string;
}) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
      <div className="flex min-w-0 items-start gap-3">
        <IconBadge icon={icon} tone={iconTone} />
        <div className="min-w-0">
          <h3 className="text-lg font-black text-[#0A1547]">{title}</h3>
          {description && (
            <p className="mt-1 max-w-2xl text-sm font-medium leading-6 text-[#0A1547]/56">
              {description}
            </p>
          )}
        </div>
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}

function IconBadge({ compact = false, icon, tone }: { compact?: boolean; icon: IconName; tone: IconTone }) {
  return (
    <span className={`flex shrink-0 items-center justify-center rounded-lg border border-[#0A1547]/10 bg-white ${compact ? "h-9 w-9" : "h-10 w-10"} ${iconToneClassName(tone)} [&_svg]:stroke-[2.6]`}>
      <Icon name={icon} size={compact ? 17 : 18} />
    </span>
  );
}

function iconToneClassName(tone: IconTone): string {
  switch (tone) {
    case "secure":
      return "text-[#F59E0B]";
    case "analysis":
      return "text-[#00CFC8]";
    case "lilac":
      return "text-[#A380F6]";
    case "neutral":
    default:
      return "text-[#0A1547]/78";
  }
}

function StatusPill({ children, className }: { children: ReactNode; className: string }) {
  return (
    <span className={`inline-flex rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${className}`}>
      {children}
    </span>
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
  const [downloadingFileId, setDownloadingFileId] = useState<string | null>(null);
  const [downloadErrors, setDownloadErrors] = useState<Record<string, string>>({});

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

  const handleDownloadFile = async (file: SecureUploadFile) => {
    if (!token || downloadingFileId || !file.completedAt) {
      return;
    }

    setDownloadingFileId(file.id);
    setDownloadErrors((current) => {
      const next = { ...current };
      delete next[file.id];
      return next;
    });

    try {
      const result = await createSecureUploadDownloadUrl(token, file.id);
      window.location.assign(result.downloadUrl);
    } catch (downloadError) {
      const message = downloadError instanceof AdminApiError
        ? downloadError.message
        : "Secure upload download link could not be created.";
      setDownloadErrors((current) => ({ ...current, [file.id]: message }));
    } finally {
      setDownloadingFileId((current) => (current === file.id ? null : current));
    }
  };

  const canGoBack = response.offset > 0;
  const canGoNext = response.hasMore;

  return (
    <div className="space-y-5">
      {canWriteSecureUploads ? (
        <section className={`${sectionClassName} p-5`}>
          <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
            <div>
              <SectionHeader
                action={(
                  <StatusPill className="border-[#F59E0B]/25 bg-[#F59E0B]/10 text-[#0A1547]/72">
                    Private Google Cloud storage
                  </StatusPill>
                )}
                description="Send the existing portal email to a client record already in the system."
                icon="mail"
                iconTone="secure"
                title="Send upload request"
              />
              <label className="mt-5 block max-w-2xl">
                <span className={labelClassName}>Client email</span>
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
                  className={inputClassName}
                />
              </label>
            </div>

            <button
              type="button"
              onClick={() => void handleSendRequest()}
              disabled={requestSending || !requestEmail.trim()}
              className="admin-focus inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-[#0A1547] px-5 text-sm font-bold text-white transition hover:bg-[#1A2460] disabled:cursor-not-allowed disabled:opacity-55"
            >
              <Icon name="mail" size={15} />
              {requestSending ? "Sending..." : "Send request"}
            </button>
          </div>

          {requestSuccess && (
            <div className="mt-4 rounded-lg border border-[#02D99D]/25 bg-[#02D99D]/10 px-4 py-3 text-sm font-semibold text-[#0A1547]">
              Secure upload request emailed to {requestSuccess.clientEmail}. Link expires {formatDate(requestSuccess.expiresAt)} ({requestSuccess.expiresInMinutes} minutes).
            </div>
          )}

          {requestError && (
            <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
              {requestError}
            </div>
          )}
        </section>
      ) : (
        <section className={`${sectionClassName} p-5`}>
          <div className="flex items-start gap-3">
            <IconBadge icon="lock" tone="lilac" />
            <div>
              <p className="text-sm font-semibold text-[#0A1547]">Read-only secure uploads access</p>
              <p className="mt-1 text-sm font-medium leading-6 text-[#0A1547]/58">
                You can inspect secure upload files. Request-email actions are hidden unless your role includes secure uploads write permission.
              </p>
            </div>
          </div>
        </section>
      )}

      <section className={`${sectionClassName} p-5`}>
        <SectionHeader
          action={(
            <button
              type="button"
              onClick={handleRefresh}
              disabled={loading}
              className="admin-focus inline-flex h-10 w-fit items-center gap-2 rounded-lg border border-[#0A1547]/10 bg-white px-4 text-sm font-semibold text-[#0A1547]/82 transition hover:border-[#A380F6]/60 disabled:cursor-not-allowed disabled:opacity-55"
            >
              <Icon name="refresh" size={15} />
              {loading ? "Refreshing..." : "Refresh"}
            </button>
          )}
          description="Change filters, then apply them to the private upload inbox."
          icon="filter"
          iconTone="analysis"
          title="Upload filters"
        />

        <div className="mt-5 grid gap-4 lg:grid-cols-[180px_1fr_180px_180px_auto_auto] lg:items-end">
          <label className="flex h-11 items-center gap-3 rounded-lg border border-[#0A1547]/10 bg-[#F8F9FD] px-4">
            <input
              type="checkbox"
              checked={filters.completedOnly}
              onChange={(event) => setFilters((current) => ({ ...current, completedOnly: event.target.checked }))}
              className="h-4 w-4 accent-[#A380F6]"
            />
            <span className="text-sm font-semibold text-[#0A1547]/82">Completed only</span>
          </label>

          <label>
            <span className={labelClassName}>Email contains</span>
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
              className={inputClassName}
            />
          </label>

          <label>
            <span className={labelClassName}>Start date</span>
            <input
              type="date"
              value={filters.startDate}
              onChange={(event) => setFilters((current) => ({ ...current, startDate: event.target.value }))}
              className={inputClassName}
            />
          </label>

          <label>
            <span className={labelClassName}>End date</span>
            <input
              type="date"
              value={filters.endDate}
              onChange={(event) => setFilters((current) => ({ ...current, endDate: event.target.value }))}
              className={inputClassName}
            />
          </label>

          <button
            type="button"
            onClick={() => applyFilters()}
            disabled={loading}
            className="admin-focus inline-flex h-11 items-center justify-center rounded-lg bg-[#0A1547] px-4 text-sm font-bold text-white transition hover:bg-[#1A2460] disabled:cursor-not-allowed disabled:opacity-55"
          >
            Apply filters
          </button>

          <button
            type="button"
            onClick={clearFilters}
            disabled={loading}
            className="admin-focus inline-flex h-11 items-center justify-center rounded-lg border border-[#0A1547]/10 bg-white px-4 text-sm font-semibold text-[#0A1547]/82 transition hover:border-[#A380F6]/60 disabled:cursor-not-allowed disabled:opacity-55"
          >
            Clear filters
          </button>
        </div>
      </section>

      {loading && (
        <div className={`${sectionClassName} p-8 text-center text-sm font-medium text-[#0A1547]/56`}>
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
        <section className="grid gap-3">
          <div className="flex items-start gap-3 rounded-lg border border-[#0A1547]/10 bg-[#F8F9FD] px-4 py-3 text-sm font-medium leading-6 text-[#0A1547]/58">
            <IconBadge compact icon="cloud" tone="secure" />
            <p>
              Files stay in private Google Cloud Storage. Use Download file for a short-lived admin link or Open in Google Cloud for internal object details.
            </p>
          </div>
          {response.items.map((file) => (
            <SecureUploadCard
              key={file.id}
              file={file}
              downloadDisabled={Boolean(downloadingFileId) && downloadingFileId !== file.id}
              downloadError={downloadErrors[file.id]}
              downloading={downloadingFileId === file.id}
              onDownload={handleDownloadFile}
            />
          ))}
        </section>
      )}

      {!error && (
        <section className={`${sectionClassName} flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between`}>
          <p className="text-sm font-medium text-[#0A1547]/58">
            Showing {response.count} files from offset {response.offset}. {response.hasMore ? "More results are available." : "End of current result set."}
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setOffset(Math.max(0, offset - DEFAULT_LIMIT))}
              disabled={loading || !canGoBack}
              className="admin-focus rounded-lg border border-[#0A1547]/10 bg-white px-4 py-2 text-sm font-semibold text-[#0A1547]/82 transition hover:border-[#A380F6]/60 disabled:cursor-not-allowed disabled:opacity-55"
            >
              Previous
            </button>
            <button
              type="button"
              onClick={() => setOffset(offset + DEFAULT_LIMIT)}
              disabled={loading || !canGoNext}
              className="admin-focus rounded-lg bg-[#0A1547] px-4 py-2 text-sm font-bold text-white transition hover:bg-[#1A2460] disabled:cursor-not-allowed disabled:opacity-55"
            >
              Next
            </button>
          </div>
        </section>
      )}
    </div>
  );
}

function SecureUploadCard({
  downloadDisabled,
  downloadError,
  downloading,
  file,
  onDownload,
}: {
  downloadDisabled: boolean;
  downloadError?: string;
  downloading: boolean;
  file: SecureUploadFile;
  onDownload: (file: SecureUploadFile) => void;
}) {
  const status = statusLabel(file);
  const isCompleted = status === "Completed";

  return (
    <article className={`${sectionClassName} p-4`}>
      <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
        <div className="flex min-w-0 flex-1 items-start gap-3">
          <IconBadge compact icon="upload" tone="secure" />
          <div className="min-w-0">
            <h3 className="break-words text-base font-semibold leading-6 text-[#0A1547]">
              {formatNullable(file.originalFilename)}
            </h3>
            <p className="mt-1 break-all text-sm font-medium text-[#0A1547]/56">
              {formatNullable(file.userEmail)}
            </p>
            <div className="mt-3 grid gap-2 text-xs font-medium text-[#0A1547]/52 sm:grid-cols-2 lg:grid-cols-3">
              <span>Created {formatDate(file.createdAt)}</span>
              <span>Completed {formatDate(file.completedAt)}</span>
              <span>{formatBytes(file.byteSize)}</span>
            </div>
          </div>
        </div>
        <div className="shrink-0 xl:ml-4">
          <div className="flex flex-wrap items-center gap-2 sm:flex-nowrap xl:justify-end">
            <StatusPill className={statusTone(file)}>
              {status}
            </StatusPill>
            {isCompleted && (
              <button
                type="button"
                onClick={() => onDownload(file)}
                disabled={downloading || downloadDisabled}
                className="admin-focus inline-flex h-9 items-center gap-1.5 whitespace-nowrap rounded-lg bg-[#0A1547] px-3 text-xs font-bold text-white transition hover:bg-[#1A2460] disabled:cursor-not-allowed disabled:opacity-55"
              >
                <Icon name="download" size={14} />
                {downloading ? "Preparing..." : "Download file"}
              </button>
            )}
            {file.consoleUrl && (
              <a
                href={file.consoleUrl}
                target="_blank"
                rel="noreferrer"
                className="admin-focus inline-flex h-9 items-center gap-1.5 whitespace-nowrap rounded-lg border border-[#02ABE0]/25 bg-white px-3 text-xs font-semibold text-[#02ABE0] transition hover:border-[#02ABE0]/55"
              >
                <Icon name="cloud" size={14} />
                Open in Google Cloud
              </a>
            )}
          </div>
          {downloadError && (
            <p className="mt-2 text-xs font-semibold text-red-700 xl:text-right">
              {downloadError}
            </p>
          )}
        </div>
      </div>

      <div className="mt-3">
        <details className="rounded-lg border border-[#0A1547]/10 bg-[#F8F9FD] px-4 py-3">
          <summary className="cursor-pointer text-[11px] font-medium uppercase tracking-[0.12em] text-[#0A1547]/45">
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
    <div className="min-w-0">
      <dt className="text-[11px] font-medium uppercase tracking-[0.12em] text-[#0A1547]/38">{label}</dt>
      <dd className="mt-1 break-words font-medium text-[#0A1547]/72">{formatNullable(value)}</dd>
    </div>
  );
}

function ErrorState({ message }: { message: string }) {
  return (
    <div className="rounded-lg border border-red-200 bg-red-50 p-5 text-sm font-semibold text-red-700">
      {message}
    </div>
  );
}

function EmptyState({ description, title }: { description: string; title: string }) {
  return (
    <div className={`${sectionClassName} p-8 text-center`}>
      <div className="mx-auto mb-3 flex justify-center">
        <IconBadge icon="file" tone="neutral" />
      </div>
      <h3 className="text-lg font-black text-[#0A1547]">{title}</h3>
      <p className="mt-2 text-sm font-medium text-[#0A1547]/60">{description}</p>
    </div>
  );
}

function Icon({ name, size = 18 }: { name: IconName; size?: number }) {
  return (
    <svg
      aria-hidden="true"
      fill="none"
      height={size}
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="2"
      viewBox="0 0 24 24"
      width={size}
    >
      {iconPath(name)}
    </svg>
  );
}

function iconPath(name: IconName): ReactNode {
  switch (name) {
    case "cloud":
      return (
        <>
          <path d="M17.5 19H7a5 5 0 1 1 1.2-9.85A7 7 0 0 1 21 12a4 4 0 0 1-3.5 7Z" />
        </>
      );
    case "download":
      return (
        <>
          <path d="M12 3v12" />
          <path d="m7 10 5 5 5-5" />
          <path d="M5 21h14" />
        </>
      );
    case "file":
      return (
        <>
          <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8Z" />
          <path d="M14 3v5h5" />
        </>
      );
    case "filter":
      return (
        <>
          <path d="M4 6h16" />
          <path d="M7 12h10" />
          <path d="M10 18h4" />
        </>
      );
    case "lock":
      return (
        <>
          <rect height="11" rx="2" width="16" x="4" y="10" />
          <path d="M8 10V7a4 4 0 0 1 8 0v3" />
        </>
      );
    case "mail":
      return (
        <>
          <rect height="14" rx="2" width="18" x="3" y="5" />
          <path d="m3 7 9 6 9-6" />
        </>
      );
    case "refresh":
      return (
        <>
          <path d="M21 12a9 9 0 0 1-15.5 6.2" />
          <path d="M3 12A9 9 0 0 1 18.5 5.8" />
          <path d="M3 18v-5h5" />
          <path d="M21 6v5h-5" />
        </>
      );
    case "upload":
    default:
      return (
        <>
          <path d="M12 21V9" />
          <path d="m7 14 5-5 5 5" />
          <path d="M5 21h14" />
          <path d="M19 5v4" />
          <path d="M5 5v4" />
        </>
      );
  }
}
