import { useCallback, useEffect, useMemo, useState, type FormEvent, type ReactNode } from "react";
import { Link } from "wouter";
import { useAuth } from "@/auth/AuthProvider";
import { ConsultantReviewExportControls } from "@/components/ConsultantReviewExportControls";
import {
  AdminApiError,
  createAgreementDownloadUrl,
  expireCheckoutSession,
  getClientBillingDetail,
  listAgreements,
  voidAdminUpload,
} from "@/lib/adminApi";
import type {
  AgreementDownloadFileType,
  AgreementSummary,
  BillingUploadSummary,
  BillingUploadStatus,
  CheckoutSessionSummary,
  ClientBillingDetailResponse,
  ConsultantReviewArchiveItem,
  StructuredRankedFinding,
} from "@/lib/types";

type ClientDetailPageProps = {
  email: string;
};

type IconName = "activity" | "archive" | "arrow" | "check" | "clock" | "copy" | "credit" | "file" | "link" | "lock" | "pen" | "users";
type IconTone = "clients" | "agreements" | "billing" | "secure" | "analysis" | "reports" | "success" | "warning" | "danger" | "neutral" | "lilac";

const UPLOAD_STATUS_FILTERS: Array<{ label: string; value: BillingUploadStatus }> = [
  { label: "Active", value: "active" },
  { label: "Voided", value: "voided" },
  { label: "All", value: "all" },
];
const checkedOutSubscriptionStatuses = new Set([
  "active",
  "trialing",
  "past_due",
  "canceled",
  "incomplete",
  "incomplete_expired",
  "unpaid",
]);
const sectionClassName = "rounded-lg border border-[#0A1547]/10 bg-white shadow-[0_12px_28px_rgba(10,21,71,0.05)]";
const compactRowClassName = "rounded-lg border border-[#0A1547]/10 bg-white p-4";
const quietDetailsClassName = "mt-4 rounded-lg border border-[#0A1547]/10 bg-[#F8F9FD] px-4 py-3";
const quietSummaryClassName = "cursor-pointer text-xs font-semibold uppercase tracking-[0.12em] text-[#0A1547]/46";

function formatNullable(value: string | number | boolean | null | undefined): string {
  if (value === null || value === undefined || value === "") {
    return "—";
  }

  if (typeof value === "boolean") {
    return value ? "Yes" : "No";
  }

  return String(value);
}

function formatDate(value: string | null): string {
  if (!value) {
    return "—";
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

function formatDateOnly(value: string | null): string {
  if (!value) {
    return "—";
  }

  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const [year, month, day] = value.split("-").map(Number);
    return new Intl.DateTimeFormat(undefined, { dateStyle: "medium" }).format(new Date(year, month - 1, day));
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat(undefined, { dateStyle: "medium" }).format(date);
}

function formatMountainDate(value: string | null): string {
  if (!value) {
    return "—";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZone: "America/Denver",
    timeZoneName: "short",
  }).format(date);
}

function formatCurrency(amount: number | null, currency: string | null): string {
  if (amount === null || amount === undefined) {
    return "—";
  }

  const normalizedCurrency = currency || "usd";

  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency: normalizedCurrency.toUpperCase(),
    }).format(amount / 100);
  } catch {
    return `${amount} ${normalizedCurrency}`;
  }
}

function statusTone(status: string | null | undefined): string {
  const normalized = status?.toLowerCase();

  if (normalized === "paid" || normalized === "complete" || normalized === "completed" || normalized === "active" || normalized === "trialing") {
    return "border-[#02D99D]/30 bg-[#02D99D]/12 text-[#0A1547]";
  }

  if (normalized === "open" || normalized === "unpaid") {
    return "border-[#02ABE0]/25 bg-[#02ABE0]/10 text-[#0A1547]";
  }

  if (normalized === "voided") {
    return "border-[#A380F6]/30 bg-[#A380F6]/12 text-[#0A1547]";
  }

  if (normalized === "expired" || normalized === "canceled" || normalized === "incomplete_expired") {
    return "border-[#A380F6]/30 bg-[#A380F6]/12 text-[#0A1547]";
  }

  if (normalized === "needs_review" || normalized === "failed" || normalized === "past_due" || normalized === "incomplete") {
    return "border-red-200 bg-red-50 text-red-700";
  }

  return "border-[#0A1547]/10 bg-white text-[#0A1547]/70";
}

function agreementStatusTone(status: string | null | undefined): string {
  const normalized = status?.toLowerCase();

  if (normalized === "signed") {
    return "border-[#02D99D]/35 bg-[#02D99D]/12 text-[#0A1547]";
  }

  if (normalized === "sent") {
    return "border-[#02ABE0]/35 bg-[#02ABE0]/12 text-[#0A1547]";
  }

  if (normalized === "pending_ba_signature") {
    return "border-[#A380F6]/35 bg-[#A380F6]/12 text-[#0A1547]";
  }

  if (normalized === "voided" || normalized === "expired" || normalized === "superseded") {
    return "border-[#0A1547]/10 bg-[#0A1547]/6 text-[#0A1547]/62";
  }

  return "border-[#A380F6]/30 bg-[#A380F6]/12 text-[#0A1547]";
}

function agreementStatusLabel(status: string | null | undefined): string {
  const normalized = status?.toLowerCase();

  if (!normalized) {
    return "Unknown";
  }

  if (normalized === "pending_ba_signature") {
    return "Pending BA Signature";
  }

  return normalized
    .split(/[_\s-]+/)
    .filter(Boolean)
    .map((part) => `${part.charAt(0).toUpperCase()}${part.slice(1)}`)
    .join(" ");
}

function submissionStatusLabel(status: string | null): string {
  const normalized = status?.toLowerCase();

  if (!normalized) {
    return "Unknown";
  }

  if (normalized === "cancel_requested") {
    return "Cancel requested";
  }

  return normalized
    .split(/[_\s-]+/)
    .filter(Boolean)
    .map((part) => `${part.charAt(0).toUpperCase()}${part.slice(1)}`)
    .join(" ");
}

function submissionStatusTone(status: string | null): string {
  const normalized = status?.toLowerCase();

  if (normalized === "completed") {
    return "border-[#02D99D]/30 bg-[#02D99D]/12 text-[#0A1547]";
  }

  if (normalized === "canceled" || normalized === "cancelled") {
    return "border-[#A380F6]/30 bg-[#A380F6]/12 text-[#0A1547]";
  }

  if (normalized === "error" || normalized === "failed") {
    return "border-red-200 bg-red-50 text-red-700";
  }

  if (normalized === "submitted" || normalized === "queued" || normalized === "processing" || normalized === "cancel_requested") {
    return "border-[#02ABE0]/25 bg-[#02ABE0]/10 text-[#0A1547]";
  }

  return "border-[#0A1547]/10 bg-white text-[#0A1547]/70";
}

function submissionSourceLabel(source: string | null): string {
  const normalized = source?.trim().toLowerCase();

  if (!normalized) {
    return "—";
  }

  if (normalized === "client" || normalized.includes("public")) {
    return "Public analyzer";
  }

  if (normalized === "admin") {
    return "Admin analysis";
  }

  return source || "—";
}

