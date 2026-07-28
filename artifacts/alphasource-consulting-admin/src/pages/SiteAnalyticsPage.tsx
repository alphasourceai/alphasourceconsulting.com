import { useCallback, useEffect, useMemo, useState } from "react";
import { exportSiteAnalyticsLeadsCsv, getSiteAnalytics, updateSiteAnalyticsLeadArchiveState } from "@/lib/adminApi";
import type { SiteAnalyticsLead, SiteAnalyticsQuery, SiteAnalyticsResponse } from "@/lib/types";
import { useAuth } from "@/auth/AuthProvider";

function isoDate(offsetDays = 0): string {
  const value = new Date();
  value.setDate(value.getDate() + offsetDays);
  return value.toISOString().slice(0, 10);
}

function formatDate(value: string | null | undefined): string {
  if (!value) return "-";
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? "-" : new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(parsed);
}

function StatusChip({ value }: { value: string }) {
  const tone = value === "submitted" ? "border-[#02D99D]/30 bg-[#02D99D]/10 text-[#087A5B]" : value === "abandoned" ? "border-amber-300 bg-amber-50 text-amber-800" : "border-[#02ABE0]/25 bg-[#02ABE0]/10 text-[#076C95]";
  return <span className={`inline-flex rounded-full border px-2.5 py-1 text-[11px] font-bold ${tone}`}>{value === "submitted" ? "Submitted" : value === "abandoned" ? "Abandoned" : "Partial"}</span>;
}

type IconName = "activity" | "archive" | "chart" | "download" | "file" | "mail" | "pointer" | "restore" | "sparkles" | "users";

function Metric({ label, value, icon, tone }: { label: string; value: number; icon: IconName; tone: string }) {
  return (
    <article className="admin-card flex min-h-[112px] items-start justify-between p-4">
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#0A1547]/48">{label}</p>
        <p className="mt-2 text-3xl font-black text-[#0A1547]">{value.toLocaleString()}</p>
      </div>
      <span className={`inline-flex h-9 w-9 items-center justify-center rounded-lg border border-[#0A1547]/10 bg-white ${tone}`}><Icon name={icon} size={18} /></span>
    </article>
  );
}

