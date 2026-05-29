import { useCallback, useEffect, useState, type ReactNode } from "react";
import { Link } from "wouter";
import { useAuth } from "@/auth/AuthProvider";
import {
  getAdminClients,
  getAuditEvents,
  getBillingOverview,
  getPdfGeneratorOptions,
  getSecureUploadFiles,
  listAgreements,
} from "@/lib/adminApi";
import type {
  AdminClient,
  AgreementSummary,
  AuditEvent,
  CheckoutSessionSummary,
  PdfGeneratorClientOption,
  SecureUploadFile,
} from "@/lib/types";

type IconName = "activity" | "agreement" | "analysis" | "arrow" | "billing" | "check" | "client" | "file" | "lock" | "pdf" | "upload";
type IconTone = "audit" | "clients" | "agreements" | "billing" | "analysis" | "secure" | "report" | "success" | "warning" | "danger" | "neutral" | "lilac";
type MetricItem = {
  helper: string;
  icon: IconName;
  label: string;
  tone: IconTone;
  value: number | string;
};
type WorkQueueItem = {
  actionLabel: string;
  context: string;
  href: string;
  icon: IconName;
  label: string;
  status: string;
  statusTone: string;
  tone: IconTone;
};

const sectionClassName = "rounded-lg border border-[#0A1547]/10 bg-white shadow-[0_12px_28px_rgba(10,21,71,0.05)]";