function formatStructuredLabel(value: string | null | undefined): string {
  if (!value) {
    return "—";
  }

  return value
    .replace(/_/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function isPaidSession(session: CheckoutSessionSummary): boolean {
  const status = session.status?.toLowerCase();
  const paymentStatus = session.paymentStatus?.toLowerCase();
  return status === "paid" || status === "complete" || status === "completed" || paymentStatus === "paid";
}

function isExpiredSession(session: CheckoutSessionSummary): boolean {
  const status = session.status?.toLowerCase();
  return status === "expired" || Boolean(session.expiredAt);
}

function isOpenSession(session: CheckoutSessionSummary): boolean {
  return !isPaidSession(session) && !isExpiredSession(session);
}

function formatStatusLabel(value: string | null | undefined): string {
  if (!value) {
    return "—";
  }

  return value
    .split(/[_\s-]+/)
    .filter(Boolean)
    .map((part) => `${part.charAt(0).toUpperCase()}${part.slice(1)}`)
    .join(" ");
}

function isCheckedOutRecurringSession(session: CheckoutSessionSummary): boolean {
  if (session.billingMode !== "recurring") {
    return false;
  }

  const subscriptionStatus = session.subscriptionStatus?.toLowerCase();
  return Boolean(session.stripeSubscriptionId) || Boolean(subscriptionStatus && checkedOutSubscriptionStatuses.has(subscriptionStatus));
}

function subscriptionSummaryText(session: CheckoutSessionSummary): string {
  const label = formatStatusLabel(session.subscriptionStatus);
  if (label === "—") {
    return "Subscription checked out";
  }

  return `Subscription ${label.toLowerCase()}`;
}

function uploadTimeValue(upload: BillingUploadSummary): number {
  if (!upload.uploadTime) {
    return 0;
  }

  const date = new Date(upload.uploadTime);
  return Number.isNaN(date.getTime()) ? 0 : date.getTime();
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
    case "clients":
      return "text-[#A380F6]";
    case "agreements":
      return "text-[#7C5CF2]";
    case "billing":
      return "text-[#02ABE0]";
    case "secure":
    case "warning":
      return "text-[#F59E0B]";
    case "analysis":
      return "text-[#00CFC8]";
    case "reports":
    case "neutral":
      return "text-[#0A1547]/78";
    case "success":
      return "text-[#02D99D]";
    case "danger":
      return "text-[#EF4444]";
    case "lilac":
    default:
      return "text-[#A380F6]";
  }
}

function StatusPill({ children, className }: { children: ReactNode; className: string }) {
  return (
    <span className={`inline-flex rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${className}`}>
      {children}
    </span>
  );
}

export default function ClientDetailPage({ email }: ClientDetailPageProps) {
  const { permissions, session } = useAuth();
  const [detail, setDetail] = useState<ClientBillingDetailResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [uploadsExpanded, setUploadsExpanded] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<BillingUploadStatus>("active");
  const [voidTarget, setVoidTarget] = useState<BillingUploadSummary | null>(null);
  const [uploadActionMessage, setUploadActionMessage] = useState("");
  const [checkoutActionMessage, setCheckoutActionMessage] = useState("");

  const token = session?.access_token || "";
  const validEmail = email.trim();
  const canWriteBilling = permissions.canWriteBilling;
  const canWriteUploads = permissions.canWriteUploads;
  const canReadAgreements = permissions.canReadAgreements || permissions.canWriteAgreements;

  const loadDetail = useCallback(async (
    signal?: AbortSignal,
    options: { showLoading?: boolean } = {},
  ) => {
    if (!token || !validEmail) {
      return;
    }

    if (options.showLoading !== false) {
      setLoading(true);
    }
    setError("");

    try {
      const response = await getClientBillingDetail(token, validEmail, signal, { uploadStatus });
      setDetail(response);
    } catch (detailError) {
      if (detailError instanceof DOMException && detailError.name === "AbortError") {
        return;
      }

      if (detailError instanceof AdminApiError) {
        setError(detailError.message);
      } else {
        setError("Client billing details could not be loaded.");
      }
    } finally {
      if (!signal?.aborted) {
        setLoading(false);
      }
    }
  }, [token, uploadStatus, validEmail]);

  useEffect(() => {
    const controller = new AbortController();
    void loadDetail(controller.signal);

    return () => {
      controller.abort();
    };
  }, [loadDetail]);

  useEffect(() => {
    setUploadsExpanded(false);
  }, [uploadStatus, validEmail]);

  const summary = detail?.summary;
  const sortedUploads = useMemo(() => {
    return [...(detail?.uploads ?? [])].sort((left, right) => uploadTimeValue(right) - uploadTimeValue(left));
  }, [detail?.uploads]);
  const visibleUploads = uploadsExpanded ? sortedUploads : sortedUploads.slice(0, 4);
  const empty = useMemo(() => {
    return (
      !loading &&
      !error &&
      detail !== null &&
      detail.checkoutSessions.length === 0 &&
      (detail.recentSubmissions?.length ?? 0) === 0 &&
      (detail.consultantReviews?.length ?? 0) === 0 &&
      detail.uploads.length === 0 &&
      detail.billingOverrides.length === 0
    );
  }, [detail, error, loading]);

  const handleUploadStatusChange = (nextStatus: BillingUploadStatus) => {
    setUploadActionMessage("");
    setUploadsExpanded(false);
    setUploadStatus(nextStatus);
  };

  const handleCheckoutExpired = async () => {
    setCheckoutActionMessage("Checkout link expired.");
    await loadDetail(undefined, { showLoading: false });
  };

  const handleUploadVoided = async () => {
    setVoidTarget(null);
    setUploadActionMessage("Upload voided. It is hidden from active workflows and remains available in the Voided or All upload filters.");

    if (uploadStatus === "voided") {
      await loadDetail(undefined, { showLoading: false });
      return;
    }

    setUploadStatus("voided");
  };

  if (!validEmail) {
    return (
      <div className={`${sectionClassName} p-8`}>
        <h2 className="text-xl font-black text-[#0A1547]">Invalid client email</h2>
        <p className="mt-2 text-sm font-medium text-[#0A1547]/62">
          The client detail route did not include a usable email address.
        </p>
        <BackLink />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <section className={`${sectionClassName} px-5 py-4`}>
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div className="min-w-0">
            <BackLink />
            <div className="mt-4 flex min-w-0 items-start gap-3">
              <IconBadge icon="users" tone="clients" />
              <div className="min-w-0">
                <h2 className="truncate text-2xl font-black text-[#0A1547]">{detail?.clientProfile.name || detail?.clientEmail || validEmail}</h2>
                <p className="mt-1 truncate text-sm font-medium text-[#0A1547]/56">{detail?.clientEmail || validEmail}</p>
                {detail?.clientProfile.officeName && (
                  <p className="mt-1 truncate text-xs font-medium text-[#0A1547]/44">{detail.clientProfile.officeName}</p>
                )}
              </div>
            </div>
          </div>
          <div className="rounded-lg border border-[#0A1547]/10 bg-[#F8F9FD] px-4 py-3 md:min-w-72">
            <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-[#0A1547]/38">
              Stripe Customer
            </p>
            <p className="mt-1 max-w-xs break-all text-sm font-semibold text-[#0A1547]/82">
              {detail?.customer?.stripeCustomerId || "Not linked"}
            </p>
          </div>
        </div>
      </section>

      {loading && (
        <div className={`${sectionClassName} p-8 text-center text-sm font-medium text-[#0A1547]/56`}>
          Loading client details...
        </div>
      )}

      {error && !loading && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-5 text-sm font-semibold text-red-700">
          {error}
        </div>
      )}

      {empty && (
        <div className={`${sectionClassName} p-8 text-center`}>
          <h3 className="text-lg font-black text-[#0A1547]">No billing detail yet</h3>
          <p className="mt-2 text-sm font-medium text-[#0A1547]/60">
            This client does not have local checkout sessions or uploads yet.
          </p>
        </div>
      )}

      {detail && !loading && !error && (
        <>
          <ClientInformationPanel
            canReadAgreements={canReadAgreements}
            detail={detail}
            token={token}
          />
          <RecentSubmissionsPanel submissions={detail.recentSubmissions ?? []} />

          <BillingHandoffCard />

          <BillingSummaryPanel summary={detail.summary} />

          {checkoutActionMessage && (
            <p className="rounded-lg border border-[#02D99D]/25 bg-[#02D99D]/10 px-5 py-4 text-sm font-semibold text-[#0A1547]">
              {checkoutActionMessage}
            </p>
          )}

          <section className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
            <Panel title="Checkout Sessions" emptyText="No checkout sessions found.">
              {detail.checkoutSessions.map((session) => (
                <CheckoutSessionCard
                  key={session.id}
                  canWriteBilling={canWriteBilling}
                  onExpired={handleCheckoutExpired}
                  session={session}
                  token={token}
                  upload={sortedUploads.find((upload) => upload.id === session.uploadId)}
                />
              ))}
            </Panel>

            <UploadsPanel
              canWriteUploads={canWriteUploads}
              expanded={uploadsExpanded}
              message={uploadActionMessage}
              onRequestVoid={setVoidTarget}
              onStatusChange={handleUploadStatusChange}
              onToggle={() => setUploadsExpanded((current) => !current)}
              status={uploadStatus}
              totalCount={sortedUploads.length}
              uploads={visibleUploads}
            />
          </section>

          <ConsultantReviewArchivePanel
            clientEmail={detail.clientEmail}
            clientName={detail.clientProfile.name}
            reviews={detail.consultantReviews ?? []}
          />

          {voidTarget && (
            <VoidUploadModal
              onClose={() => setVoidTarget(null)}
              onVoided={handleUploadVoided}
              token={token}
              upload={voidTarget}
            />
          )}
        </>
      )}
    </div>
  );
}

function ClientInformationPanel({
  canReadAgreements,
  detail,
  token,
}: {
  canReadAgreements: boolean;
  detail: ClientBillingDetailResponse;
  token: string;
}) {
  const [copyStatus, setCopyStatus] = useState("");
  const profile = detail.clientProfile;
  const latestGhlCid = profile.latestGhlCid?.trim() || detail.latestGhlCid?.trim() || "";

  const handleCopyGhlCid = async () => {
    if (!latestGhlCid) {
      return;
    }

    try {
      await navigator.clipboard.writeText(latestGhlCid);
      setCopyStatus("Copied");
    } catch {
      setCopyStatus("Copy failed");
    }
  };

  return (
    <section className={`${sectionClassName} p-5`}>
      <SectionHeader
        description="Profile details used across uploads, billing, agreements, and reporting."
        icon="users"
        iconTone="clients"
        title="Client information"
      />
      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <ClientInfoFact label="Name" value={profile.name} />
        <ClientInfoFact label="Email" value={profile.email || detail.clientEmail} />
        <ClientInfoFact label="Office / Group" value={profile.officeName} />
        <ClientInfoFact label="Type" value={profile.orgType} />
        <ClientInfoFact label="Phone" value={profile.phone} />
        <ClientInfoFact
          action={latestGhlCid ? (
            <button
              type="button"
              onClick={() => void handleCopyGhlCid()}
              className="admin-focus rounded-lg border border-[#0A1547]/10 bg-white px-2.5 py-1 text-xs font-semibold text-[#0A1547]/82 transition hover:border-[#A380F6]/60"
            >
              Copy
            </button>
          ) : null}
          helper={copyStatus}
          label="GHL CID"
          value={latestGhlCid || null}
        />
      </div>
      {canReadAgreements && (
        <AgreementHistorySection
          clientEmail={detail.clientEmail}
          token={token}
        />
      )}
    </section>
  );
}

function ClientInfoFact({
  action,
  helper,
  label,
  value,
}: {
  action?: ReactNode;
  helper?: string;
  label: string;
  value: string | number | boolean | null | undefined;
}) {
  return (
    <div className="min-w-0 rounded-lg border border-[#0A1547]/10 bg-[#F8F9FD] px-3 py-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-[#0A1547]/38">{label}</p>
          <p className="mt-1 break-words text-sm font-semibold text-[#0A1547]/82">{formatNullable(value)}</p>
          {helper && (
            <p className="mt-1 text-xs font-medium text-[#0A1547]/50">{helper}</p>
          )}
        </div>
        {action && <div className="shrink-0">{action}</div>}
      </div>
    </div>
  );
}

function AgreementHistorySection({
  clientEmail,
  token,
}: {
  clientEmail: string;
  token: string;
}) {
  const [agreements, setAgreements] = useState<AgreementSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [actionBusyKey, setActionBusyKey] = useState("");

  const loadAgreementHistory = useCallback(async (signal?: AbortSignal) => {
    if (!token || !clientEmail) {
      setAgreements([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError("");

    try {
      const response = await listAgreements(token, {
        clientEmail,
        limit: 25,
      }, signal);
      setAgreements(response.items);
    } catch (agreementError) {
      if (agreementError instanceof DOMException && agreementError.name === "AbortError") {
        return;
      }

      setError("Agreement history could not be loaded.");
      setAgreements([]);
    } finally {
      if (!signal?.aborted) {
        setLoading(false);
      }
    }
  }, [clientEmail, token]);

  useEffect(() => {
    const controller = new AbortController();
    void loadAgreementHistory(controller.signal);

    return () => {
      controller.abort();
    };
  }, [loadAgreementHistory]);

  const handleDownload = async (agreement: AgreementSummary, fileType: AgreementDownloadFileType) => {
    if (!token || actionBusyKey) {
      return;
    }

    setActionBusyKey(`${agreement.id}:${fileType}`);
    setError("");

    try {
      const response = await createAgreementDownloadUrl(token, agreement.id, fileType);
      window.open(response.url, "_blank", "noopener,noreferrer");
    } catch {
      setError("Agreement PDF could not be opened.");
    } finally {
      setActionBusyKey("");
    }
  };

  return (
    <div className="mt-6 border-t border-[#0A1547]/10 pt-5">
      <div className="flex min-w-0 items-start gap-3">
        <IconBadge compact icon="pen" tone="agreements" />
        <div>
          <h4 className="text-base font-bold text-[#0A1547]">Agreement history</h4>
          <p className="mt-1 text-sm font-medium text-[#0A1547]/54">
            BAA/Privacy Agreement records for this client.
          </p>
        </div>
      </div>

      {error && (
        <p className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
          {error}
        </p>
      )}

      <div className="mt-4 overflow-hidden rounded-lg border border-[#0A1547]/10">
        <div className="grid grid-cols-[1.25fr_1fr_0.7fr_0.8fr_0.8fr_1fr] gap-3 bg-[#F8F9FD] px-4 py-3 text-[11px] font-medium uppercase tracking-[0.12em] text-[#0A1547]/38 max-xl:hidden">
          <span>Agreement</span>
          <span>Signer</span>
          <span>Status</span>
          <span>Effective</span>
          <span>Signed</span>
          <span>Actions</span>
        </div>

        {loading ? (
          <p className="px-4 py-5 text-sm font-medium text-[#0A1547]/54">Loading agreement history...</p>
        ) : agreements.length ? (
          <div className="divide-y divide-[#0A1547]/8">
            {agreements.map((agreement) => {
              const normalizedStatus = agreement.status.toLowerCase();
              const showSignedPdf = normalizedStatus === "signed" && agreement.hasSignedPdf;
              const showDraftPreview = !showSignedPdf && agreement.hasDraftPdf;

              return (
                <div key={agreement.id} className="grid gap-4 px-4 py-4 text-sm xl:grid-cols-[1.25fr_1fr_0.7fr_0.8fr_0.8fr_1fr] xl:items-center">
                  <div>
                    <p className="font-semibold text-[#0A1547]">{formatNullable(agreement.clientLegalName)}</p>
                    <p className="mt-1 text-xs font-medium text-[#0A1547]/45">{agreement.documentType}</p>
                  </div>
                  <div>
                    <p className="break-all font-medium text-[#0A1547]/80">{formatNullable(agreement.signerEmail)}</p>
                    <p className="mt-1 text-xs font-medium text-[#0A1547]/50">{formatNullable(agreement.signerName)}</p>
                  </div>
                  <div>
                    <StatusPill className={agreementStatusTone(agreement.status)}>
                      {agreementStatusLabel(agreement.status)}
                    </StatusPill>
                  </div>
                  <div className="font-medium text-[#0A1547]/64">
                    {formatDateOnly(agreement.effectiveDate)}
                  </div>
                  <div className="font-medium text-[#0A1547]/64">
                    {formatDate(agreement.signedAt || agreement.baSignedAt || agreement.clientSignedAt || agreement.sentAt)}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {showDraftPreview && (
                      <button
                        type="button"
                        onClick={() => void handleDownload(agreement, "draft")}
                        disabled={Boolean(actionBusyKey)}
                        className="admin-focus rounded-lg border border-[#0A1547]/10 bg-white px-3 py-2 text-xs font-semibold text-[#0A1547]/82 transition hover:border-[#A380F6]/50 disabled:opacity-45"
                      >
                        Draft Preview
                      </button>
                    )}
                    {showSignedPdf && (
                      <button
                        type="button"
                        onClick={() => void handleDownload(agreement, "signed")}
                        disabled={Boolean(actionBusyKey)}
                        className="admin-focus rounded-lg bg-[#0A1547] px-3 py-2 text-xs font-bold text-white transition hover:bg-[#1A2460] disabled:opacity-45"
                      >
                        Signed PDF
                      </button>
                    )}
                    {!showDraftPreview && !showSignedPdf && (
                      <span className="text-xs font-medium text-[#0A1547]/45">No PDF action</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="px-4 py-5 text-sm font-medium text-[#0A1547]/54">
            No agreements found for this client.
          </p>
        )}
      </div>
    </div>
  );
}

function RecentSubmissionsPanel({
  submissions,
}: {
  submissions: ClientBillingDetailResponse["recentSubmissions"];
}) {
  const [expanded, setExpanded] = useState(false);
  const hasMore = submissions.length > 2;
  const visibleSubmissions = expanded || !hasMore ? submissions : submissions.slice(0, 2);

  return (
    <section className={`${sectionClassName} p-5`}>
      <SectionHeader
        description="Public analyzer and admin submission attempts."
        icon="activity"
        iconTone="analysis"
        title="Recent submissions"
      />

      <div className="mt-4 grid gap-3">
        {visibleSubmissions.length > 0 ? visibleSubmissions.map((submission) => (
          <RecentSubmissionCard key={submission.id || `${submission.submittedAt}-${submission.status}`} submission={submission} />
        )) : (
          <p className="rounded-lg border border-[#0A1547]/10 bg-[#F8F9FD] p-4 text-sm font-medium text-[#0A1547]/54">
            No recent submissions found.
          </p>
        )}
      </div>

      {hasMore && (
        <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          {!expanded && (
            <p className="text-xs font-medium text-[#0A1547]/50">
              Showing the 2 most recent submissions.
            </p>
          )}
          <button
            type="button"
            onClick={() => setExpanded((current) => !current)}
            className="admin-focus w-fit rounded-lg border border-[#0A1547]/10 bg-white px-4 py-2 text-xs font-semibold text-[#0A1547]/82 transition hover:border-[#A380F6]/50"
          >
            {expanded ? "Show less" : `Show all (${submissions.length})`}
          </button>
        </div>
      )}
    </section>
  );
}

function RecentSubmissionCard({
  submission,
}: {
  submission: ClientBillingDetailResponse["recentSubmissions"][number];
}) {
  const status = submission.status?.toLowerCase() || null;
  const eventTime = submission.canceledAt
    ? { label: "Canceled", value: submission.canceledAt }
    : submission.erroredAt
      ? { label: "Errored", value: submission.erroredAt }
      : submission.completedAt
        ? { label: "Completed", value: submission.completedAt }
        : null;
  const upload = submission.upload;

  return (
    <article className={compactRowClassName}>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex min-w-0 items-start gap-3">
          <IconBadge compact icon="activity" tone="analysis" />
          <div className="min-w-0">
            <p className="text-sm font-semibold text-[#0A1547]">
              Submitted {formatDate(submission.submittedAt)}
            </p>
            <p className="mt-1 text-xs font-medium text-[#0A1547]/52">
              {submissionSourceLabel(submission.source)}
            </p>
          </div>
        </div>
        <StatusPill className={`w-fit shrink-0 ${submissionStatusTone(status)}`}>
          {submissionStatusLabel(status)}
        </StatusPill>
      </div>

      <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-3">
        <Detail label="Submitted" value={formatDate(submission.submittedAt)} />
        {eventTime && <Detail label={eventTime.label} value={formatDate(eventTime.value)} />}
        <Detail label="Source" value={submissionSourceLabel(submission.source)} />
        <Detail label="GHL CID" value={submission.ghlCid} />
      </dl>

      {submission.errorMessage && (
        <p className="mt-3 rounded-xl border border-red-200 bg-white px-3 py-2 text-sm font-medium text-red-700">
          {submission.errorMessage}
        </p>
      )}

      {upload && (
        <div className="mt-3 rounded-lg border border-[#0A1547]/10 bg-[#F8F9FD] px-3 py-2">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-[#0A1547]">{formatNullable(upload.fileName)}</p>
              <p className="mt-1 text-xs font-medium text-[#0A1547]/58">
                {formatNullable(upload.toolName)} · Uploaded {formatDate(upload.uploadTime)}
              </p>
            </div>
            <div className="flex shrink-0 flex-wrap gap-2">
              {upload.voided && (
                <StatusPill className={statusTone("voided")}>
                  Voided
                </StatusPill>
              )}
              <StatusPill className={statusTone(upload.paid ? "paid" : "unpaid")}>
                {upload.paid ? "Paid" : "Not paid"}
              </StatusPill>
            </div>
          </div>
        </div>
      )}
    </article>
  );
}

function ConsultantReviewArchivePanel({
  clientEmail,
  clientName,
  reviews,
}: {
  clientEmail: string;
  clientName: string | null;
  reviews: ConsultantReviewArchiveItem[];
}) {
  return (
    <section className={`${sectionClassName} p-5`}>
      <SectionHeader
        description="Promoted structured reviews for internal review, follow-up planning, and export."
        icon="archive"
        iconTone="reports"
        title="Consultant review archive"
      />

      <div className="mt-4 grid gap-3">
        {reviews.length > 0 ? reviews.map((review) => (
          <ConsultantReviewArchiveCard
            key={review.id || review.uploadId || `${review.toolName}-${review.uploadTime}`}
            clientEmail={clientEmail}
            clientName={clientName}
            review={review}
          />
        )) : (
          <p className="rounded-lg border border-[#0A1547]/10 bg-[#F8F9FD] p-4 text-sm font-medium text-[#0A1547]/54">
            No consultant review exports are available yet. Promote a structured Document Analysis result to make it available here.
          </p>
        )}
      </div>
    </section>
  );
}

function ConsultantReviewArchiveCard({
  clientEmail,
  clientName,
  review,
}: {
  clientEmail: string;
  clientName: string | null;
  review: ConsultantReviewArchiveItem;
}) {
  const [expanded, setExpanded] = useState(false);
  const structuredAnalysis = review.structuredAnalysis;
  const summary = structuredAnalysis.executiveSummary || {};
  const findings = structuredAnalysis.rankedFindings || [];
  const rawOutputs = Object.entries(review.rawAnalyses || {}).filter((entry): entry is [string, string] => (
    typeof entry[1] === "string"
  ));
  const providerStatuses = Object.entries(review.providerStructuredStatuses || {});
  const eventTime = review.generatedAt || review.uploadTime || review.pdfGeneratedAt;

  return (
    <article className={compactRowClassName}>
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div className="flex min-w-0 items-start gap-3">
          <IconBadge compact icon="file" tone="reports" />
          <div className="min-w-0">
            <p className="break-words text-sm font-semibold text-[#0A1547]">{formatNullable(review.fileName)}</p>
            <p className="mt-1 text-xs font-medium text-[#0A1547]/52">
              {formatNullable(review.toolName)} / {formatDate(eventTime)}
            </p>
          </div>
        </div>
        <div className="flex shrink-0 flex-wrap gap-2">
          <StatusPill className={statusTone(review.paid ? "paid" : "unpaid")}>
            {review.paid ? "Paid" : "Not paid"}
          </StatusPill>
          {review.voided && (
            <StatusPill className={statusTone("voided")}>
              Voided
            </StatusPill>
          )}
        </div>
      </div>

      <div className="mt-4 grid gap-3 lg:grid-cols-3">
        <ClientInfoFact label="Findings" value={findings.length} />
        <ClientInfoFact label="Primary concern" value={summary.primaryConcern} />
        <ClientInfoFact label="Recommended focus" value={summary.recommendedFocus} />
      </div>

      {summary.summary && (
        <p className="mt-3 line-clamp-3 rounded-lg border border-[#0A1547]/10 bg-[#F8F9FD] px-3 py-2 text-sm font-medium leading-6 text-[#0A1547]/68">
          {summary.summary}
        </p>
      )}

      <div className="mt-4 flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <button
          type="button"
          onClick={() => setExpanded((current) => !current)}
          className="admin-focus w-fit rounded-lg border border-[#0A1547]/10 bg-white px-4 py-2 text-xs font-semibold text-[#0A1547]/82 transition hover:border-[#A380F6]/50"
        >
          {expanded ? "Hide details" : "View details"}
        </button>

        <ConsultantReviewExportControls
          buttonLabel="Export review"
          context={{
            clientEmail,
            clientName,
            fileName: review.fileName,
            generatedAt: review.generatedAt,
            sourceFormat: review.sourceFormat,
            toolName: review.toolName,
            toolType: structuredAnalysis.toolType,
            uploadTime: review.uploadTime,
          }}
          providerStatuses={providerStatuses}
          rawOutputs={rawOutputs}
          structuredAnalysis={structuredAnalysis}
        />
      </div>

      {expanded && (
        <div className="mt-4 rounded-lg border border-[#0A1547]/10 bg-[#F8F9FD] p-4">
          <p className="text-sm font-semibold text-[#0A1547]">Review preview</p>
          <div className="mt-3 grid gap-3">
            {summary.summary && <ArchivePreviewBlock label="Executive summary" value={summary.summary} />}
            {findings.slice(0, 3).map((finding, index) => (
              <ArchiveFindingPreview
                key={`${finding.rank || index}-${finding.title || "finding"}`}
                finding={finding}
                fallbackRank={index + 1}
              />
            ))}
            {findings.length === 0 && (
              <p className="rounded-lg bg-white p-3 text-sm font-medium text-[#0A1547]/54">
                No ranked findings are available for this review.
              </p>
            )}
          </div>
        </div>
      )}
    </article>
  );
}

function ArchivePreviewBlock({ label, value }: { label: string; value: string | null | undefined }) {
  if (!value) {
    return null;
  }

  return (
    <div>
      <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-[#0A1547]/38">{label}</p>
      <p className="mt-1 break-words text-sm font-medium leading-6 text-[#0A1547]/68">{value}</p>
    </div>
  );
}

function ArchiveFindingPreview({
  fallbackRank,
  finding,
}: {
  fallbackRank: number;
  finding: StructuredRankedFinding;
}) {
  const rank = finding.rank || fallbackRank;

  return (
    <div className="rounded-lg border border-[#0A1547]/10 bg-white p-3">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#A380F6]">Finding {rank}</p>
          <p className="mt-1 text-sm font-semibold text-[#0A1547]">{formatNullable(finding.title)}</p>
          <p className="mt-1 text-xs font-medium text-[#0A1547]/50">{formatStructuredLabel(finding.category)}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <StatusPill className={reviewSeverityTone(finding.severity)}>
            {formatStructuredLabel(finding.severity)}
          </StatusPill>
          <StatusPill className="border-[#A380F6]/25 bg-white text-[#0A1547]/72">
            {formatStructuredLabel(finding.confidence)} confidence
          </StatusPill>
        </div>
      </div>
      {finding.recommendedAction && (
        <p className="mt-3 text-sm font-medium leading-6 text-[#0A1547]/68">
          <span className="font-semibold text-[#0A1547]">Recommended action:</span> {finding.recommendedAction}
        </p>
      )}
    </div>
  );
}

function reviewSeverityTone(value: string | null | undefined): string {
  const normalized = value?.toLowerCase();
  if (normalized === "critical" || normalized === "high") {
    return "border-red-200 bg-red-50 text-red-700";
  }
  if (normalized === "medium") {
    return "border-[#A380F6]/30 bg-[#A380F6]/10 text-[#0A1547]";
  }
  if (normalized === "low") {
    return "border-[#02D99D]/30 bg-[#02D99D]/10 text-[#0A1547]";
  }
  return "border-[#0A1547]/10 bg-white text-[#0A1547]/70";
}

function BillingHandoffCard() {
  return (
    <section className={`${sectionClassName} p-5`}>
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="flex min-w-0 items-start gap-3">
          <IconBadge icon="credit" tone="billing" />
          <div className="min-w-0">
            <h3 className="text-lg font-black text-[#0A1547]">Create payment links in Billing</h3>
            <p className="mt-1 max-w-2xl text-sm font-medium leading-6 text-[#0A1547]/56">
              Checkout links now live in Billing so payments, upload links, and future offer links stay together.
            </p>
          </div>
        </div>
        <Link
          href="/billing"
          className="admin-focus w-fit rounded-lg bg-[#0A1547] px-4 py-2 text-sm font-bold text-white transition hover:bg-[#1A2460]"
        >
          Open Billing
        </Link>
      </div>
    </section>
  );
}

function BackLink() {
  return (
    <Link
      href="/clients"
      className="admin-focus inline-flex items-center gap-2 rounded-lg border border-[#0A1547]/10 bg-white px-3 py-2 text-sm font-semibold text-[#0A1547]/82 transition hover:border-[#A380F6]/50"
    >
      <Icon name="arrow" size={15} />
      Back to clients
    </Link>
  );
}

function UploadsPanel({
  canWriteUploads,
  expanded,
  message,
  onRequestVoid,
  onStatusChange,
  onToggle,
  status,
  totalCount,
  uploads,
}: {
  canWriteUploads: boolean;
  expanded: boolean;
  message: string;
  onRequestVoid: (upload: BillingUploadSummary) => void;
  onStatusChange: (status: BillingUploadStatus) => void;
  onToggle: () => void;
  status: BillingUploadStatus;
  totalCount: number;
  uploads: BillingUploadSummary[];
}) {
  return (
    <section className={`${sectionClassName} p-5`}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <SectionHeader
          description="Active uploads are used for normal checkout and report workflows."
          icon="lock"
          iconTone="secure"
          title="Uploads"
        />
        <div className="flex flex-wrap items-center gap-2">
          {UPLOAD_STATUS_FILTERS.map((filter) => (
            <button
              key={filter.value}
              type="button"
              onClick={() => onStatusChange(filter.value)}
              className={`admin-focus rounded-lg border px-3 py-2 text-xs font-semibold transition ${
                status === filter.value
                  ? "border-[#A380F6] bg-[#A380F6] text-white"
                  : "border-[#0A1547]/10 bg-white text-[#0A1547]/65 hover:border-[#A380F6]/50"
              }`}
            >
              {filter.label}
            </button>
          ))}
          {totalCount > 4 && (
            <button
              type="button"
              onClick={onToggle}
              className="admin-focus rounded-lg border border-[#0A1547]/10 bg-white px-4 py-2 text-sm font-semibold text-[#0A1547]/82 transition hover:border-[#A380F6]/50"
            >
              {expanded ? "Show fewer" : `Show all (${totalCount})`}
            </button>
          )}
        </div>
      </div>
      {message && (
        <p className="mt-4 rounded-xl border border-[#02D99D]/25 bg-[#02D99D]/10 px-4 py-3 text-sm font-semibold text-[#0A1547]">
          {message}
        </p>
      )}
      <div className="mt-4 grid gap-3">
        {uploads.length > 0 ? uploads.map((upload) => (
          <UploadCard
            key={upload.id}
            canWriteUploads={canWriteUploads}
            onVoid={() => onRequestVoid(upload)}
            upload={upload}
          />
        )) : (
          <p className="rounded-lg border border-[#0A1547]/10 bg-[#F8F9FD] p-4 text-sm font-medium text-[#0A1547]/54">
            No uploads found.
          </p>
        )}
      </div>
    </section>
  );
}

function BillingSummaryPanel({ summary }: { summary: ClientBillingDetailResponse["summary"] }) {
  return (
    <section className={`${sectionClassName} p-5`}>
      <SectionHeader
        description="High-level checkout and override status."
        icon="credit"
        iconTone="billing"
        title="Billing summary"
      />
      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <SummaryFact
          label="Sessions"
          value={summary.checkoutSessionCount}
          helpText="Number of checkout sessions created for this client."
          valueClassName="text-[#A380F6]"
        />
        <SummaryFact
          label="Paid"
          value={summary.paidCheckoutSessionCount}
          helpText="Checkout sessions marked paid."
          valueClassName="text-[#02D99D]"
        />
        <SummaryFact
          label="Open"
          value={summary.openCheckoutSessionCount}
          helpText="Unpaid or open checkout sessions."
          valueClassName="text-[#02ABE0]"
        />
        <SummaryFact
          label="Overrides"
          value={summary.manualOverrideCount}
          helpText="Manual billing status overrides."
          valueClassName="text-[#A380F6]"
        />
        <SummaryFact
          label="Latest"
          value={formatNullable(summary.latestPaymentStatus)}
          helpText="Latest known payment status."
          valueClassName="text-[#0A1547]"
        />
      </div>
    </section>
  );
}

function SummaryFact({
  helpText,
  label,
  value,
  valueClassName,
}: {
  helpText: string;
  label: string;
  value: string | number;
  valueClassName: string;
}) {
  return (
    <div title={helpText} className="rounded-lg border border-[#0A1547]/10 bg-white p-4 shadow-[0_8px_20px_rgba(10,21,71,0.035)]">
      <p className={`break-words text-2xl font-black leading-none ${valueClassName}`}>{value}</p>
      <p className="mt-2 text-[11px] font-medium uppercase tracking-[0.12em] text-[#0A1547]/40">{label}</p>
      <p className="mt-1 text-xs font-medium leading-5 text-[#0A1547]/50">{helpText}</p>
    </div>
  );
}

function Panel({
  children,
  emptyText,
  title,
}: {
  children: ReactNode[];
  emptyText: string;
  title: string;
}) {
  return (
    <section className={`${sectionClassName} p-5`}>
      <SectionHeader
        description="Created checkout links and subscription checkout records."
        icon="credit"
        iconTone="billing"
        title={title}
      />
      <div className="mt-4 grid gap-3">
        {children.length > 0 ? children : (
          <p className="rounded-lg border border-[#0A1547]/10 bg-[#F8F9FD] p-4 text-sm font-medium text-[#0A1547]/54">
            {emptyText}
          </p>
        )}
      </div>
    </section>
  );
}

function CheckoutSessionCard({
  canWriteBilling,
  onExpired,
  session,
  token,
  upload,
}: {
  canWriteBilling: boolean;
  onExpired: () => Promise<void>;
  session: CheckoutSessionSummary;
  token: string;
  upload?: BillingUploadSummary;
}) {
  const [copyStatus, setCopyStatus] = useState("");
  const [expiring, setExpiring] = useState(false);
  const [expireError, setExpireError] = useState("");
  const checkoutUrl = session.checkoutUrl?.trim() || "";
  const paid = isPaidSession(session);
  const expired = isExpiredSession(session);
  const subscriptionCheckedOut = isCheckedOutRecurringSession(session);
  const canUseCheckoutLink = checkoutUrl !== "" && !paid && !expired && !subscriptionCheckedOut;
  const canExpire = canWriteBilling && isOpenSession(session) && !subscriptionCheckedOut;
  const relatedUploads = session.relatedUploads?.length > 0 ? session.relatedUploads : upload ? [upload] : [];
  const hasLegacyUploadOnly = relatedUploads.length === 0 && Boolean(session.uploadId);
  const technicalUploadIds = session.uploadIds?.length ? session.uploadIds.join(", ") : session.uploadId;
  const isRecurringSession = session.billingMode === "recurring";
  const recurringAmount = session.monthlyAmount ?? session.amountTotal;
  const amountLabel = isRecurringSession && recurringAmount !== null && recurringAmount !== undefined
    ? `${formatCurrency(recurringAmount, session.currency)}/month`
    : formatCurrency(session.amountTotal, session.currency);
  const subscriptionCancelAt = session.subscriptionCancelAt ?? session.cancelAt ?? null;
  const subscriptionCurrentPeriodEnd = session.subscriptionCurrentPeriodEnd ?? session.currentPeriodEnd ?? null;
  const subscriptionPaymentStatus = session.latestPaymentStatus || session.paymentStatus;
  const displayStatus = subscriptionCheckedOut ? session.subscriptionStatus : expired ? "expired" : session.status;
  const displayPaymentStatus = subscriptionCheckedOut ? subscriptionPaymentStatus : session.paymentStatus;

  const handleCopy = async () => {
    if (!checkoutUrl) {
      return;
    }

    try {
      await navigator.clipboard.writeText(checkoutUrl);
      setCopyStatus("Copied");
    } catch {
      setCopyStatus("Copy failed");
    }
  };

  const handleExpire = async () => {
    if (!window.confirm("Expire this checkout link? The client will no longer be able to use it.")) {
      return;
    }

    setExpiring(true);
    setExpireError("");
    try {
      await expireCheckoutSession(token, session.id);
      await onExpired();
    } catch (expireSessionError) {
      if (expireSessionError instanceof AdminApiError) {
        setExpireError(expireSessionError.message);
      } else {
        setExpireError("Checkout link could not be expired.");
      }
    } finally {
      setExpiring(false);
    }
  };

  return (
    <article className={compactRowClassName}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex min-w-0 items-start gap-3">
          <IconBadge compact icon="credit" tone="billing" />
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-[#0A1547]">{formatNullable(session.offerName || session.purpose)}</p>
            <p className="mt-1 text-sm font-medium text-[#0A1547]/58">
              {amountLabel}
            </p>
            {isRecurringSession ? (
              <div className="mt-2 flex flex-wrap gap-2">
                <StatusPill className="border-[#02D99D]/25 bg-white text-[#0A1547]/70">
                  Monthly retainer
                </StatusPill>
                {session.contractMonths ? (
                  <StatusPill className="border-[#A380F6]/25 bg-white text-[#0A1547]/70">
                    {session.contractMonths} months
                  </StatusPill>
                ) : null}
              </div>
            ) : null}
            <p className="mt-1 text-xs font-medium text-[#0A1547]/52">
              {subscriptionCheckedOut
                ? subscriptionCancelAt
                  ? `Auto-cancels ${formatMountainDate(subscriptionCancelAt)}`
                  : session.contractMonths
                    ? `Term: ${session.contractMonths} months`
                    : "Monthly retainer"
                : expired
                  ? `Expired ${formatMountainDate(session.expiredAt)}`
                  : `Expires ${formatMountainDate(session.expiresAt)}`}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <StatusPill className={statusTone(displayStatus)}>
            {formatStatusLabel(displayStatus)}
          </StatusPill>
          <StatusPill className={statusTone(displayPaymentStatus)}>
            {formatStatusLabel(displayPaymentStatus)}
          </StatusPill>
        </div>
      </div>
      <dl className="mt-4 grid gap-3 text-sm md:grid-cols-2">
        <Detail label="Amount" value={amountLabel} />
        <Detail label="Status" value={formatStatusLabel(displayStatus)} />
        <Detail label="Payment" value={formatStatusLabel(displayPaymentStatus)} />
        <Detail label="Created" value={formatDate(session.createdAt)} />
        {subscriptionCheckedOut && subscriptionCancelAt ? (
          <Detail label="Auto-cancels" value={formatMountainDate(subscriptionCancelAt)} />
        ) : null}
        {!subscriptionCheckedOut ? (
          <Detail label="Expires" value={formatMountainDate(session.expiresAt)} />
        ) : null}
        <Detail label="Expired" value={formatMountainDate(session.expiredAt)} />
      </dl>

      {subscriptionCheckedOut && (
        <div className="mt-4 rounded-lg border border-[#02D99D]/20 bg-[#F8F9FD] p-4">
          <div>
            <p className="text-sm font-semibold text-[#0A1547]">{subscriptionSummaryText(session)}</p>
            <p className="mt-1 text-sm font-medium text-[#0A1547]/58">
              {session.contractMonths ? `Term: ${session.contractMonths} months` : "Monthly retainer"}
            </p>
            {subscriptionCancelAt ? (
              <p className="mt-1 text-sm font-medium text-[#0A1547]/58">
                Auto-cancels {formatMountainDate(subscriptionCancelAt)}
              </p>
            ) : null}
            {subscriptionCurrentPeriodEnd ? (
              <p className="mt-1 text-xs font-medium text-[#0A1547]/52">
                Current period ends {formatMountainDate(subscriptionCurrentPeriodEnd)}
              </p>
            ) : null}
          </div>
        </div>
      )}

      {relatedUploads.length > 0 && (
        <div className="mt-4 rounded-lg border border-[#0A1547]/10 bg-[#F8F9FD] p-4">
          <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-[#0A1547]/38">Related uploads</p>
          <div className="mt-3 grid gap-2">
            {relatedUploads.map((relatedUpload) => (
              <div key={relatedUpload.id} className="min-w-0 rounded-lg border border-[#0A1547]/10 bg-white px-3 py-2">
                <p className="truncate text-sm font-semibold text-[#0A1547]">
                  {formatNullable(relatedUpload.fileName)}
                </p>
                <p className="mt-1 truncate text-xs font-medium text-[#0A1547]/58">
                  {formatNullable(relatedUpload.toolName)}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {hasLegacyUploadOnly && (
        <p className="mt-4 rounded-xl border border-[#0A1547]/10 bg-white px-4 py-3 text-sm font-medium text-[#0A1547]/55">
          Related upload linked to this session.
        </p>
      )}

      {canUseCheckoutLink && (
        <div className="mt-4 rounded-lg border border-[#02ABE0]/20 bg-[#F8F9FD] p-4">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <p className="text-sm font-semibold text-[#0A1547]">Checkout link available</p>
            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={() => void handleCopy()}
                className="admin-focus inline-flex items-center gap-2 rounded-lg border border-[#0A1547]/10 bg-white px-4 py-2 text-sm font-semibold text-[#0A1547]/82 transition hover:border-[#A380F6]/50"
              >
                <Icon name="copy" size={15} />
                Copy Link
              </button>
              <a
                href={checkoutUrl}
                target="_blank"
                rel="noreferrer"
                className="admin-focus inline-flex items-center gap-2 rounded-lg bg-[#0A1547] px-4 py-2 text-sm font-bold text-white transition hover:bg-[#1A2460]"
              >
                <Icon name="link" size={15} />
                Open Link
              </a>
              {copyStatus && (
                <span className="text-sm font-bold text-[#0A1547]/58">{copyStatus}</span>
              )}
              {canExpire && (
                <button
                  type="button"
                  onClick={() => void handleExpire()}
                  disabled={expiring}
                  className="admin-focus rounded-lg border border-[#A380F6]/35 bg-white px-4 py-2 text-sm font-semibold text-[#0A1547]/82 transition hover:border-[#A380F6]/70 disabled:cursor-not-allowed disabled:opacity-55"
                >
                  {expiring ? "Expiring..." : "Expire link"}
                </button>
              )}
            </div>
          </div>
          <details className={quietDetailsClassName}>
            <summary className={quietSummaryClassName}>
              Technical details
            </summary>
            <p className="mt-3 break-all text-sm font-medium text-[#0A1547]/64">
              {checkoutUrl}
            </p>
          </details>
        </div>
      )}

      {!checkoutUrl && !paid && !expired && (
        <p className="mt-4 rounded-xl border border-[#0A1547]/10 bg-white px-4 py-3 text-sm font-medium text-[#0A1547]/50">
          Checkout link unavailable for older session.
        </p>
      )}

      {canExpire && !canUseCheckoutLink && (
        <div className="mt-4 rounded-lg border border-[#A380F6]/20 bg-[#F8F9FD] p-4">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <p className="text-sm font-medium text-[#0A1547]/62">This open checkout session can be expired manually.</p>
            <button
              type="button"
              onClick={() => void handleExpire()}
              disabled={expiring}
              className="admin-focus rounded-lg border border-[#A380F6]/35 bg-white px-4 py-2 text-sm font-semibold text-[#0A1547]/82 transition hover:border-[#A380F6]/70 disabled:cursor-not-allowed disabled:opacity-55"
            >
              {expiring ? "Expiring..." : "Expire link"}
            </button>
          </div>
        </div>
      )}

      {expired && (
        <p className="mt-4 rounded-xl border border-[#A380F6]/20 bg-white px-4 py-3 text-sm font-medium text-[#0A1547]/62">
          This checkout link expired {formatMountainDate(session.expiredAt)} and is no longer payable.
        </p>
      )}

      {expireError && (
        <p className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-700">
          {expireError}
        </p>
      )}

      <details className={quietDetailsClassName}>
        <summary className={quietSummaryClassName}>
          Technical details
        </summary>
        <dl className="mt-3 grid gap-3 text-sm md:grid-cols-2">
          <Detail label="Stripe session ID" value={session.stripeCheckoutSessionId} />
          <Detail label="Local session ID" value={session.id} />
          <Detail label="Offer name" value={session.offerName} />
          <Detail label="Billing mode" value={formatStructuredLabel(session.billingMode)} />
          <Detail label="Interval" value={formatStructuredLabel(session.interval)} />
          <Detail label="Monthly amount" value={session.monthlyAmount !== null && session.monthlyAmount !== undefined ? formatCurrency(session.monthlyAmount, session.currency) : null} />
          <Detail label="Months" value={session.contractMonths} />
          <Detail label="Subscription status" value={formatStatusLabel(session.subscriptionStatus)} />
          <Detail label="Latest payment status" value={session.latestPaymentStatus} />
          <Detail label="Current period start" value={formatMountainDate(session.subscriptionCurrentPeriodStart ?? null)} />
          <Detail label="Current period end" value={formatMountainDate(subscriptionCurrentPeriodEnd)} />
          <Detail label="Cancel at" value={formatMountainDate(subscriptionCancelAt)} />
          <Detail label="Cancel at period end" value={session.subscriptionCancelAtPeriodEnd} />
          <Detail label="Canceled at" value={formatMountainDate(session.subscriptionCanceledAt ?? null)} />
          <Detail label="Cancel schedule" value={formatStatusLabel(session.cancelScheduleStatus)} />
          <Detail label="Stripe subscription ID" value={session.stripeSubscriptionId} />
          <Detail label="Upload IDs" value={technicalUploadIds} />
          <Detail label="Submission ID" value={session.clientSubmissionId} />
          <Detail label="Mode" value={session.mode} />
          <Detail label="Live mode" value={session.livemode} />
          <Detail label="Expires" value={formatMountainDate(session.expiresAt)} />
          <Detail label="Expired" value={formatMountainDate(session.expiredAt)} />
          <Detail label="Updated" value={formatDate(session.updatedAt)} />
        </dl>
      </details>
    </article>
  );
}

function UploadCard({
  canWriteUploads,
  onVoid,
  upload,
}: {
  canWriteUploads: boolean;
  onVoid: () => void;
  upload: BillingUploadSummary;
}) {
  const paid = Boolean(upload.paid);
  const voided = Boolean(upload.voided);
  const canVoid = canWriteUploads && !paid && !voided;

  return (
    <article className={compactRowClassName}>
      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3">
        <div className="flex min-w-0 items-start gap-3">
          <IconBadge compact icon="lock" tone="secure" />
          <div className="min-w-0">
            <p className="line-clamp-2 break-words text-[13px] font-semibold leading-5 text-[#0A1547]">
              {formatNullable(upload.fileName)}
            </p>
            <p className="mt-1 truncate text-sm font-medium text-[#0A1547]/58">{formatNullable(upload.toolName)}</p>
          </div>
        </div>
        <div className="flex shrink-0 flex-wrap items-start justify-end gap-2">
          {voided && (
            <StatusPill className={`shrink-0 ${statusTone("voided")}`}>
              Voided
            </StatusPill>
          )}
          <StatusPill className={`shrink-0 ${statusTone(paid ? "paid" : "unpaid")}`}>
            {paid ? "Paid" : "Not paid"}
          </StatusPill>
          {canVoid && (
            <button
              type="button"
              onClick={onVoid}
              className="admin-focus rounded-lg border border-red-200 bg-white px-3 py-2 text-xs font-semibold text-red-700 transition hover:bg-red-50"
            >
              Void upload
            </button>
          )}
        </div>
      </div>
      {voided && (
        <div className="mt-3 rounded-lg border border-[#A380F6]/20 bg-[#F8F9FD] px-4 py-3 text-sm text-[#0A1547]/68">
          <p className="font-semibold text-[#0A1547]">Voided {formatDate(upload.voidedAt ?? null)}</p>
          {upload.voidReason && (
            <p className="mt-1 font-medium leading-6">Reason: {upload.voidReason}</p>
          )}
          {upload.voidedByAdminEmail && (
            <p className="mt-1 text-xs font-medium text-[#0A1547]/50">By {upload.voidedByAdminEmail}</p>
          )}
        </div>
      )}
      <dl className="mt-4 grid gap-3 text-sm md:grid-cols-2">
        <Detail label="Tool" value={upload.toolName} />
        <Detail label="Upload time" value={formatDate(upload.uploadTime)} />
      </dl>
      <details className={quietDetailsClassName}>
        <summary className={quietSummaryClassName}>
          Technical details
        </summary>
        <dl className="mt-3 grid gap-3 text-sm">
          <Detail label="Upload ID" value={upload.id} />
        </dl>
      </details>
    </article>
  );
}

function VoidUploadModal({
  onClose,
  onVoided,
  token,
  upload,
}: {
  onClose: () => void;
  onVoided: () => Promise<void>;
  token: string;
  upload: BillingUploadSummary;
}) {
  const [reason, setReason] = useState("");
  const [voiding, setVoiding] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmedReason = reason.trim();
    setError("");

    if (!trimmedReason) {
      setError("Enter a reason for voiding this upload.");
      return;
    }

    setVoiding(true);
    try {
      await voidAdminUpload(token, upload.id, { reason: trimmedReason });
      await onVoided();
    } catch (voidError) {
      setError(voidUploadErrorMessage(voidError));
      setVoiding(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0A1547]/45 p-4">
      <div
        aria-labelledby="void-upload-title"
        aria-modal="true"
        role="dialog"
        className="max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-2xl bg-white shadow-2xl"
      >
        <div className="flex items-start justify-between gap-4 border-b border-[#0A1547]/10 px-5 py-4">
          <div className="min-w-0">
            <p className="text-xs font-extrabold uppercase tracking-[0.18em] text-[#A380F6]">Uploads</p>
            <h3 id="void-upload-title" className="mt-1 text-lg font-black text-[#0A1547]">Void upload</h3>
            <p className="mt-1 max-w-xl text-sm font-medium leading-6 text-[#0A1547]/62">
              Voiding hides this upload from normal active workflows. It does not delete the row or storage object.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={voiding}
            className="admin-focus rounded-xl border border-[#0A1547]/10 bg-white px-4 py-2 text-sm font-extrabold text-[#0A1547] transition hover:border-[#A380F6]/60 disabled:cursor-not-allowed disabled:opacity-55"
          >
            Close
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5">
          <div className="rounded-2xl border border-[#0A1547]/10 bg-[#F8F9FD] p-4">
            <p className="truncate text-sm font-bold text-[#0A1547]">{formatNullable(upload.fileName)}</p>
            <p className="mt-1 text-sm font-medium text-[#0A1547]/58">{formatNullable(upload.toolName)}</p>
            <p className="mt-1 text-xs font-medium text-[#0A1547]/48">
              Uploaded {formatDate(upload.uploadTime)}
            </p>
          </div>

          <label className="mt-4 block">
            <span className="text-sm font-semibold text-[#0A1547]">
              Reason <span className="text-red-600">*</span>
            </span>
            <textarea
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              disabled={voiding}
              rows={4}
              maxLength={500}
              placeholder="Duplicate upload, wrong file, or client requested removal from normal views."
              className="admin-focus mt-2 w-full rounded-xl border border-[#0A1547]/10 bg-[#F8F9FD] px-4 py-3 text-sm font-medium leading-6 text-[#0A1547]"
            />
            <span className="mt-1 block text-xs font-medium text-[#0A1547]/45">
              Required for audit context. Paid uploads cannot be voided.
            </span>
          </label>

          {error && (
            <p className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-700">
              {error}
            </p>
          )}

          <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={onClose}
              disabled={voiding}
              className="admin-focus rounded-xl border border-[#0A1547]/10 bg-white px-4 py-2 text-sm font-extrabold text-[#0A1547] transition hover:border-[#A380F6]/60 disabled:cursor-not-allowed disabled:opacity-55"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={voiding || reason.trim().length === 0}
              className="admin-focus rounded-xl bg-red-600 px-4 py-2 text-sm font-extrabold text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-55"
            >
              {voiding ? "Voiding..." : "Void upload"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function voidUploadErrorMessage(error: unknown): string {
  if (error instanceof AdminApiError) {
    if (error.code === "paid_upload_cannot_be_voided") {
      return "Paid uploads cannot be voided.";
    }

    if (error.code === "paid_checkout_upload_cannot_be_voided") {
      return "Uploads linked to paid or completed checkout sessions cannot be voided.";
    }

    if (error.code === "voided_upload_cannot_be_used") {
      return "This upload has already been voided and cannot be used in active workflows.";
    }

    return error.message;
  }

  return "Upload could not be voided.";
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
    case "activity":
      return <path d="M4 12h4l2-7 4 14 2-7h4" />;
    case "archive":
      return (
        <>
          <path d="M4 7h16" />
          <path d="M6 7v12h12V7" />
          <path d="M9 11h6" />
          <path d="M5 4h14v3H5z" />
        </>
      );
    case "arrow":
      return (
        <>
          <path d="M19 12H5" />
          <path d="m12 19-7-7 7-7" />
        </>
      );
    case "check":
      return <path d="m5 12 4 4L19 6" />;
    case "clock":
      return (
        <>
          <circle cx="12" cy="12" r="8" />
          <path d="M12 8v5l3 2" />
        </>
      );
    case "copy":
      return (
        <>
          <rect height="13" rx="2" width="13" x="8" y="8" />
          <path d="M4 16c-1.1 0-2-.9-2-2V5c0-1.1.9-2 2-2h9c1.1 0 2 .9 2 2" />
        </>
      );
    case "credit":
      return (
        <>
          <rect height="14" rx="2" width="18" x="3" y="5" />
          <path d="M3 10h18" />
          <path d="M7 15h3" />
        </>
      );
    case "file":
      return (
        <>
          <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8Z" />
          <path d="M14 3v5h5" />
        </>
      );
    case "link":
      return (
        <>
          <path d="M10 13a5 5 0 0 0 7.1 0l1.4-1.4a5 5 0 0 0-7.1-7.1l-.9.9" />
          <path d="M14 11a5 5 0 0 0-7.1 0l-1.4 1.4a5 5 0 0 0 7.1 7.1l.9-.9" />
        </>
      );
    case "lock":
      return (
        <>
          <rect height="11" rx="2" width="16" x="4" y="10" />
          <path d="M8 10V7a4 4 0 0 1 8 0v3" />
        </>
      );
    case "pen":
      return (
        <>
          <path d="M12 20h9" />
          <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" />
        </>
      );
    case "users":
    default:
      return (
        <>
          <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
          <circle cx="9" cy="7" r="4" />
          <path d="M22 21v-2a4 4 0 0 0-3-3.9" />
          <path d="M16 3.1a4 4 0 0 1 0 7.8" />
        </>
      );
  }
}

function Detail({ label, value }: { label: string; value: string | number | boolean | null | undefined }) {
  return (
    <div className="min-w-0 max-w-full">
      <dt className="text-[11px] font-medium uppercase tracking-[0.12em] text-[#0A1547]/38">{label}</dt>
      <dd className="mt-1 max-w-full break-all font-medium text-[#0A1547]/72">{formatNullable(value)}</dd>
    </div>
  );
}
