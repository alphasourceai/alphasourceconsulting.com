import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { Link } from "wouter";
import { useAuth } from "@/auth/AuthProvider";
import { AdminApiError, getBillingOverview } from "@/lib/adminApi";
import type {
  BillingOverviewResponse,
  BillingOverviewStatus,
  BillingOverrideSummary,
  CheckoutSessionSummary,
} from "@/lib/types";

type BillingRecordFilter = "all" | "paid" | "open" | "overrides" | "needs_review";

const billingRecordFilters: Array<{ accent: string; label: string; value: BillingRecordFilter }> = [
  { label: "Total Sessions", value: "all", accent: "#A380F6" },
  { label: "Paid", value: "paid", accent: "#02D99D" },
  { label: "Open", value: "open", accent: "#02ABE0" },
  { label: "Overrides", value: "overrides", accent: "#1A2460" },
  { label: "Needs Review", value: "needs_review", accent: "#A380F6" },
];

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

function statusTone(status: string | null): string {
  const normalized = status?.toLowerCase();

  if (normalized === "paid" || normalized === "complete" || normalized === "completed") {
    return "border-[#02D99D]/30 bg-[#02D99D]/12 text-[#0A1547]";
  }

  if (normalized === "open" || normalized === "unpaid") {
    return "border-[#02ABE0]/25 bg-[#02ABE0]/10 text-[#0A1547]";
  }

  if (normalized === "needs_review" || normalized === "failed") {
    return "border-red-200 bg-red-50 text-red-700";
  }

  return "border-[#0A1547]/10 bg-white text-[#0A1547]/70";
}

function clientHref(email: string | null): string {
  return `/clients/${encodeURIComponent(email || "")}`;
}

function statusForFilter(filter: BillingRecordFilter): BillingOverviewStatus {
  if (filter === "paid" || filter === "open") {
    return filter;
  }

  return "all";
}

function isPaidSession(session: CheckoutSessionSummary): boolean {
  const status = session.status?.toLowerCase();
  const paymentStatus = session.paymentStatus?.toLowerCase();
  return status === "paid" || status === "complete" || status === "completed" || paymentStatus === "paid";
}

function isOpenSession(session: CheckoutSessionSummary): boolean {
  const status = session.status?.toLowerCase();
  const paymentStatus = session.paymentStatus?.toLowerCase();
  return status === "open" || paymentStatus === "open" || paymentStatus === "unpaid";
}

function needsReviewSession(session: CheckoutSessionSummary): boolean {
  const status = session.status?.toLowerCase();
  const paymentStatus = session.paymentStatus?.toLowerCase();
  return status === "needs_review" || status === "failed" || paymentStatus === "needs_review" || paymentStatus === "failed";
}

