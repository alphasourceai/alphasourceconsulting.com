import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import { Link } from "wouter";
import { useAuth } from "@/auth/AuthProvider";
import { AdminApiError, createCheckoutSession, getClientBillingDetail } from "@/lib/adminApi";
import type {
  BillingOverrideSummary,
  BillingUploadSummary,
  CheckoutSessionSummary,
  ClientBillingDetailResponse,
  CreateCheckoutSessionResponse,
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

function uploadTimeValue(upload: BillingUploadSummary): number {
  if (!upload.uploadTime) {
    return 0;
  }

  const date = new Date(upload.uploadTime);
  return Number.isNaN(date.getTime()) ? 0 : date.getTime();
}

function dollarsToCents(value: string): number | null {
  const trimmed = value.trim();

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

export default function ClientDetailPage({ email }: ClientDetailPageProps) {
  const { permissions, session } = useAuth();
  const [detail, setDetail] = useState<ClientBillingDetailResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [uploadsExpanded, setUploadsExpanded] = useState(false);

  const token = session?.access_token || "";
  const validEmail = email.trim();
  const canWriteBilling = permissions.canWriteBilling;

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

  useEffect(() => {
    setUploadsExpanded(false);
  }, [validEmail]);

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

          {canWriteBilling ? (
            <CreateCheckoutLinkCard
              clientEmail={detail.clientEmail}
              onCreated={() => loadDetail(undefined, { showLoading: false })}
              token={token}
              uploads={sortedUploads}
            />
          ) : (
            <section className="rounded-2xl border border-[#A380F6]/25 bg-[#A380F6]/10 p-5">
              <p className="text-sm font-black text-[#0A1547]">Read-only billing access</p>
              <p className="mt-1 text-sm font-semibold leading-6 text-[#0A1547]/62">
                You can inspect billing and upload records, but creating checkout links requires billing write permission.
              </p>
            </section>
          )}

          <section className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
            <Panel title="Checkout Sessions" emptyText="No checkout sessions found.">
              {detail.checkoutSessions.map((session) => (
                <CheckoutSessionCard key={session.id} session={session} />
              ))}
            </Panel>

            <UploadsPanel
              expanded={uploadsExpanded}
              onToggle={() => setUploadsExpanded((current) => !current)}
              totalCount={sortedUploads.length}
              uploads={visibleUploads}
            />
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

function CreateCheckoutLinkCard({
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
  const [description, setDescription] = useState("");
  const [amountDollars, setAmountDollars] = useState("");
  const [purpose, setPurpose] = useState("report");
  const [uploadId, setUploadId] = useState("");
  const [creating, setCreating] = useState(false);
  const [createdSession, setCreatedSession] = useState<CreateCheckoutSessionResponse | null>(null);
  const [error, setError] = useState("");
  const [copyStatus, setCopyStatus] = useState("");

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError("");
    setCopyStatus("");

    const trimmedDescription = description.trim();
    const trimmedPurpose = purpose.trim() || "report";
    const cents = dollarsToCents(amountDollars);

    if (!trimmedDescription) {
      setError("Enter a description for the checkout link.");
      return;
    }

    if (!cents) {
      setError("Enter a valid dollar amount greater than zero, using up to two decimal places.");
      return;
    }

    setCreating(true);

    try {
      const response = await createCheckoutSession(token, {
        clientEmail,
        purpose: trimmedPurpose,
        description: trimmedDescription,
        amount: cents,
        currency: "usd",
        ...(uploadId ? { uploadId } : {}),
        successUrl: `${window.location.origin}/payment-success`,
        cancelUrl: `${window.location.origin}/payment-cancel`,
      });

      setCreatedSession(response);
      await onCreated();
    } catch (checkoutError) {
      if (checkoutError instanceof AdminApiError) {
        setError(checkoutError.message);
      } else {
        setError("Checkout link could not be created.");
      }
    } finally {
      setCreating(false);
    }
  };

  const handleCopy = async () => {
    if (!createdSession?.url) {
      return;
    }

    try {
      await navigator.clipboard.writeText(createdSession.url);
      setCopyStatus("Copied");
    } catch {
      setCopyStatus("Copy failed");
    }
  };

  return (
    <section className="admin-card p-5">
      <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
        <div>
          <h3 className="text-lg font-black text-[#0A1547]">Create checkout link</h3>
          <p className="mt-1 max-w-2xl text-sm font-medium leading-6 text-[#0A1547]/60">
            Generate an admin-created Stripe Checkout link. This does not email the client, mark uploads paid, or deliver reports.
          </p>
        </div>
        <span className="w-fit rounded-full border border-[#A380F6]/25 bg-[#A380F6]/10 px-3 py-1 text-xs font-extrabold text-[#0A1547]">
          Admin only
        </span>
      </div>

      <form onSubmit={handleSubmit} className="mt-5 grid gap-4 lg:grid-cols-[1.25fr_0.5fr_0.55fr_0.9fr_auto] lg:items-end">
        <label className="block">
          <span className="text-sm font-extrabold text-[#0A1547]">Description</span>
          <input
            type="text"
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            placeholder="Full Financial Report"
            className="admin-focus mt-2 w-full rounded-xl border border-[#0A1547]/10 bg-[#F8F9FD] px-4 py-3 text-sm font-semibold text-[#0A1547]"
            disabled={creating}
          />
        </label>

        <label className="block">
          <span className="text-sm font-extrabold text-[#0A1547]">Amount</span>
          <input
            type="text"
            inputMode="decimal"
            value={amountDollars}
            onChange={(event) => setAmountDollars(event.target.value)}
            placeholder="500.00"
            className="admin-focus mt-2 w-full rounded-xl border border-[#0A1547]/10 bg-[#F8F9FD] px-4 py-3 text-sm font-semibold text-[#0A1547]"
            disabled={creating}
          />
        </label>

        <label className="block">
          <span className="text-sm font-extrabold text-[#0A1547]">Purpose</span>
          <input
            type="text"
            value={purpose}
            onChange={(event) => setPurpose(event.target.value)}
            className="admin-focus mt-2 w-full rounded-xl border border-[#0A1547]/10 bg-[#F8F9FD] px-4 py-3 text-sm font-semibold text-[#0A1547]"
            disabled={creating}
          />
        </label>

        <label className="block">
          <span className="text-sm font-extrabold text-[#0A1547]">Related upload</span>
          <select
            value={uploadId}
            onChange={(event) => setUploadId(event.target.value)}
            className="admin-focus mt-2 h-[46px] w-full appearance-none rounded-xl border border-[#0A1547]/10 bg-[#F8F9FD] px-4 py-3 text-sm font-semibold leading-tight text-[#0A1547]"
            disabled={creating || uploads.length === 0}
          >
            <option value="">No upload selected</option>
            {uploads.map((upload) => (
              <option key={upload.id} value={upload.id}>
                {upload.fileName || upload.toolName || upload.id}
              </option>
            ))}
          </select>
        </label>

        <button
          type="submit"
          disabled={creating}
          className="admin-focus rounded-xl bg-[#A380F6] px-5 py-3 text-sm font-extrabold text-white shadow-lg shadow-[#A380F6]/20 transition hover:bg-[#906cf2] disabled:opacity-60"
        >
          {creating ? "Creating..." : "Create link"}
        </button>
      </form>

      {error && (
        <p className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-700">
          {error}
        </p>
      )}

      {createdSession?.url && (
        <div className="mt-5 rounded-2xl border border-[#02D99D]/25 bg-[#02D99D]/10 p-4">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-sm font-black text-[#0A1547]">Checkout link created.</p>
              <p className="mt-1 max-w-xl text-sm font-semibold text-[#0A1547]/62">
                Session {formatNullable(createdSession.checkoutSessionId)} is ready to send manually.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={() => void handleCopy()}
                className="admin-focus rounded-xl border border-[#0A1547]/10 bg-white px-4 py-2 text-sm font-extrabold text-[#0A1547] transition hover:border-[#A380F6]/50"
              >
                Copy Link
              </button>
              <a
                href={createdSession.url}
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
          <details className="mt-4 rounded-xl border border-[#0A1547]/10 bg-white px-4 py-3">
            <summary className="cursor-pointer text-xs font-extrabold uppercase tracking-[0.16em] text-[#0A1547]/50">
              Technical details
            </summary>
            <p className="mt-3 break-all text-sm font-semibold text-[#0A1547]/68">
              {createdSession.url}
            </p>
          </details>
        </div>
      )}
    </section>
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

function UploadsPanel({
  expanded,
  onToggle,
  totalCount,
  uploads,
}: {
  expanded: boolean;
  onToggle: () => void;
  totalCount: number;
  uploads: BillingUploadSummary[];
}) {
  return (
    <section className="admin-card p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 className="text-lg font-black text-[#0A1547]">Uploads</h3>
        {totalCount > 4 && (
          <button
            type="button"
            onClick={onToggle}
            className="admin-focus rounded-xl border border-[#0A1547]/10 bg-white px-4 py-2 text-sm font-extrabold text-[#0A1547] transition hover:border-[#A380F6]/50"
          >
            {expanded ? "Show fewer uploads" : `Show all uploads (${totalCount})`}
          </button>
        )}
      </div>
      <div className="mt-4 grid gap-3">
        {uploads.length > 0 ? uploads.map((upload) => (
          <UploadCard key={upload.id} upload={upload} />
        )) : (
          <p className="rounded-2xl bg-[#F8F9FD] p-4 text-sm font-bold text-[#0A1547]/56">
            No uploads found.
          </p>
        )}
      </div>
    </section>
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
  const [copyStatus, setCopyStatus] = useState("");
  const checkoutUrl = session.checkoutUrl?.trim() || "";
  const paymentStatus = session.paymentStatus?.toLowerCase() || "";
  const canUseCheckoutLink = checkoutUrl !== "" && paymentStatus !== "paid";

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

      {!checkoutUrl && (
        <p className="mt-4 rounded-xl border border-[#0A1547]/10 bg-white px-4 py-3 text-sm font-bold text-[#0A1547]/50">
          Checkout link unavailable for older session.
        </p>
      )}
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
