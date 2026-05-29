import { useCallback, useEffect, useState, type FormEvent } from "react";
import { Link } from "wouter";
import { useAuth } from "@/auth/AuthProvider";
import { AdminApiError, createAdminClient, getAdminClients } from "@/lib/adminApi";
import type { AdminClient, CreateAdminClientRequest } from "@/lib/types";

type NewClientForm = {
  firstName: string;
  lastName: string;
  email: string;
  officeName: string;
  orgType: string;
  phone: string;
};

const emptyNewClientForm: NewClientForm = {
  firstName: "",
  lastName: "",
  email: "",
  officeName: "",
  orgType: "",
  phone: "",
};

type IconName = "arrow" | "lock" | "plus" | "search" | "users";
type IconTone = "clients" | "billing" | "analysis" | "secure" | "success" | "warning" | "danger" | "neutral" | "lilac";

const sectionClassName = "rounded-lg border border-[#0A1547]/10 bg-white shadow-[0_12px_28px_rgba(10,21,71,0.05)]";
const compactRowClassName = "rounded-lg border border-[#0A1547]/10 bg-white p-4";
const inputClassName = "admin-focus mt-2 h-11 w-full rounded-lg border border-[#0A1547]/10 bg-[#F8F9FD] px-4 text-sm font-medium text-[#0A1547] placeholder:text-[#0A1547]/38";
const selectClassName = "admin-focus mt-2 h-11 w-full rounded-lg border border-[#0A1547]/10 bg-[#F8F9FD] px-4 text-sm font-medium leading-tight text-[#0A1547]";

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

function statusTone(value: string | null | undefined): string {
  const normalized = value?.toLowerCase();

  if (normalized === "paid" || normalized === "complete" || normalized === "completed" || normalized === "active") {
    return "border-[#02D99D]/30 bg-[#02D99D]/10 text-[#0A1547]/80";
  }

  if (normalized === "open" || normalized === "submitted" || normalized === "processing" || normalized === "unpaid") {
    return "border-[#02ABE0]/30 bg-[#02ABE0]/10 text-[#0A1547]/75";
  }

  if (normalized === "needs_review" || normalized === "past_due" || normalized === "incomplete") {
    return "border-amber-200 bg-amber-50 text-amber-700/90";
  }

  if (normalized === "failed" || normalized === "error" || normalized === "canceled" || normalized === "cancelled") {
    return "border-red-200 bg-red-50 text-red-700/90";
  }

  return "border-[#0A1547]/10 bg-[#F8F9FD] text-[#0A1547]/58";
}

