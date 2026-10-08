import { useEffect, useRef, useState, type ComponentType } from "react";
import { Link } from "wouter";
import {
  Activity, ArrowRight, CreditCard, FileCheck2, FileText, FolderOpen,
  Search, ShieldCheck, UserRound, X,
} from "lucide-react";
import { useAuth } from "@/auth/AuthProvider";
import {
  getAuditEvents, getClientBillingDetail, getClientOptions,
  getSecureUploadFiles, listAgreements,
} from "@/lib/adminApi";
import type {
  AdminClientOption, AgreementSummary, AuditEvent, CheckoutSessionSummary,
  ClientBillingDetailResponse, SecureUploadFile,
} from "@/lib/types";

type WorkspaceTab = "activity" | "agreements" | "billing" | "uploads" | "analysis" | "reports";
type WorkspaceItem = {
  id: string;
  label: string;
  context: string;
  date: string | null;
  status: string;
  href: string;
  icon: ComponentType<{ size?: number; className?: string }>;
};

const panelClass = "rounded-lg border border-[#0A1547]/10 bg-white";

function formatDate(value: string | null | undefined): string {
  if (!value) return "";
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? ""
    : new Intl.DateTimeFormat(undefined, { dateStyle: "medium" }).format(date);
}

function sameEmail(value: string | null | undefined, selectedEmail: string): boolean {
  return value?.trim().toLowerCase() === selectedEmail.trim().toLowerCase();
}

function statusClass(status: string): string {
  const value = status.toLowerCase();
  if (value.includes("signed") && !value.includes("pending")) return "bg-[#02D99D]/10 text-[#176D55]";
  if (value.includes("pending") || value.includes("sent")) return "bg-[#F59E0B]/10 text-[#9B6507]";
  if (value.includes("void") || value.includes("error") || value.includes("failed")) return "bg-red-50 text-red-700";
  return "bg-[#02ABE0]/10 text-[#0A678A]";
}

function isOpenCheckoutSession(session: CheckoutSessionSummary): boolean {
  const status = session.status?.toLowerCase();
  const paymentStatus = session.paymentStatus?.toLowerCase();
  return paymentStatus !== "paid" && !["paid", "complete", "completed", "expired"].includes(status || "") && !session.expiredAt;
}

function StatusChip({ status }: { status: string }) {
  const label = status.replace(/[_-]/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
  return <span className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold ${statusClass(status)}`}>{label}</span>;
}

function WorkspaceRow({ item }: { item: WorkspaceItem }) {
  const Icon = item.icon;
  const iconColor = item.id.startsWith("agreement:") ? "text-[#7C5CF2]"
    : item.id.startsWith("billing:") ? "text-[#02ABE0]"
      : item.id.startsWith("analysis:") ? "text-[#00AFA9]"
        : "text-[#0A1547]";
  return (
    <Link href={item.href} className="admin-focus flex min-w-0 flex-wrap items-center gap-3 border-b border-[#0A1547]/8 px-4 py-3 last:border-b-0 hover:bg-[#F8F9FD] sm:flex-nowrap">
      <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-[#0A1547]/10 ${iconColor}`}><Icon size={17} /></span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-semibold text-[#0A1547]">{item.label}</span>
        <span className="block truncate text-xs text-[#0A1547]/55">{item.context}</span>
      </span>
      <span className="text-xs text-[#0A1547]/50">{formatDate(item.date)}</span>
      <StatusChip status={item.status} />
      <ArrowRight size={15} className="hidden shrink-0 text-[#0A1547]/45 sm:block" />
    </Link>
  );
}

