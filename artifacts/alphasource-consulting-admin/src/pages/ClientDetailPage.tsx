import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import { Link } from "wouter";
import { useAuth } from "@/auth/AuthProvider";
import { AdminApiError, createCheckoutSession, expireCheckoutSession, getClientBillingDetail, voidAdminUpload } from "@/lib/adminApi";
import type {
  BillingUploadSummary,
  BillingUploadStatus,
  CheckoutSessionSummary,
  ClientBillingDetailResponse,
  CreateCheckoutSessionResponse,
} from "@/lib/types";

type ClientDetailPageProps = {
  email: string;
};

const UPLOAD_STATUS_FILTERS: Array<{ label: string; value: BillingUploadStatus }> = [
  { label: "Active", value: "active" },
  { label: "Voided", value: "voided" },
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

function statusTone(status: string | null): string {
  const normalized = status?.toLowerCase();

  if (normalized === "paid" || normalized === "complete" || normalized === "completed") {
    return "border-[#02D99D]/30 bg-[#02D99D]/12 text-[#0A1547]";
  }

  if (normalized === "open" || normalized === "unpaid") {
    return "border-[#02ABE0]/25 bg-[#02ABE0]/10 text-[#0A1547]";
  }

  if (normalized === "voided") {
    return "border-[#A380F6]/30 bg-[#A380F6]/12 text-[#0A1547]";
  }

  if (normalized === "expired") {
    return "border-[#A380F6]/30 bg-[#A380F6]/12 text-[#0A1547]";
  }

  return "border-[#0A1547]/10 bg-white text-[#0A1547]/70";
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
  const [uploadStatus, setUploadStatus] = useState<BillingUploadStatus>("active");
  const [voidTarget, setVoidTarget] = useState<BillingUploadSummary | null>(null);
  const [uploadActionMessage, setUploadActionMessage] = useState("");
  const [checkoutActionMessage, setCheckoutActionMessage] = useState("");

  const token = session?.access_token || "";
  const validEmail = email.trim();
  const canWriteBilling = permissions.canWriteBilling;
  const canWriteUploads = permissions.canWriteUploads;

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
  const activeUploads = useMemo(() => {
    return sortedUploads.filter((upload) => !upload.voided);
  }, [sortedUploads]);
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
            Client billing, checkout, and upload visibility from local admin records.
          </p>
        </div>
        <div className="admin-card px-5 py-4">
          <p className="text-xs font-extrabold uppercase tracking-[0.18em] text-[#0A1547]/45">
            Stripe Customer
          </p>
          <p className="mt-2 max-w-xs break-all text-sm font-semibold text-[#0A1547]">
            {detail?.customer?.stripeCustomerId || "Not linked"}
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
            This client does not have local checkout sessions or uploads yet.
          </p>
        </div>
      )}

      {detail && !loading && !error && (
        <>
          <ClientInformationPanel detail={detail} />

          {canWriteBilling ? (
            <CreateCheckoutLinkCard
              clientEmail={detail.clientEmail}
              onCreated={() => loadDetail(undefined, { showLoading: false })}
              token={token}
              uploads={activeUploads}
            />
          ) : (
            <section className="rounded-2xl border border-[#A380F6]/25 bg-[#A380F6]/10 p-5">
              <p className="text-sm font-black text-[#0A1547]">Read-only billing access</p>
              <p className="mt-1 text-sm font-semibold leading-6 text-[#0A1547]/62">
                You can inspect billing and upload records, but creating checkout links requires billing write permission.
              </p>
            </section>
          )}

          <BillingSummaryPanel summary={detail.summary} />

          {checkoutActionMessage && (
            <p className="rounded-2xl border border-[#02D99D]/25 bg-[#02D99D]/10 px-5 py-4 text-sm font-semibold text-[#0A1547]">
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

function ClientInformationPanel({ detail }: { detail: ClientBillingDetailResponse }) {
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
    <section className="admin-card p-5">
      <div>
        <h3 className="text-lg font-black text-[#0A1547]">Client information</h3>
        <p className="mt-1 text-sm font-medium text-[#0A1547]/60">
          Client profile details used across uploads, secure requests, billing, and reporting.
        </p>
      </div>
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
              className="admin-focus rounded-lg border border-[#A380F6]/30 bg-white px-2.5 py-1 text-xs font-extrabold text-[#0A1547] transition hover:border-[#A380F6]/70"
            >
              Copy
            </button>
          ) : null}
          helper={copyStatus}
          label="GHL CID"
          value={latestGhlCid || null}
        />
      </div>
    </section>
  );
}

function ClientInfoFact({
  action,
  helper,
  label,
  value,
}: {
  action?: React.ReactNode;
  helper?: string;
  label: string;
  value: string | number | boolean | null | undefined;
}) {
  return (
    <div className="min-w-0 rounded-2xl border border-[#0A1547]/10 bg-[#F8F9FD] p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-[#0A1547]/45">{label}</p>
          <p className="mt-2 break-words text-sm font-semibold text-[#0A1547]">{formatNullable(value)}</p>
          {helper && (
            <p className="mt-1 text-xs font-medium text-[#0A1547]/50">{helper}</p>
          )}
        </div>
        {action && <div className="shrink-0">{action}</div>}
      </div>
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
  const [selectedUploadIds, setSelectedUploadIds] = useState<string[]>([]);
  const [creating, setCreating] = useState(false);
  const [createdSession, setCreatedSession] = useState<CreateCheckoutSessionResponse | null>(null);
  const [error, setError] = useState("");
  const [copyStatus, setCopyStatus] = useState("");
  const selectableUploadIds = useMemo(() => {
    return new Set(uploads.filter((upload) => !upload.paid && !upload.voided).map((upload) => upload.id));
  }, [uploads]);
  const selectedSelectableUploadIds = useMemo(() => {
    return selectedUploadIds.filter((uploadId) => selectableUploadIds.has(uploadId));
  }, [selectableUploadIds, selectedUploadIds]);

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
        ...(selectedSelectableUploadIds.length > 0 ? { uploadIds: selectedSelectableUploadIds } : {}),
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

      <form onSubmit={handleSubmit} className="mt-5 space-y-4">
        <div className="grid gap-4 lg:grid-cols-[1.25fr_0.5fr_0.55fr_auto] lg:items-end">
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

          <button
            type="submit"
            disabled={creating}
            className="admin-focus rounded-xl bg-[#A380F6] px-5 py-3 text-sm font-extrabold text-white shadow-lg shadow-[#A380F6]/20 transition hover:bg-[#906cf2] disabled:opacity-60"
          >
            {creating ? "Creating..." : "Create link"}
          </button>
        </div>

        <div className="rounded-2xl border border-[#0A1547]/10 bg-[#F8F9FD] p-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-sm font-extrabold text-[#0A1547]">Related uploads</p>
              <p className="mt-1 text-sm font-medium leading-6 text-[#0A1547]/58">
                Select one or more uploads to associate with this checkout session.
              </p>
              <p className="mt-1 text-xs font-medium leading-5 text-[#0A1547]/48">
                Paid or voided uploads cannot be selected.
              </p>
            </div>
            <span className="rounded-full border border-[#0A1547]/10 bg-white px-3 py-1 text-xs font-bold text-[#0A1547]/60">
              {selectedSelectableUploadIds.length} selected
            </span>
          </div>

          <div className="mt-3 grid gap-2">
            {uploads.length > 0 ? uploads.map((upload) => (
              <UploadSelectRow
                key={upload.id}
                checked={selectedSelectableUploadIds.includes(upload.id)}
                disabled={creating}
                onToggle={() => toggleUpload(upload.id)}
                upload={upload}
              />
            )) : (
              <p className="rounded-xl border border-[#0A1547]/10 bg-white px-4 py-3 text-sm font-medium text-[#0A1547]/56">
                No uploads found.
              </p>
            )}
          </div>
        </div>
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
                The checkout link is ready to send manually.
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
            <dl className="mt-3 grid gap-3 text-sm">
              <Detail label="Checkout session ID" value={createdSession.checkoutSessionId} />
              <Detail label="Checkout URL" value={createdSession.url} />
            </dl>
          </details>
        </div>
      )}
    </section>
  );
}

