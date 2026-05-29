import { useCallback, useEffect, useMemo, useState, type FormEvent, type ReactNode } from "react";
import { Link } from "wouter";
import { useAuth } from "@/auth/AuthProvider";
import { AdminApiError, createOfferPaymentLink, expireCheckoutSession, getAdminClients, getBillingOverview, getClientBillingDetail } from "@/lib/adminApi";
import type {
  AdminClient,
  BillingOverviewResponse,
  BillingOverviewStatus,
  BillingOverrideSummary,
  BillingUploadSummary,
  CheckoutSessionSummary,
  ClientBillingDetailResponse,
  OfferPaymentLinkOfferType,
  OfferPaymentLinkResponse,
  OneTimeOfferType,
} from "@/lib/types";

type BillingRecordFilter = "all" | "paid" | "open" | "expired" | "overrides";
type IconName = "check" | "clock" | "copy" | "credit" | "file" | "link" | "lock" | "search" | "users";
type IconTone = "clients" | "billing" | "subscription" | "success" | "warning" | "danger" | "neutral" | "lilac";
type OfferPreset = {
  amountCents: number;
  billingMode: "one_time" | "recurring";
  defaultContractMonths?: number;
  helper: string;
  interval?: "month";
  label: string;
  offerType: OfferPaymentLinkOfferType;
};

const billingRecordFilters: Array<{ icon: IconName; iconTone: IconTone; label: string; value: BillingRecordFilter }> = [
  { label: "Total Sessions", value: "all", icon: "credit", iconTone: "billing" },
  { label: "Paid", value: "paid", icon: "check", iconTone: "success" },
  { label: "Open", value: "open", icon: "link", iconTone: "billing" },
  { label: "Expired", value: "expired", icon: "clock", iconTone: "warning" },
  { label: "Overrides", value: "overrides", icon: "file", iconTone: "neutral" },
];
const offerPresets: OfferPreset[] = [
  {
    amountCents: 99500,
    billingMode: "one_time",
    helper: "One-time Practice Opportunity Review founder pricing.",
    label: "Practice Opportunity Review",
    offerType: "practice_opportunity_review",
  },
  {
    amountCents: 350000,
    billingMode: "one_time",
    helper: "One-time scoped sprint for production, collection, write-off, and conversion leakage.",
    label: "Revenue Leak Sprint",
    offerType: "revenue_leak_sprint",
  },
  {
    amountCents: 250000,
    billingMode: "one_time",
    helper: "One-time scoped sprint for claims, collections, documentation, and follow-up workflow.",
    label: "AR / Claims Cleanup Sprint",
    offerType: "ar_claims_cleanup_sprint",
  },
  {
    amountCents: 350000,
    billingMode: "one_time",
    helper: "One-time scoped sprint for lead flow, scheduling, follow-up, conversion, and patient experience friction.",
    label: "Growth + New Patient Conversion Sprint",
    offerType: "growth_new_patient_conversion_sprint",
  },
  {
    amountCents: 250000,
    billingMode: "recurring",
    defaultContractMonths: 3,
    helper: "Monthly retainer subscription.",
    interval: "month",
    label: "Operations Intelligence Partner",
    offerType: "operations_intelligence_partner",
  },
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
const fieldClassName = "admin-focus mt-2 h-11 w-full rounded-lg border border-[#0A1547]/10 bg-[#F8F9FD] px-4 text-sm font-medium text-[#0A1547] placeholder:text-[#0A1547]/38";
const textareaClassName = "admin-focus mt-2 w-full rounded-lg border border-[#0A1547]/10 bg-[#F8F9FD] px-4 py-3 text-sm font-medium text-[#0A1547] placeholder:text-[#0A1547]/38";

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

  if (normalized === "expired" || normalized === "canceled" || normalized === "incomplete_expired") {
    return "border-[#A380F6]/30 bg-[#A380F6]/12 text-[#0A1547]";
  }

  if (normalized === "needs_review" || normalized === "failed" || normalized === "past_due" || normalized === "incomplete") {
    return "border-red-200 bg-red-50 text-red-700";
  }

  return "border-[#0A1547]/10 bg-white text-[#0A1547]/70";
}

function clientHref(email: string | null): string {
  return `/clients/${encodeURIComponent(email || "")}`;
}

