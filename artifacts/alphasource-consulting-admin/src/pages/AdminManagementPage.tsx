import { useCallback, useEffect, useState, type FormEvent, type ReactNode } from "react";
import { useAuth } from "@/auth/AuthProvider";
import { AdminApiError, createAdminUserAccess, getAdminMe, getAdminUsers } from "@/lib/adminApi";
import type { AdminAccess, AdminAccessUser, CreateAdminUserAccessRequest } from "@/lib/types";

function formatNullable(value: string | number | null | undefined): string {
  if (value === null || value === undefined || value === "") {
    return "-";
  }
  return String(value);
}

function formatDate(value: string | null): string {
  if (!value) {
    return "-";
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

function fallbackAdminFromResponse(admin: AdminAccess | undefined, userId: string, email: string, role: string): AdminAccess {
  return admin ?? {
    id: userId,
    email,
    role: role || "admin",
    status: "active",
  };
}

export default function AdminManagementPage() {
  const { session } = useAuth();
  const token = session?.access_token || "";
  const [currentAdmin, setCurrentAdmin] = useState<AdminAccess | null>(null);
  const [adminUsers, setAdminUsers] = useState<AdminAccessUser[]>([]);
  const [canManageAdminAccess, setCanManageAdminAccess] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [newAdminName, setNewAdminName] = useState("");
  const [newAdminEmail, setNewAdminEmail] = useState("");
  const [newAdminRole, setNewAdminRole] = useState<CreateAdminUserAccessRequest["role"]>("admin");
  const [savingAdminAccess, setSavingAdminAccess] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [saveSuccess, setSaveSuccess] = useState("");

  const loadAdminAccess = useCallback(async (signal?: AbortSignal) => {
    if (!token) {
      return;
    }

    setLoading(true);
    setError("");

    try {
      const [meResponse, usersResponse] = await Promise.all([
        getAdminMe(token, signal),
        getAdminUsers(token, signal),
      ]);
      setCurrentAdmin(
        fallbackAdminFromResponse(
          meResponse.admin,
          meResponse.user.id,
          meResponse.user.email,
          meResponse.role,
        ),
      );
      setCanManageAdminAccess(meResponse.permissions?.canManageAdminAccess === true);
      setAdminUsers(usersResponse.items);
    } catch (loadError) {
      if (loadError instanceof DOMException && loadError.name === "AbortError") {
        return;
      }

      if (loadError instanceof AdminApiError) {
        setError(loadError.message);
      } else {
        setError("Admin access could not be loaded.");
      }
    } finally {
      if (!signal?.aborted) {
        setLoading(false);
      }
    }
  }, [token]);

  useEffect(() => {
    const controller = new AbortController();
    void loadAdminAccess(controller.signal);

    return () => {
      controller.abort();
    };
  }, [loadAdminAccess]);

  const handleAddAdminAccess = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const name = newAdminName.trim();
    const email = newAdminEmail.trim();

    setSaveError("");
    setSaveSuccess("");

    if (!name || !email) {
      setSaveError("Name and email are required.");
      return;
    }

    if (!token || savingAdminAccess) {
      return;
    }

    setSavingAdminAccess(true);

    try {
      const response = await createAdminUserAccess(token, {
        name,
        email,
        role: newAdminRole,
      });
      const addedEmail = response.adminUser.email || email;
      const inviteMessage = response.auth?.inviteSent
        ? " An invite email was sent."
        : "";
      setNewAdminName("");
      setNewAdminEmail("");
      setNewAdminRole("admin");
      await loadAdminAccess();
      setSaveSuccess(`Admin access added for ${addedEmail}.${inviteMessage}`);
    } catch (saveFailure) {
      if (saveFailure instanceof AdminApiError) {
        setSaveError(saveFailure.message);
      } else {
        setSaveError("Admin access could not be added.");
      }
    } finally {
      setSavingAdminAccess(false);
    }
  };

  return (
    <div className="space-y-6">
      <section className="admin-card p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="max-w-3xl">
            <p className="text-xs font-extrabold uppercase tracking-[0.2em] text-[#A380F6]">Admin Management</p>
            <h2 className="mt-3 text-2xl font-black text-[#0A1547]">Admin access visibility</h2>
            <p className="mt-2 text-sm font-semibold leading-6 text-[#0A1547]/62">
              Supabase Auth controls sign-in. The Admin API grants dashboard access through the admin_users access list.
            </p>
          </div>
          <button
            type="button"
            onClick={() => void loadAdminAccess()}
            disabled={loading}
            className="admin-focus rounded-xl bg-[#0A1547] px-5 py-3 text-sm font-extrabold text-white transition hover:bg-[#1A2460] disabled:cursor-not-allowed disabled:opacity-55"
          >
            {loading ? "Refreshing..." : "Refresh"}
          </button>
        </div>
      </section>

      {loading && (
        <div className="admin-card p-8 text-center text-sm font-bold text-[#0A1547]/60">
          Loading admin access...
        </div>
      )}

      {error && !loading && (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-5 text-sm font-bold text-red-700">
          {error}
        </div>
      )}

      {!loading && !error && currentAdmin && (
        <section className="admin-card p-5">
          <h3 className="text-lg font-black text-[#0A1547]">Current admin session</h3>
          <dl className="mt-5 grid gap-4 text-sm md:grid-cols-2 xl:grid-cols-4">
            <Detail label="Email" value={currentAdmin.email} />
            <Detail label="Supabase Auth user ID" value={currentAdmin.id} />
            <Detail label="Role" value={currentAdmin.role} />
            <Detail label="Status" value={currentAdmin.status} />
          </dl>
        </section>
      )}

      {!loading && !error && (
        <section className={`rounded-2xl border p-5 ${canManageAdminAccess ? "border-[#02D99D]/25 bg-[#02D99D]/10" : "border-[#A380F6]/25 bg-[#A380F6]/10"}`}>
          <p className="text-sm font-extrabold text-[#0A1547]">
            {canManageAdminAccess
              ? "Admin access management is enabled for this account. Add dashboard access by name, email, and role."
              : "You can view admin access, but this account cannot manage admin access."}
          </p>
        </section>
      )}

      {!loading && !error && canManageAdminAccess && (
        <section className="admin-card p-5">
          <div className="max-w-3xl">
            <h3 className="text-lg font-black text-[#0A1547]">Add admin access</h3>
            <p className="mt-2 text-sm font-semibold leading-6 text-[#0A1547]/62">
              Enter the admin&apos;s name, email, and role. If they do not already have a Supabase Auth account, an invite email will be sent.
            </p>
          </div>

          <form onSubmit={handleAddAdminAccess} className="mt-5 grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_180px_auto] lg:items-end">
            <label className="block">
              <span className="text-xs font-extrabold uppercase tracking-[0.14em] text-[#0A1547]/45">
                Name
              </span>
              <input
                type="text"
                value={newAdminName}
                onChange={(event) => setNewAdminName(event.target.value)}
                placeholder="Jane Smith"
                className="admin-focus mt-2 w-full rounded-xl border border-[#0A1547]/12 bg-white px-4 py-3 text-sm font-bold text-[#0A1547] outline-none"
              />
            </label>
            <label className="block">
              <span className="text-xs font-extrabold uppercase tracking-[0.14em] text-[#0A1547]/45">
                Email
              </span>
              <input
                type="email"
                value={newAdminEmail}
                onChange={(event) => setNewAdminEmail(event.target.value)}
                placeholder="person@example.com"
                className="admin-focus mt-2 w-full rounded-xl border border-[#0A1547]/12 bg-white px-4 py-3 text-sm font-bold text-[#0A1547] outline-none"
              />
            </label>
            <label className="block">
              <span className="text-xs font-extrabold uppercase tracking-[0.14em] text-[#0A1547]/45">
                Role
              </span>
              <select
                value={newAdminRole}
                onChange={(event) => setNewAdminRole(event.target.value as CreateAdminUserAccessRequest["role"])}
                className="admin-focus mt-2 w-full rounded-xl border border-[#0A1547]/12 bg-white px-4 py-3 text-sm font-bold text-[#0A1547] outline-none"
              >
                <option value="admin">admin</option>
                <option value="super_admin">super_admin</option>
              </select>
            </label>
            <button
              type="submit"
              disabled={savingAdminAccess}
              className="admin-focus rounded-xl bg-[#0A1547] px-5 py-3 text-sm font-extrabold text-white transition hover:bg-[#1A2460] disabled:cursor-not-allowed disabled:opacity-55"
            >
              {savingAdminAccess ? "Adding..." : "Add access"}
            </button>
          </form>

          {saveSuccess && (
            <div className="mt-4 rounded-2xl border border-[#02D99D]/25 bg-[#02D99D]/10 p-4 text-sm font-bold text-[#0A1547]">
              {saveSuccess}
            </div>
          )}

          {saveError && (
            <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-bold text-red-700">
              {saveError}
            </div>
          )}
        </section>
      )}

      {!loading && !error && (
        <section className="admin-card overflow-hidden">
          <div className="border-b border-[#0A1547]/10 p-5">
            <h3 className="text-lg font-black text-[#0A1547]">Admin access list</h3>
            <p className="mt-2 text-sm font-semibold leading-6 text-[#0A1547]/62">
              Role editing and deactivation are intentionally disabled until the permission model is finalized.
            </p>
          </div>

          {adminUsers.length === 0 ? (
            <div className="p-8 text-center text-sm font-bold text-[#0A1547]/60">
              No admin access rows were returned.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-[#0A1547]/10 text-left text-sm">
                <thead className="bg-[#F8F9FD]">
                  <tr>
                    <HeaderCell>Name</HeaderCell>
                    <HeaderCell>Email</HeaderCell>
                    <HeaderCell>Supabase Auth user ID</HeaderCell>
                    <HeaderCell>Role</HeaderCell>
                    <HeaderCell>Status</HeaderCell>
                    <HeaderCell>Created</HeaderCell>
                    <HeaderCell>Updated</HeaderCell>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#0A1547]/10 bg-white">
                  {adminUsers.map((adminUser) => (
                    <tr key={adminUser.userId}>
                      <BodyCell>{adminUser.displayName || "-"}</BodyCell>
                      <BodyCell>{adminUser.email || "Email not stored yet"}</BodyCell>
                      <BodyCell>{formatNullable(adminUser.userId)}</BodyCell>
                      <BodyCell>{formatNullable(adminUser.role)}</BodyCell>
                      <BodyCell>{formatNullable(adminUser.status)}</BodyCell>
                      <BodyCell>{formatDate(adminUser.createdAt)}</BodyCell>
                      <BodyCell>{formatDate(adminUser.updatedAt)}</BodyCell>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}
    </div>
  );
}

function Detail({ label, value }: { label: string; value: string | number | null | undefined }) {
  return (
    <div>
      <dt className="text-xs font-extrabold uppercase tracking-[0.14em] text-[#0A1547]/40">{label}</dt>
      <dd className="mt-1 break-words font-black text-[#0A1547]">{formatNullable(value)}</dd>
    </div>
  );
}

function HeaderCell({ children }: { children: ReactNode }) {
  return (
    <th className="px-4 py-3 text-xs font-extrabold uppercase tracking-[0.14em] text-[#0A1547]/45">
      {children}
    </th>
  );
}

function BodyCell({ children }: { children: ReactNode }) {
  return (
    <td className="max-w-[260px] break-words px-4 py-4 font-bold text-[#0A1547]">
      {children}
    </td>
  );
}