function UploadSelectRow({
  checked,
  disabled,
  onToggle,
  upload,
}: {
  checked: boolean;
  disabled: boolean;
  onToggle: () => void;
  upload: BillingUploadSummary;
}) {
  const paid = Boolean(upload.paid);
  const voided = Boolean(upload.voided);

  return (
    <label
      className={`flex cursor-pointer items-center gap-3 rounded-xl border px-3 py-2 transition ${
        checked ? "border-[#A380F6]/45 bg-white shadow-sm" : "border-[#0A1547]/10 bg-white/70 hover:border-[#A380F6]/35"
      } ${disabled || paid || voided ? "cursor-not-allowed opacity-70" : ""}`}
    >
      {paid || voided ? (
        <span className="h-4 w-4 shrink-0 rounded border border-[#0A1547]/15 bg-[#0A1547]/5" aria-hidden="true" />
      ) : (
        <input
          type="checkbox"
          checked={checked}
          onChange={onToggle}
          disabled={disabled}
          className="admin-focus h-4 w-4 shrink-0 rounded border-[#0A1547]/20 text-[#A380F6]"
        />
      )}
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-bold text-[#0A1547]">
          {formatNullable(upload.fileName)}
        </span>
        <span className="mt-1 block truncate text-xs font-medium text-[#0A1547]/58">
          {formatNullable(upload.toolName)} / {formatDate(upload.uploadTime)}
        </span>
        {paid && (
          <span className="mt-1 block text-xs font-medium text-[#0A1547]/45">Already paid</span>
        )}
        {voided && (
          <span className="mt-1 block text-xs font-medium text-[#0A1547]/45">Voided uploads cannot be selected</span>
        )}
      </span>
      <span className={`shrink-0 rounded-full border px-2.5 py-1 text-xs font-bold ${statusTone(voided ? "voided" : paid ? "paid" : "unpaid")}`}>
        {voided ? "Voided" : paid ? "Paid" : "Not paid"}
      </span>
    </label>
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
    <section className="admin-card p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-lg font-black text-[#0A1547]">Uploads</h3>
          <p className="mt-1 text-sm font-medium text-[#0A1547]/58">
            Active uploads are used for normal checkout and report workflows.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {UPLOAD_STATUS_FILTERS.map((filter) => (
            <button
              key={filter.value}
              type="button"
              onClick={() => onStatusChange(filter.value)}
              className={`admin-focus rounded-xl border px-3 py-2 text-xs font-extrabold transition ${
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
              className="admin-focus rounded-xl border border-[#0A1547]/10 bg-white px-4 py-2 text-sm font-extrabold text-[#0A1547] transition hover:border-[#A380F6]/50"
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
          <p className="rounded-2xl bg-[#F8F9FD] p-4 text-sm font-medium text-[#0A1547]/56">
            No uploads found.
          </p>
        )}
      </div>
    </section>
  );
}

function BillingSummaryPanel({ summary }: { summary: ClientBillingDetailResponse["summary"] }) {
  return (
    <section className="admin-card p-5">
      <div>
        <h3 className="text-lg font-black text-[#0A1547]">Billing summary</h3>
        <p className="mt-1 text-sm font-medium text-[#0A1547]/60">
          High-level checkout and override status for this client.
        </p>
      </div>
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
    <div title={helpText} className="rounded-2xl border border-[#0A1547]/10 bg-[#F8F9FD] p-4">
      <p className="text-xs font-bold uppercase tracking-[0.14em] text-[#0A1547]/45">{label}</p>
      <p className={`mt-2 break-words text-xl font-black ${valueClassName}`}>{value}</p>
      <p className="mt-1 text-xs font-medium leading-5 text-[#0A1547]/55">{helpText}</p>
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
          <p className="rounded-2xl bg-[#F8F9FD] p-4 text-sm font-medium text-[#0A1547]/56">
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
  const canUseCheckoutLink = checkoutUrl !== "" && !paid && !expired;
  const canExpire = canWriteBilling && isOpenSession(session);
  const relatedUploads = session.relatedUploads?.length > 0 ? session.relatedUploads : upload ? [upload] : [];
  const hasLegacyUploadOnly = relatedUploads.length === 0 && Boolean(session.uploadId);
  const technicalUploadIds = session.uploadIds?.length ? session.uploadIds.join(", ") : session.uploadId;

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
    <article className="rounded-2xl border border-[#0A1547]/10 bg-[#F8F9FD] p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm font-black text-[#0A1547]">{formatNullable(session.purpose)}</p>
          <p className="mt-1 text-sm font-medium text-[#0A1547]/58">
            {formatCurrency(session.amountTotal, session.currency)}
          </p>
          <p className="mt-1 text-xs font-medium text-[#0A1547]/52">
            {expired ? `Expired ${formatMountainDate(session.expiredAt)}` : `Expires ${formatMountainDate(session.expiresAt)}`}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <span className={`rounded-full border px-3 py-1 text-xs font-extrabold ${statusTone(expired ? "expired" : session.status)}`}>
            {expired ? "Expired" : formatNullable(session.status)}
          </span>
          <span className={`rounded-full border px-3 py-1 text-xs font-extrabold ${statusTone(session.paymentStatus)}`}>
            {formatNullable(session.paymentStatus)}
          </span>
        </div>
      </div>
      <dl className="mt-4 grid gap-3 text-sm md:grid-cols-2">
        <Detail label="Amount" value={formatCurrency(session.amountTotal, session.currency)} />
        <Detail label="Status" value={session.status} />
        <Detail label="Payment" value={session.paymentStatus} />
        <Detail label="Created" value={formatDate(session.createdAt)} />
        <Detail label="Expires" value={formatMountainDate(session.expiresAt)} />
        <Detail label="Expired" value={formatMountainDate(session.expiredAt)} />
      </dl>

      {relatedUploads.length > 0 && (
        <div className="mt-4 rounded-2xl border border-[#0A1547]/10 bg-white p-4">
          <p className="text-xs font-bold uppercase tracking-[0.12em] text-[#0A1547]/42">Related uploads</p>
          <div className="mt-3 grid gap-2">
            {relatedUploads.map((relatedUpload) => (
              <div key={relatedUpload.id} className="min-w-0 rounded-xl border border-[#0A1547]/10 bg-[#F8F9FD] px-3 py-2">
                <p className="truncate text-sm font-bold text-[#0A1547]">
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
              {canExpire && (
                <button
                  type="button"
                  onClick={() => void handleExpire()}
                  disabled={expiring}
                  className="admin-focus rounded-xl border border-[#A380F6]/35 bg-white px-4 py-2 text-sm font-extrabold text-[#0A1547] transition hover:border-[#A380F6]/70 disabled:cursor-not-allowed disabled:opacity-55"
                >
                  {expiring ? "Expiring..." : "Expire link"}
                </button>
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

      {!checkoutUrl && !paid && !expired && (
        <p className="mt-4 rounded-xl border border-[#0A1547]/10 bg-white px-4 py-3 text-sm font-medium text-[#0A1547]/50">
          Checkout link unavailable for older session.
        </p>
      )}

      {canExpire && !canUseCheckoutLink && (
        <div className="mt-4 rounded-2xl border border-[#A380F6]/20 bg-white p-4">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <p className="text-sm font-medium text-[#0A1547]/62">This open checkout session can be expired manually.</p>
            <button
              type="button"
              onClick={() => void handleExpire()}
              disabled={expiring}
              className="admin-focus rounded-xl border border-[#A380F6]/35 bg-white px-4 py-2 text-sm font-extrabold text-[#0A1547] transition hover:border-[#A380F6]/70 disabled:cursor-not-allowed disabled:opacity-55"
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

      <details className="mt-4 rounded-xl border border-[#0A1547]/10 bg-white px-4 py-3">
        <summary className="cursor-pointer text-xs font-bold uppercase tracking-[0.14em] text-[#0A1547]/50">
          Technical details
        </summary>
        <dl className="mt-3 grid gap-3 text-sm md:grid-cols-2">
          <Detail label="Stripe session ID" value={session.stripeCheckoutSessionId} />
          <Detail label="Local session ID" value={session.id} />
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
    <article className="rounded-2xl border border-[#0A1547]/10 bg-[#F8F9FD] p-4">
      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3">
        <div className="min-w-0">
          <p className="line-clamp-2 break-words text-[13px] font-black leading-5 text-[#0A1547]">
            {formatNullable(upload.fileName)}
          </p>
          <p className="mt-1 truncate text-sm font-medium text-[#0A1547]/58">{formatNullable(upload.toolName)}</p>
        </div>
        <div className="flex shrink-0 flex-wrap items-start justify-end gap-2">
          {voided && (
            <span className={`shrink-0 rounded-full border px-3 py-1 text-xs font-extrabold ${statusTone("voided")}`}>
              Voided
            </span>
          )}
          <span className={`shrink-0 rounded-full border px-3 py-1 text-xs font-extrabold ${statusTone(paid ? "paid" : "unpaid")}`}>
            {paid ? "Paid" : "Not paid"}
          </span>
          {canVoid && (
            <button
              type="button"
              onClick={onVoid}
              className="admin-focus rounded-xl border border-red-200 bg-white px-3 py-2 text-xs font-extrabold text-red-700 transition hover:bg-red-50"
            >
              Void upload
            </button>
          )}
        </div>
      </div>
      {voided && (
        <div className="mt-3 rounded-xl border border-[#A380F6]/20 bg-white px-4 py-3 text-sm text-[#0A1547]/68">
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
      <details className="mt-4 rounded-xl border border-[#0A1547]/10 bg-white px-4 py-3">
        <summary className="cursor-pointer text-xs font-bold uppercase tracking-[0.14em] text-[#0A1547]/50">
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

function Detail({ label, value }: { label: string; value: string | number | boolean | null | undefined }) {
  return (
    <div className="min-w-0 max-w-full">
      <dt className="text-xs font-bold uppercase tracking-[0.12em] text-[#0A1547]/42">{label}</dt>
      <dd className="mt-1 max-w-full break-all font-semibold text-[#0A1547]">{formatNullable(value)}</dd>
    </div>
  );
}
