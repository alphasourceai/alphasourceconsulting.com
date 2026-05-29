import { useCallback, useEffect, useMemo, useState, type FormEvent, type ReactNode } from "react";
import { useAuth } from "@/auth/AuthProvider";
import { AdminApiError, exportAuditEventsCsv, getAuditEvents } from "@/lib/adminApi";
import type { AuditEvent, AuditEventsQuery, AuditEventsResponse } from "@/lib/types";

const PAGE_LIMIT = 50;

const auditEventLabels: Record<string, string> = {
  "admin_access.created": "Admin Access Created",
  "admin_access.updated": "Admin Access Updated",
  "analysis.phi_acknowledged": "PHI Acknowledgment",
  "checkout_session.created": "Checkout Session Created",
  "checkout_session.expired": "Checkout Session Expired",
  "client.created": "Client Created",
  "pdf_report.generated": "PDF Report Generated",
  "secure_upload.download_url_created": "Secure Upload Download Created",
  "secure_upload.file_completed": "Secure Upload File Completed",
  "secure_upload.request_sent": "Secure Upload Request Sent",
  "upload.voided": "Upload Voided",
};

const eventTypeOptions = Object.keys(auditEventLabels);

type AuditFilters = {
  startDate: string;
  endDate: string;
  eventType: string;
  clientEmail: string;
  actorEmail: string;
  targetType: string;
};
type IconName = "activity" | "calendar" | "client" | "download" | "filter" | "ip" | "metadata" | "target" | "user";
type IconTone = "audit" | "clients" | "secure" | "billing" | "analysis" | "success" | "warning" | "danger" | "neutral" | "lilac";

const DEFAULT_FILTERS: AuditFilters = {
  startDate: "",
  endDate: "",
  eventType: "",
  clientEmail: "",
  actorEmail: "",
  targetType: "",
};
const sectionClassName = "rounded-lg border border-[#0A1547]/10 bg-white shadow-[0_12px_28px_rgba(10,21,71,0.05)]";
const compactRowClassName = "rounded-lg border border-[#0A1547]/10 bg-white p-4";
const inputClassName = "admin-focus mt-2 h-11 w-full rounded-lg border border-[#0A1547]/10 bg-[#F8F9FD] px-4 text-sm font-medium text-[#0A1547] placeholder:text-[#0A1547]/38";
const selectClassName = "admin-focus mt-2 h-11 w-full rounded-lg border border-[#0A1547]/10 bg-[#F8F9FD] px-4 text-sm font-medium leading-tight text-[#0A1547]";
const labelClassName = "text-[11px] font-medium uppercase tracking-[0.12em] text-[#0A1547]/38";
const quietDetailsClassName = "mt-4 rounded-lg border border-[#0A1547]/10 bg-[#F8F9FD] px-4 py-3";
const quietSummaryClassName = "admin-focus cursor-pointer text-xs font-semibold uppercase tracking-[0.12em] text-[#0A1547]/46";

const emptyResponse: AuditEventsResponse = {
  ok: true,
  items: [],
  count: 0,
  hasMore: false,
};

function cleanQuery(filters: AuditFilters, offset: number): AuditEventsQuery {
  return {
    startDate: filters.startDate,
    endDate: filters.endDate,
    eventType: filters.eventType,
    clientEmail: filters.clientEmail,
    actorEmail: filters.actorEmail,
    targetType: filters.targetType,
    limit: PAGE_LIMIT,
    offset,
  };
}

function eventLabel(eventType: string | null): string {
  if (!eventType) {
    return "-";
  }
  if (auditEventLabels[eventType]) {
    return auditEventLabels[eventType];
  }
  return eventType
    .split(".")
    .map((part) => part.replace(/_/g, " "))
    .join(" / ");
}

function sourceLabel(source: string | null): string {
  if (!source) {
    return "-";
  }
  return source.replace(/_/g, " ");
}

function eventIcon(eventType: string | null): IconName {
  const normalized = eventType || "";

  if (normalized.includes("admin_access")) {
    return "user";
  }

  if (normalized.includes("checkout")) {
    return "download";
  }

  if (normalized.includes("secure_upload") || normalized.includes("upload")) {
    return "target";
  }

  if (normalized.includes("analysis") || normalized.includes("pdf_report")) {
    return "activity";
  }

  if (normalized.includes("client")) {
    return "client";
  }

  return "metadata";
}

