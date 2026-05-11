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

const statusOptions: Array<{ label: string; value: BillingOverviewStatus }> = [
  { label: "Open", value: "open" },
  { label: "Paid", value: "paid" },
  { label: "All", value: "all" },
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

export default function BillingPage() {
  const { permissions, session } = useAuth();
  const [overview, setOverview] = useState<BillingOverviewResponse | null>(null);
  const [status, setStatus] = useState<BillingOverviewStatus>("open");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const token = session?.access_token || "";
  const canWriteBilling = permissions.canWriteBilling;

  const loadOverview = useCallback(async (signal?: AbortSignal) => {
    if (!token) {
      return;
    }

    setLoading(true);
    setError("");

    try {
      const response = await getBillingOverview(token, {
        status,
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
  }, [search, status, token]);

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

  const empty = useMemo(() => {
    return (
      !loading &&
      !error &&
      overview !== null &&
      overview.checkoutSessions.length === 0 &&
      overview.billingOverrides.length === 0
    );
  }, [error, loading, overview]);

  const summary = overview?.summary;

  return (
    <div className="space-y-6">
      <section className="grid gap-4 md:grid-cols-5">
        <MetricCard label="Checkout Sessions" value={summary?.checkoutSessionCount ?? 0} accent="#A380F6" />
        <MetricCard label="Paid" value={summary?.paidCheckoutSessionCount ?? 0} accent="#02D99D" />
        <MetricCard label="Open" value={summary?.openCheckoutSessionCount ?? 0} accent="#02ABE0" />
        <MetricCard label="Overrides" value={summary?.manualOverrideCount ?? 0} accent="#1A2460" />
        <MetricCard label="Needs Review" value={summary?.needsReviewEventCount ?? 0} accent="#A380F6" />
      </section>

      <section className="admin-card p-5">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div>
            <h2 className="text-xl font-black text-[#0A1547]">Billing</h2>
            <p className="mt-1 max-w-2xl text-sm font-medium leading-6 text-[#0A1547]/60">
              Manage checkout sessions, payment visibility, and manual billing override records.
            </p>
            {!canWriteBilling && (
              <p className="mt-2 text-sm font-bold text-[#0A1547]/58">
                Checkout creation and billing override actions are hidden or disabled unless your role includes billing write permission.
              </p>
            )}
          </div>

          <div className="flex flex-col gap-3 md:flex-row md:items-center">
            <div className="flex rounded-2xl border border-[#0A1547]/10 bg-[#F8F9FD] p-1">
              {statusOptions.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setStatus(option.value)}
                  className={`admin-focus rounded-xl px-4 py-2 text-sm font-extrabold transition ${
                    status === option.value
                      ? "bg-[#0A1547] text-white"
                      : "text-[#0A1547]/62 hover:bg-white hover:text-[#0A1547]"
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>

            <label className="w-full md:w-80">
              <span className="sr-only">Search billing records</span>
              <input
                type="search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search client email or purpose"
                className="admin-focus w-full rounded-xl border border-[#0A1547]/10 bg-[#F8F9FD] px-4 py-3 text-sm font-semibold text-[#0A1547] placeholder:text-[#0A1547]/38"
              />
            </label>
          </div>
        </div>
      </section>

      {loading && (
        <div className="admin-card p-8 text-center text-sm font-bold text-[#0A1547]/60">
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
        <section className="grid gap-6 xl:grid-cols-[1.25fr_0.75fr]">
          <Panel
            count={overview.count}
            hasMore={overview.hasMore}
            title="Checkout Sessions"
            emptyText="No checkout sessions found."
          >
            {overview.checkoutSessions.map((checkoutSession) => (
              <CheckoutSessionCard key={checkoutSession.id} session={checkoutSession} />
            ))}
          </Panel>

          <Panel
            count={overview.billingOverrides.length}
            title="Manual Overrides"
            emptyText="No manual overrides found."
          >
            {overview.billingOverrides.map((override) => (
              <OverrideCard key={override.id} override={override} />
            ))}
          </Panel>
        </section>
      )}
    </div>
  );
}

function MetricCard({ accent, label, value }: { accent: string; label: string; value: string | number }) {
  return (
    <div className="admin-card p-5">
      <div className="h-1.5 w-12 rounded-full" style={{ backgroundColor: accent }} />
      <p className="mt-4 text-xs font-extrabold uppercase tracking-[0.16em] text-[#0A1547]/45">{label}</p>
      <p className="mt-2 break-words text-2xl font-black text-[#0A1547]">{value}</p>
    </div>
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
            <p className="mt-1 text-sm font-semibold text-[#0A1547]/56">
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
          <p className="rounded-2xl bg-[#F8F9FD] p-4 text-sm font-bold text-[#0A1547]/56">
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
          <p className="mt-2 text-sm font-bold text-[#0A1547]/62">{formatNullable(session.purpose)}</p>
          <p className="mt-1 break-all text-xs font-bold text-[#0A1547]/45">
            {formatNullable(session.stripeCheckoutSessionId)}
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

      <dl className="mt-4 grid gap-3 text-sm md:grid-cols-2">
        <Detail label="Amount" value={formatCurrency(session.amountTotal, session.currency)} />
        <Detail label="Created" value={formatDate(session.createdAt)} />
        <Detail label="Upload ID" value={session.uploadId} />
        <Detail label="Submission ID" value={session.clientSubmissionId} />
      </dl>

      {canUseCheckoutLink && (
        <div className="mt-4 rounded-2xl border border-[#02ABE0]/20 bg-white p-4">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <p className="text-sm font-black text-[#0A1547]">Checkout link available</p>
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
                <span className="text-sm font-bold text-[#0A1547]/58">{copyStatus}</span>
              )}
            </div>
          </div>
          <details className="mt-3 rounded-xl border border-[#0A1547]/10 bg-[#F8F9FD] px-4 py-3">
            <summary className="cursor-pointer text-xs font-extrabold uppercase tracking-[0.16em] text-[#0A1547]/50">
              Technical details
            </summary>
            <p className="mt-3 break-all text-sm font-semibold text-[#0A1547]/68">
              {checkoutUrl}
            </p>
          </details>
        </div>
      )}

      {!checkoutUrl && paymentStatus !== "paid" && (
        <p className="mt-4 rounded-xl border border-[#0A1547]/10 bg-white px-4 py-3 text-sm font-bold text-[#0A1547]/50">
          Checkout link unavailable for older session.
        </p>
      )}
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
          <p className="mt-2 text-sm font-bold text-[#0A1547]/62">
            {formatNullable(override.targetType)} · {formatNullable(override.targetId)}
          </p>
        </div>
        <span className={`rounded-full border px-3 py-1 text-xs font-extrabold ${statusTone(override.overridePaid ? "paid" : "unpaid")}`}>
          {override.overridePaid ? "Override paid" : "Override unpaid"}
        </span>
      </div>

      <p className="mt-4 text-sm font-semibold leading-6 text-[#0A1547]/68">
        {formatNullable(override.reason)}
      </p>

      <dl className="mt-4 grid gap-3 text-sm md:grid-cols-2">
        <Detail label="Admin user" value={override.adminUserId} />
        <Detail label="Created" value={formatDate(override.createdAt)} />
      </dl>
    </article>
  );
}

function Detail({ label, value }: { label: string; value: string | number | boolean | null | undefined }) {
  return (
    <div>
      <dt className="text-xs font-extrabold uppercase tracking-[0.14em] text-[#0A1547]/40">{label}</dt>
      <dd className="mt-1 break-words font-black text-[#0A1547]">{formatNullable(value)}</dd>
    </div>
  );
}