function formatDateTime(value: string | null | undefined): string {
  if (!value) {
    return "-";
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(parsed);
}

function displayText(value: string | null | undefined): string {
  return value?.trim() || "-";
}

function agreementStatusLabel(status: string): string {
  if (status.toLowerCase() === "pending_ba_signature") {
    return "Pending BA Signature";
  }

  return status
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .replace(/\b\w/g, (match) => match.toUpperCase());
}

function eventLabel(eventType: string | null): string {
  if (!eventType) {
    return "Audit event";
  }

  return eventType
    .split(".")
    .map((part) => part.replace(/_/g, " "))
    .join(" / ");
}

function isOpenCheckoutSession(session: CheckoutSessionSummary): boolean {
  const status = session.status?.toLowerCase();
  const paymentStatus = session.paymentStatus?.toLowerCase();
  return paymentStatus !== "paid" && status !== "paid" && status !== "complete" && status !== "completed" && status !== "expired" && !session.expiredAt;
}

export default function OverviewPage() {
  const { permissions, session } = useAuth();
  const token = session?.access_token || "";
  const [clients, setClients] = useState<AdminClient[]>([]);
  const [clientCount, setClientCount] = useState<number | null>(null);
  const [openSessions, setOpenSessions] = useState<CheckoutSessionSummary[]>([]);
  const [openPaymentCount, setOpenPaymentCount] = useState<number | null>(null);
  const [activeRetainerCount, setActiveRetainerCount] = useState<number | null>(null);
  const [pendingBaAgreements, setPendingBaAgreements] = useState<AgreementSummary[]>([]);
  const [sentAgreements, setSentAgreements] = useState<AgreementSummary[]>([]);
  const [secureUploads, setSecureUploads] = useState<SecureUploadFile[]>([]);
  const [secureUploadCount, setSecureUploadCount] = useState<number | null>(null);
  const [pdfClients, setPdfClients] = useState<PdfGeneratorClientOption[]>([]);
  const [auditEvents, setAuditEvents] = useState<AuditEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [sourceErrors, setSourceErrors] = useState<string[]>([]);

  const loadOverview = useCallback(async (signal?: AbortSignal) => {
    if (!token) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setSourceErrors([]);

    const errors: string[] = [];
    const requests: Promise<void>[] = [];

    if (permissions.canReadClients) {
      requests.push(
        getAdminClients(token, { limit: 25 }, signal)
          .then((response) => {
            setClients(response.items);
            setClientCount(response.count);
          })
          .catch((error: unknown) => {
            if (!(error instanceof DOMException && error.name === "AbortError")) {
              errors.push("Client metrics could not be loaded.");
            }
          }),
      );
    } else {
      setClients([]);
      setClientCount(null);
    }

    if (permissions.canReadBilling) {
      requests.push(
        getBillingOverview(token, { status: "open", limit: 5 }, signal)
          .then((response) => {
            setOpenSessions(response.checkoutSessions.filter(isOpenCheckoutSession));
            setOpenPaymentCount(response.summary.openCheckoutSessionCount);
          })
          .catch((error: unknown) => {
            if (!(error instanceof DOMException && error.name === "AbortError")) {
              errors.push("Billing metrics could not be loaded.");
            }
          }),
      );
      requests.push(
        getBillingOverview(token, { status: "all", limit: 1 }, signal)
          .then((response) => {
            setActiveRetainerCount(response.summary.subscriptionCount ?? 0);
          })
          .catch((error: unknown) => {
            if (!(error instanceof DOMException && error.name === "AbortError")) {
              errors.push("Retainer metrics could not be loaded.");
            }
          }),
      );
    } else {
      setOpenSessions([]);
      setOpenPaymentCount(null);
      setActiveRetainerCount(null);
    }

    if (permissions.canReadAgreements || permissions.canWriteAgreements) {
      requests.push(
        listAgreements(token, { status: "pending_ba_signature", limit: 5 }, signal)
          .then((response) => setPendingBaAgreements(response.items))
          .catch((error: unknown) => {
            if (!(error instanceof DOMException && error.name === "AbortError")) {
              errors.push("Pending agreement metrics could not be loaded.");
            }
          }),
      );
      requests.push(
        listAgreements(token, { status: "sent", limit: 5 }, signal)
          .then((response) => setSentAgreements(response.items))
          .catch((error: unknown) => {
            if (!(error instanceof DOMException && error.name === "AbortError")) {
              errors.push("Sent agreement metrics could not be loaded.");
            }
          }),
      );
    } else {
      setPendingBaAgreements([]);
      setSentAgreements([]);
    }

    if (permissions.canReadSecureUploads) {
      requests.push(
        getSecureUploadFiles(token, { completedOnly: true, limit: 5 }, signal)
          .then((response) => {
            setSecureUploads(response.items);
            setSecureUploadCount(response.count);
          })
          .catch((error: unknown) => {
            if (!(error instanceof DOMException && error.name === "AbortError")) {
              errors.push("Secure upload metrics could not be loaded.");
            }
          }),
      );
    } else {
      setSecureUploads([]);
      setSecureUploadCount(null);
    }

    if (permissions.canReadPdf) {
      requests.push(
        getPdfGeneratorOptions(token, signal)
          .then((response) => setPdfClients(response.clients))
          .catch((error: unknown) => {
            if (!(error instanceof DOMException && error.name === "AbortError")) {
              errors.push("PDF report metrics could not be loaded.");
            }
          }),
      );
    } else {
      setPdfClients([]);
    }

    if (permissions.canReadAudit) {
      requests.push(
        getAuditEvents(token, { limit: 6, offset: 0 }, signal)
          .then((response) => setAuditEvents(response.items))
          .catch((error: unknown) => {
            if (!(error instanceof DOMException && error.name === "AbortError")) {
              errors.push("Recent activity could not be loaded.");
            }
          }),
      );
    } else {
      setAuditEvents([]);
    }

    await Promise.allSettled(requests);

    if (!signal?.aborted) {
      setSourceErrors(errors);
      setLoading(false);
    }
  }, [permissions, token]);

  useEffect(() => {
    const controller = new AbortController();
    void loadOverview(controller.signal);

    return () => {
      controller.abort();
    };
  }, [loadOverview]);

  const recentSubmissionCount = clients.reduce((total, client) => total + client.submissionCount, 0);
  const pdfReadyUploadCount = pdfClients.reduce((total, client) => total + client.eligibleUploadCount, 0);
  const pendingAgreementCount = pendingBaAgreements.length + sentAgreements.length;
  const metrics: MetricItem[] = [
    ...(permissions.canReadClients ? [{
      helper: "Total client records",
      icon: "client" as const,
      label: "Clients",
      tone: "clients" as const,
      value: clientCount ?? "-",
    }] : []),
    ...(permissions.canReadClients ? [{
      helper: "Visible recent client sample",
      icon: "activity" as const,
      label: "Recent submissions",
      tone: "analysis" as const,
      value: recentSubmissionCount,
    }] : []),
    ...(permissions.canReadBilling ? [{
      helper: "Checkout sessions awaiting payment",
      icon: "billing" as const,
      label: "Open payment links",
      tone: "billing" as const,
      value: openPaymentCount ?? "-",
    }, {
      helper: "Recurring subscription records",
      icon: "check" as const,
      label: "Active retainers",
      tone: "success" as const,
      value: activeRetainerCount ?? "-",
    }] : []),
    ...(permissions.canReadAgreements || permissions.canWriteAgreements ? [{
      helper: "Sent or awaiting BA countersignature",
      icon: "agreement" as const,
      label: "Pending agreements",
      tone: "agreements" as const,
      value: pendingAgreementCount,
    }] : []),
    ...(permissions.canReadSecureUploads ? [{
      helper: "Completed secure upload files",
      icon: "upload" as const,
      label: "Secure uploads",
      tone: "secure" as const,
      value: secureUploadCount ?? "-",
    }] : []),
    ...(permissions.canReadPdf ? [{
      helper: "Eligible uploads available for reports",
      icon: "pdf" as const,
      label: "PDF-ready uploads",
      tone: "report" as const,
      value: pdfReadyUploadCount,
    }] : []),
  ];
  const workQueue: WorkQueueItem[] = [
    ...pendingBaAgreements.map((agreement) => ({
      actionLabel: "Open Agreements",
      context: `${displayText(agreement.clientEmail)} · ${displayText(agreement.baSignerEmail)}`,
      href: "/agreements",
      icon: "agreement" as const,
      label: displayText(agreement.clientLegalName),
      status: "Pending BA Signature",
      statusTone: "border-[#A380F6]/30 bg-[#A380F6]/10 text-[#0A1547]/76",
      tone: "agreements" as const,
    })),
    ...sentAgreements.map((agreement) => ({
      actionLabel: "Open Agreements",
      context: `${displayText(agreement.clientEmail)} · sent ${formatDateTime(agreement.sentAt)}`,
      href: "/agreements",
      icon: "agreement" as const,
      label: displayText(agreement.clientLegalName),
      status: agreementStatusLabel(agreement.status),
      statusTone: "border-[#02ABE0]/25 bg-[#02ABE0]/10 text-[#0A1547]/76",
      tone: "agreements" as const,
    })),
    ...openSessions.map((sessionItem) => ({
      actionLabel: "Open Billing",
      context: `${displayText(sessionItem.clientEmail)} · ${displayText(sessionItem.offerName || sessionItem.purpose)}`,
      href: "/billing",
      icon: "billing" as const,
      label: displayText(sessionItem.description || sessionItem.offerName || sessionItem.purpose || "Open checkout link"),
      status: displayText(sessionItem.paymentStatus || sessionItem.status || "open"),
      statusTone: "border-[#02ABE0]/25 bg-[#02ABE0]/10 text-[#0A1547]/76",
      tone: "billing" as const,
    })),
    ...secureUploads.map((file) => ({
      actionLabel: "Open Uploads",
      context: `${displayText(file.userEmail)} · ${formatDateTime(file.completedAt || file.createdAt)}`,
      href: "/secure-uploads",
      icon: "upload" as const,
      label: displayText(file.originalFilename || "Secure upload"),
      status: "Ready",
      statusTone: "border-[#02D99D]/30 bg-[#02D99D]/10 text-[#0A1547]/76",
      tone: "secure" as const,
    })),
    ...pdfClients.filter((client) => client.eligibleUploadCount > 0).slice(0, 5).map((client) => ({
      actionLabel: "Open PDF Reports",
      context: `${client.eligibleUploadCount} eligible uploads · latest ${formatDateTime(client.latestUploadTime || client.latestSubmittedAt)}`,
      href: "/pdf-generator",
      icon: "pdf" as const,
      label: client.email,
      status: "PDF ready",
      statusTone: "border-[#0A1547]/10 bg-[#F8F9FD] text-[#0A1547]/62",
      tone: "report" as const,
    })),
  ].slice(0, 10);
  const quickActions = [
    { href: "/clients", icon: "client" as const, label: "Add client", show: permissions.canWriteClients, tone: "clients" as const },
    { href: "/agreements", icon: "agreement" as const, label: "Create agreement", show: permissions.canWriteAgreements, tone: "agreements" as const },
    { href: "/billing", icon: "billing" as const, label: "Create payment link", show: permissions.canWriteBilling, tone: "billing" as const },
    { href: "/secure-uploads", icon: "upload" as const, label: "Send secure upload request", show: permissions.canWriteSecureUploads, tone: "secure" as const },
    { href: "/analysis", icon: "analysis" as const, label: "Run document analysis", show: permissions.canWriteAnalysis, tone: "analysis" as const },
    { href: "/pdf-generator", icon: "pdf" as const, label: "Generate PDF report", show: permissions.canGeneratePdf, tone: "report" as const },
  ].filter((action) => action.show);

  return (
    <div className="space-y-5">
      {loading ? (
        <section className={`${sectionClassName} p-6 text-sm font-medium text-[#0A1547]/58`}>
          Loading overview...
        </section>
      ) : null}

      {sourceErrors.length ? (
        <section className={`${sectionClassName} p-4`}>
          <p className="text-sm font-semibold text-[#0A1547]">Some overview data could not be loaded.</p>
          <p className="mt-1 text-sm font-medium text-[#0A1547]/56">{sourceErrors.join(" ")}</p>
        </section>
      ) : null}

      <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {metrics.length ? (
          metrics.map((metric) => <MetricCard key={metric.label} metric={metric} />)
        ) : (
          <EmptyPanel message="No overview metrics are available for this role." />
        )}
      </section>

      <section className="grid gap-5 xl:grid-cols-[minmax(0,1.35fr)_minmax(320px,0.65fr)]">
        <div className={`${sectionClassName} overflow-hidden`}>
          <div className="border-b border-[#0A1547]/10 p-5">
            <SectionHeader
              description="Operational items that may need follow-up."
              icon="activity"
              iconTone="analysis"
              title="Needs attention"
            />
          </div>
          {workQueue.length ? (
            <div className="divide-y divide-[#0A1547]/8">
              {workQueue.map((item, index) => (
                <WorkQueueRow item={item} key={`${item.href}:${item.label}:${index}`} />
              ))}
            </div>
          ) : (
            <EmptyPanel message="No attention items are visible from the available data." />
          )}
        </div>

        <div className={`${sectionClassName} p-5`}>
          <SectionHeader
            description="Jump into common admin workflows."
            icon="arrow"
            iconTone="lilac"
            title="Quick actions"
          />
          {quickActions.length ? (
            <div className="mt-5 grid gap-2">
              {quickActions.map((action) => (
                <Link
                  key={action.label}
                  href={action.href}
                  className="admin-focus flex items-center justify-between gap-3 rounded-lg border border-[#0A1547]/10 bg-white px-4 py-3 text-sm font-semibold text-[#0A1547] transition hover:border-[#A380F6]/45 hover:bg-[#F8F9FD]"
                >
                  <span className="flex min-w-0 items-center gap-3">
                    <IconBadge compact icon={action.icon} tone={action.tone} />
                    <span className="truncate">{action.label}</span>
                  </span>
                  <Icon name="arrow" size={15} />
                </Link>
              ))}
            </div>
          ) : (
            <p className="mt-5 rounded-lg border border-[#0A1547]/10 bg-[#F8F9FD] px-4 py-3 text-sm font-medium text-[#0A1547]/56">
              No quick actions are available for this role.
            </p>
          )}
        </div>
      </section>

      <section className={`${sectionClassName} overflow-hidden`}>
        <div className="border-b border-[#0A1547]/10 p-5">
          <SectionHeader
            description={permissions.canReadAudit ? "Latest audit events from enabled workflows." : "Recent activity requires Audit Trail access."}
            icon="activity"
            iconTone="audit"
            title="Recent activity"
          />
        </div>
        {permissions.canReadAudit && auditEvents.length ? (
          <div className="divide-y divide-[#0A1547]/8">
            {auditEvents.map((event) => (
              <div key={event.id} className="grid gap-2 px-4 py-3 text-sm md:grid-cols-[11rem_minmax(0,1fr)_minmax(0,16rem)] md:items-center">
                <p className="truncate text-xs font-semibold text-[#0A1547]/68">{formatDateTime(event.occurredAtMst || event.occurredAt)}</p>
                <p className="truncate font-semibold text-[#0A1547]">{eventLabel(event.eventType)}</p>
                <p className="truncate text-sm font-medium text-[#0A1547]/56">{displayText(event.actorDisplayName || event.actorAdminEmail)}</p>
              </div>
            ))}
          </div>
        ) : (
          <EmptyPanel message={permissions.canReadAudit ? "Recent activity will appear here." : "Recent activity is hidden for this role."} />
        )}
      </section>
    </div>
  );
}

function SectionHeader({
  description,
  icon,
  iconTone,
  title,
}: {
  description?: string;
  icon: IconName;
  iconTone: IconTone;
  title: string;
}) {
  return (
    <div className="flex min-w-0 items-start gap-3">
      <IconBadge icon={icon} tone={iconTone} />
      <div className="min-w-0">
        <h2 className="text-xl font-black text-[#0A1547]">{title}</h2>
        {description ? (
          <p className="mt-1 max-w-3xl text-sm font-medium leading-6 text-[#0A1547]/56">{description}</p>
        ) : null}
      </div>
    </div>
  );
}

function MetricCard({ metric }: { metric: MetricItem }) {
  return (
    <div className={`${sectionClassName} p-4`}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-2xl font-black text-[#0A1547]">{metric.value}</p>
          <p className="mt-1 text-sm font-semibold text-[#0A1547]/78">{metric.label}</p>
          <p className="mt-1 text-xs font-medium leading-5 text-[#0A1547]/48">{metric.helper}</p>
        </div>
        <IconBadge compact icon={metric.icon} tone={metric.tone} />
      </div>
    </div>
  );
}

function WorkQueueRow({ item }: { item: WorkQueueItem }) {
  return (
    <div className="grid gap-3 px-4 py-3 md:grid-cols-[minmax(0,1fr)_auto_auto] md:items-center">
      <div className="flex min-w-0 items-center gap-3">
        <IconBadge compact icon={item.icon} tone={item.tone} />
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-[#0A1547]">{item.label}</p>
          <p className="mt-0.5 truncate text-xs font-medium text-[#0A1547]/48">{item.context}</p>
        </div>
      </div>
      <StatusChip className={item.statusTone}>{item.status}</StatusChip>
      <Link
        href={item.href}
        className="admin-focus inline-flex items-center justify-center gap-1.5 rounded-lg border border-[#0A1547]/10 bg-white px-3 py-2 text-xs font-semibold text-[#0A1547]/76 transition hover:border-[#A380F6]/45 hover:text-[#0A1547]"
      >
        {item.actionLabel}
        <Icon name="arrow" size={13} />
      </Link>
    </div>
  );
}

function EmptyPanel({ message }: { message: string }) {
  return (
    <div className="rounded-lg border border-[#0A1547]/10 bg-white p-5 text-sm font-medium text-[#0A1547]/54">
      {message}
    </div>
  );
}

function StatusChip({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <span className={`inline-flex w-fit rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${className || "border-[#0A1547]/10 bg-[#F8F9FD] text-[#0A1547]/62"}`}>
      {children}
    </span>
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
    case "agreements":
      return "text-[#7C5CF2]";
    case "billing":
      return "text-[#02ABE0]";
    case "analysis":
    case "audit":
      return "text-[#00CFC8]";
    case "secure":
    case "warning":
      return "text-[#F59E0B]";
    case "report":
      return "text-[#0A1547]/82";
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
    case "agreement":
      return (
        <>
          <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8Z" />
          <path d="M14 3v5h5" />
          <path d="M9 15h3" />
          <path d="M9 11h6" />
        </>
      );
    case "analysis":
    case "activity":
      return <path d="M22 12h-4l-3 8-6-16-3 8H2" />;
    case "arrow":
      return (
        <>
          <path d="M5 12h14" />
          <path d="m12 5 7 7-7 7" />
        </>
      );
    case "billing":
      return (
        <>
          <rect height="14" rx="2" width="20" x="2" y="5" />
          <path d="M2 10h20" />
        </>
      );
    case "check":
      return <path d="m5 12 4 4L19 6" />;
    case "client":
      return (
        <>
          <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
          <circle cx="9" cy="7" r="4" />
          <path d="M22 21v-2a4 4 0 0 0-3-3.9" />
          <path d="M16 3.1a4 4 0 0 1 0 7.8" />
        </>
      );
    case "file":
    case "pdf":
      return (
        <>
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z" />
          <path d="M14 2v6h6" />
          <path d="M8 13h8" />
          <path d="M8 17h5" />
        </>
      );
    case "lock":
      return (
        <>
          <rect height="11" rx="2" width="16" x="4" y="10" />
          <path d="M8 10V7a4 4 0 0 1 8 0v3" />
        </>
      );
    case "upload":
      return (
        <>
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
          <path d="M17 8 12 3 7 8" />
          <path d="M12 3v12" />
        </>
      );
    default:
      return <path d="M22 12h-4l-3 8-6-16-3 8H2" />;
  }
}