function eventTone(eventType: string | null): IconTone {
  const normalized = eventType || "";

  if (normalized.includes("admin_access")) {
    return "lilac";
  }

  if (normalized.includes("checkout")) {
    return "billing";
  }

  if (normalized.includes("secure_upload") || normalized.includes("upload")) {
    return "secure";
  }

  if (normalized.includes("analysis") || normalized.includes("pdf_report")) {
    return "analysis";
  }

  if (normalized.includes("client")) {
    return "clients";
  }

  return "audit";
}

function displayValue(value: string | null | undefined): string {
  return value?.trim() || "-";
}

function metadataJson(metadata: Record<string, unknown> | null | undefined): string {
  if (!metadata || Object.keys(metadata).length === 0) {
    return "";
  }
  return JSON.stringify(metadata, null, 2);
}

function triggerCsvDownload(blob: Blob) {
  const objectUrl = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = objectUrl;
  link.download = "alphasource-audit-events.csv";
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(objectUrl);
}

function EventDetails({ event }: { event: AuditEvent }) {
  const json = metadataJson(event.metadata);

  return (
    <details className={quietDetailsClassName}>
      <summary className={quietSummaryClassName}>
        Event details
      </summary>
      <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <DetailTile label="Source" value={sourceLabel(event.source)} />
        <DetailTile label="Target type" value={displayValue(event.targetType)} />
        <DetailTile label="Target ID" value={displayValue(event.targetId)} breakAll />
        <DetailTile label="IP address" value={displayValue(event.ipAddress)} mono />
        <DetailTile label="Device" value={displayValue(event.deviceSummary)} />
        <DetailTile label="Location" value={displayValue(event.location)} />
        <DetailTile label="User agent" value={displayValue(event.userAgent)} breakAll className="md:col-span-2" />
      </div>
      <div className="mt-4">
        <p className={labelClassName}>Metadata</p>
        {json ? (
          <pre className="mt-2 max-h-64 overflow-auto rounded-lg border border-[#0A1547]/10 bg-white p-3 text-xs font-medium leading-5 text-[#0A1547]/68">
            {json}
          </pre>
        ) : (
          <p className="mt-2 text-sm font-medium text-[#0A1547]/45">No metadata recorded.</p>
        )}
      </div>
    </details>
  );
}

function UserCell({ event }: { event: AuditEvent }) {
  const primary = event.actorDisplayName || event.actorAdminEmail || "-";

  return (
    <div className="min-w-0">
      <p className="break-words text-sm font-semibold text-[#0A1547]/82">{primary}</p>
      {event.actorRole ? (
        <p className="mt-1 text-xs font-medium capitalize text-[#0A1547]/50">{event.actorRole.replace(/_/g, " ")}</p>
      ) : null}
    </div>
  );
}

function TargetCell({ event }: { event: AuditEvent }) {
  if (!event.targetType && !event.targetId) {
    return <span className="text-sm font-medium text-[#0A1547]/45">-</span>;
  }

  return (
    <div className="min-w-0">
      <p className="text-sm font-semibold text-[#0A1547]/80">{displayValue(event.targetType)}</p>
      {event.targetId ? (
        <p className="mt-1 max-w-72 break-all font-mono text-xs text-[#0A1547]/45">{event.targetId}</p>
      ) : null}
    </div>
  );
}

