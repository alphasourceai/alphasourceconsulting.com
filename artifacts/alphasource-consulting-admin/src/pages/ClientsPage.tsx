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

const inputClassName = "admin-focus mt-2 w-full rounded-xl border border-[#0A1547]/10 bg-[#F8F9FD] px-4 py-3 text-sm font-medium text-[#0A1547] placeholder:text-[#0A1547]/38";

function formatNullable(value: string | number | null | undefined): string {
  if (value === null || value === undefined || value === "") {
    return "—";
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
    <div className="space-y-6">
      <section className="admin-card p-5">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-xl font-black text-[#0A1547]">Search Clients</h2>
            <p className="mt-1 text-sm font-medium text-[#0A1547]/58">
              Review client records, submissions, uploads, and status visibility. Detailed billing records are shown only when your role includes billing access.
            </p>
          </div>
          <div className="flex w-full flex-col gap-3 sm:flex-row md:w-auto md:items-center">
            {canWriteClients && (
              <button
                type="button"
                onClick={openAddClient}
                className="admin-focus rounded-xl bg-[#0A1547] px-4 py-3 text-sm font-extrabold text-white transition hover:bg-[#1A2460]"
              >
                Add New Client
              </button>
            )}
            <label className="w-full md:w-80">
              <span className="sr-only">Search clients</span>
              <input
                type="search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search email, name, office, phone"
                className="admin-focus w-full rounded-xl border border-[#0A1547]/10 bg-[#F8F9FD] px-4 py-3 text-sm font-semibold text-[#0A1547] placeholder:text-[#0A1547]/38"
              />
            </label>
          </div>
        </div>
      </section>

      {createSuccess && (
        <div className="rounded-2xl border border-[#02D99D]/25 bg-[#02D99D]/10 p-4 text-sm font-medium text-[#0A1547]/72">
          {createSuccess}
        </div>
      )}

      {loading && (
        <div className="admin-card p-8 text-center text-sm font-bold text-[#0A1547]/60">
          Loading clients...
        </div>
      )}

      {error && !loading && (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-5 text-sm font-bold text-red-700">
          {error}
        </div>
      )}

      {!loading && !error && clients.length === 0 && (
        <div className="admin-card p-8 text-center">
          <h3 className="text-lg font-black text-[#0A1547]">No clients found</h3>
          <p className="mt-2 text-sm font-medium text-[#0A1547]/60">
            Try a different search term or clear the search field.
          </p>
        </div>
      )}

      {!loading && !error && clients.length > 0 && (
        <section className="grid gap-4">
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
  return (
    <article className="admin-card p-5">
      <div className="grid gap-5 lg:grid-cols-[1.2fr_1.4fr_auto] lg:items-center">
        <div className="min-w-0">
          <h3 className="break-words text-lg font-black text-[#0A1547]">{client.email}</h3>
          <p className="mt-2 text-sm font-medium text-[#0A1547]/62">
            {formatNullable(client.latestName)} · {formatNullable(client.latestOfficeName)}
          </p>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <Fact label="Submissions" value={client.submissionCount} />
          <Fact label="Uploads" value={client.uploadCount} />
          <Fact label="Latest submitted" value={formatDate(client.latestSubmittedAt)} />
        </div>

        <div className="lg:text-right">
          {canReadBilling ? (
            <Link
              href={`/clients/${encodeURIComponent(client.email)}`}
              className="admin-focus inline-flex rounded-xl bg-[#0A1547] px-4 py-2 text-sm font-extrabold text-white transition hover:bg-[#1A2460]"
            >
              View details
            </Link>
          ) : (
            <p className="rounded-xl border border-[#A380F6]/20 bg-[#A380F6]/10 px-4 py-2 text-sm font-medium text-[#0A1547]/68">
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
        className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white shadow-2xl"
      >
        <div className="flex items-start justify-between gap-4 border-b border-[#0A1547]/10 px-5 py-4">
          <div className="min-w-0">
            <p className="text-xs font-extrabold uppercase tracking-[0.18em] text-[#A380F6]">Clients</p>
            <h3 id="add-client-title" className="mt-1 text-lg font-black text-[#0A1547]">Add New Client</h3>
            <p className="mt-1 max-w-xl text-sm font-medium leading-6 text-[#0A1547]/62">
              Create a client record before uploads or submissions exist. This allows Secure Upload requests to be sent to net-new clients as a separate action.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="admin-focus rounded-xl border border-[#0A1547]/10 bg-white px-4 py-2 text-sm font-extrabold text-[#0A1547] transition hover:border-[#A380F6]/60 disabled:cursor-not-allowed disabled:opacity-55"
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
            <TextField label="Organization type" value={form.orgType} onChange={(value) => onChange("orgType", value)} required />
            <TextField label="Phone" value={form.phone} onChange={(value) => onChange("phone", value)} />
          </div>

          {error && (
            <p className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-700">
              {error}
            </p>
          )}

          <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="admin-focus rounded-xl border border-[#0A1547]/10 bg-white px-4 py-2 text-sm font-extrabold text-[#0A1547] transition hover:border-[#A380F6]/60 disabled:cursor-not-allowed disabled:opacity-55"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="admin-focus rounded-xl bg-[#0A1547] px-4 py-2 text-sm font-extrabold text-white transition hover:bg-[#1A2460] disabled:cursor-not-allowed disabled:opacity-55"
            >
              {loading ? "Creating..." : "Create Client"}
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
    <div>
      <p className="text-xs font-bold uppercase tracking-[0.12em] text-[#0A1547]/42">{label}</p>
      <p className="mt-1 break-words text-sm font-semibold text-[#0A1547]">{value}</p>
    </div>
  );
}
