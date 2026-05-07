import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "wouter";
import { useAuth } from "@/auth/AuthProvider";
import { AdminApiError, getClientBillingDetail } from "@/lib/adminApi";
import type {
  BillingOverrideSummary,
  BillingUploadSummary,
  CheckoutSessionSummary,
  ClientBillingDetailResponse,
} from "@/lib/types";

type ClientDetailPageProps = {
  email: string;
};

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

  return "border-[#0A1547]/10 bg-white text-[#0A1547]/70";
}

export default function ClientDetailPage({ email }: ClientDetailPageProps) {
  const { session } = useAuth();
  const [detail, setDetail] = useState<ClientBillingDetailResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const token = session?.access_token || "";
  const validEmail = email.trim();

  const loadDetail = useCallback(async (signal?: AbortSignal) => {
    if (!token || !validEmail) {
      return;
    }

    setLoading(true);
    setError("");

    try {
      const response = await getClientBillingDetail(token, validEmail, signal);
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
  }, [token, validEmail]);

  useEffect(() => {
    const controller = new AbortController();
    void loadDetail(controller.signal);

    return () => {
      controller.abort();
    };
  }, [loadDetail]);

  const summary = detail?.summary;
  const empty = useMemo(() => {
    return (
      !loading &&
      !error &&
      detail !== null &&
      detail.checkoutSessions.length === 0 &&
      detail.uploads.length === 0 &&
      detail.billingOverrides.length === 0
    );
  }, [detail, error, loading]);

  if (!validEmail) {
    return (
      <div className="admin-card p-8">
        <h2 className="text-xl font-black text-[#0A1547]">Invalid client email</h2>
        <p className="mt-2 text-sm font-medium text-[#0A1547]/62">
          The client detail route did not include a usable email address.
        </p>
        <BackLink />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <BackLink />
          <h2 className="mt-4 text-2xl font-black text-[#0A1547]">{detail?.clientEmail || validEmail}</h2>
          <p className="mt-1 text-sm font-medium text-[#0A1547]/60">
            Read-only billing and upload visibility from local admin records.
          </p>
        </div>
        <div className="admin-card px-5 py-4">
          <p className="text-xs font-extrabold uppercase tracking-[0.18em] text-[#0A1547]/45">
            Stripe customer
          </p>
          <p className="mt-2 max-w-xs truncate text-sm font-black text-[#0A1547]">
            {formatNullable(detail?.customer?.stripeCustomerId)}
          </p>
        </div>
      </div>

      {loading && (
        <div className="admin-card p-8 text-center text-sm font-bold text-[#0A1547]/60">
          Loading client details...
        </div>
      )}

      {error && !loading && (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-5 text-sm font-bold text-red-700">
          {error}
        </div>
      )}

      {empty && (
        <div className="admin-card p-8 text-center">
          <h3 className="text-lg font-black text-[#0A1547]">No billing detail yet</h3>
          <p className="mt-2 text-sm font-medium text-[#0A1547]/60">
            This client does not have local checkout sessions, uploads, or manual billing overrides.
          </p>
        </div>
      )}

      {detail && !loading && !error && (
        <>
          <section className="grid gap-4 md:grid-cols-5">
            <MetricCard label="Sessions" value={summary?.checkoutSessionCount ?? 0} accent="#A380F6" />
            <MetricCard label="Paid" value={summary?.paidCheckoutSessionCount ?? 0} accent="#02D99D" />
            <MetricCard label="Open" value={summary?.openCheckoutSessionCount ?? 0} accent="#02ABE0" />
            <MetricCard label="Overrides" value={summary?.manualOverrideCount ?? 0} accent="#1A2460" />
            <MetricCard label="Latest" value={formatNullable(summary?.latestPaymentStatus)} accent="#A380F6" />
          </section>

          <section className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
            <Panel title="Checkout Sessions" emptyText="No checkout sessions found.">
              {detail.checkoutSessions.map((session) => (
                <CheckoutSessionCard key={session.id} session={session} />
              ))}
            </Panel>

            <Panel title="Uploads" emptyText="No uploads found.">
              {detail.uploads.map((upload) => (
                <UploadCard key={upload.id} upload={upload} />
              ))}
            </Panel>
          </section>

          <section className="grid gap-6 lg:grid-cols-2">
            <Panel title="Billing Overrides" emptyText="No manual overrides recorded.">
              {detail.billingOverrides.map((override) => (
                <OverrideCard key={override.id} override={override} />
              ))}
            </Panel>

            <Panel title="Invoices and Subscriptions" emptyText="No invoice or subscription records returned.">
              <PlaceholderList label="Invoices" values={detail.invoices} />
              <PlaceholderList label="Subscriptions" values={detail.subscriptions} />
            </Panel>
          </section>
        </>
      )}
    </div>
  );
}

function BackLink() {
  return (
    <Link
      href="/clients"
      className="admin-focus inline-flex rounded-xl border border-[#0A1547]/10 bg-white px-4 py-2 text-sm font-extrabold text-[#0A1547] transition hover:border-[#A380F6]/50"
    >
      Back to clients
    </Link>
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
  emptyText,
  title,
}: {
  children: React.ReactNode[];
  emptyText: string;
  title: string;
}) {
  return (
    <section className="admin-card p-5">
      <h3 className="text-lg font-black text-[#0A1547]">{title}</h3>
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
  return (
    <article className="rounded-2xl border border-[#0A1547]/10 bg-[#F8F9FD] p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm font-black text-[#0A1547]">{formatNullable(session.purpose)}</p>
          <p className="mt-1 text-xs font-bold text-[#0A1547]/50">{formatNullable(session.stripeCheckoutSessionId)}</p>
        </div>
        <span className={`rounded-full border px-3 py-1 text-xs font-extrabold ${statusTone(session.paymentStatus)}`}>
          {formatNullable(session.paymentStatus)}
        </span>
      </div>
      <dl className="mt-4 grid gap-3 text-sm md:grid-cols-2">
        <Detail label="Amount" value={formatCurrency(session.amountTotal, session.currency)} />
        <Detail label="Status" value={session.status} />
        <Detail label="Mode" value={session.mode} />
        <Detail label="Created" value={formatDate(session.createdAt)} />
        <Detail label="Upload ID" value={session.uploadId} />
        <Detail label="Submission ID" value={session.clientSubmissionId} />
      </dl>
    </article>
  );
}

function UploadCard({ upload }: { upload: BillingUploadSummary }) {
  return (
    <article className="rounded-2xl border border-[#0A1547]/10 bg-[#F8F9FD] p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm font-black text-[#0A1547]">{formatNullable(upload.fileName)}</p>
          <p className="mt-1 text-xs font-bold text-[#0A1547]/50">{formatNullable(upload.id)}</p>
        </div>
        <span className={`rounded-full border px-3 py-1 text-xs font-extrabold ${statusTone(upload.paid ? "paid" : "unpaid")}`}>
          {upload.paid ? "Paid" : "Not paid"}
        </span>
      </div>
      <dl className="mt-4 grid gap-3 text-sm md:grid-cols-2">
        <Detail label="Tool" value={upload.toolName} />
        <Detail label="Upload time" value={formatDate(upload.uploadTime)} />
      </dl>
    </article>
  );
}

function OverrideCard({ override }: { override: BillingOverrideSummary }) {
  return (
    <article className="rounded-2xl border border-[#0A1547]/10 bg-[#F8F9FD] p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm font-black text-[#0A1547]">{formatNullable(override.targetType)}</p>
        <span className={`rounded-full border px-3 py-1 text-xs font-extrabold ${statusTone(override.overridePaid ? "paid" : "unpaid")}`}>
          {override.overridePaid ? "Override paid" : "Override unpaid"}
        </span>
      </div>
      <p className="mt-3 text-sm font-semibold leading-6 text-[#0A1547]/68">
        {formatNullable(override.reason)}
      </p>
      <dl className="mt-4 grid gap-3 text-sm md:grid-cols-2">
        <Detail label="Target ID" value={override.targetId} />
        <Detail label="Admin user" value={override.adminUserId} />
        <Detail label="Created" value={formatDate(override.createdAt)} />
      </dl>
    </article>
  );
}

function PlaceholderList({ label, values }: { label: string; values: unknown[] | undefined }) {
  const count = values?.length ?? 0;

  return (
    <div className="rounded-2xl border border-[#0A1547]/10 bg-[#F8F9FD] p-4">
      <div className="flex items-center justify-between gap-4">
        <p className="text-sm font-black text-[#0A1547]">{label}</p>
        <span className="rounded-full border border-[#0A1547]/10 bg-white px-3 py-1 text-xs font-extrabold text-[#0A1547]/65">
          {count}
        </span>
      </div>
      {count === 0 && (
        <p className="mt-2 text-sm font-medium text-[#0A1547]/58">
          No {label.toLowerCase()} returned by the Admin API.
        </p>
      )}
    </div>
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