export default function ClientsPage() {
  const { permissions, session } = useAuth();
  const [clients, setClients] = useState<AdminClient[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showAddClient, setShowAddClient] = useState(false);
  const [newClientForm, setNewClientForm] = useState<NewClientForm>(emptyNewClientForm);
  const [creatingClient, setCreatingClient] = useState(false);
  const [createError, setCreateError] = useState("");
  const [createSuccess, setCreateSuccess] = useState("");

  const token = session?.access_token || "";
  const canReadBilling = permissions.canReadBilling;
  const canWriteClients = permissions.canWriteClients;

  const loadClients = useCallback(async (signal?: AbortSignal, searchOverride = search) => {
    if (!token) {
      return;
    }

    setLoading(true);
    setError("");

    try {
      const response = await getAdminClients(token, {
        search: searchOverride,
        limit: 25,
      }, signal);
      setClients(response.items);
    } catch (clientError) {
      if (clientError instanceof DOMException && clientError.name === "AbortError") {
        return;
      }

      if (clientError instanceof AdminApiError) {
        setError(clientError.message);
      } else {
        setError("Client data could not be loaded.");
      }
    } finally {
      if (!signal?.aborted) {
        setLoading(false);
      }
    }
  }, [search, token]);

  useEffect(() => {
    const controller = new AbortController();
    const timeout = window.setTimeout(() => {
      void loadClients(controller.signal);
    }, 250);

    return () => {
      window.clearTimeout(timeout);
      controller.abort();
    };
  }, [loadClients]);

  const updateNewClientForm = (field: keyof NewClientForm, value: string) => {
    setNewClientForm((current) => ({ ...current, [field]: value }));
  };

  const openAddClient = () => {
    setCreateError("");
    setCreateSuccess("");
    setShowAddClient(true);
  };

  const closeAddClient = () => {
    if (creatingClient) {
      return;
    }

    setShowAddClient(false);
    setCreateError("");
  };

  const handleCreateClient = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const payload: CreateAdminClientRequest = {
      email: newClientForm.email.trim(),
      firstName: newClientForm.firstName.trim(),
      lastName: newClientForm.lastName.trim(),
      officeName: newClientForm.officeName.trim(),
      orgType: newClientForm.orgType.trim(),
      ...(newClientForm.phone.trim() ? { phone: newClientForm.phone.trim() } : {}),
    };

    setCreateError("");
    setCreateSuccess("");

    if (!payload.firstName || !payload.lastName || !payload.email || !payload.officeName || !payload.orgType) {
      setCreateError("First name, last name, email, office/group name, and organization type are required.");
      return;
    }

    if (!payload.email.includes("@")) {
      setCreateError("Enter a valid client email.");
      return;
    }

    if (!token || creatingClient) {
      return;
    }

    setCreatingClient(true);

    try {
      const response = await createAdminClient(token, payload);
      const createdEmail = response.client.email || payload.email;
      setNewClientForm(emptyNewClientForm);
      setShowAddClient(false);
      setSearch(createdEmail);
      setCreateSuccess(`Client record created for ${createdEmail}. Secure Upload requests can now be sent separately.`);
      await loadClients(undefined, createdEmail);
    } catch (createClientError) {
      if (createClientError instanceof AdminApiError) {
        setCreateError(createClientError.code === "client_already_exists"
          ? "A client already exists for this email. Search for the email or continue from Secure Uploads."
          : createClientError.message);
      } else {
        setCreateError("Client record could not be created.");
      }
    } finally {
      setCreatingClient(false);
    }
  };

  return (
    <div className="space-y-5">
      <section className={`${sectionClassName} px-5 py-4`}>
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div className="flex min-w-0 items-start gap-3">
            <IconBadge icon="users" tone="clients" />
            <div className="min-w-0">
              <h2 className="text-2xl font-black text-[#0A1547]">Clients</h2>
              <p className="mt-1 max-w-2xl text-sm font-medium leading-6 text-[#0A1547]/56">
                Search, review, and open client records across submissions, uploads, and billing visibility.
              </p>
            </div>
          </div>
          {canWriteClients && (
            <button
              type="button"
              onClick={openAddClient}
              className="admin-focus inline-flex w-fit items-center gap-2 rounded-lg bg-[#A380F6] px-4 py-2.5 text-sm font-bold text-white transition hover:bg-[#906cf2]"
            >
              <Icon name="plus" size={16} />
              Add client
            </button>
          )}
        </div>
      </section>

      <section className={`${sectionClassName} p-4`}>
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="min-w-0">
            <h3 className="text-lg font-black text-[#0A1547]">Client directory</h3>
            <p className="mt-1 text-sm font-medium text-[#0A1547]/54">
              Billing details appear only when your role includes billing access.
            </p>
          </div>
          <label className="relative w-full md:w-96">
            <span className="sr-only">Search clients</span>
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#02ABE0]">
              <Icon name="search" size={17} />
            </span>
            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search email, name, office, phone"
              className="admin-focus h-11 w-full rounded-lg border border-[#0A1547]/10 bg-[#F8F9FD] pl-10 pr-4 text-sm font-medium text-[#0A1547] placeholder:text-[#0A1547]/38"
            />
          </label>
        </div>
      </section>

      {createSuccess && (
        <div className="rounded-lg border border-[#02D99D]/25 bg-[#02D99D]/10 p-4 text-sm font-medium text-[#0A1547]/72">
          {createSuccess}
        </div>
      )}

      {loading && (
        <div className={`${sectionClassName} p-8 text-center text-sm font-medium text-[#0A1547]/56`}>
          Loading clients...
        </div>
      )}

      {error && !loading && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-5 text-sm font-semibold text-red-700">
          {error}
        </div>
      )}

      {!loading && !error && clients.length === 0 && (
        <div className={`${sectionClassName} p-8 text-center`}>
          <div className="mx-auto w-fit">
            <IconBadge icon="users" tone="neutral" />
          </div>
          <h3 className="text-lg font-black text-[#0A1547]">No clients found</h3>
          <p className="mt-2 text-sm font-medium text-[#0A1547]/56">
            Try a different search term or clear the search field.
          </p>
        </div>
      )}

      {!loading && !error && clients.length > 0 && (
        <section className="grid gap-3">
          {clients.map((client) => (
            <ClientCard key={client.email} canReadBilling={canReadBilling} client={client} />
          ))}
        </section>
      )}

      {showAddClient && (
        <AddNewClientModal
          error={createError}
          form={newClientForm}
          loading={creatingClient}
          onChange={updateNewClientForm}
          onClose={closeAddClient}
          onSubmit={handleCreateClient}
        />
      )}
    </div>
  );
}

