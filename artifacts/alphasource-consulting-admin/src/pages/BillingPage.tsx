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
  OfferPaymentLinkResponse,
  OneTimeOfferType,
} from "@/lib/types";

type BillingRecordFilter = "all" | "paid" | "open" | "expired" | "overrides";
type OfferPreset = {
  amountCents: number;
  helper: string;
  label: string;
  offerType: OneTimeOfferType;
};

const billingRecordFilters: Array<{ accent: string; label: string; value: BillingRecordFilter }> = [
  { label: "Total Sessions", value: "all", accent: "#A380F6" },
  { label: "Paid", value: "paid", accent: "#02D99D" },
  { label: "Open", value: "open", accent: "#02ABE0" },
  { label: "Expired", value: "expired", accent: "#A380F6" },
  { label: "Overrides", value: "overrides", accent: "#1A2460" },
];
const oneTimeOfferPresets: OfferPreset[] = [
  {
    amountCents: 99500,
    helper: "One-time Practice Opportunity Review founder pricing.",
    label: "Practice Opportunity Review",
    offerType: "practice_opportunity_review",
  },
  {
    amountCents: 350000,
    helper: "One-time scoped sprint for production, collection, write-off, and conversion leakage.",
    label: "Revenue Leak Sprint",
    offerType: "revenue_leak_sprint",
  },
  {
    amountCents: 250000,
    helper: "One-time scoped sprint for claims, collections, documentation, and follow-up workflow.",
    label: "AR / Claims Cleanup Sprint",
    offerType: "ar_claims_cleanup_sprint",
  },
  {
    amountCents: 350000,
    helper: "One-time scoped sprint for lead flow, scheduling, follow-up, conversion, and patient experience friction.",
    label: "Growth + New Patient Conversion Sprint",
    offerType: "growth_new_patient_conversion_sprint",
  },
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

  if (normalized === "expired") {
    return "border-[#A380F6]/30 bg-[#A380F6]/12 text-[#0A1547]";
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

function uploadTimeValue(upload: BillingUploadSummary): number {
  if (!upload.uploadTime) {
    return 0;
  }

  const date = new Date(upload.uploadTime);
  return Number.isNaN(date.getTime()) ? 0 : date.getTime();
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
  const preset = oneTimeOfferPresets.find((offer) => offer.offerType === value);
  if (preset) {
    return preset.label;
  }

  return formatNullable(value?.replace(/_/g, " "));
}

function billingModeLabel(value: string | null | undefined): string {
  if (value === "one_time") {
    return "One-time payment link";
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
                    filter.value === "expired" ? summary?.expiredCheckoutSessionCount ?? 0 :
                    summary?.manualOverrideCount ?? 0
            }
          />
        ))}
      </section>

      <section className="admin-card p-5">
        <div className="grid gap-4 lg:grid-cols-[1fr_420px] lg:items-end">
          <div>
            <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-[#A380F6]">Payment workspace</p>
            <h2 className="mt-2 text-xl font-black text-[#0A1547]">Select client</h2>
            <p className="mt-1 max-w-2xl text-sm font-medium leading-6 text-[#0A1547]/60">
              Select a client once, then create offer payment links or upload-based checkout links from the workspace below.
            </p>
          </div>

          <label>
            <span className="text-xs font-extrabold uppercase tracking-[0.16em] text-[#0A1547]/45">Search client</span>
            <input
              type="search"
              value={clientSearch}
              onChange={(event) => setClientSearch(event.target.value)}
              placeholder="Search client email, name, office, phone"
              className="admin-focus mt-2 w-full rounded-xl border border-[#0A1547]/10 bg-[#F8F9FD] px-4 py-3 text-sm font-semibold text-[#0A1547] placeholder:text-[#0A1547]/38"
            />
          </label>
        </div>

        {loadingClients && (
          <p className="mt-4 rounded-xl bg-[#F8F9FD] px-4 py-3 text-sm font-medium text-[#0A1547]/58">
            Loading clients...
          </p>
        )}

        {clientsError && !loadingClients && (
          <p className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-700">
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
                  className={`admin-focus rounded-xl border px-4 py-3 text-left transition ${
                    active ? "border-[#A380F6]/55 bg-[#A380F6]/10" : "border-[#0A1547]/10 bg-[#F8F9FD] hover:border-[#A380F6]/35"
                  }`}
                >
                  <span className="flex flex-col gap-1 md:flex-row md:items-center md:justify-between">
                    <span className="min-w-0">
                      <span className="block break-all text-sm font-black text-[#0A1547]">{client.email}</span>
                      <span className="mt-1 block text-xs font-medium text-[#0A1547]/58">
                        {formatNullable(client.latestName)} / {formatNullable(client.latestOfficeName)}
                      </span>
                    </span>
                    <span className="shrink-0 rounded-full border border-[#0A1547]/10 bg-white px-3 py-1 text-xs font-bold text-[#0A1547]/60">
                      {client.uploadCount} uploads
                    </span>
                  </span>
                </button>
              );
            }) : (
              <p className="rounded-xl border border-[#0A1547]/10 bg-[#F8F9FD] px-4 py-3 text-sm font-medium text-[#0A1547]/56">
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
        <div className="admin-card p-8 text-center text-sm font-medium text-[#0A1547]/60">
          Loading selected client billing detail...
        </div>
      )}

      {selectedClientEmail && clientDetailError && !loadingClientDetail && (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-5 text-sm font-bold text-red-700">
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
            <section className="rounded-2xl border border-[#A380F6]/25 bg-[#A380F6]/10 p-5">
              <p className="text-sm font-black text-[#0A1547]">Read-only billing access</p>
              <p className="mt-1 text-sm font-semibold leading-6 text-[#0A1547]/62">
                You can inspect billing records, but creating checkout links requires billing write permission.
              </p>
            </section>
          )}
        </>
      )}

      {actionMessage && (
        <p className="rounded-2xl border border-[#02D99D]/25 bg-[#02D99D]/10 px-5 py-4 text-sm font-semibold text-[#0A1547]">
          {actionMessage}
        </p>
      )}

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
    <section className="admin-card p-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-[#A380F6]">Offer payment links</p>
          <h3 className="mt-2 text-lg font-black text-[#0A1547]">Create offer payment link</h3>
          <p className="mt-1 max-w-2xl text-sm font-medium leading-6 text-[#0A1547]/60">
            Select a client before creating an offer payment link.
          </p>
        </div>
        <span className="rounded-full border border-[#0A1547]/10 bg-[#F8F9FD] px-3 py-1 text-xs font-extrabold text-[#0A1547]/58">
          One-time offers
        </span>
      </div>
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
  const [offerType, setOfferType] = useState<OneTimeOfferType>("practice_opportunity_review");
  const selectedPreset = useMemo(
    () => oneTimeOfferPresets.find((offer) => offer.offerType === offerType) ?? oneTimeOfferPresets[0],
    [offerType],
  );
  const [amountDollars, setAmountDollars] = useState(centsToDollarInput(selectedPreset.amountCents));
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
    setDescription(selectedPreset.label);
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

    if (!cents) {
      setError("Enter a valid dollar amount greater than zero, using up to two decimal places.");
      return;
    }

    setCreating(true);

    try {
      const response = await createOfferPaymentLink(token, {
        clientEmail,
        offerType,
        offerName: selectedPreset.label,
        amount: cents,
        currency: "usd",
        description: trimmedDescription,
        ...(trimmedInternalNote ? { internalNote: trimmedInternalNote } : {}),
        ...(selectedSelectableUploadIds.length > 0 ? { uploadIds: selectedSelectableUploadIds } : {}),
        successUrl: `${window.location.origin}/payment-success`,
        cancelUrl: `${window.location.origin}/payment-cancel`,
      });

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
    <section className="admin-card p-5">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-[#A380F6]">Offer payment links</p>
          <h3 className="mt-2 text-lg font-black text-[#0A1547]">Create offer payment link</h3>
          <p className="mt-1 max-w-2xl text-sm font-medium leading-6 text-[#0A1547]/60">
            Create one-time payment links for Practice Opportunity Reviews and scoped consulting sprints. Recurring retainer links will be added separately.
          </p>
        </div>
        <span className="w-fit rounded-full border border-[#02D99D]/25 bg-[#02D99D]/10 px-3 py-1 text-xs font-extrabold text-[#0A1547]">
          One-time payment link
        </span>
      </div>

      <form onSubmit={handleSubmit} className="mt-5 space-y-4">
        <div className="grid gap-4 lg:grid-cols-[1fr_0.38fr_1fr]">
          <label className="block">
            <span className="text-sm font-extrabold text-[#0A1547]">Offer</span>
            <select
              value={offerType}
              onChange={(event) => setOfferType(event.target.value as OneTimeOfferType)}
              disabled={creating}
              className="admin-focus mt-2 h-12 w-full rounded-xl border border-[#0A1547]/10 bg-[#F8F9FD] px-4 py-3 text-sm font-semibold text-[#0A1547]"
            >
              {oneTimeOfferPresets.map((offer) => (
                <option key={offer.offerType} value={offer.offerType}>
                  {offer.label}
                </option>
              ))}
            </select>
            <span className="mt-2 block text-xs font-semibold leading-5 text-[#0A1547]/52">
              {selectedPreset.helper}
            </span>
          </label>

          <label className="block">
            <span className="text-sm font-extrabold text-[#0A1547]">Amount</span>
            <input
              type="text"
              inputMode="decimal"
              value={amountDollars}
              onChange={(event) => setAmountDollars(event.target.value)}
              disabled={creating}
              className="admin-focus mt-2 h-12 w-full rounded-xl border border-[#0A1547]/10 bg-[#F8F9FD] px-4 py-3 text-sm font-semibold text-[#0A1547]"
            />
            <span className="mt-2 block text-xs font-semibold text-[#0A1547]/52">USD / one-time</span>
          </label>

          <label className="block">
            <span className="text-sm font-extrabold text-[#0A1547]">Description</span>
            <input
              type="text"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              disabled={creating}
              className="admin-focus mt-2 h-12 w-full rounded-xl border border-[#0A1547]/10 bg-[#F8F9FD] px-4 py-3 text-sm font-semibold text-[#0A1547]"
            />
          </label>
        </div>

        <label className="block">
          <span className="text-sm font-extrabold text-[#0A1547]">Internal note</span>
          <textarea
            value={internalNote}
            onChange={(event) => setInternalNote(event.target.value)}
            disabled={creating}
            rows={3}
            placeholder="Optional admin-only context for this offer link."
            className="admin-focus mt-2 w-full rounded-xl border border-[#0A1547]/10 bg-[#F8F9FD] px-4 py-3 text-sm font-semibold text-[#0A1547] placeholder:text-[#0A1547]/38"
          />
        </label>

        <div className="rounded-2xl border border-[#0A1547]/10 bg-[#F8F9FD] p-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-sm font-extrabold text-[#0A1547]">Optional: link this payment to analyzed uploads</p>
              <p className="mt-1 text-sm font-medium leading-6 text-[#0A1547]/58">
                Leave uploads unchecked for standalone offer payments. Paid or voided uploads cannot be selected.
              </p>
            </div>
            <span className="rounded-full border border-[#0A1547]/10 bg-white px-3 py-1 text-xs font-bold text-[#0A1547]/60">
              {selectedSelectableUploadIds.length} selected
            </span>
          </div>

          <div className="mt-3 grid gap-2">
            {selectableUploads.length > 0 ? selectableUploads.map((upload) => (
              <label
                key={upload.id}
                className="flex cursor-pointer flex-col gap-2 rounded-xl border border-[#0A1547]/10 bg-white px-4 py-3 text-sm transition hover:border-[#A380F6]/35 md:flex-row md:items-center md:justify-between"
              >
                <span className="min-w-0">
                  <span className="block break-words font-black text-[#0A1547]">{formatNullable(upload.fileName)}</span>
                  <span className="mt-1 block text-xs font-medium text-[#0A1547]/52">
                    {formatNullable(upload.toolName)} / {formatDate(upload.uploadTime)}
                  </span>
                </span>
                <span className="flex shrink-0 items-center gap-2 text-xs font-extrabold text-[#0A1547]/62">
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
              <p className="rounded-xl border border-[#0A1547]/10 bg-white px-4 py-3 text-sm font-medium text-[#0A1547]/56">
                No unpaid active uploads are available for optional linking.
              </p>
            )}
          </div>
        </div>

        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <p className="text-xs font-semibold leading-5 text-[#0A1547]/52">
            This creates a Stripe Checkout link only. It does not send email, update GHL, deliver reports, or mark uploads paid from the dashboard.
          </p>
          <button
            type="submit"
            disabled={creating}
            className="admin-focus rounded-xl bg-[#A380F6] px-5 py-3 text-sm font-extrabold text-white shadow-lg shadow-[#A380F6]/20 transition hover:bg-[#906cf2] disabled:opacity-60"
          >
            {creating ? "Creating..." : "Create offer link"}
          </button>
        </div>
      </form>

      <p className="mt-4 rounded-xl border border-[#0A1547]/10 bg-white px-4 py-3 text-sm font-semibold text-[#0A1547]/62">
        Recurring retainer links coming later.
      </p>

      {error && (
        <p className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-700">
          {error}
        </p>
      )}

      {createdLink?.url && (
        <div className="mt-5 rounded-2xl border border-[#02D99D]/25 bg-[#02D99D]/10 p-4">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-sm font-black text-[#0A1547]">Offer payment link created.</p>
              <p className="mt-1 max-w-xl text-sm font-semibold text-[#0A1547]/62">
                {offerTypeLabel(createdLink.offerType)} / {billingModeLabel(createdLink.billingMode)} / Expires {formatMountainDate(createdLink.expiresAt ?? null)}
              </p>
              <p className="mt-1 text-xs font-semibold text-[#0A1547]/52">
                Status: {formatNullable(createdLink.status)} / Payment: {formatNullable(createdLink.paymentStatus)}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={() => void handleCopy()}
                className="admin-focus rounded-xl border border-[#0A1547]/10 bg-white px-4 py-2 text-sm font-extrabold text-[#0A1547] transition hover:border-[#A380F6]/50"
              >
                Copy link
              </button>
              <a
                href={createdLink.url}
                target="_blank"
                rel="noreferrer"
                className="admin-focus rounded-xl bg-[#0A1547] px-4 py-2 text-sm font-extrabold text-white transition hover:bg-[#1A2460]"
              >
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
    <section className="admin-card p-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-[#0A1547]/45">Selected client</p>
          <Link
            href={clientHref(detail.clientEmail)}
            className="admin-focus mt-2 block break-all text-xl font-black text-[#0A1547] underline decoration-[#A380F6]/35 underline-offset-4 transition hover:text-[#1A2460]"
          >
            {detail.clientEmail}
          </Link>
          <p className="mt-1 text-sm font-medium text-[#0A1547]/58">
            Current billing workspace for this client.
          </p>
        </div>
        <span className="rounded-full border border-[#02ABE0]/20 bg-[#02ABE0]/10 px-3 py-1 text-xs font-extrabold text-[#0A1547]">
          Billing workspace
        </span>
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
  const canUseCheckoutLink = checkoutUrl !== "" && !paid && !expired;
  const canExpire = canWriteBilling && isOpenSession(session);
  const clientEmail = session.clientEmail || "";
  const offerName = session.offerName || "";
  const isOfferSession = Boolean(offerName || session.offerType || session.billingMode);

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
          <p className="mt-2 text-sm font-medium text-[#0A1547]/62">
            {isOfferSession ? formatNullable(offerName || offerTypeLabel(session.offerType)) : formatNullable(session.purpose)}
          </p>
          {isOfferSession && (
            <div className="mt-2 flex flex-wrap gap-2">
              <span className="rounded-full border border-[#A380F6]/25 bg-white px-2.5 py-1 text-xs font-bold text-[#0A1547]/70">
                {offerTypeLabel(session.offerType)}
              </span>
              <span className="rounded-full border border-[#02D99D]/25 bg-white px-2.5 py-1 text-xs font-bold text-[#0A1547]/70">
                {billingModeLabel(session.billingMode)}
              </span>
            </div>
          )}
          <p className="mt-1 text-xs font-medium text-[#0A1547]/52">
            {formatDate(session.createdAt)} / {formatCurrency(session.amountTotal, session.currency)}
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
        <summary className="cursor-pointer text-xs font-extrabold uppercase tracking-[0.16em] text-[#0A1547]/50">
          Technical details
        </summary>
        <dl className="mt-3 grid gap-3 text-sm md:grid-cols-2">
          <Detail label="Stripe session ID" value={session.stripeCheckoutSessionId} />
          <Detail label="Internal session ID" value={session.id} />
          <Detail label="Offer name" value={session.offerName} />
          <Detail label="Offer type" value={offerTypeLabel(session.offerType)} />
          <Detail label="Billing mode" value={billingModeLabel(session.billingMode)} />
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