function statusForFilter(filter: BillingRecordFilter): BillingOverviewStatus {
  if (filter === "paid" || filter === "open" || filter === "expired") {
    return filter;
  }

  return "all";
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
    case "lilac":
    case "subscription":
      return "text-[#A380F6]";
    case "billing":
      return "text-[#02ABE0]";
    case "success":
      return "text-[#02D99D]";
    case "warning":
      return "text-[#F59E0B]";
    case "danger":
      return "text-[#EF4444]";
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

function centsToDollarInput(amount: number): string {
  return (amount / 100).toFixed(2).replace(/\.00$/, "");
}

function dollarsToCents(value: string): number | null {
  const trimmed = value.trim().replace(/[$,]/g, "");

  if (!/^\d+(\.\d{1,2})?$/.test(trimmed)) {
    return null;
  }

  const amount = Number(trimmed);
  if (!Number.isFinite(amount) || amount <= 0) {
    return null;
  }

  const cents = Math.round(amount * 100);
  return cents > 0 ? cents : null;
}

function offerTypeLabel(value: string | null | undefined): string {
  const preset = offerPresets.find((offer) => offer.offerType === value);
  if (preset) {
    return preset.label;
  }

  return formatNullable(value?.replace(/_/g, " "));
}

function billingModeLabel(value: string | null | undefined): string {
  if (value === "one_time") {
    return "One-time payment link";
  }
  if (value === "recurring") {
    return "Recurring";
  }

  return formatNullable(value);
}

function intervalLabel(value: string | null | undefined): string {
  if (value === "month") {
    return "Monthly";
  }

  return formatNullable(value);
}

export default function BillingPage() {
  const { permissions, session } = useAuth();
  const [overview, setOverview] = useState<BillingOverviewResponse | null>(null);
  const [recordFilter, setRecordFilter] = useState<BillingRecordFilter>("open");
  const [search, setSearch] = useState("");
  const [clientSearch, setClientSearch] = useState("");
  const [clientOptions, setClientOptions] = useState<AdminClient[]>([]);
  const [selectedClientEmail, setSelectedClientEmail] = useState("");
  const [selectedClientDetail, setSelectedClientDetail] = useState<ClientBillingDetailResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingClients, setLoadingClients] = useState(true);
  const [loadingClientDetail, setLoadingClientDetail] = useState(false);
  const [error, setError] = useState("");
  const [clientsError, setClientsError] = useState("");
  const [clientDetailError, setClientDetailError] = useState("");
  const [actionMessage, setActionMessage] = useState("");

  const token = session?.access_token || "";
  const canWriteBilling = permissions.canWriteBilling;
  const queryStatus = statusForFilter(recordFilter);

  const loadOverview = useCallback(async (
    signal?: AbortSignal,
    options: { showLoading?: boolean } = {},
  ) => {
    if (!token) {
      return;
    }

    if (options.showLoading !== false) {
      setLoading(true);
    }
    setError("");

    try {
      const response = await getBillingOverview(token, {
        status: queryStatus,
        search,
        limit: 10,
      }, signal);
      setOverview(response);
    } catch (overviewError) {
      if (overviewError instanceof DOMException && overviewError.name === "AbortError") {
        return;
      }

      if (overviewError instanceof AdminApiError) {
        setError(overviewError.message);
      } else {
        setError("Billing overview could not be loaded.");
      }
    } finally {
      if (!signal?.aborted && options.showLoading !== false) {
        setLoading(false);
      }
    }
  }, [queryStatus, search, token]);

  const loadClientOptions = useCallback(async (signal?: AbortSignal) => {
    if (!token) {
      return;
    }

    setLoadingClients(true);
    setClientsError("");

    try {
      const response = await getAdminClients(token, {
        search: clientSearch,
        limit: 8,
      }, signal);
      setClientOptions(response.items);
    } catch (clientError) {
      if (clientError instanceof DOMException && clientError.name === "AbortError") {
        return;
      }

      if (clientError instanceof AdminApiError) {
        setClientsError(clientError.message);
      } else {
        setClientsError("Clients could not be loaded.");
      }
    } finally {
      if (!signal?.aborted) {
        setLoadingClients(false);
      }
    }
  }, [clientSearch, token]);

  const loadSelectedClientDetail = useCallback(async (
    signal?: AbortSignal,
    options: { showLoading?: boolean } = {},
  ) => {
    if (!token || !selectedClientEmail) {
      return;
    }

    if (options.showLoading !== false) {
      setLoadingClientDetail(true);
    }
    setClientDetailError("");

    try {
      const response = await getClientBillingDetail(token, selectedClientEmail, signal, { uploadStatus: "active" });
      setSelectedClientDetail(response);
    } catch (detailError) {
      if (detailError instanceof DOMException && detailError.name === "AbortError") {
        return;
      }

      if (detailError instanceof AdminApiError) {
        setClientDetailError(detailError.message);
      } else {
        setClientDetailError("Client billing details could not be loaded.");
      }
    } finally {
      if (!signal?.aborted && options.showLoading !== false) {
        setLoadingClientDetail(false);
      }
    }
  }, [selectedClientEmail, token]);

  useEffect(() => {
    const controller = new AbortController();
    const timeout = window.setTimeout(() => {
      void loadOverview(controller.signal);
    }, 250);

    return () => {
      window.clearTimeout(timeout);
      controller.abort();
    };
  }, [loadOverview]);

  useEffect(() => {
    const controller = new AbortController();
    const timeout = window.setTimeout(() => {
      void loadClientOptions(controller.signal);
    }, 250);

    return () => {
      window.clearTimeout(timeout);
      controller.abort();
    };
  }, [loadClientOptions]);

  useEffect(() => {
    if (!selectedClientEmail) {
      setSelectedClientDetail(null);
      setClientDetailError("");
      setLoadingClientDetail(false);
      return;
    }

    setSelectedClientDetail(null);

    const controller = new AbortController();
    void loadSelectedClientDetail(controller.signal);

    return () => {
      controller.abort();
    };
  }, [loadSelectedClientDetail, selectedClientEmail]);

  const summary = overview?.summary;
  const selectedActiveUploads = useMemo(() => {
    return [...(selectedClientDetail?.uploads ?? [])]
      .filter((upload) => !upload.voided)
      .sort((left, right) => uploadTimeValue(right) - uploadTimeValue(left));
  }, [selectedClientDetail?.uploads]);
  const visibleCheckoutSessions = useMemo(() => {
    const sessions = overview?.checkoutSessions ?? [];

    if (recordFilter === "paid") {
      return sessions.filter(isPaidSession);
    }

    if (recordFilter === "open") {
      return sessions.filter(isOpenSession);
    }

    if (recordFilter === "expired") {
      return sessions.filter(isExpiredSession);
    }

    if (recordFilter === "overrides") {
      return [];
    }

    return sessions;
  }, [overview?.checkoutSessions, recordFilter]);
  const visibleOverrides = useMemo(() => (
    recordFilter === "overrides" ? overview?.billingOverrides ?? [] : []
  ), [overview?.billingOverrides, recordFilter]);
  const empty = useMemo(() => (
    !loading &&
    !error &&
    overview !== null &&
    visibleCheckoutSessions.length === 0 &&
    visibleOverrides.length === 0
  ), [error, loading, overview, visibleCheckoutSessions.length, visibleOverrides.length]);

  const handleSessionExpired = async () => {
    setActionMessage("Checkout link expired.");
    await loadOverview(undefined, { showLoading: false });
  };

  const handleSelectedClientCheckoutCreated = async () => {
    await loadSelectedClientDetail(undefined, { showLoading: false });

    if (overview) {
      await loadOverview(undefined, { showLoading: false });
    }
  };

  return (
    <div className="space-y-5">
      <section className={`${sectionClassName} px-5 py-4`}>
        <SectionHeader
          description="Create checkout links, inspect payment records, and manage active billing visibility."
          icon="credit"
          iconTone="billing"
          title="Billing"
        />
      </section>

      <section className="grid gap-3 md:grid-cols-5">
        {billingRecordFilters.map((filter) => (
          <MetricCard
            key={filter.value}
            active={recordFilter === filter.value}
            icon={filter.icon}
            iconTone={filter.iconTone}
            label={filter.label}
            onClick={() => setRecordFilter(filter.value)}
            value={
              filter.value === "all" ? summary?.checkoutSessionCount ?? 0 :
                filter.value === "paid" ? summary?.paidCheckoutSessionCount ?? 0 :
                  filter.value === "open" ? summary?.openCheckoutSessionCount ?? 0 :
                    filter.value === "expired" ? summary?.expiredCheckoutSessionCount ?? 0 :
                    summary?.manualOverrideCount ?? 0
            }
          />
        ))}
      </section>

      <section className={`${sectionClassName} p-5`}>
        <div className="grid gap-4 lg:grid-cols-[1fr_420px] lg:items-start">
          <SectionHeader
            description="Select a client before creating offer or upload-linked checkout links."
            icon="users"
            iconTone="clients"
            title="Payment workspace"
          />

          <label className="relative">
            <span className="text-[11px] font-medium uppercase tracking-[0.12em] text-[#0A1547]/38">Search client</span>
            <span className="pointer-events-none absolute left-3 top-[2.45rem] text-[#02ABE0]">
              <Icon name="search" size={17} />
            </span>
            <input
              type="search"
              value={clientSearch}
              onChange={(event) => setClientSearch(event.target.value)}
              placeholder="Search client email, name, office, phone"
              className="admin-focus mt-2 h-11 w-full rounded-lg border border-[#0A1547]/10 bg-[#F8F9FD] pl-10 pr-4 text-sm font-medium text-[#0A1547] placeholder:text-[#0A1547]/38"
            />
          </label>
        </div>

        {loadingClients && (
          <p className="mt-4 rounded-lg border border-[#0A1547]/10 bg-[#F8F9FD] px-4 py-3 text-sm font-medium text-[#0A1547]/54">
            Loading clients...
          </p>
        )}

        {clientsError && !loadingClients && (
          <p className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
            {clientsError}
          </p>
        )}

        {!loadingClients && !clientsError && (
          <div className="mt-4 grid gap-2">
            {clientOptions.length > 0 ? clientOptions.map((client) => {
              const active = selectedClientEmail === client.email;
              return (
                <button
                  key={client.email}
                  type="button"
                  onClick={() => setSelectedClientEmail(client.email)}
                  className={`admin-focus rounded-lg border px-4 py-3 text-left transition ${
                    active ? "border-[#A380F6]/55 bg-[#A380F6]/10" : "border-[#0A1547]/10 bg-white hover:border-[#A380F6]/35"
                  }`}
                >
                  <span className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                    <span className="flex min-w-0 items-start gap-3">
                      <IconBadge compact icon="users" tone="clients" />
                      <span className="min-w-0">
                        <span className="block break-all text-sm font-semibold text-[#0A1547]">{client.email}</span>
                        <span className="mt-1 block text-xs font-medium text-[#0A1547]/52">
                          {formatNullable(client.latestName)} / {formatNullable(client.latestOfficeName)}
                        </span>
                      </span>
                    </span>
                    <StatusPill className="shrink-0 border-[#0A1547]/10 bg-[#F8F9FD] text-[#0A1547]/58">
                      {client.uploadCount} uploads
                    </StatusPill>
                  </span>
                </button>
              );
            }) : (
              <p className="rounded-lg border border-[#0A1547]/10 bg-[#F8F9FD] px-4 py-3 text-sm font-medium text-[#0A1547]/54">
                No clients found. Refine the search to select a client before creating a payment link.
              </p>
            )}
          </div>
        )}
      </section>

      {!selectedClientEmail && (
        <OfferPaymentLinkPrompt />
      )}

      {selectedClientEmail && loadingClientDetail && (
        <div className={`${sectionClassName} p-8 text-center text-sm font-medium text-[#0A1547]/56`}>
          Loading selected client billing detail...
        </div>
      )}

      {selectedClientEmail && clientDetailError && !loadingClientDetail && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-5 text-sm font-semibold text-red-700">
          {clientDetailError}
        </div>
      )}

      {selectedClientDetail && !loadingClientDetail && !clientDetailError && (
        <>
          <SelectedClientCheckoutSummary detail={selectedClientDetail} uploadCount={selectedActiveUploads.length} />

          {canWriteBilling ? (
            <CreateOfferPaymentLinkCard
              key={`${selectedClientDetail.clientEmail}-offer`}
              clientEmail={selectedClientDetail.clientEmail}
              onCreated={handleSelectedClientCheckoutCreated}
              token={token}
              uploads={selectedActiveUploads}
            />
          ) : (
            <section className="rounded-lg border border-[#A380F6]/25 bg-[#A380F6]/10 p-5">
              <p className="text-sm font-semibold text-[#0A1547]">Read-only billing access</p>
              <p className="mt-1 text-sm font-medium leading-6 text-[#0A1547]/62">
                You can inspect billing records, but creating checkout links requires billing write permission.
              </p>
            </section>
          )}
        </>
      )}

      {actionMessage && (
        <p className="rounded-lg border border-[#02D99D]/25 bg-[#02D99D]/10 px-5 py-4 text-sm font-semibold text-[#0A1547]">
          {actionMessage}
        </p>
      )}

      <section className={`${sectionClassName} p-5`}>
        <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
          <div className="min-w-0">
            <SectionHeader
              description="Checkout sessions, payment visibility, and manual billing override records."
              icon="credit"
              iconTone="billing"
              title="Billing records"
            />
            {!canWriteBilling && (
              <p className="mt-3 text-sm font-medium text-[#0A1547]/58">
                Checkout creation and billing override actions are hidden or disabled unless your role includes billing write permission.
              </p>
            )}
          </div>

          <div className="flex flex-col gap-3 md:flex-row md:items-center">
            <label className="relative w-full md:w-80">
              <span className="sr-only">Search billing records</span>
              <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#02ABE0]">
                <Icon name="search" size={17} />
              </span>
              <input
                type="search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search client email or purpose"
                className="admin-focus h-11 w-full rounded-lg border border-[#0A1547]/10 bg-[#F8F9FD] pl-10 pr-4 text-sm font-medium text-[#0A1547] placeholder:text-[#0A1547]/38"
              />
            </label>
          </div>
        </div>
      </section>

      {loading && (
        <div className={`${sectionClassName} p-8 text-center text-sm font-medium text-[#0A1547]/56`}>
          Loading billing overview...
        </div>
      )}

      {error && !loading && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-5 text-sm font-semibold text-red-700">
          {error}
        </div>
      )}

      {empty && (
        <div className={`${sectionClassName} p-8 text-center`}>
          <h3 className="text-lg font-black text-[#0A1547]">No billing records found</h3>
          <p className="mt-2 text-sm font-medium text-[#0A1547]/56">
            Try another status filter or clear the search field.
          </p>
        </div>
      )}

      {overview && !loading && !error && !empty && (
        <section className="grid gap-5">
          {recordFilter !== "overrides" && (
            <Panel
              count={visibleCheckoutSessions.length}
              hasMore={overview.hasMore}
              title="Checkout Sessions"
              emptyText="No checkout sessions found."
            >
              {visibleCheckoutSessions.map((checkoutSession) => (
                <CheckoutSessionCard
                  key={checkoutSession.id}
                  canWriteBilling={canWriteBilling}
                  onExpired={handleSessionExpired}
                  session={checkoutSession}
                  token={token}
                />
              ))}
            </Panel>
          )}

          {recordFilter === "overrides" && (
            <Panel
              count={visibleOverrides.length}
              title="Manual Overrides"
              emptyText="No manual overrides found."
            >
              {visibleOverrides.map((override) => (
                <OverrideCard key={override.id} override={override} />
              ))}
            </Panel>
          )}
        </section>
      )}
    </div>
  );
}