function ClientCard({ canReadBilling, client }: { canReadBilling: boolean; client: AdminClient }) {
  const primaryName = client.latestName || client.latestOfficeName || client.email;
  const contextParts = [
    client.latestOfficeName,
    client.latestOrgType,
    client.latestPhone,
  ].filter(Boolean);
  const latestStatus = client.latestStatus ? formatStatusLabel(client.latestStatus) : null;
  const latestPaymentStatus = client.billing?.latestPaymentStatus ? formatStatusLabel(client.billing.latestPaymentStatus) : null;

  return (
    <article className={compactRowClassName}>
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.25fr)_minmax(360px,1fr)_auto] xl:items-center">
        <div className="flex min-w-0 items-start gap-3">
          <IconBadge icon="users" tone="clients" />
          <div className="min-w-0">
            <h3 className="truncate text-base font-bold text-[#0A1547]">{primaryName}</h3>
            <p className="mt-1 break-all text-sm font-medium text-[#0A1547]/58">{client.email}</p>
            {contextParts.length > 0 && (
              <p className="mt-1 truncate text-xs font-medium text-[#0A1547]/44">
                {contextParts.join(" / ")}
              </p>
            )}
            <div className="mt-2 flex flex-wrap gap-2">
              {latestStatus && (
                <StatusChip label={latestStatus} toneClassName={statusTone(client.latestStatus)} />
              )}
              {latestPaymentStatus && canReadBilling && (
                <StatusChip label={latestPaymentStatus} toneClassName={statusTone(client.billing.latestPaymentStatus)} />
              )}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <Fact label="Submissions" value={client.submissionCount} />
          <Fact label="Uploads" value={client.uploadCount} />
          <Fact label="Latest submitted" value={formatDate(client.latestSubmittedAt)} />
        </div>

        <div className="flex flex-col gap-2 xl:items-end">
          {canReadBilling && (
            <div className="flex flex-wrap gap-2 xl:justify-end">
              <MetricChip label="Open" value={client.billing.openCheckoutSessionCount} tone="billing" />
              <MetricChip label="Paid" value={client.billing.paidCheckoutSessionCount} tone="success" />
            </div>
          )}
          {canReadBilling ? (
            <Link
              href={`/clients/${encodeURIComponent(client.email)}`}
              className="admin-focus inline-flex w-fit items-center gap-2 rounded-lg bg-[#0A1547] px-4 py-2 text-sm font-bold text-white transition hover:bg-[#1A2460]"
            >
              <Icon name="arrow" size={15} />
              View details
            </Link>
          ) : (
            <p className="inline-flex w-fit items-center gap-2 rounded-lg border border-[#A380F6]/20 bg-[#A380F6]/10 px-4 py-2 text-sm font-medium text-[#0A1547]/68">
              <Icon name="lock" size={15} />
              Billing detail requires billing access.
            </p>
          )}
        </div>
      </div>
    </article>
  );
}

