import { useCallback, useEffect, useMemo, useState } from "react";
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

function statusTone(status: string | null): string {
  const normalized = status?.toLowerCase();

  if (normalized === "completed") {
    return "border-[#02D99D]/30 bg-[#02D99D]/12 text-[#0A1547]";
  }

  if (normalized === "error" || normalized === "failed") {
    return "border-red-200 bg-red-50 text-red-700";
  }

  return "border-[#02ABE0]/25 bg-[#02ABE0]/10 text-[#0A1547]";
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

  const totals = useMemo(() => {
    return clients.reduce(
      (summary, client) => ({
        submissions: summary.submissions + client.submissionCount,
        uploads: summary.uploads + client.uploadCount,
        paid: summary.paid + client.billing.paidCheckoutSessionCount,
        open: summary.open + client.billing.openCheckoutSessionCount,
      }),
      { submissions: 0, uploads: 0, paid: 0, open: 0 },
    );
  }, [clients]);

  return (
    <div className="space-y-6">
      <section className="grid gap-4 md:grid-cols-4">
        <MetricCard label="Clients" value={clients.length} accent="#A380F6" />
        <MetricCard label="Submissions" value={totals.submissions} accent="#02ABE0" />
        <MetricCard label="Uploads" value={totals.uploads} accent="#02D99D" />
        <MetricCard label="Open Payments" value={totals.open} accent="#1A2460" />
      </section>

      <section className="admin-card p-5">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-xl font-black text-[#0A1547]">Clients</h2>
            <p className="mt-1 text-sm font-medium text-[#0A1547]/58">
              Review client records, submissions, uploads, and status visibility. Billing counts are shown only when your role includes billing access.
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

function MetricCard({ accent, label, value }: { accent: string; label: string; value: number }) {
  return (
    <div className="admin-card p-5">
      <div className="h-1.5 w-12 rounded-full" style={{ backgroundColor: accent }} />
      <p className="mt-4 text-xs font-extrabold uppercase tracking-[0.18em] text-[#0A1547]/45">{label}</p>
      <p className="mt-2 text-3xl font-black text-[#0A1547]">{value}</p>
    </div>
  );
}

function ClientCard({ canReadBilling, client }: { canReadBilling: boolean; client: AdminClient }) {
  return (
    <article className="admin-card overflow-hidden">
      <div className="grid gap-5 border-b border-[#0A1547]/10 p-5 lg:grid-cols-[1.4fr_1fr]">
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <h3 className="text-xl font-black text-[#0A1547]">{client.email}</h3>
            <span className={`rounded-full border px-3 py-1 text-xs font-extrabold ${statusTone(client.latestStatus)}`}>
              {formatNullable(client.latestStatus)}
            </span>
          </div>
          <p className="mt-2 text-sm font-bold text-[#0A1547]/62">
            {formatNullable(client.latestName)} · {formatNullable(client.latestOfficeName)}
          </p>
          {canReadBilling ? (
            <Link
              href={`/clients/${encodeURIComponent(client.email)}`}
              className="admin-focus mt-4 inline-flex rounded-xl bg-[#0A1547] px-4 py-2 text-sm font-extrabold text-white transition hover:bg-[#1A2460]"
            >
              View details
            </Link>
          ) : (
            <p className="mt-4 rounded-xl border border-[#A380F6]/20 bg-[#A380F6]/10 px-4 py-2 text-sm font-bold text-[#0A1547]/68">
              Billing detail requires billing access.
            </p>
          )}
        </div>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4 lg:grid-cols-2">
          <Fact label="Submissions" value={client.submissionCount} />
          <Fact label="Uploads" value={client.uploadCount} />
          <Fact label="Latest Phone" value={formatNullable(client.latestPhone)} />
          <Fact label="Latest Submitted" value={formatDate(client.latestSubmittedAt)} />
        </div>
      </div>

      <div className="grid gap-4 p-5 lg:grid-cols-[1fr_1.2fr]">
        <div className="rounded-2xl bg-[#F8F9FD] p-4">
          <p className="text-xs font-extrabold uppercase tracking-[0.18em] text-[#0A1547]/45">Client detail</p>
          <dl className="mt-3 grid gap-3 text-sm">
            <Detail label="Organization" value={client.latestOrgType} />
            <Detail label="Office / Group" value={client.latestOfficeName} />
            <Detail label="Phone" value={client.latestPhone} />
          </dl>
        </div>

        <div className="rounded-2xl bg-[#F8F9FD] p-4">
          <p className="text-xs font-extrabold uppercase tracking-[0.18em] text-[#0A1547]/45">Billing summary</p>
          <div className="mt-3 grid gap-3 sm:grid-cols-5">
            <BillingFact label="Sessions" value={client.billing.checkoutSessionCount} />
            <BillingFact label="Paid" value={client.billing.paidCheckoutSessionCount} tone="green" />
            <BillingFact label="Open" value={client.billing.openCheckoutSessionCount} tone="teal" />
            <BillingFact label="Overrides" value={client.billing.manualOverrideCount} tone="lilac" />
            <BillingFact label="Latest" value={formatNullable(client.billing.latestPaymentStatus)} />
          </div>
        </div>
      </div>
    </article>
  );
}

function Fact({ label, value }: { label: string; value: string | number }) {
  return (
    <div>
      <p className="text-xs font-extrabold uppercase tracking-[0.14em] text-[#0A1547]/40">{label}</p>
      <p className="mt-1 text-sm font-black text-[#0A1547]">{value}</p>
    </div>
  );
}

function Detail({ label, value }: { label: string; value: string | null }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <dt className="font-bold text-[#0A1547]/55">{label}</dt>
      <dd className="text-right font-black text-[#0A1547]">{formatNullable(value)}</dd>
    </div>
  );
}

function BillingFact({
  label,
  tone,
  value,
}: {
  label: string;
  tone?: "green" | "teal" | "lilac";
  value: string | number;
}) {
  const color = tone === "green" ? "#02D99D" : tone === "teal" ? "#02ABE0" : tone === "lilac" ? "#A380F6" : "#0A1547";

  return (
    <div className="rounded-xl border border-[#0A1547]/10 bg-white p-3">
      <p className="text-xs font-extrabold uppercase tracking-[0.14em] text-[#0A1547]/40">{label}</p>
      <p className="mt-2 text-lg font-black" style={{ color }}>{value}</p>
    </div>
  );
}