function OfferPaymentLinkPrompt() {
  return (
    <section className={`${sectionClassName} p-5`}>
      <SectionHeader
        action={(
          <StatusPill className="border-[#0A1547]/10 bg-[#F8F9FD] text-[#0A1547]/58">
            One-time and recurring
          </StatusPill>
        )}
        description="Select a client before creating an offer or monthly retainer payment link."
        icon="link"
        iconTone="billing"
        title="Create offer payment link"
      />
    </section>
  );
}

function CreateOfferPaymentLinkCard({
  clientEmail,
  onCreated,
  token,
  uploads,
}: {
  clientEmail: string;
  onCreated: () => Promise<void>;
  token: string;
  uploads: BillingUploadSummary[];
}) {
  const [offerType, setOfferType] = useState<OfferPaymentLinkOfferType>("practice_opportunity_review");
  const selectedPreset = useMemo(
    () => offerPresets.find((offer) => offer.offerType === offerType) ?? offerPresets[0],
    [offerType],
  );
  const isRecurring = selectedPreset.billingMode === "recurring";
  const [amountDollars, setAmountDollars] = useState(centsToDollarInput(selectedPreset.amountCents));
  const [contractMonths, setContractMonths] = useState(String(selectedPreset.defaultContractMonths ?? 3));
  const [description, setDescription] = useState(selectedPreset.label);
  const [internalNote, setInternalNote] = useState("");
  const [selectedUploadIds, setSelectedUploadIds] = useState<string[]>([]);
  const [creating, setCreating] = useState(false);
  const [createdLink, setCreatedLink] = useState<OfferPaymentLinkResponse | null>(null);
  const [error, setError] = useState("");
  const [copyStatus, setCopyStatus] = useState("");
  const selectableUploads = useMemo(() => (
    uploads.filter((upload) => !upload.paid && !upload.voided)
  ), [uploads]);
  const selectableUploadIds = useMemo(() => (
    new Set(selectableUploads.map((upload) => upload.id))
  ), [selectableUploads]);
  const selectedSelectableUploadIds = useMemo(() => (
    selectedUploadIds.filter((uploadId) => selectableUploadIds.has(uploadId))
  ), [selectableUploadIds, selectedUploadIds]);

  useEffect(() => {
    setAmountDollars(centsToDollarInput(selectedPreset.amountCents));
    setContractMonths(String(selectedPreset.defaultContractMonths ?? 3));
    setDescription(selectedPreset.label);
    if (selectedPreset.billingMode === "recurring") {
      setSelectedUploadIds([]);
    }
    setCopyStatus("");
    setError("");
    setCreatedLink(null);
  }, [selectedPreset]);

  useEffect(() => {
    setSelectedUploadIds((current) => current.filter((uploadId) => selectableUploadIds.has(uploadId)));
  }, [selectableUploadIds]);

  const toggleUpload = (uploadId: string) => {
    if (!selectableUploadIds.has(uploadId)) {
      return;
    }

    setSelectedUploadIds((current) => (
      current.includes(uploadId)
        ? current.filter((selectedUploadId) => selectedUploadId !== uploadId)
        : [...current, uploadId]
    ));
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError("");
    setCopyStatus("");

    const cents = dollarsToCents(amountDollars);
    const trimmedDescription = description.trim() || selectedPreset.label;
    const trimmedInternalNote = internalNote.trim();
    const parsedContractMonths = Number(contractMonths);

    if (!cents) {
      setError("Enter a valid dollar amount greater than zero, using up to two decimal places.");
      return;
    }

    if (isRecurring && (!Number.isInteger(parsedContractMonths) || parsedContractMonths < 1 || parsedContractMonths > 24)) {
      setError("Enter a number of months from 1 to 24.");
      return;
    }

    setCreating(true);

    try {
      const response = await createOfferPaymentLink(
        token,
        isRecurring ? {
          clientEmail,
          offerType: "operations_intelligence_partner",
          offerName: selectedPreset.label,
          billingMode: "recurring",
          interval: "month",
          monthlyAmount: cents,
          contractMonths: parsedContractMonths,
          currency: "usd",
          description: trimmedDescription,
          ...(trimmedInternalNote ? { internalNote: trimmedInternalNote } : {}),
          successUrl: `${window.location.origin}/payment-success`,
          cancelUrl: `${window.location.origin}/payment-cancel`,
        } : {
          clientEmail,
          offerType: offerType as OneTimeOfferType,
          offerName: selectedPreset.label,
          amount: cents,
          currency: "usd",
          description: trimmedDescription,
          ...(trimmedInternalNote ? { internalNote: trimmedInternalNote } : {}),
          ...(selectedSelectableUploadIds.length > 0 ? { uploadIds: selectedSelectableUploadIds } : {}),
          successUrl: `${window.location.origin}/payment-success`,
          cancelUrl: `${window.location.origin}/payment-cancel`,
        },
      );

      setCreatedLink(response);
      await onCreated();
    } catch (paymentLinkError) {
      if (paymentLinkError instanceof AdminApiError) {
        setError(paymentLinkError.message);
      } else {
        setError("Offer payment link could not be created.");
      }
    } finally {
      setCreating(false);
    }
  };

  const handleCopy = async () => {
    if (!createdLink?.url) {
      return;
    }

    try {
      await navigator.clipboard.writeText(createdLink.url);
      setCopyStatus("Copied");
    } catch {
      setCopyStatus("Copy failed");
    }
  };

  return (
    <section className={`${sectionClassName} p-5`}>
      <SectionHeader
        action={(
          <StatusPill className="border-[#02D99D]/25 bg-[#02D99D]/10 text-[#0A1547]">
            Offer checkout link
          </StatusPill>
        )}
        description="Create one-time consulting offer links or monthly retainer checkout links."
        icon="link"
        iconTone={isRecurring ? "subscription" : "billing"}
        title="Create offer payment link"
      />

      <form onSubmit={handleSubmit} className="mt-5 space-y-4">
        <div className={`grid gap-4 ${isRecurring ? "lg:grid-cols-[minmax(16rem,1fr)_9rem_6.5rem_minmax(14rem,1fr)]" : "lg:grid-cols-[1fr_0.38fr_1fr]"}`}>
          <label className="block">
            <span className="text-sm font-semibold text-[#0A1547]">Offer</span>
            <select
              value={offerType}
              onChange={(event) => setOfferType(event.target.value as OfferPaymentLinkOfferType)}
              disabled={creating}
              className={fieldClassName}
            >
              {offerPresets.map((offer) => (
                <option key={offer.offerType} value={offer.offerType}>
                  {offer.label}
                </option>
              ))}
            </select>
            <span className="mt-2 block text-xs font-medium leading-5 text-[#0A1547]/50">
              {selectedPreset.helper}
            </span>
          </label>

          <label className="block">
            <span className="text-sm font-semibold text-[#0A1547]">{isRecurring ? "Monthly amount" : "Amount"}</span>
            <input
              type="text"
              inputMode="decimal"
              value={amountDollars}
              onChange={(event) => setAmountDollars(event.target.value)}
              disabled={creating}
              className={fieldClassName}
            />
            <span className="mt-2 block text-xs font-medium text-[#0A1547]/50">
              {isRecurring ? "USD / month" : "USD / one-time"}
            </span>
          </label>

          {isRecurring && (
            <label className="block">
              <span className="text-sm font-semibold text-[#0A1547]">Months</span>
              <input
                type="number"
                min={1}
                max={24}
                step={1}
                value={contractMonths}
                onChange={(event) => setContractMonths(event.target.value)}
                disabled={creating}
                className={fieldClassName}
              />
              <span className="mt-2 block text-xs font-medium text-[#0A1547]/50">1-24 months</span>
            </label>
          )}

          <label className="block">
            <span className="text-sm font-semibold text-[#0A1547]">Description</span>
            <input
              type="text"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              disabled={creating}
              className={fieldClassName}
            />
          </label>
        </div>

        <label className="block">
          <span className="text-sm font-semibold text-[#0A1547]">Internal note</span>
          <textarea
            value={internalNote}
            onChange={(event) => setInternalNote(event.target.value)}
            disabled={creating}
            rows={3}
            placeholder="Optional admin-only context for this offer link."
            className={textareaClassName}
          />
        </label>

        {isRecurring ? (
          <div className="rounded-lg border border-[#A380F6]/20 bg-[#A380F6]/10 p-4">
            <div className="flex items-start gap-3">
              <IconBadge compact icon="credit" tone="subscription" />
              <div>
                <p className="text-sm font-semibold text-[#0A1547]">Monthly retainer</p>
                <p className="mt-1 text-sm font-medium leading-6 text-[#0A1547]/62">
                  Creates a monthly subscription checkout link. The backend tracks the selected term and attempts to schedule cancellation at the end of the term.
                </p>
              </div>
            </div>
            <p className="mt-3 text-xs font-medium text-[#0A1547]/52">
              Upload linking is not available for recurring retainers.
            </p>
          </div>
        ) : (
          <div className="rounded-lg border border-[#0A1547]/10 bg-[#F8F9FD] p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="flex min-w-0 items-start gap-3">
                <IconBadge compact icon="file" tone="neutral" />
                <div>
                  <p className="text-sm font-semibold text-[#0A1547]">Optional upload linking</p>
                  <p className="mt-1 text-sm font-medium leading-6 text-[#0A1547]/56">
                    Leave uploads unchecked for standalone offer payments. Paid or voided uploads cannot be selected.
                  </p>
                </div>
              </div>
              <StatusPill className="border-[#0A1547]/10 bg-white text-[#0A1547]/58">
                {selectedSelectableUploadIds.length} selected
              </StatusPill>
            </div>

            <div className="mt-3 grid gap-2">
              {selectableUploads.length > 0 ? selectableUploads.map((upload) => (
                <label
                  key={upload.id}
                  className="flex cursor-pointer flex-col gap-2 rounded-lg border border-[#0A1547]/10 bg-white px-4 py-3 text-sm transition hover:border-[#A380F6]/35 md:flex-row md:items-center md:justify-between"
                >
                  <span className="min-w-0">
                    <span className="block break-words font-semibold text-[#0A1547]">{formatNullable(upload.fileName)}</span>
                    <span className="mt-1 block text-xs font-medium text-[#0A1547]/52">
                      {formatNullable(upload.toolName)} / {formatDate(upload.uploadTime)}
                    </span>
                  </span>
                  <span className="flex shrink-0 items-center gap-2 text-xs font-semibold text-[#0A1547]/62">
                    <input
                      type="checkbox"
                      checked={selectedSelectableUploadIds.includes(upload.id)}
                      onChange={() => toggleUpload(upload.id)}
                      disabled={creating}
                      className="h-4 w-4 rounded border-[#0A1547]/20 text-[#A380F6]"
                    />
                    Link upload
                  </span>
                </label>
              )) : (
                <p className="rounded-lg border border-[#0A1547]/10 bg-white px-4 py-3 text-sm font-medium text-[#0A1547]/54">
                  No unpaid active uploads are available for optional linking.
                </p>
              )}
            </div>
          </div>
        )}

        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <p className="text-xs font-medium leading-5 text-[#0A1547]/50">
            This creates a Stripe Checkout link only. It does not send email, update GHL, deliver reports, or mark uploads paid from the dashboard.
          </p>
          <button
            type="submit"
            disabled={creating}
            className="admin-focus rounded-lg bg-[#A380F6] px-5 py-3 text-sm font-bold text-white shadow-lg shadow-[#A380F6]/20 transition hover:bg-[#906cf2] disabled:opacity-60"
          >
            {creating ? "Creating..." : "Create offer link"}
          </button>
        </div>
      </form>

      {error && (
        <p className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
          {error}
        </p>
      )}

      {createdLink?.url && (
        <div className="mt-5 rounded-lg border border-[#02D99D]/25 bg-[#02D99D]/10 p-4">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="flex min-w-0 items-start gap-3">
              <IconBadge compact icon="check" tone="success" />
              <div>
                <p className="text-sm font-semibold text-[#0A1547]">Offer payment link created.</p>
                <p className="mt-1 max-w-xl text-sm font-medium text-[#0A1547]/62">
                  {offerTypeLabel(createdLink.offerType)} / {billingModeLabel(createdLink.billingMode)}
                  {createdLink.billingMode === "recurring" ? ` / ${intervalLabel(createdLink.interval)} / ${formatNullable(createdLink.contractMonths ?? null)} months` : ""}
                  {" / "}Expires {formatMountainDate(createdLink.expiresAt ?? null)}
                </p>
                <p className="mt-1 text-xs font-medium text-[#0A1547]/52">
                  Status: {formatNullable(createdLink.status)} / Payment: {formatNullable(createdLink.paymentStatus)}
                </p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={() => void handleCopy()}
                className="admin-focus inline-flex items-center gap-2 rounded-lg border border-[#0A1547]/10 bg-white px-4 py-2 text-sm font-semibold text-[#0A1547]/82 transition hover:border-[#A380F6]/50"
              >
                <Icon name="copy" size={15} />
                Copy link
              </button>
              <a
                href={createdLink.url}
                target="_blank"
                rel="noreferrer"
                className="admin-focus inline-flex items-center gap-2 rounded-lg bg-[#0A1547] px-4 py-2 text-sm font-bold text-white transition hover:bg-[#1A2460]"
              >
                <Icon name="link" size={15} />
                Open link
              </a>
              {copyStatus && (
                <span className="text-sm font-bold text-[#0A1547]/58">{copyStatus}</span>
              )}
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

function SelectedClientCheckoutSummary({
  detail,
  uploadCount,
}: {
  detail: ClientBillingDetailResponse;
  uploadCount: number;
}) {
  const profile = detail.clientProfile;

  return (
    <section className={`${sectionClassName} p-5`}>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex min-w-0 items-start gap-3">
          <IconBadge icon="users" tone="clients" />
          <div className="min-w-0">
            <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-[#0A1547]/38">Selected client</p>
            <Link
              href={clientHref(detail.clientEmail)}
              className="admin-focus mt-1 block break-all text-lg font-black text-[#0A1547] underline decoration-[#A380F6]/35 underline-offset-4 transition hover:text-[#1A2460]"
            >
              {detail.clientEmail}
            </Link>
            <p className="mt-1 text-sm font-medium text-[#0A1547]/54">
              Current billing workspace for this client.
            </p>
          </div>
        </div>
        <StatusPill className="border-[#02ABE0]/20 bg-[#02ABE0]/10 text-[#0A1547]">
          Billing workspace
        </StatusPill>
      </div>

      <dl className="mt-5 grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-4">
        <Detail label="Client name" value={profile.name} />
        <Detail label="Office" value={profile.officeName} />
        <Detail label="Selectable active uploads" value={uploadCount} />
        <Detail label="Stripe customer" value={detail.customer?.stripeCustomerId || null} />
      </dl>
    </section>
  );
}

function MetricCard({
  active,
  icon,
  iconTone,
  label,
  onClick,
  value,
}: {
  active: boolean;
  icon: IconName;
  iconTone: IconTone;
  label: string;
  onClick: () => void;
  value: string | number;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`admin-focus rounded-lg border border-[#0A1547]/10 bg-white p-4 text-left shadow-[0_10px_24px_rgba(10,21,71,0.04)] transition ${
        active ? "border-[#A380F6]/65 ring-2 ring-[#A380F6]/20" : "hover:border-[#02ABE0]/35"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="break-words text-2xl font-black leading-none text-[#0A1547]">{value}</p>
          <p className="mt-2 text-[11px] font-medium uppercase tracking-[0.12em] text-[#0A1547]/40">{label}</p>
        </div>
        <IconBadge compact icon={icon} tone={iconTone} />
      </div>
    </button>
  );
}

function Panel({
  children,
  count,
  emptyText,
  hasMore,
  title,
}: {
  children: ReactNode[];
  count: number;
  emptyText: string;
  hasMore?: boolean;
  title: string;
}) {
  return (
    <section className={`${sectionClassName} p-5`}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex min-w-0 items-start gap-3">
          <IconBadge icon={title === "Manual Overrides" ? "file" : "credit"} tone={title === "Manual Overrides" ? "neutral" : "billing"} />
          <div>
            <h3 className="text-lg font-black text-[#0A1547]">{title}</h3>
            {hasMore && (
              <p className="mt-1 text-sm font-medium text-[#0A1547]/56">
                Showing the first {count} records. Narrow the search to refine the list.
              </p>
            )}
          </div>
        </div>
        <StatusPill className="border-[#0A1547]/10 bg-[#F8F9FD] text-[#0A1547]/58">
          {count}
        </StatusPill>
      </div>
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
}: {
  canWriteBilling: boolean;
  onExpired: () => Promise<void>;
  session: CheckoutSessionSummary;
  token: string;
}) {
  const [copyStatus, setCopyStatus] = useState("");
  const [expiring, setExpiring] = useState(false);
  const [expireError, setExpireError] = useState("");
  const checkoutUrl = session.checkoutUrl?.trim() || "";
  const paid = isPaidSession(session);
  const expired = isExpiredSession(session);
  const clientEmail = session.clientEmail || "";
  const offerName = session.offerName || "";
  const isOfferSession = Boolean(offerName || session.offerType || session.billingMode);
  const isRecurringSession = session.billingMode === "recurring";
  const subscriptionCheckedOut = isCheckedOutRecurringSession(session);
  const canUseCheckoutLink = checkoutUrl !== "" && !paid && !expired && !subscriptionCheckedOut;
  const canExpire = canWriteBilling && isOpenSession(session) && !subscriptionCheckedOut;
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
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-3">
          <IconBadge compact icon={isRecurringSession ? "credit" : "link"} tone={isRecurringSession ? "subscription" : "billing"} />
          <div className="min-w-0">
            {clientEmail ? (
              <Link
                href={clientHref(clientEmail)}
                className="admin-focus break-all text-sm font-semibold text-[#0A1547] underline decoration-[#A380F6]/40 underline-offset-4 transition hover:text-[#1A2460]"
              >
                {clientEmail}
              </Link>
            ) : (
              <p className="text-sm font-semibold text-[#0A1547]">No client email</p>
            )}
            <p className="mt-2 text-sm font-medium text-[#0A1547]/62">
              {isOfferSession ? formatNullable(offerName || offerTypeLabel(session.offerType)) : formatNullable(session.purpose)}
            </p>
            {isOfferSession && (
              <div className="mt-2 flex flex-wrap gap-2">
                {isRecurringSession ? (
                  <>
                    <StatusPill className="border-[#02ABE0]/25 bg-white text-[#0A1547]/70">
                      Monthly retainer
                    </StatusPill>
                    {session.contractMonths ? (
                      <StatusPill className="border-[#A380F6]/25 bg-white text-[#0A1547]/70">
                        {session.contractMonths} months
                      </StatusPill>
                    ) : null}
                  </>
                ) : (
                  <>
                    <StatusPill className="border-[#A380F6]/25 bg-white text-[#0A1547]/70">
                      {offerTypeLabel(session.offerType)}
                    </StatusPill>
                    <StatusPill className="border-[#02D99D]/25 bg-white text-[#0A1547]/70">
                      {billingModeLabel(session.billingMode)}
                    </StatusPill>
                  </>
                )}
              </div>
            )}
            <p className="mt-1 text-xs font-medium text-[#0A1547]/52">
              {formatDate(session.createdAt)} / {amountLabel}
            </p>
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

      {subscriptionCheckedOut && (
        <div className="mt-4 rounded-lg border border-[#02D99D]/20 bg-[#F8F9FD] p-4">
          <div className="flex items-start gap-3">
            <IconBadge compact icon="check" tone="success" />
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
        </div>
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
                <span className="text-sm font-medium text-[#0A1547]/58">{copyStatus}</span>
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
        </div>
      )}

      {!checkoutUrl && !paid && !expired && (
        <p className="mt-4 rounded-lg border border-[#0A1547]/10 bg-[#F8F9FD] px-4 py-3 text-sm font-medium text-[#0A1547]/50">
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
        <p className="mt-4 rounded-lg border border-[#A380F6]/20 bg-[#F8F9FD] px-4 py-3 text-sm font-medium text-[#0A1547]/62">
          This checkout link expired {formatMountainDate(session.expiredAt)} and is no longer payable.
        </p>
      )}

      {expireError && (
        <p className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
          {expireError}
        </p>
      )}

      <details className={quietDetailsClassName}>
        <summary className={quietSummaryClassName}>
          Technical details
        </summary>
        <dl className="mt-3 grid gap-3 text-sm md:grid-cols-2">
          <Detail label="Stripe session ID" value={session.stripeCheckoutSessionId} />
          <Detail label="Internal session ID" value={session.id} />
          <Detail label="Offer name" value={session.offerName} />
          <Detail label="Offer type" value={offerTypeLabel(session.offerType)} />
          <Detail label="Billing mode" value={billingModeLabel(session.billingMode)} />
          <Detail label="Interval" value={intervalLabel(session.interval)} />
          <Detail label="Monthly amount" value={session.monthlyAmount !== null && session.monthlyAmount !== undefined ? formatCurrency(session.monthlyAmount, session.currency) : null} />
          <Detail label="Number of months" value={session.contractMonths} />
          <Detail label="Subscription status" value={session.subscriptionStatus} />
          <Detail label="Latest payment status" value={session.latestPaymentStatus} />
          <Detail label="Current period start" value={formatMountainDate(session.subscriptionCurrentPeriodStart ?? null)} />
          <Detail label="Current period end" value={formatMountainDate(subscriptionCurrentPeriodEnd)} />
          <Detail label="Cancel at" value={formatMountainDate(subscriptionCancelAt)} />
          <Detail label="Cancel at period end" value={session.subscriptionCancelAtPeriodEnd} />
          <Detail label="Canceled at" value={formatMountainDate(session.subscriptionCanceledAt ?? null)} />
          <Detail label="Cancel schedule" value={formatStatusLabel(session.cancelScheduleStatus)} />
          <Detail label="Stripe subscription ID" value={session.stripeSubscriptionId} />
          <Detail label="Internal note" value={session.internalNote} />
          <Detail label="Upload ID" value={session.uploadId} />
          <Detail label="Submission ID" value={session.clientSubmissionId} />
          <Detail label="Checkout URL" value={checkoutUrl || null} />
          <Detail label="Expires" value={formatMountainDate(session.expiresAt)} />
          <Detail label="Expired" value={formatMountainDate(session.expiredAt)} />
          <Detail label="Updated" value={formatDate(session.updatedAt)} />
        </dl>
      </details>
    </article>
  );
}

function OverrideCard({ override }: { override: BillingOverrideSummary }) {
  const clientEmail = override.clientEmail || "";

  return (
    <article className={compactRowClassName}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-3">
          <IconBadge compact icon="file" tone="neutral" />
          <div className="min-w-0">
            {clientEmail ? (
              <Link
                href={clientHref(clientEmail)}
                className="admin-focus break-all text-sm font-semibold text-[#0A1547] underline decoration-[#A380F6]/40 underline-offset-4 transition hover:text-[#1A2460]"
              >
                {clientEmail}
              </Link>
            ) : (
              <p className="text-sm font-semibold text-[#0A1547]">No client email</p>
            )}
            <p className="mt-2 text-sm font-medium text-[#0A1547]/62">{formatNullable(override.targetType)}</p>
            <p className="mt-1 text-xs font-medium text-[#0A1547]/52">{formatDate(override.createdAt)}</p>
          </div>
        </div>
        <StatusPill className={statusTone(override.overridePaid ? "paid" : "unpaid")}>
          {override.overridePaid ? "Override paid" : "Override unpaid"}
        </StatusPill>
      </div>

      <p className="mt-4 text-sm font-medium leading-6 text-[#0A1547]/68">
        {formatNullable(override.reason)}
      </p>

      <details className={quietDetailsClassName}>
        <summary className={quietSummaryClassName}>
          Technical details
        </summary>
        <dl className="mt-3 grid gap-3 text-sm md:grid-cols-2">
          <Detail label="Override ID" value={override.id} />
          <Detail label="Target ID" value={override.targetId} />
          <Detail label="Admin user ID" value={override.adminUserId} />
        </dl>
      </details>
    </article>
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

function iconPath(name: IconName) {
  switch (name) {
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
    case "search":
      return (
        <>
          <circle cx="11" cy="11" r="7" />
          <path d="m16 16 4 4" />
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
    <div className="min-w-0">
      <dt className="text-[11px] font-medium uppercase tracking-[0.12em] text-[#0A1547]/38">{label}</dt>
      <dd className="mt-1 break-words font-medium text-[#0A1547]/72">{formatNullable(value)}</dd>
    </div>
  );
}
