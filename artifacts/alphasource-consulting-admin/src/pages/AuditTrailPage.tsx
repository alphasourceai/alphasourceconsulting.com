import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import { useAuth } from "@/auth/AuthProvider";
import { AdminApiError, exportAuditEventsCsv, getAuditEvents } from "@/lib/adminApi";
import type { AuditEvent, AuditEventsQuery, AuditEventsResponse } from "@/lib/types";

const PAGE_LIMIT = 50;

const eventTypeOptions = [
  "admin_access.created",
  "admin_access.updated",
  "analysis.phi_acknowledged",
  "checkout_session.created",
  "checkout_session.expired",
  "client.created",
  "pdf_report.generated",
  "secure_upload.download_url_created",
  "secure_upload.file_completed",
  "secure_upload.request_sent",
  "upload.voided",
];

type AuditFilters = {
  startDate: string;
  endDate: string;
  eventType: string;
  clientEmail: string;
  actorEmail: string;
  targetType: string;
};

const DEFAULT_FILTERS: AuditFilters = {
  startDate: "",
  endDate: "",
  eventType: "",
  clientEmail: "",
  actorEmail: "",
  targetType: "",
};

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

function MetadataDetails({ event }: { event: AuditEvent }) {
  const json = metadataJson(event.metadata);

  if (!json) {
    return <span className="text-[#0A1547]/45">-</span>;
  }

  return (
    <details className="group">
      <summary className="admin-focus cursor-pointer rounded-lg text-xs font-semibold text-[#0A1547]/65 underline decoration-[#A380F6]/40 underline-offset-4 hover:text-[#0A1547]">
        View metadata
      </summary>
      <pre className="mt-2 max-h-64 max-w-[30rem] overflow-auto rounded-xl border border-[#0A1547]/10 bg-[#F8F9FD] p-3 text-xs font-medium leading-5 text-[#0A1547]/72">
        {json}
      </pre>
    </details>
  );
}

function UserCell({ event }: { event: AuditEvent }) {
  const primary = event.actorDisplayName || event.actorAdminEmail || "-";

  return (
    <div className="min-w-0">
      <p className="break-words text-sm font-semibold text-[#0A1547]">{primary}</p>
      {event.actorRole ? (
        <p className="mt-1 text-xs font-medium capitalize text-[#0A1547]/52">{event.actorRole.replace(/_/g, " ")}</p>
      ) : null}
    </div>
  );
}

