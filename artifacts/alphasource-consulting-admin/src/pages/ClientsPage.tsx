import { useCallback, useEffect, useState } from "react";
import { Link } from "wouter";
import { useAuth } from "@/auth/AuthProvider";
import { AdminApiError, getAdminClients } from "@/lib/adminApi";
import type { AdminClient } from "@/lib/types";

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

  const token = session?.access_token || "";
  const canReadBilling = permissions.canReadBilling;

  const loadClients = useCallback(async (signal?: AbortSignal) => {
    if (!token) {
      return;
    }

    setLoading(true);
    setError("");

    try {
      const response = await getAdminClients(token, {
        search,
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
      </section>

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

function Fact({ label, value }: { label: string; value: string | number }) {
  return (
    <div>
      <p className="text-xs font-bold uppercase tracking-[0.12em] text-[#0A1547]/42">{label}</p>
      <p className="mt-1 break-words text-sm font-semibold text-[#0A1547]">{value}</p>
    </div>
  );
}