export default function AuditTrailPage() {
  const { session } = useAuth();
  const token = session?.access_token || "";
  const [filters, setFilters] = useState<AuditFilters>(DEFAULT_FILTERS);
  const [appliedFilters, setAppliedFilters] = useState<AuditFilters>(DEFAULT_FILTERS);
  const [offset, setOffset] = useState(0);
  const [response, setResponse] = useState<AuditEventsResponse>(emptyResponse);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState("");

  const query = useMemo(() => cleanQuery(appliedFilters, offset), [appliedFilters, offset]);
  const exportQuery = useMemo<AuditEventsQuery>(() => ({ ...appliedFilters }), [appliedFilters]);

  const loadEvents = useCallback(async (signal?: AbortSignal) => {
    if (!token) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError("");

    try {
      const eventsResponse = await getAuditEvents(token, query, signal);
      setResponse(eventsResponse);
    } catch (loadError) {
      if (loadError instanceof DOMException && loadError.name === "AbortError") {
        return;
      }
      setError(loadError instanceof AdminApiError ? loadError.message : "Audit events could not be loaded.");
    } finally {
      if (!signal?.aborted) {
        setLoading(false);
      }
    }
  }, [query, token]);

  useEffect(() => {
    const controller = new AbortController();
    void loadEvents(controller.signal);

    return () => {
      controller.abort();
    };
  }, [loadEvents]);

  const applyFilters = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setOffset(0);
    setAppliedFilters({ ...filters });
    setExportError("");
  };

  const clearFilters = () => {
    setFilters(DEFAULT_FILTERS);
    setAppliedFilters(DEFAULT_FILTERS);
    setOffset(0);
    setExportError("");
  };

  const handleExport = async () => {
    if (!token || exporting) {
      return;
    }

    setExporting(true);
    setExportError("");

    try {
      const csvBlob = await exportAuditEventsCsv(token, exportQuery);
      triggerCsvDownload(csvBlob);
    } catch (exportFailure) {
      setExportError(exportFailure instanceof AdminApiError ? exportFailure.message : "Audit CSV export could not be created.");
    } finally {
      setExporting(false);
    }
  };

  const canGoBack = offset > 0;
  const canGoNext = response.hasMore;
  const rangeStart = response.items.length > 0 ? offset + 1 : 0;
  const rangeEnd = offset + response.items.length;

  return (
    <div className="space-y-5">
      <section className={`${sectionClassName} px-5 py-4`}>
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex min-w-0 items-start gap-3">
            <IconBadge icon="activity" tone="audit" />
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-2xl font-black text-[#0A1547]">Audit Trail</h2>
                <StatusChip>Super Admin only</StatusChip>
              </div>
              <p className="mt-1 max-w-3xl text-sm font-medium leading-6 text-[#0A1547]/58">
                Review admin and platform events with Mountain Time timestamps and sanitized exports.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => void handleExport()}
            disabled={exporting}
            className="admin-focus inline-flex shrink-0 items-center justify-center gap-2 rounded-lg bg-[#A380F6] px-4 py-2.5 text-sm font-bold text-white transition hover:bg-[#906cf2] disabled:cursor-not-allowed disabled:opacity-55"
          >
            <Icon name="download" size={15} />
            {exporting ? "Exporting..." : "Export CSV"}
          </button>
        </div>
        {exportError ? (
          <Alert className="mt-4">{exportError}</Alert>
        ) : null}
      </section>

      <section className={`${sectionClassName} p-5`}>
        <SectionHeader
          icon="filter"
          iconTone="lilac"
          title="Filters"
          helper="Narrow audit events by date, action, client, actor, or target."
        />
        <form onSubmit={applyFilters} className="space-y-4">
          <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-6">
            <label className="block">
              <span className={labelClassName}>Start date</span>
              <input
                type="date"
                value={filters.startDate}
                onChange={(event) => setFilters((current) => ({ ...current, startDate: event.target.value }))}
                className={inputClassName}
              />
            </label>
            <label className="block">
              <span className={labelClassName}>End date</span>
              <input
                type="date"
                value={filters.endDate}
                onChange={(event) => setFilters((current) => ({ ...current, endDate: event.target.value }))}
                className={inputClassName}
              />
            </label>
            <label className="block">
              <span className={labelClassName}>Event type</span>
              <select
                value={filters.eventType}
                onChange={(event) => setFilters((current) => ({ ...current, eventType: event.target.value }))}
                className={selectClassName}
              >
                <option value="">All events</option>
                {eventTypeOptions.map((eventType) => (
                  <option key={eventType} value={eventType}>{eventLabel(eventType)}</option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className={labelClassName}>Client email</span>
              <input
                type="search"
                value={filters.clientEmail}
                onChange={(event) => setFilters((current) => ({ ...current, clientEmail: event.target.value }))}
                placeholder="client@example.com"
                className={inputClassName}
              />
            </label>
            <label className="block">
              <span className={labelClassName}>Actor email</span>
              <input
                type="search"
                value={filters.actorEmail}
                onChange={(event) => setFilters((current) => ({ ...current, actorEmail: event.target.value }))}
                placeholder="admin@example.com"
                className={inputClassName}
              />
            </label>
            <label className="block">
              <span className={labelClassName}>Target type</span>
              <input
                type="search"
                value={filters.targetType}
                onChange={(event) => setFilters((current) => ({ ...current, targetType: event.target.value }))}
                placeholder="upload"
                className={inputClassName}
              />
            </label>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm font-medium text-[#0A1547]/58">
              Showing {rangeStart}-{rangeEnd} of the current page. CSV export uses the current filters.
            </p>
            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={clearFilters}
                className="admin-focus rounded-lg border border-[#0A1547]/10 bg-white px-4 py-2.5 text-sm font-semibold text-[#0A1547]/72 transition hover:border-[#02ABE0]/35 hover:text-[#0A1547]"
              >
                Clear filters
              </button>
              <button
                type="submit"
                className="admin-focus rounded-lg bg-[#0A1547] px-4 py-2.5 text-sm font-bold text-white transition hover:bg-[#1A2460]"
              >
                Apply filters
              </button>
            </div>
          </div>
        </form>
      </section>

      <section className={`${sectionClassName} overflow-hidden`}>
        <div className="border-b border-[#0A1547]/10 p-5">
          <SectionHeader
            icon="activity"
            iconTone="audit"
            title="Events"
            helper="Sensitive tokens, signed URLs, object paths, and filenames are removed before display and export."
            trailing={(
              <div className="flex flex-wrap gap-2">
                <MetricChip label="Showing" value={`${rangeStart}-${rangeEnd}`} />
                <MetricChip label="Page size" value={PAGE_LIMIT} />
              </div>
            )}
          />
        </div>

        {error ? (
          <Alert className="m-5">{error}</Alert>
        ) : null}

        <div className="space-y-3 bg-[#F8F9FD] p-4">
          {loading ? (
            <div className="rounded-lg border border-[#0A1547]/10 bg-white p-8 text-center text-sm font-medium text-[#0A1547]/58">
              Loading audit events...
            </div>
          ) : response.items.length === 0 ? (
            <div className="rounded-lg border border-[#0A1547]/10 bg-white p-8 text-center text-sm font-medium text-[#0A1547]/58">
              No audit events match the selected filters.
            </div>
          ) : (
            response.items.map((event) => (
              <article key={event.id} className={compactRowClassName}>
                <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                  <div className="flex min-w-0 flex-1 gap-3">
                    <IconBadge icon={eventIcon(event.eventType)} tone={eventTone(event.eventType)} compact />
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                        <div className="min-w-0">
                          <h3 className="text-base font-bold text-[#0A1547]">{eventLabel(event.eventType)}</h3>
                          <div className="mt-2 flex flex-wrap items-center gap-2">
                            <StatusChip>{sourceLabel(event.source)}</StatusChip>
                            {event.targetType ? <StatusChip>{event.targetType}</StatusChip> : null}
                          </div>
                        </div>
                        <div className="shrink-0 lg:text-right">
                          <p className="text-sm font-semibold text-[#0A1547]/82">{displayValue(event.occurredAtMst)}</p>
                          <p className="mt-1 text-xs font-medium text-[#0A1547]/45">Mountain Time</p>
                        </div>
                      </div>

                      <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                        <ContextTile icon="user" iconTone="clients" label="Actor">
                          <UserCell event={event} />
                        </ContextTile>
                        <ContextTile icon="client" iconTone="clients" label="Client">
                          <p className="break-words text-sm font-semibold text-[#0A1547]/78">{displayValue(event.clientEmail)}</p>
                        </ContextTile>
                        <ContextTile icon="target" iconTone="neutral" label="Target">
                          <TargetCell event={event} />
                        </ContextTile>
                        <ContextTile icon="ip" iconTone="neutral" label="IP / device">
                          <p className="font-mono text-xs font-medium text-[#0A1547]/68">{displayValue(event.ipAddress)}</p>
                          <p className="mt-1 text-xs font-medium text-[#0A1547]/48">{displayValue(event.deviceSummary)}</p>
                        </ContextTile>
                      </div>

                      <EventDetails event={event} />
                    </div>
                  </div>
                </div>
              </article>
            ))
          )}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[#0A1547]/8 px-5 py-4">
          <p className="text-sm font-medium text-[#0A1547]/58">
            Page size {PAGE_LIMIT}. {response.hasMore ? "More events are available." : "End of current results."}
          </p>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => setOffset((current) => Math.max(0, current - PAGE_LIMIT))}
              disabled={!canGoBack || loading}
              className="admin-focus rounded-lg border border-[#0A1547]/10 bg-white px-4 py-2.5 text-sm font-semibold text-[#0A1547]/72 transition hover:border-[#02ABE0]/35 hover:text-[#0A1547] disabled:cursor-not-allowed disabled:opacity-45"
            >
              Previous
            </button>
            <button
              type="button"
              onClick={() => setOffset((current) => current + PAGE_LIMIT)}
              disabled={!canGoNext || loading}
              className="admin-focus rounded-lg bg-[#A380F6] px-4 py-2.5 text-sm font-bold text-white transition hover:bg-[#906cf2] disabled:cursor-not-allowed disabled:opacity-45"
            >
              Next
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}

function SectionHeader({
  helper,
  icon,
  iconTone,
  title,
  trailing,
}: {
  helper?: string;
  icon: IconName;
  iconTone: IconTone;
  title: string;
  trailing?: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
      <div className="flex min-w-0 items-start gap-3">
        <IconBadge icon={icon} tone={iconTone} compact />
        <div className="min-w-0">
          <h3 className="text-base font-bold text-[#0A1547]">{title}</h3>
          {helper ? (
            <p className="mt-1 text-sm font-medium leading-6 text-[#0A1547]/55">
              {helper}
            </p>
          ) : null}
        </div>
      </div>
      {trailing}
    </div>
  );
}

function ContextTile({
  children,
  icon,
  iconTone,
  label,
}: {
  children: ReactNode;
  icon: IconName;
  iconTone: IconTone;
  label: string;
}) {
  return (
    <div className="min-w-0 rounded-lg border border-[#0A1547]/10 bg-[#F8F9FD] px-3 py-2.5">
      <div className="mb-2 flex items-center gap-2">
        <IconBadge icon={icon} tone={iconTone} compact />
        <p className={labelClassName}>{label}</p>
      </div>
      {children}
    </div>
  );
}

function DetailTile({
  breakAll = false,
  className = "",
  label,
  mono = false,
  value,
}: {
  breakAll?: boolean;
  className?: string;
  label: string;
  mono?: boolean;
  value: string;
}) {
  return (
    <div className={`min-w-0 rounded-lg border border-[#0A1547]/10 bg-white px-3 py-2.5 ${className}`}>
      <p className={labelClassName}>{label}</p>
      <p className={`mt-1 text-sm font-medium text-[#0A1547]/70 ${mono ? "font-mono text-xs" : ""} ${breakAll ? "break-all" : "truncate"}`}>
        {value}
      </p>
    </div>
  );
}

function MetricChip({ label, value }: { label: string; value: number | string }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-lg border border-[#0A1547]/10 bg-[#F8F9FD] px-3 py-1.5 text-xs font-medium text-[#0A1547]/62">
      <span className="font-semibold text-[#0A1547]/82">{value}</span>
      {label}
    </span>
  );
}

function StatusChip({ children }: { children: ReactNode }) {
  return (
    <span className="inline-flex rounded-full border border-[#A380F6]/25 bg-[#A380F6]/10 px-2.5 py-0.5 text-[11px] font-semibold capitalize text-[#0A1547]/72">
      {children}
    </span>
  );
}

function Alert({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <div className={`rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700 ${className}`}>
      {children}
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
    case "clients":
    case "lilac":
      return "text-[#A380F6]";
    case "billing":
      return "text-[#02ABE0]";
    case "analysis":
    case "audit":
      return "text-[#00CFC8]";
    case "secure":
    case "warning":
      return "text-[#F59E0B]";
    case "success":
      return "text-[#02D99D]";
    case "danger":
      return "text-[#EF4444]";
    case "neutral":
    default:
      return "text-[#0A1547]/78";
  }
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

function iconPath(name: IconName) {
  switch (name) {
    case "calendar":
      return (
        <>
          <path d="M8 2v4" />
          <path d="M16 2v4" />
          <rect height="18" rx="2" width="18" x="3" y="4" />
          <path d="M3 10h18" />
        </>
      );
    case "client":
      return (
        <>
          <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
          <circle cx="9" cy="7" r="4" />
          <path d="M22 21v-2a4 4 0 0 0-3-3.9" />
          <path d="M16 3.1a4 4 0 0 1 0 7.8" />
        </>
      );
    case "download":
      return (
        <>
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
          <path d="M7 10l5 5 5-5" />
          <path d="M12 15V3" />
        </>
      );
    case "filter":
      return (
        <>
          <path d="M22 3H2l8 9.46V19l4 2v-8.54L22 3Z" />
        </>
      );
    case "ip":
      return (
        <>
          <rect height="14" rx="2" width="18" x="3" y="5" />
          <path d="M7 9h.01" />
          <path d="M11 9h.01" />
          <path d="M15 9h2" />
          <path d="M7 13h10" />
        </>
      );
    case "metadata":
      return (
        <>
          <path d="M8 6h13" />
          <path d="M8 12h13" />
          <path d="M8 18h13" />
          <path d="M3 6h.01" />
          <path d="M3 12h.01" />
          <path d="M3 18h.01" />
        </>
      );
    case "target":
      return (
        <>
          <circle cx="12" cy="12" r="8" />
          <circle cx="12" cy="12" r="3" />
          <path d="M12 2v3" />
          <path d="M12 19v3" />
          <path d="M2 12h3" />
          <path d="M19 12h3" />
        </>
      );
    case "user":
      return (
        <>
          <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
          <circle cx="12" cy="7" r="4" />
        </>
      );
    case "activity":
    default:
      return (
        <>
          <path d="M22 12h-4l-3 8-6-16-3 8H2" />
        </>
      );
  }
}