function TargetCell({ event }: { event: AuditEvent }) {
  if (!event.targetType && !event.targetId) {
    return <span className="text-[#0A1547]/45">-</span>;
  }

  return (
    <div className="min-w-0">
      <p className="text-sm font-semibold text-[#0A1547]">{displayValue(event.targetType)}</p>
      {event.targetId ? (
        <details className="mt-1">
          <summary className="admin-focus cursor-pointer rounded-lg text-xs font-medium text-[#0A1547]/52 underline decoration-[#A380F6]/30 underline-offset-4">
            Target ID
          </summary>
          <p className="mt-1 max-w-56 break-all font-mono text-xs text-[#0A1547]/55">{event.targetId}</p>
        </details>
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
    <div className="space-y-6">
      <section className="admin-card p-6">
        <p className="text-xs font-extrabold uppercase tracking-[0.18em] text-[#A380F6]">Super Admin only</p>
        <div className="mt-3 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h2 className="text-2xl font-black text-[#0A1547]">Audit Trail</h2>
            <p className="mt-2 max-w-3xl text-sm font-medium leading-6 text-[#0A1547]/65">
              Review key admin and platform events captured going forward from enabled workflows. Timestamps display in Mountain Time, and sensitive values such as tokens, signed URLs, object paths, and filenames are sanitized by the Admin API.
            </p>
          </div>
          <button
            type="button"
            onClick={() => void handleExport()}
            disabled={exporting}
            className="admin-focus shrink-0 rounded-xl bg-[#A380F6] px-5 py-3 text-sm font-extrabold text-white transition hover:bg-[#906cf2] disabled:opacity-55"
          >
            {exporting ? "Exporting..." : "Export CSV"}
          </button>
        </div>
        {exportError ? (
          <p className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
            {exportError}
          </p>
        ) : null}
      </section>

      <section className="admin-card p-5">
        <form onSubmit={applyFilters} className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-6">
            <label className="block">
              <span className="text-xs font-bold uppercase tracking-[0.14em] text-[#0A1547]/58">Start date</span>
              <input
                type="date"
                value={filters.startDate}
                onChange={(event) => setFilters((current) => ({ ...current, startDate: event.target.value }))}
                className="admin-focus mt-2 h-11 w-full rounded-xl border border-[#0A1547]/12 bg-white px-3 text-sm font-medium text-[#0A1547]"
              />
            </label>
            <label className="block">
              <span className="text-xs font-bold uppercase tracking-[0.14em] text-[#0A1547]/58">End date</span>
              <input
                type="date"
                value={filters.endDate}
                onChange={(event) => setFilters((current) => ({ ...current, endDate: event.target.value }))}
                className="admin-focus mt-2 h-11 w-full rounded-xl border border-[#0A1547]/12 bg-white px-3 text-sm font-medium text-[#0A1547]"
              />
            </label>
            <label className="block">
              <span className="text-xs font-bold uppercase tracking-[0.14em] text-[#0A1547]/58">Event type</span>
              <select
                value={filters.eventType}
                onChange={(event) => setFilters((current) => ({ ...current, eventType: event.target.value }))}
                className="admin-focus mt-2 h-11 w-full rounded-xl border border-[#0A1547]/12 bg-white px-3 text-sm font-medium text-[#0A1547]"
              >
                <option value="">All events</option>
                {eventTypeOptions.map((eventType) => (
                  <option key={eventType} value={eventType}>{eventType}</option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="text-xs font-bold uppercase tracking-[0.14em] text-[#0A1547]/58">Client email</span>
              <input
                type="search"
                value={filters.clientEmail}
                onChange={(event) => setFilters((current) => ({ ...current, clientEmail: event.target.value }))}
                placeholder="client@example.com"
                className="admin-focus mt-2 h-11 w-full rounded-xl border border-[#0A1547]/12 bg-white px-3 text-sm font-medium text-[#0A1547]"
              />
            </label>
            <label className="block">
              <span className="text-xs font-bold uppercase tracking-[0.14em] text-[#0A1547]/58">Actor email</span>
              <input
                type="search"
                value={filters.actorEmail}
                onChange={(event) => setFilters((current) => ({ ...current, actorEmail: event.target.value }))}
                placeholder="admin@example.com"
                className="admin-focus mt-2 h-11 w-full rounded-xl border border-[#0A1547]/12 bg-white px-3 text-sm font-medium text-[#0A1547]"
              />
            </label>
            <label className="block">
              <span className="text-xs font-bold uppercase tracking-[0.14em] text-[#0A1547]/58">Target type</span>
              <input
                type="search"
                value={filters.targetType}
                onChange={(event) => setFilters((current) => ({ ...current, targetType: event.target.value }))}
                placeholder="upload"
                className="admin-focus mt-2 h-11 w-full rounded-xl border border-[#0A1547]/12 bg-white px-3 text-sm font-medium text-[#0A1547]"
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
                className="admin-focus rounded-xl border border-[#0A1547]/12 bg-white px-4 py-2.5 text-sm font-bold text-[#0A1547] transition hover:bg-[#F8F9FD]"
              >
                Clear filters
              </button>
              <button
                type="submit"
                className="admin-focus rounded-xl bg-[#0A1547] px-4 py-2.5 text-sm font-extrabold text-white transition hover:bg-[#1A2460]"
              >
                Apply filters
              </button>
            </div>
          </div>
        </form>
      </section>

      <section className="admin-card overflow-hidden">
        {error ? (
          <div className="m-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
            {error}
          </div>
        ) : null}

        <div className="overflow-x-auto">
          <table className="min-w-[1180px] w-full border-collapse text-left">
            <thead className="bg-[#F8F9FD] text-xs font-extrabold uppercase tracking-[0.14em] text-[#0A1547]/55">
              <tr>
                <th className="px-5 py-4">Timestamp</th>
                <th className="px-5 py-4">Event</th>
                <th className="px-5 py-4">User</th>
                <th className="px-5 py-4">Client</th>
                <th className="px-5 py-4">Target</th>
                <th className="px-5 py-4">IP</th>
                <th className="px-5 py-4">Device</th>
                <th className="px-5 py-4">Location</th>
                <th className="px-5 py-4">Metadata</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#0A1547]/8">
              {loading ? (
                <tr>
                  <td colSpan={9} className="px-5 py-10 text-center text-sm font-semibold text-[#0A1547]/58">
                    Loading audit events...
                  </td>
                </tr>
              ) : response.items.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-5 py-10 text-center text-sm font-semibold text-[#0A1547]/58">
                    No audit events match the selected filters.
                  </td>
                </tr>
              ) : (
                response.items.map((event) => (
                  <tr key={event.id} className="align-top">
                    <td className="w-48 px-5 py-4">
                      <p className="text-sm font-semibold text-[#0A1547]">{displayValue(event.occurredAtMst)}</p>
                      <p className="mt-1 text-xs font-medium text-[#0A1547]/45">Mountain Time</p>
                    </td>
                    <td className="w-56 px-5 py-4">
                      <p className="text-sm font-semibold capitalize text-[#0A1547]">{eventLabel(event.eventType)}</p>
                      <p className="mt-1 text-xs font-medium capitalize text-[#0A1547]/48">{sourceLabel(event.source)}</p>
                    </td>
                    <td className="w-60 px-5 py-4">
                      <UserCell event={event} />
                    </td>
                    <td className="w-60 px-5 py-4">
                      <p className="break-words text-sm font-medium text-[#0A1547]/72">{displayValue(event.clientEmail)}</p>
                    </td>
                    <td className="w-56 px-5 py-4">
                      <TargetCell event={event} />
                    </td>
                    <td className="w-40 px-5 py-4">
                      <p className="break-all text-sm font-medium text-[#0A1547]/72">{displayValue(event.ipAddress)}</p>
                    </td>
                    <td className="w-48 px-5 py-4">
                      <p className="text-sm font-medium text-[#0A1547]/72">{displayValue(event.deviceSummary)}</p>
                    </td>
                    <td className="w-36 px-5 py-4">
                      <p className="text-sm font-medium text-[#0A1547]/72">{displayValue(event.location)}</p>
                    </td>
                    <td className="w-72 px-5 py-4">
                      <MetadataDetails event={event} />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
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
              className="admin-focus rounded-xl border border-[#0A1547]/12 bg-white px-4 py-2.5 text-sm font-bold text-[#0A1547] transition hover:bg-[#F8F9FD] disabled:opacity-45"
            >
              Previous
            </button>
            <button
              type="button"
              onClick={() => setOffset((current) => current + PAGE_LIMIT)}
              disabled={!canGoNext || loading}
              className="admin-focus rounded-xl bg-[#A380F6] px-4 py-2.5 text-sm font-extrabold text-white transition hover:bg-[#906cf2] disabled:opacity-45"
            >
              Next
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