function LeadRow({ lead, canManage, onArchive }: { lead: SiteAnalyticsLead; canManage: boolean; onArchive: (lead: SiteAnalyticsLead) => void }) {
  const title = lead.contact.fullName || lead.contact.email || lead.contact.phone || "Contact saved";
  return (
    <article className="border-t border-[#0A1547]/8 px-5 py-4 first:border-t-0">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <StatusChip value={lead.status} />
            {lead.archived && <span className="rounded-full border border-slate-300 bg-slate-100 px-2.5 py-1 text-[11px] font-bold text-slate-600">Archived</span>}
            <p className="truncate text-sm font-bold text-[#0A1547]">{title}</p>
            {lead.productInterest && <span className="text-xs font-medium text-[#0A1547]/52">{lead.productInterest}</span>}
          </div>
          <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-[#0A1547]/58">
            {lead.contact.email && <span className="inline-flex items-center gap-1"><span className="text-[#A380F6]"><Icon name="mail" size={14} /></span>{lead.contact.email}</span>}
            {lead.contact.phone && <span>{lead.contact.phone}</span>}
            <span>{lead.source.path || "/"}</span>
            {lead.source.referrerSource && lead.source.referrerSource !== "Direct / internal" && <span>From {lead.source.referrerSource}</span>}
            <span>Updated {formatDate(lead.updatedAt)}</span>
          </div>
          {lead.messagePreview && <p className="mt-3 max-w-4xl rounded-lg bg-[#F8F9FD] px-3 py-2 text-xs leading-5 text-[#0A1547]/65">{lead.messagePreview}</p>}
        </div>
        {canManage && <button type="button" onClick={() => onArchive(lead)} className="inline-flex shrink-0 items-center justify-center gap-2 rounded-lg border border-[#0A1547]/12 px-3 py-2 text-xs font-bold text-[#0A1547] hover:border-[#A380F6] hover:text-[#6F4FE4]"><Icon name={lead.archived ? "restore" : "archive"} size={14} />{lead.archived ? "Restore" : "Archive"}</button>}
      </div>
    </article>
  );
}

export default function SiteAnalyticsPage() {
  const { session, permissions } = useAuth();
  const [filters, setFilters] = useState<SiteAnalyticsQuery>({ startDate: isoDate(-29), endDate: isoDate(), archive: "active", leadStatus: "all", leadLimit: 50, leadOffset: 0 });
  const [payload, setPayload] = useState<SiteAnalyticsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [actionError, setActionError] = useState("");
  const [exporting, setExporting] = useState(false);

  const accessToken = session?.access_token || "";
  const load = useCallback(async () => {
    if (!accessToken) return;
    setLoading(true);
    setError("");
    try {
      setPayload(await getSiteAnalytics(accessToken, filters));
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Could not load site analytics.");
    } finally {
      setLoading(false);
    }
  }, [accessToken, filters]);

  useEffect(() => { void load(); }, [load]);

  const summary = payload?.summary;
  const queryForExport = useMemo(() => ({ ...filters, leadOffset: undefined, leadLimit: undefined }), [filters]);

  const updateFilter = <Key extends keyof SiteAnalyticsQuery>(key: Key, value: SiteAnalyticsQuery[Key]) => {
    setFilters((current) => key === "leadOffset" ? { ...current, [key]: value } : { ...current, [key]: value, leadOffset: 0 });
  };

  const exportLeads = async () => {
    if (!accessToken) return;
    setExporting(true);
    setActionError("");
    try {
      const blob = await exportSiteAnalyticsLeadsCsv(accessToken, queryForExport);
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = "site-leads.csv";
      anchor.click();
      URL.revokeObjectURL(url);
    } catch (exportError) {
      setActionError(exportError instanceof Error ? exportError.message : "Could not export leads.");
    } finally {
      setExporting(false);
    }
  };

  const toggleArchive = async (lead: SiteAnalyticsLead) => {
    if (!accessToken || !permissions.canManageSiteAnalytics) return;
    const action = lead.archived ? "restore" : "archive";
    if (!window.confirm(`${action === "archive" ? "Archive" : "Restore"} this lead capture?`)) return;
    setActionError("");
    try {
      await updateSiteAnalyticsLeadArchiveState(accessToken, lead.id, !lead.archived);
      await load();
    } catch (updateError) {
      setActionError(updateError instanceof Error ? updateError.message : "Could not update lead capture.");
    }
  };

  return (
    <div className="space-y-5">
      <section className="admin-card p-4 sm:p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="flex flex-wrap gap-3">
            <label className="grid gap-1 text-xs font-semibold text-[#0A1547]/60">From<input type="date" value={filters.startDate} onChange={(event) => updateFilter("startDate", event.target.value)} className="h-10 rounded-lg border border-[#0A1547]/12 bg-white px-3 text-sm text-[#0A1547]" /></label>
            <label className="grid gap-1 text-xs font-semibold text-[#0A1547]/60">To<input type="date" value={filters.endDate} onChange={(event) => updateFilter("endDate", event.target.value)} className="h-10 rounded-lg border border-[#0A1547]/12 bg-white px-3 text-sm text-[#0A1547]" /></label>
            <label className="grid gap-1 text-xs font-semibold text-[#0A1547]/60">Lead status<select value={filters.leadStatus} onChange={(event) => updateFilter("leadStatus", event.target.value as SiteAnalyticsQuery["leadStatus"])} className="h-10 rounded-lg border border-[#0A1547]/12 bg-white px-3 text-sm text-[#0A1547]"><option value="all">All</option><option value="submitted">Submitted</option><option value="partial">Partial</option><option value="abandoned">Abandoned</option></select></label>
            <label className="grid gap-1 text-xs font-semibold text-[#0A1547]/60">Lead view<select value={filters.archive} onChange={(event) => updateFilter("archive", event.target.value as SiteAnalyticsQuery["archive"])} className="h-10 rounded-lg border border-[#0A1547]/12 bg-white px-3 text-sm text-[#0A1547]"><option value="active">Active</option><option value="archived">Archived</option><option value="all">All</option></select></label>
          </div>
          <button type="button" onClick={() => void load()} className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-[#0A1547] px-4 text-sm font-bold text-white"><Icon name="activity" size={16} />Refresh</button>
        </div>
        <p className="mt-3 text-xs leading-5 text-[#0A1547]/52">Public analytics reflects visitors who allowed optional analytics. Contact captures are first-party records and remain separate from analytics event data.</p>
      </section>

      {error && <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">{error}</p>}
      {actionError && <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">{actionError}</p>}

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <Metric label="Lead captures" value={summary?.leadCaptures || 0} icon="users" tone="text-[#A380F6]" />
        <Metric label="Submitted leads" value={summary?.submittedLeads || 0} icon="mail" tone="text-[#02D99D]" />
        <Metric label="Page views" value={summary?.pageViews || 0} icon="chart" tone="text-[#02ABE0]" />
        <Metric label="AI referrals" value={summary?.aiReferrals || 0} icon="sparkles" tone="text-[#7C5CF2]" />
        <Metric label="CTA clicks" value={summary?.ctaClicks || 0} icon="pointer" tone="text-[#F59E0B]" />
      </section>

      <section className="admin-card overflow-hidden">
        <div className="flex flex-col gap-3 border-b border-[#0A1547]/8 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div><h2 className="text-base font-black text-[#0A1547]">Lead captures</h2><p className="mt-1 text-xs text-[#0A1547]/55">Business contact requests and contact-ready form drafts.</p></div>
          <button type="button" onClick={() => void exportLeads()} disabled={exporting} className="inline-flex items-center justify-center gap-2 rounded-lg border border-[#0A1547]/12 px-3 py-2 text-xs font-bold text-[#0A1547] disabled:opacity-60"><span className="text-[#02ABE0]"><Icon name="download" size={14} /></span>{exporting ? "Exporting..." : "Export CSV"}</button>
        </div>
        {loading && !payload ? <p className="px-5 py-6 text-sm text-[#0A1547]/55">Loading lead captures...</p> : payload?.leads.items.length ? payload.leads.items.map((lead) => <LeadRow key={lead.id} lead={lead} canManage={permissions.canManageSiteAnalytics} onArchive={toggleArchive} />) : <p className="px-5 py-7 text-sm text-[#0A1547]/55">No lead captures match these filters.</p>}
        {payload?.leads.hasMore && <div className="border-t border-[#0A1547]/8 px-5 py-3"><button type="button" onClick={() => updateFilter("leadOffset", (filters.leadOffset || 0) + (filters.leadLimit || 50))} className="text-xs font-bold text-[#6F4FE4]">Load more leads</button></div>}
      </section>

      <section className="grid gap-5 xl:grid-cols-2">
        <SummaryList title="Page activity" icon="chart" iconTone="text-[#02ABE0]" empty="No public page activity in this range." rows={(payload?.pageActivity || []).map((item) => ({ primary: item.path, detail: `${item.pageViews} views · ${item.ctaClicks} CTA clicks · ${item.leadCount} leads`, value: item.pageViews + item.leadCount }))} />
        <SummaryList title="Referral sources" icon="sparkles" iconTone="text-[#7C5CF2]" empty="No referral activity in this range." rows={(payload?.referrerActivity || []).map((item) => ({ primary: item.source, detail: `${item.isAi ? "AI referral" : "Referral source"}${item.host ? ` · ${item.host}` : ""}`, value: item.count }))} />
        <SummaryList title="CTA activity" icon="pointer" iconTone="text-[#F59E0B]" empty="No tracked CTA activity in this range." rows={(payload?.ctaActivity || []).map((item) => ({ primary: item.label, detail: `${item.placement} · ${item.target}`, value: item.count }))} />
        <SummaryList title="Form progress" icon="file" iconTone="text-[#A380F6]" empty="No form progress signals in this range." rows={(payload?.formActivity || []).map((item) => ({ primary: item.productInterest || item.formId, detail: `${item.viewed} views · ${item.started} starts · ${item.submitted} submitted`, value: item.submitted }))} />
        <SummaryList title="Event mix" icon="activity" iconTone="text-[#00A89C]" empty="No public events in this range." rows={(payload?.eventTypes || []).map((item) => ({ primary: item.eventName.replace(/_/g, " "), detail: "consented public-site events", value: item.count }))} />
      </section>

      <details className="admin-card overflow-hidden">
        <summary className="cursor-pointer list-none px-5 py-4"><div className="flex items-center justify-between gap-4"><div><h2 className="text-base font-black text-[#0A1547]">Recent analytics events</h2><p className="mt-1 text-xs text-[#0A1547]/55">Sanitized public-site event details for troubleshooting.</p></div><span className="text-[#02ABE0]"><Icon name="activity" size={16} /></span></div></summary>
        <div className="border-t border-[#0A1547]/8">
          {payload?.events.items.length ? payload.events.items.map((event) => <div key={event.id} className="grid gap-2 border-t border-[#0A1547]/8 px-5 py-3 first:border-t-0 md:grid-cols-[minmax(190px,0.7fr)_minmax(160px,1fr)_auto]"><div><p className="text-sm font-bold text-[#0A1547]">{event.eventName.replace(/_/g, " ")}</p><p className="mt-1 text-xs text-[#0A1547]/55">{event.path}{event.referrerSource ? ` · ${event.referrerSource}` : ""}</p></div><p className="text-xs leading-5 text-[#0A1547]/55">{Object.entries(event.properties).map(([key, value]) => `${key}: ${Array.isArray(value) ? value.join(", ") : String(value)}`).join(" · ") || "No additional metadata"}</p><p className="text-xs text-[#0A1547]/50 md:text-right">{formatDate(event.occurredAt)}</p></div>) : <p className="px-5 py-6 text-sm text-[#0A1547]/55">No events match these filters.</p>}
        </div>
      </details>

      {payload?.sampled && <p className="text-xs text-[#0A1547]/48">Large result sets are summarized from the most recent matching records.</p>}
    </div>
  );
}

function SummaryList({ title, icon, iconTone, empty, rows }: { title: string; icon: IconName; iconTone: string; empty: string; rows: Array<{ primary: string; detail: string; value: number }> }) {
  return <section className="admin-card overflow-hidden"><div className="flex items-center gap-3 border-b border-[#0A1547]/8 px-5 py-4"><span className={`inline-flex h-8 w-8 items-center justify-center rounded-lg border border-[#0A1547]/10 bg-white ${iconTone}`}><Icon name={icon} size={16} /></span><h2 className="text-base font-black text-[#0A1547]">{title}</h2></div>{rows.length ? rows.slice(0, 6).map((row) => <div key={`${row.primary}:${row.detail}`} className="flex items-start justify-between gap-4 border-t border-[#0A1547]/8 px-5 py-3 first:border-t-0"><div className="min-w-0"><p className="truncate text-sm font-semibold text-[#0A1547]">{row.primary}</p><p className="mt-1 truncate text-xs text-[#0A1547]/55">{row.detail}</p></div><p className="text-lg font-black text-[#0A1547]">{row.value.toLocaleString()}</p></div>) : <p className="px-5 py-6 text-sm text-[#0A1547]/55">{empty}</p>}</section>;
}

function Icon({ name, size = 18 }: { name: IconName; size?: number }) {
  const common = { fill: "none", stroke: "currentColor", strokeLinecap: "round" as const, strokeLinejoin: "round" as const, strokeWidth: 2.25, viewBox: "0 0 24 24" };
  return <svg aria-hidden="true" className="shrink-0" height={size} width={size} {...common}>
    {name === "activity" && <path d="M4 12h4l2-7 4 14 2-7h4" />}
    {name === "archive" && <><path d="M4 7h16" /><path d="M6 7v12h12V7" /><path d="M9 11h6" /><path d="M5 4h14v3H5z" /></>}
    {name === "chart" && <><path d="M4 19V5" /><path d="M4 19h16" /><path d="M8 15v-4" /><path d="M12 15V8" /><path d="M16 15v-7" /></>}
    {name === "download" && <><path d="M12 3v12" /><path d="m7 10 5 5 5-5" /><path d="M5 21h14" /></>}
    {name === "file" && <><path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8Z" /><path d="M14 3v5h5" /></>}
    {name === "mail" && <><rect height="14" rx="2" width="18" x="3" y="5" /><path d="m3 7 9 6 9-6" /></>}
    {name === "pointer" && <><path d="m5 3 7 17 2-7 7-2L5 3Z" /><path d="m14 14 4 5" /></>}
    {name === "restore" && <><path d="M3 12a9 9 0 1 0 3-6.7" /><path d="M3 4v5h5" /></>}
    {name === "sparkles" && <><path d="m12 3 1.4 3.6L17 8l-3.6 1.4L12 13l-1.4-3.6L7 8l3.6-1.4L12 3Z" /><path d="m18.5 14 .8 2.2 2.2.8-2.2.8-.8 2.2-.8-2.2-2.2-.8 2.2-.8.8-2.2Z" /><path d="m5 14 .8 2.2 2.2.8-2.2.8L5 20l-.8-2.2L2 17l2.2-.8L5 14Z" /></>}
    {name === "users" && <><circle cx="9" cy="8" r="3" /><path d="M3 20c0-3.3 2.7-6 6-6s6 2.7 6 6" /><path d="M16 5a3 3 0 0 1 0 6" /><path d="M21 20c0-2.6-1.7-4.8-4-5.6" /></>}
  </svg>;
}