export default function OverviewClientWorkspace() {
  const { permissions, session } = useAuth();
  const token = session?.access_token || "";
  const searchRef = useRef<HTMLDivElement>(null);
  const [search, setSearch] = useState("");
  const [options, setOptions] = useState<AdminClientOption[]>([]);
  const [searchOpen, setSearchOpen] = useState(false);
  const [activeOption, setActiveOption] = useState(0);
  const [searchError, setSearchError] = useState(false);
  const [searchLoading, setSearchLoading] = useState(false);
  const [selected, setSelected] = useState<AdminClientOption | null>(null);
  const [billingState, setBilling] = useState<ClientBillingDetailResponse | null>(null);
  const [agreementState, setAgreements] = useState<AgreementSummary[]>([]);
  const [secureFileState, setSecureFiles] = useState<SecureUploadFile[]>([]);
  const [eventState, setEvents] = useState<AuditEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [sourceErrors, setSourceErrors] = useState<string[]>([]);
  const [tab, setTab] = useState<WorkspaceTab>("activity");

  useEffect(() => {
    if (!token || !permissions.canReadClients) return;
    const controller = new AbortController();
    setSearchLoading(true);
    const timer = window.setTimeout(() => {
      getClientOptions(token, { search, limit: 20 }, controller.signal)
        .then((response) => {
          if (controller.signal.aborted) return;
          setOptions(response.items);
          setActiveOption(0);
          setSearchError(false);
          setSearchLoading(false);
        })
        .catch(() => {
          if (!controller.signal.aborted) { setSearchError(true); setSearchLoading(false); }
        });
    }, 200);
    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [token, search, permissions.canReadClients]);

  useEffect(() => {
    if (!searchOpen) return;
    const close = (event: PointerEvent) => {
      if (!searchRef.current?.contains(event.target as Node)) setSearchOpen(false);
    };
    document.addEventListener("pointerdown", close);
    return () => document.removeEventListener("pointerdown", close);
  }, [searchOpen]);

  useEffect(() => {
    if (!selected || !token) {
      setBilling(null);
      setAgreements([]);
      setSecureFiles([]);
      setEvents([]);
      setSourceErrors([]);
      setLoading(false);
      return;
    }
    const controller = new AbortController();
    const errors: string[] = [];
    setLoading(true);
    setSourceErrors([]);
    setBilling(null);
    setAgreements([]);
    setSecureFiles([]);
    setEvents([]);
    const requests: Promise<unknown>[] = [];
    if (permissions.canReadBilling) {
      requests.push(getClientBillingDetail(token, selected.email, controller.signal)
        .then((result) => { if (!controller.signal.aborted && sameEmail(result.clientEmail, selected.email)) setBilling(result); })
        .catch(() => { if (!controller.signal.aborted) errors.push("Billing"); }));
    }
    if (permissions.canReadAgreements || permissions.canWriteAgreements) {
      requests.push(listAgreements(token, { clientEmail: selected.email, limit: 20 }, controller.signal)
        .then((result) => { if (!controller.signal.aborted) setAgreements(result.items.filter((item) => sameEmail(item.clientEmail, selected.email))); })
        .catch(() => { if (!controller.signal.aborted) errors.push("Agreements"); }));
    }
    if (permissions.canReadSecureUploads) {
      requests.push(getSecureUploadFiles(token, { email: selected.email, limit: 20 }, controller.signal)
        .then((result) => { if (!controller.signal.aborted) setSecureFiles(result.items.filter((item) => sameEmail(item.userEmail, selected.email))); })
        .catch(() => { if (!controller.signal.aborted) errors.push("Secure Uploads"); }));
    }
    if (permissions.canReadAudit) {
      requests.push(getAuditEvents(token, { clientEmail: selected.email, limit: 20 }, controller.signal)
        .then((result) => { if (!controller.signal.aborted) setEvents(result.items.filter((item) => sameEmail(item.clientEmail, selected.email))); })
        .catch(() => { if (!controller.signal.aborted) errors.push("Audit Trail"); }));
    }
    void Promise.allSettled(requests).then(() => {
      if (!controller.signal.aborted) {
        setSourceErrors(errors);
        setLoading(false);
      }
    });
    return () => controller.abort();
  }, [selected, token, permissions.canReadBilling, permissions.canReadAgreements, permissions.canWriteAgreements, permissions.canReadSecureUploads, permissions.canReadAudit]);

  const billing = selected && sameEmail(billingState?.clientEmail, selected.email) ? billingState : null;
  const agreements = selected ? agreementState.filter((item) => sameEmail(item.clientEmail, selected.email)) : [];
  const secureFiles = selected ? secureFileState.filter((item) => sameEmail(item.userEmail, selected.email)) : [];
  const events = selected ? eventState.filter((item) => sameEmail(item.clientEmail, selected.email)) : [];

  const tabs: { id: WorkspaceTab; label: string }[] = [
    { id: "activity", label: "Activity" },
    ...(permissions.canReadAgreements || permissions.canWriteAgreements ? [{ id: "agreements" as const, label: "Agreements" }] : []),
    ...(permissions.canReadBilling ? [{ id: "billing" as const, label: "Billing" }] : []),
    ...(permissions.canReadSecureUploads ? [{ id: "uploads" as const, label: "Uploads" }] : []),
    ...(permissions.canReadAnalysis && permissions.canReadBilling ? [{ id: "analysis" as const, label: "Analysis" }] : []),
    ...(permissions.canReadPdf && permissions.canReadBilling ? [{ id: "reports" as const, label: "Reports" }] : []),
  ];
  const pendingAgreement = agreements.find((item) => item.status === "pending_ba_signature")
    || agreements.find((item) => item.status === "sent");
  const openSession = billing?.checkoutSessions.find(isOpenCheckoutSession);
  const nextStep = pendingAgreement
    ? { title: pendingAgreement.status === "pending_ba_signature" ? "Awaiting BA countersignature" : "Awaiting client signature", context: pendingAgreement.clientLegalName, href: "/agreements", action: "Open Agreements" }
    : openSession
      ? { title: "Payment link is open", context: openSession.description || openSession.purpose || selected?.email || "", href: "/billing", action: "Open Billing" }
      : null;

  const activity: WorkspaceItem[] = [
    ...agreements.map((item) => ({
      id: `agreement:${item.id}`, label: "BAA/Privacy Agreement",
      context: item.clientLegalName, date: item.signedAt || item.sentAt,
      status: item.status === "pending_ba_signature" ? "Pending BA" : item.status,
      href: "/agreements", icon: FileCheck2,
    })),
    ...(billing?.checkoutSessions || []).map((item: CheckoutSessionSummary) => ({
      id: `billing:${item.id}`, label: item.offerName || item.description || "Checkout link",
      context: "Billing", date: item.createdAt,
      status: item.paymentStatus || item.status || "Open", href: "/billing", icon: CreditCard,
    })),
    ...secureFiles.map((item) => ({
      id: `secure:${item.id}`, label: item.originalFilename || "Secure upload",
      context: "Secure Uploads", date: item.completedAt || item.createdAt,
      status: item.completedAt ? "Ready" : "Open", href: "/secure-uploads", icon: FolderOpen,
    })),
    ...(billing?.recentSubmissions || []).map((item, index) => ({
      id: `submission:${item.id || index}`, label: item.upload?.fileName || "Client submission",
      context: item.source || "Submission", date: item.completedAt || item.submittedAt,
      status: item.status || "Submitted", href: `/clients/${encodeURIComponent(selected?.email || "")}`, icon: FileText,
    })),
    ...(permissions.canReadAnalysis ? billing?.consultantReviews || [] : []).map((item, index) => ({
      id: `analysis:${item.id || index}`, label: item.fileName || "Analysis completed",
      context: item.toolName || "Document Analysis", date: item.generatedAt,
      status: "Ready", href: "/analysis", icon: Activity,
    })),
  ].sort((a, b) => (Date.parse(b.date || "") || 0) - (Date.parse(a.date || "") || 0));
  const rows = tab === "activity" ? activity.slice(0, 12)
    : tab === "agreements" ? activity.filter((item) => item.id.startsWith("agreement:"))
      : tab === "billing" ? activity.filter((item) => item.id.startsWith("billing:"))
        : tab === "uploads" ? activity.filter((item) => item.id.startsWith("secure:") || item.id.startsWith("submission:"))
          : tab === "analysis" ? (billing?.consultantReviews || []).map((item, index) => ({
            id: `analysis:${item.id || index}`, label: item.fileName || "Consultant review",
            context: item.toolName || "Document Analysis", date: item.generatedAt,
            status: "Review", href: "/analysis", icon: Activity,
          }))
            : (billing?.consultantReviews || []).filter((item) => item.pdfGeneratedAt).map((item, index) => ({
              id: `report:${item.id || index}`, label: item.fileName || "PDF report",
              context: "PDF Reports", date: item.pdfGeneratedAt,
              status: "Ready", href: "/pdf-generator", icon: FileText,
            }));
  const quickActions = [
    { label: "Create agreement", href: "/agreements", show: permissions.canWriteAgreements, icon: FileCheck2 },
    { label: "Create payment link", href: "/billing", show: permissions.canReadBilling && permissions.canWriteBilling, icon: CreditCard },
    { label: "Send upload request", href: "/secure-uploads", show: permissions.canReadSecureUploads && permissions.canWriteSecureUploads, icon: FolderOpen },
    { label: "Run document analysis", href: "/analysis", show: permissions.canWriteAnalysis, icon: Activity },
    { label: "Generate PDF report", href: "/pdf-generator", show: permissions.canReadPdf && permissions.canGeneratePdf, icon: FileText },
  ].filter((item) => item.show);

  if (!permissions.canReadClients) return null;

  return (
    <div className="space-y-4">
      {permissions.canWriteClients && <div className="flex justify-end"><Link href="/clients" className="admin-focus inline-flex items-center gap-2 rounded-md bg-[#A380F6] px-4 py-2 text-sm font-semibold text-white hover:bg-[#8B67E6]">Add client <ArrowRight size={15} /></Link></div>}
      <div ref={searchRef} className="relative">
        <label htmlFor="overview-client-search" className="sr-only">Select client</label>
        <div className={`${panelClass} flex items-center gap-3 px-4 py-3`}>
          <Search size={19} className="shrink-0 text-[#A380F6]" />
          <input
            id="overview-client-search" type="search" value={search}
            role="combobox" aria-autocomplete="list" aria-expanded={searchOpen} aria-controls="overview-client-options"
            aria-activedescendant={searchOpen && options[activeOption] ? `overview-client-option-${activeOption}` : undefined}
            onFocus={() => setSearchOpen(true)}
            onChange={(event) => { setSearch(event.target.value); setOptions([]); setSearchError(false); setSearchOpen(true); setActiveOption(0); }}
            onKeyDown={(event) => {
              if (event.key === "Escape") setSearchOpen(false);
              if (event.key === "ArrowDown" && options.length) { event.preventDefault(); setSearchOpen(true); setActiveOption((value) => (value + 1) % options.length); }
              if (event.key === "ArrowUp" && options.length) { event.preventDefault(); setSearchOpen(true); setActiveOption((value) => (value - 1 + options.length) % options.length); }
              if (event.key === "Enter" && searchOpen && options[activeOption]) { event.preventDefault(); setSelected(options[activeOption]); setSearch(""); setSearchOpen(false); setTab("activity"); }
            }}
            placeholder="Search or select a client"
            className="admin-focus min-w-0 flex-1 bg-transparent text-sm text-[#0A1547] outline-none placeholder:text-[#0A1547]/45"
          />
          {selected && <button type="button" onClick={() => { setSelected(null); setSearch(""); setTab("activity"); }} className="admin-focus rounded p-1 text-[#0A1547]/55 hover:text-[#0A1547]" aria-label="Clear selected client" title="Clear selected client"><X size={17} /></button>}
        </div>
        {searchOpen && (
          <div id="overview-client-options" role="listbox" className="absolute z-20 mt-1 max-h-64 w-full overflow-auto rounded-lg border border-[#0A1547]/10 bg-white p-1 shadow-lg">
            {searchError ? <p className="px-3 py-2 text-sm text-red-700">Client search is unavailable.</p>
              : searchLoading ? <p className="px-3 py-2 text-sm text-[#0A1547]/55">Searching clients...</p>
              : options.length ? options.map((client, index) => (
                <button key={client.email} id={`overview-client-option-${index}`} type="button" role="option" aria-selected={activeOption === index} onMouseEnter={() => setActiveOption(index)} onClick={() => { setSelected(client); setSearch(""); setSearchOpen(false); setTab("activity"); }}
                  className={`admin-focus flex w-full items-center gap-3 rounded-md px-3 py-2 text-left ${activeOption === index ? "bg-[#F8F9FD]" : "hover:bg-[#F8F9FD]"}`}>
                  <UserRound size={16} className="shrink-0 text-[#A380F6]" />
                  <span className="min-w-0"><span className="block truncate text-sm font-semibold text-[#0A1547]">{client.officeName || [client.firstName, client.lastName].filter(Boolean).join(" ") || client.email}</span><span className="block truncate text-xs text-[#0A1547]/55">{client.email}</span></span>
                </button>
              )) : <p className="px-3 py-2 text-sm text-[#0A1547]/55">No clients found.</p>}
          </div>
        )}
      </div>

      {!selected ? (
        <div className={`${panelClass} flex items-center gap-3 px-5 py-6 text-sm text-[#0A1547]/60`}>
          <UserRound size={20} className="text-[#A380F6]" />
          No client selected.
        </div>
      ) : (
        <>
          <section className={`${panelClass} flex flex-wrap items-center gap-6 px-5 py-5`}>
            <div className="min-w-0 flex-1">
              <h2 className="truncate text-lg font-bold text-[#0A1547]">{selected.officeName || [selected.firstName, selected.lastName].filter(Boolean).join(" ") || selected.email}</h2>
              <p className="truncate text-sm text-[#0A1547]/60">{selected.email}</p>
              {selected.orgType && <p className="mt-1 text-xs text-[#0A1547]/50">{selected.orgType}</p>}
            </div>
            {permissions.canReadBilling && <div><p className="text-2xl font-bold text-[#0A1547]">{billing ? billing.checkoutSessions.filter(isOpenCheckoutSession).length : "-"}</p><p className="text-xs text-[#0A1547]/55">Open payments</p></div>}
            {(permissions.canReadAgreements || permissions.canWriteAgreements) && <div><p className="text-2xl font-bold text-[#0A1547]">{agreements.filter((item) => item.status === "sent" || item.status === "pending_ba_signature").length}</p><p className="text-xs text-[#0A1547]/55">Pending in recent history</p></div>}
            {permissions.canReadSecureUploads && <div><p className="text-2xl font-bold text-[#0A1547]">{secureFiles.length}</p><p className="text-xs text-[#0A1547]/55">Recent files</p></div>}
            {permissions.canReadBilling && <Link href={`/clients/${encodeURIComponent(selected.email)}`} className="admin-focus rounded-md border border-[#0A1547]/10 px-3 py-2 text-xs font-semibold text-[#0A1547] hover:border-[#A380F6]">Open full profile</Link>}
          </section>

          <div className="flex gap-1 overflow-x-auto border-b border-[#0A1547]/10" role="group" aria-label="Client workspace views">
            {tabs.map((item) => <button key={item.id} type="button" aria-pressed={tab === item.id} onClick={() => setTab(item.id)}
              className={`admin-focus shrink-0 border-b-2 px-4 py-2 text-sm ${tab === item.id ? "border-[#A380F6] font-semibold text-[#0A1547]" : "border-transparent text-[#0A1547]/55 hover:text-[#0A1547]"}`}>{item.label}</button>)}
          </div>
          {sourceErrors.length > 0 && <p className="text-sm text-[#9B6507]" role="status">{sourceErrors.join(", ")} data could not be loaded. Other client details remain available.</p>}
          <div className="grid gap-4 xl:grid-cols-[minmax(0,1.7fr)_minmax(300px,0.9fr)]">
            <section className={`${panelClass} min-w-0 overflow-hidden`} aria-label={`${tabs.find((item) => item.id === tab)?.label || "Activity"} records`}>
              <div className="border-b border-[#0A1547]/10 px-5 py-4"><h3 className="text-base font-bold text-[#0A1547]">{tab === "activity" ? "Recent client activity" : tabs.find((item) => item.id === tab)?.label}</h3></div>
              {loading ? <p className="px-5 py-6 text-sm text-[#0A1547]/55">Loading client activity...</p>
                : rows.length ? rows.map((item) => <WorkspaceRow key={item.id} item={item} />)
                  : <p className="px-5 py-6 text-sm text-[#0A1547]/55">No records in this view.</p>}
            </section>
            <aside className={`${panelClass} h-fit p-5`}>
              <div className="flex items-center gap-2"><ShieldCheck size={18} className="text-[#A380F6]" /><h3 className="text-base font-bold text-[#0A1547]">Next step</h3></div>
              {nextStep ? <div className="mt-5"><StatusChip status={pendingAgreement ? "Pending" : "Open"} /><p className="mt-4 font-semibold text-[#0A1547]">{nextStep.title}</p><p className="mt-1 text-sm text-[#0A1547]/60">{nextStep.context}</p><Link href={nextStep.href} className="admin-focus mt-5 inline-flex items-center gap-2 rounded-md bg-[#A380F6] px-4 py-2 text-sm font-semibold text-white hover:bg-[#8B67E6]">{nextStep.action}<ArrowRight size={15} /></Link></div>
                : <p className="mt-4 text-sm text-[#0A1547]/55">No immediate follow-up is visible from the available records.</p>}
              {quickActions.length > 0 && <div className="mt-5 border-t border-[#0A1547]/10 pt-4"><p className="text-xs font-semibold text-[#0A1547]/50">OTHER ACTIONS</p><div className="mt-2 grid gap-1">{quickActions.map((action) => { const Icon = action.icon; return <Link key={action.href} href={action.href} className="admin-focus flex items-center gap-2 rounded px-2 py-2 text-sm text-[#0A1547] hover:bg-[#F8F9FD]"><Icon size={16} className="text-[#02ABE0]" />{action.label}</Link>; })}</div></div>}
            </aside>
          </div>
          {permissions.canReadAudit && events.length > 0 && <details className={panelClass}><summary className="cursor-pointer px-5 py-3 text-sm font-semibold text-[#0A1547]">Client audit activity</summary><div className="divide-y divide-[#0A1547]/8 border-t border-[#0A1547]/10">{events.slice(0, 10).map((event) => <div key={event.id} className="flex flex-wrap justify-between gap-2 px-5 py-2 text-xs text-[#0A1547]/65"><span>{event.eventType?.replaceAll("_", " ") || "Audit event"}</span><span>{formatDate(event.occurredAt)}</span></div>)}</div></details>}
        </>
      )}
    </div>
  );
}