function AddNewClientModal({
  error,
  form,
  loading,
  onChange,
  onClose,
  onSubmit,
}: {
  error: string;
  form: NewClientForm;
  loading: boolean;
  onChange: (field: keyof NewClientForm, value: string) => void;
  onClose: () => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0A1547]/45 p-4">
      <div
        aria-labelledby="add-client-title"
        aria-modal="true"
        role="dialog"
        className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-lg bg-white shadow-2xl"
      >
        <div className="flex items-start justify-between gap-4 border-b border-[#0A1547]/10 px-5 py-4">
          <div className="flex min-w-0 items-start gap-3">
            <IconBadge compact icon="users" tone="clients" />
            <div className="min-w-0">
              <h3 id="add-client-title" className="text-lg font-black text-[#0A1547]">Add client</h3>
              <p className="mt-1 max-w-xl text-sm font-medium leading-6 text-[#0A1547]/56">
                Create a client record before uploads or submissions exist.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="admin-focus rounded-lg border border-[#0A1547]/10 bg-white px-4 py-2 text-sm font-semibold text-[#0A1547]/82 transition hover:border-[#A380F6]/60 disabled:cursor-not-allowed disabled:opacity-55"
          >
            Close
          </button>
        </div>

        <form onSubmit={onSubmit} className="p-5">
          <div className="grid gap-4 md:grid-cols-2">
            <TextField label="First name" value={form.firstName} onChange={(value) => onChange("firstName", value)} required />
            <TextField label="Last name" value={form.lastName} onChange={(value) => onChange("lastName", value)} required />
            <TextField label="Email" type="email" value={form.email} onChange={(value) => onChange("email", value)} required />
            <TextField label="Office / Group name" value={form.officeName} onChange={(value) => onChange("officeName", value)} required />
            <label className="block">
              <span className="text-sm font-semibold text-[#0A1547]">
                Organization type <span className="text-red-600">*</span>
              </span>
              <select
                value={form.orgType}
                onChange={(event) => onChange("orgType", event.target.value)}
                className={selectClassName}
                required
              >
                <option value="">Select type</option>
                <option value="Group">Group</option>
                <option value="Location">Location</option>
              </select>
            </label>
            <TextField label="Phone" value={form.phone} onChange={(value) => onChange("phone", value)} />
          </div>

          {error && (
            <p className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
              {error}
            </p>
          )}

          <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="admin-focus rounded-lg border border-[#0A1547]/10 bg-white px-4 py-2 text-sm font-semibold text-[#0A1547]/82 transition hover:border-[#A380F6]/60 disabled:cursor-not-allowed disabled:opacity-55"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="admin-focus rounded-lg bg-[#A380F6] px-4 py-2 text-sm font-bold text-white transition hover:bg-[#906cf2] disabled:cursor-not-allowed disabled:opacity-55"
            >
              {loading ? "Creating..." : "Create client"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function TextField({
  label,
  onChange,
  required = false,
  type = "text",
  value,
}: {
  label: string;
  onChange: (value: string) => void;
  required?: boolean;
  type?: string;
  value: string;
}) {
  return (
    <label className="block">
      <span className="text-sm font-semibold text-[#0A1547]">
        {label}
        {required && <span className="text-red-600"> *</span>}
      </span>
      <input
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className={inputClassName}
        required={required}
      />
    </label>
  );
}

function Fact({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="min-w-0 rounded-lg border border-[#0A1547]/10 bg-[#F8F9FD] px-3 py-2.5">
      <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-[#0A1547]/38">{label}</p>
      <p className="mt-1 truncate text-sm font-semibold text-[#0A1547]/82">{value}</p>
    </div>
  );
}

function MetricChip({ label, tone, value }: { label: string; tone: IconTone; value: number }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-lg border border-[#0A1547]/10 bg-[#F8F9FD] px-3 py-1.5 text-xs font-medium text-[#0A1547]/62">
      <span className={iconToneClassName(tone)}>{value}</span>
      {label}
    </span>
  );
}

function StatusChip({ label, toneClassName }: { label: string; toneClassName: string }) {
  return (
    <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${toneClassName}`}>
      {label}
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
    case "billing":
      return "text-[#02ABE0]";
    case "analysis":
      return "text-[#00CFC8]";
    case "secure":
    case "warning":
      return "text-[#F59E0B]";
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
    case "arrow":
      return (
        <>
          <path d="M5 12h14" />
          <path d="m12 5 7 7-7 7" />
        </>
      );
    case "lock":
      return (
        <>
          <rect height="11" rx="2" width="16" x="4" y="10" />
          <path d="M8 10V7a4 4 0 0 1 8 0v3" />
        </>
      );
    case "plus":
      return (
        <>
          <path d="M12 5v14" />
          <path d="M5 12h14" />
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
