import { useEffect, useMemo, useState, type FormEvent } from "react";
import { AdminApiError, createCheckoutSession } from "@/lib/adminApi";
import type { BillingUploadSummary, CreateCheckoutSessionResponse } from "@/lib/types";

type CreateCheckoutLinkCardProps = {
  clientEmail: string;
  helperText?: string;
  onCreated: () => Promise<void>;
  token: string;
  uploads: BillingUploadSummary[];
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

  return "border-[#0A1547]/10 bg-white text-[#0A1547]/70";
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

export function CreateCheckoutLinkCard({
  clientEmail,
  helperText = "Generate an admin-created Stripe Checkout link. This does not email the client, mark uploads paid, or deliver reports.",
  onCreated,
  token,
  uploads,
}: CreateCheckoutLinkCardProps) {
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
            {helperText}
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

function Detail({ label, value }: { label: string; value: string | number | boolean | null | undefined }) {
  return (
    <div>
      <dt className="text-xs font-extrabold uppercase tracking-[0.14em] text-[#0A1547]/40">{label}</dt>
      <dd className="mt-1 break-words font-medium text-[#0A1547]">{formatNullable(value)}</dd>
    </div>
  );
}