export default function BillingPage() {
  const { permissions, session } = useAuth();
  const [overview, setOverview] = useState<BillingOverviewResponse | null>(null);
  const [recordFilter, setRecordFilter] = useState<BillingRecordFilter>("open");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const token = session?.access_token || "";
  const canWriteBilling = permissions.canWriteBilling;
  const queryStatus = statusForFilter(recordFilter);

  const loadOverview = useCallback(async (signal?: AbortSignal) => {
    if (!token) {
      return;
    }

    setLoading(true);
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
      if (!signal?.aborted) {
        setLoading(false);
      }
    }
  }, [queryStatus, search, token]);

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

  const summary = overview?.summary;
  const visibleCheckoutSessions = useMemo(() => {
    const sessions = overview?.checkoutSessions ?? [];

    if (recordFilter === "paid") {
      return sessions.filter(isPaidSession);
    }

    if (recordFilter === "open") {
      return sessions.filter(isOpenSession);
    }

    if (recordFilter === "needs_review") {
      return sessions.filter(needsReviewSession);
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

  return (
    <div className="space-y-6">
      <section className="grid gap-4 md:grid-cols-5">
        {billingRecordFilters.map((filter) => (
          <MetricCard
            key={filter.value}
            active={recordFilter === filter.value}
            accent={filter.accent}
            label={filter.label}
            onClick={() => setRecordFilter(filter.value)}
            value={
              filter.value === "all" ? summary?.checkoutSessionCount ?? 0 :
                filter.value === "paid" ? summary?.paidCheckoutSessionCount ?? 0 :
                  filter.value === "open" ? summary?.openCheckoutSessionCount ?? 0 :
                    filter.value === "overrides" ? summary?.manualOverrideCount ?? 0 :
                      summary?.needsReviewEventCount ?? 0
            }
          />
        ))}
      </section>

      <section className="admin-card p-5">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div>
            <h2 className="text-xl font-black text-[#0A1547]">Billing</h2>
            <p className="mt-1 max-w-2xl text-sm font-medium leading-6 text-[#0A1547]/60">
              Manage checkout sessions, payment visibility, and manual billing override records.
            </p>
            <p className="mt-2 max-w-2xl text-xs font-medium leading-5 text-[#0A1547]/52">
              Manual overrides are admin-entered billing status notes used when Stripe or session data alone does not tell the full payment or report-handling story.
            </p>
            {!canWriteBilling && (
              <p className="mt-2 text-sm font-medium text-[#0A1547]/58">
                Checkout creation and billing override actions are hidden or disabled unless your role includes billing write permission.
              </p>
            )}
          </div>

          <div className="flex flex-col gap-3 md:flex-row md:items-center">
            <label className="w-full md:w-80">
              <span className="sr-only">Search billing records</span>
              <input
                type="search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search client email or purpose"
                className="admin-focus w-full rounded-xl border border-[#0A1547]/10 bg-[#F8F9FD] px-4 py-3 text-sm font-medium text-[#0A1547] placeholder:text-[#0A1547]/38"
              />
            </label>
          </div>
        </div>
      </section>

      {loading && (
        <div className="admin-card p-8 text-center text-sm font-medium text-[#0A1547]/60">
          Loading billing overview...
        </div>
      )}

      {error && !loading && (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-5 text-sm font-bold text-red-700">
          {error}
        </div>
      )}

      {empty && (
        <div className="admin-card p-8 text-center">
          <h3 className="text-lg font-black text-[#0A1547]">No billing records found</h3>
          <p className="mt-2 text-sm font-medium text-[#0A1547]/60">
            Try another status filter or clear the search field.
          </p>
        </div>
      )}

      {overview && !loading && !error && !empty && (
        <section className="grid gap-6">
          {recordFilter !== "overrides" && (
            <Panel
              count={visibleCheckoutSessions.length}
              hasMore={overview.hasMore}
              title="Checkout Sessions"
              emptyText="No checkout sessions found."
            >
              {visibleCheckoutSessions.map((checkoutSession) => (
                <CheckoutSessionCard key={checkoutSession.id} session={checkoutSession} />
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

function MetricCard({
  accent,
  active,
  label,
  onClick,
  value,
}: {
  accent: string;
  active: boolean;
  label: string;
  onClick: () => void;
  value: string | number;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`admin-focus admin-card p-5 text-left transition ${
        active ? "border-[#A380F6]/65 ring-2 ring-[#A380F6]/20" : "hover:border-[#02ABE0]/35"
      }`}
    >
      <div className="h-1.5 w-12 rounded-full" style={{ backgroundColor: accent }} />
      <p className="mt-4 text-xs font-extrabold uppercase tracking-[0.16em] text-[#0A1547]/45">{label}</p>
      <p className="mt-2 break-words text-2xl font-black text-[#0A1547]">{value}</p>
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
    <section className="admin-card p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-lg font-black text-[#0A1547]">{title}</h3>
          {hasMore && (
            <p className="mt-1 text-sm font-medium text-[#0A1547]/56">
              Showing the first {count} records. Narrow the search to refine the list.
            </p>
          )}
        </div>
        <span className="rounded-full border border-[#0A1547]/10 bg-[#F8F9FD] px-3 py-1 text-xs font-extrabold text-[#0A1547]/65">
          {count}
        </span>
      </div>
      <div className="mt-4 grid gap-3">
        {children.length > 0 ? children : (
          <p className="rounded-2xl bg-[#F8F9FD] p-4 text-sm font-medium text-[#0A1547]/56">
            {emptyText}
          </p>
        )}
      </div>
    </section>
  );
}

function CheckoutSessionCard({ session }: { session: CheckoutSessionSummary }) {
  const [copyStatus, setCopyStatus] = useState("");
  const checkoutUrl = session.checkoutUrl?.trim() || "";
  const paymentStatus = session.paymentStatus?.toLowerCase() || "";
  const canUseCheckoutLink = checkoutUrl !== "" && paymentStatus !== "paid";
  const clientEmail = session.clientEmail || "";

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

  return (
    <article className="rounded-2xl border border-[#0A1547]/10 bg-[#F8F9FD] p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          {clientEmail ? (
            <Link
              href={clientHref(clientEmail)}
              className="admin-focus break-all text-sm font-black text-[#0A1547] underline decoration-[#A380F6]/40 underline-offset-4 transition hover:text-[#1A2460]"
            >
              {clientEmail}
            </Link>
          ) : (
            <p className="text-sm font-black text-[#0A1547]">No client email</p>
          )}
          <p className="mt-2 text-sm font-medium text-[#0A1547]/62">{formatNullable(session.purpose)}</p>
          <p className="mt-1 text-xs font-medium text-[#0A1547]/52">
            {formatDate(session.createdAt)} / {formatCurrency(session.amountTotal, session.currency)}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <span className={`rounded-full border px-3 py-1 text-xs font-extrabold ${statusTone(session.status)}`}>
            {formatNullable(session.status)}
          </span>
          <span className={`rounded-full border px-3 py-1 text-xs font-extrabold ${statusTone(session.paymentStatus)}`}>
            {formatNullable(session.paymentStatus)}
          </span>
        </div>
      </div>

      {canUseCheckoutLink && (
        <div className="mt-4 rounded-2xl border border-[#02ABE0]/20 bg-white p-4">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <p className="text-sm font-semibold text-[#0A1547]">Checkout link available</p>
            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={() => void handleCopy()}
                className="admin-focus rounded-xl border border-[#0A1547]/10 bg-white px-4 py-2 text-sm font-extrabold text-[#0A1547] transition hover:border-[#A380F6]/50"
              >
                Copy Link
              </button>
              <a
                href={checkoutUrl}
                target="_blank"
                rel="noreferrer"
                className="admin-focus rounded-xl bg-[#0A1547] px-4 py-2 text-sm font-extrabold text-white transition hover:bg-[#1A2460]"
              >
                Open Link
              </a>
              {copyStatus && (
                <span className="text-sm font-medium text-[#0A1547]/58">{copyStatus}</span>
              )}
            </div>
          </div>
        </div>
      )}

      {!checkoutUrl && paymentStatus !== "paid" && (
        <p className="mt-4 rounded-xl border border-[#0A1547]/10 bg-white px-4 py-3 text-sm font-medium text-[#0A1547]/50">
          Checkout link unavailable for older session.
        </p>
      )}

      <details className="mt-4 rounded-xl border border-[#0A1547]/10 bg-white px-4 py-3">
        <summary className="cursor-pointer text-xs font-extrabold uppercase tracking-[0.16em] text-[#0A1547]/50">
          Technical details
        </summary>
        <dl className="mt-3 grid gap-3 text-sm md:grid-cols-2">
          <Detail label="Stripe session ID" value={session.stripeCheckoutSessionId} />
          <Detail label="Internal session ID" value={session.id} />
          <Detail label="Upload ID" value={session.uploadId} />
          <Detail label="Submission ID" value={session.clientSubmissionId} />
          <Detail label="Checkout URL" value={checkoutUrl || null} />
          <Detail label="Updated" value={formatDate(session.updatedAt)} />
        </dl>
      </details>
    </article>
  );
}

function OverrideCard({ override }: { override: BillingOverrideSummary }) {
  const clientEmail = override.clientEmail || "";

  return (
    <article className="rounded-2xl border border-[#0A1547]/10 bg-[#F8F9FD] p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          {clientEmail ? (
            <Link
              href={clientHref(clientEmail)}
              className="admin-focus break-all text-sm font-black text-[#0A1547] underline decoration-[#A380F6]/40 underline-offset-4 transition hover:text-[#1A2460]"
            >
              {clientEmail}
            </Link>
          ) : (
            <p className="text-sm font-black text-[#0A1547]">No client email</p>
          )}
          <p className="mt-2 text-sm font-medium text-[#0A1547]/62">{formatNullable(override.targetType)}</p>
          <p className="mt-1 text-xs font-medium text-[#0A1547]/52">{formatDate(override.createdAt)}</p>
        </div>
        <span className={`rounded-full border px-3 py-1 text-xs font-extrabold ${statusTone(override.overridePaid ? "paid" : "unpaid")}`}>
          {override.overridePaid ? "Override paid" : "Override unpaid"}
        </span>
      </div>

      <p className="mt-4 text-sm font-medium leading-6 text-[#0A1547]/68">
        {formatNullable(override.reason)}
      </p>

      <details className="mt-4 rounded-xl border border-[#0A1547]/10 bg-white px-4 py-3">
        <summary className="cursor-pointer text-xs font-extrabold uppercase tracking-[0.16em] text-[#0A1547]/50">
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

function Detail({ label, value }: { label: string; value: string | number | boolean | null | undefined }) {
  return (
    <div>
      <dt className="text-xs font-extrabold uppercase tracking-[0.14em] text-[#0A1547]/40">{label}</dt>
      <dd className="mt-1 break-words font-medium text-[#0A1547]">{formatNullable(value)}</dd>
    </div>
  );
}
