import { useCallback, useEffect, useState, type FormEvent, type ReactNode } from "react";
import { useAuth } from "@/auth/AuthProvider";
import { AdminApiError, createAdminUserAccess, getAdminMe, getAdminUsers, updateAdminUserAccess } from "@/lib/adminApi";
import type { AdminAccess, AdminAccessUser, AdminRole, CreateAdminUserAccessRequest, UpdateAdminUserAccessRequest } from "@/lib/types";

const adminRoleOptions: AdminRole[] = ["admin", "super_admin", "analyst", "billing_admin", "viewer"];
const adminRoleLabels: Record<AdminRole, string> = {
  super_admin: "Super Admin",
  admin: "Admin",
  analyst: "Analyst",
  billing_admin: "Billing Admin",
  viewer: "Viewer",
};
const adminStatusFilters = ["active", "inactive", "all"] as const;

type AdminStatusFilter = (typeof adminStatusFilters)[number];
type AdminUserDraft = {
  displayName: string;
  role: AdminRole;
};

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

function normalizeAdminRole(role: string | null | undefined): AdminRole {
  return adminRoleOptions.includes(role as AdminRole) ? (role as AdminRole) : "admin";
}

function roleLabel(role: string | null | undefined): string {
  return adminRoleLabels[normalizeAdminRole(role)];
}

function normalizeAdminStatus(status: string | null | undefined): "active" | "inactive" {
  return status === "inactive" ? "inactive" : "active";
}

function adminUserDraftFromUser(adminUser: AdminAccessUser): AdminUserDraft {
  return {
    displayName: adminUser.displayName || "",
    role: normalizeAdminRole(adminUser.role),
  };
}

function adminUserDraftMap(adminUsers: AdminAccessUser[]): Record<string, AdminUserDraft> {
  return adminUsers.reduce<Record<string, AdminUserDraft>>((drafts, adminUser) => {
    drafts[adminUser.userId] = adminUserDraftFromUser(adminUser);
    return drafts;
  }, {});
}

export default function AdminManagementPage() {
  const { session } = useAuth();
  const token = session?.access_token || "";
  const [currentAdmin, setCurrentAdmin] = useState<AdminAccess | null>(null);
  const [adminUsers, setAdminUsers] = useState<AdminAccessUser[]>([]);
  const [adminUserDrafts, setAdminUserDrafts] = useState<Record<string, AdminUserDraft>>({});
  const [statusFilter, setStatusFilter] = useState<AdminStatusFilter>("active");
  const [canManageAdminAccess, setCanManageAdminAccess] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [newAdminName, setNewAdminName] = useState("");
  const [newAdminEmail, setNewAdminEmail] = useState("");
  const [newAdminRole, setNewAdminRole] = useState<CreateAdminUserAccessRequest["role"]>("admin");
  const [savingAdminAccess, setSavingAdminAccess] = useState(false);
  const [savingAdminUserId, setSavingAdminUserId] = useState("");
  const [saveError, setSaveError] = useState("");
  const [saveSuccess, setSaveSuccess] = useState("");
  const [editError, setEditError] = useState("");
  const [editSuccess, setEditSuccess] = useState("");

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
      setAdminUserDrafts(adminUserDraftMap(usersResponse.items));
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
    setEditError("");
    setEditSuccess("");

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

  const setAdminUserDraft = (userId: string, draft: Partial<AdminUserDraft>) => {
    setAdminUserDrafts((currentDrafts) => ({
      ...currentDrafts,
      [userId]: {
        ...(currentDrafts[userId] || { displayName: "", role: "admin" }),
        ...draft,
      },
    }));
  };

  const applyUpdatedAdminUser = (updatedAdminUser: AdminAccessUser) => {
    setAdminUsers((currentUsers) => currentUsers.map((adminUser) => (
      adminUser.userId === updatedAdminUser.userId ? updatedAdminUser : adminUser
    )));
    setAdminUserDrafts((currentDrafts) => ({
      ...currentDrafts,
      [updatedAdminUser.userId]: adminUserDraftFromUser(updatedAdminUser),
    }));
  };

  const handleSaveAdminUser = async (adminUser: AdminAccessUser) => {
    if (!token || savingAdminUserId) {
      return;
    }

    const draft = adminUserDrafts[adminUser.userId] || adminUserDraftFromUser(adminUser);
    const currentDisplayName = (adminUser.displayName || "").trim();
    const nextDisplayName = draft.displayName.trim();
    const currentRole = normalizeAdminRole(adminUser.role);
    const isCurrentUserRow = currentAdmin?.id === adminUser.userId;
    const isCurrentSuperAdminRow = isCurrentUserRow && normalizeAdminRole(currentAdmin?.role) === "super_admin";
    const payload: UpdateAdminUserAccessRequest = {};

    setSaveError("");
    setSaveSuccess("");
    setEditError("");
    setEditSuccess("");

    if (nextDisplayName !== currentDisplayName) {
      if (!nextDisplayName) {
        setEditError("Display name is required to save name changes.");
        return;
      }
      payload.name = nextDisplayName;
    }

    if (draft.role !== currentRole) {
      if (isCurrentSuperAdminRow && draft.role !== "super_admin") {
        setEditError("You cannot demote your own super admin access.");
        return;
      }
      payload.role = draft.role;
    }

    if (!payload.name && !payload.role) {
      setEditError("Change a name or role before saving.");
      return;
    }

    setSavingAdminUserId(adminUser.userId);
    try {
      const response = await updateAdminUserAccess(token, adminUser.userId, payload);
      applyUpdatedAdminUser(response.adminUser);
      setEditSuccess("Admin access updated.");
    } catch (updateFailure) {
      if (updateFailure instanceof AdminApiError) {
        setEditError(updateFailure.message);
      } else {
        setEditError("Admin access could not be updated.");
      }
    } finally {
      setSavingAdminUserId("");
    }
  };

  const handleSetAdminUserStatus = async (adminUser: AdminAccessUser, status: "active" | "inactive") => {
    if (!token || savingAdminUserId) {
      return;
    }

    const isCurrentUserRow = currentAdmin?.id === adminUser.userId;
    if (isCurrentUserRow && status === "inactive") {
      setEditError("You cannot deactivate your own admin access.");
      return;
    }

    if (status === "inactive") {
      const confirmed = window.confirm("Deactivate this admin access? This removes dashboard access without deleting the row.");
      if (!confirmed) {
        return;
      }
    }

    setSaveError("");
    setSaveSuccess("");
    setEditError("");
    setEditSuccess("");
    setSavingAdminUserId(adminUser.userId);

    try {
      const response = await updateAdminUserAccess(token, adminUser.userId, { status });
      applyUpdatedAdminUser(response.adminUser);
      setEditSuccess(status === "active" ? "Admin access activated." : "Admin access deactivated.");
    } catch (updateFailure) {
      if (updateFailure instanceof AdminApiError) {
        setEditError(updateFailure.message);
      } else {
        setEditError("Admin access status could not be updated.");
      }
    } finally {
      setSavingAdminUserId("");
    }
  };

  const filteredAdminUsers = adminUsers.filter((adminUser) => (
    statusFilter === "all" ? true : normalizeAdminStatus(adminUser.status) === statusFilter
  ));

  return (
    <div className="space-y-6">
      <section className="admin-card p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="max-w-3xl">
            <p className="text-xs font-extrabold uppercase tracking-[0.2em] text-[#A380F6]">Admin Access</p>
            <h2 className="mt-3 text-2xl font-black text-[#0A1547]">Dashboard access and roles</h2>
            <p className="mt-2 text-sm font-medium leading-6 text-[#0A1547]/62">
              Supabase Auth controls sign-in. The Admin API controls dashboard access, role assignment, and active or inactive admin status through the admin_users access list.
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
        <div className="admin-card p-8 text-center text-sm font-medium text-[#0A1547]/60">
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
          <dl className="mt-5 grid gap-4 text-sm md:grid-cols-3">
            <Detail label="Email" value={currentAdmin.email} />
            <Detail label="Role" value={roleLabel(currentAdmin.role)} />
            <Detail label="Status" value={currentAdmin.status} />
          </dl>
          <details className="mt-4 rounded-xl border border-[#0A1547]/10 bg-[#F8F9FD] px-4 py-3">
            <summary className="cursor-pointer text-xs font-extrabold uppercase tracking-[0.14em] text-[#0A1547]/45">
              Technical details
            </summary>
            <dl className="mt-3 grid gap-3 text-sm md:grid-cols-2">
              <Detail label="Supabase Auth user ID" value={currentAdmin.id} />
            </dl>
          </details>
        </section>
      )}

      {!loading && !error && (
        <section className={`rounded-2xl border p-5 ${canManageAdminAccess ? "border-[#02D99D]/25 bg-[#02D99D]/10" : "border-[#A380F6]/25 bg-[#A380F6]/10"}`}>
          <p className="text-sm font-medium text-[#0A1547]">
            {canManageAdminAccess
              ? "Admin access management is enabled for this account. Add, edit, activate, and deactivate dashboard access without deleting admin rows."
              : "You can view admin access, but this account cannot manage admin access."}
          </p>
        </section>
      )}

      {!loading && !error && canManageAdminAccess && (
        <section className="admin-card p-5">
          <div className="max-w-3xl">
            <h3 className="text-lg font-black text-[#0A1547]">Add admin access</h3>
            <p className="mt-2 text-sm font-medium leading-6 text-[#0A1547]/62">
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
                className="admin-focus mt-2 w-full rounded-xl border border-[#0A1547]/12 bg-white px-4 py-3 text-sm font-medium text-[#0A1547] outline-none"
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
                className="admin-focus mt-2 w-full rounded-xl border border-[#0A1547]/12 bg-white px-4 py-3 text-sm font-medium text-[#0A1547] outline-none"
              />
            </label>
            <label className="block">
              <span className="text-xs font-extrabold uppercase tracking-[0.14em] text-[#0A1547]/45">
                Role
              </span>
              <select
                value={newAdminRole}
                onChange={(event) => setNewAdminRole(event.target.value as CreateAdminUserAccessRequest["role"])}
                className="admin-focus mt-2 w-full rounded-xl border border-[#0A1547]/12 bg-white px-4 py-3 text-sm font-medium text-[#0A1547] outline-none"
              >
                {adminRoleOptions.map((role) => (
                  <option key={role} value={role}>{roleLabel(role)}</option>
                ))}
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
            <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
              <div>
                <h3 className="text-lg font-black text-[#0A1547]">Admin access list</h3>
                <p className="mt-2 text-sm font-medium leading-6 text-[#0A1547]/62">
                  {canManageAdminAccess
                    ? "Edit names and roles or activate/deactivate access. Admin users are never hard-deleted."
                    : "Role editing and activation controls require admin access management permission."}
                </p>
              </div>
              <div>
                <p className="text-xs font-extrabold uppercase tracking-[0.14em] text-[#0A1547]/45">Filter</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {adminStatusFilters.map((filter) => (
                    <button
                      key={filter}
                      type="button"
                      onClick={() => setStatusFilter(filter)}
                      className={`admin-focus rounded-xl px-4 py-2 text-xs font-extrabold capitalize transition ${
                        statusFilter === filter
                          ? "bg-[#0A1547] text-white"
                          : "border border-[#0A1547]/12 bg-white text-[#0A1547] hover:border-[#02ABE0]/45"
                      }`}
                    >
                      {filter}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {editSuccess && (
              <div className="mt-4 rounded-2xl border border-[#02D99D]/25 bg-[#02D99D]/10 p-4 text-sm font-bold text-[#0A1547]">
                {editSuccess}
              </div>
            )}

            {editError && (
              <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-bold text-red-700">
                {editError}
              </div>
            )}
          </div>

          {adminUsers.length === 0 ? (
            <div className="p-8 text-center text-sm font-medium text-[#0A1547]/60">
              No admin access rows were returned.
            </div>
          ) : filteredAdminUsers.length === 0 ? (
            <div className="p-8 text-center text-sm font-medium text-[#0A1547]/60">
              No admin access rows match the selected filter.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-[#0A1547]/10 text-left text-sm">
                <thead className="bg-[#F8F9FD]">
                  <tr>
                    <HeaderCell>Name</HeaderCell>
                    <HeaderCell>Email</HeaderCell>
                    <HeaderCell>Role</HeaderCell>
                    <HeaderCell>Status</HeaderCell>
                    <HeaderCell>Created</HeaderCell>
                    <HeaderCell>Updated</HeaderCell>
                    <HeaderCell>Details</HeaderCell>
                    {canManageAdminAccess && <HeaderCell>Actions</HeaderCell>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#0A1547]/10 bg-white">
                  {filteredAdminUsers.map((adminUser) => {
                    const draft = adminUserDrafts[adminUser.userId] || adminUserDraftFromUser(adminUser);
                    const status = normalizeAdminStatus(adminUser.status);
                    const isCurrentUserRow = currentAdmin?.id === adminUser.userId;
                    const isCurrentSuperAdminRow = isCurrentUserRow && normalizeAdminRole(currentAdmin?.role) === "super_admin";
                    const isRowSaving = savingAdminUserId === adminUser.userId;

                    return (
                      <tr key={adminUser.userId}>
                        <BodyCell>
                          {canManageAdminAccess ? (
                            <input
                              type="text"
                              value={draft.displayName}
                              onChange={(event) => setAdminUserDraft(adminUser.userId, { displayName: event.target.value })}
                              className="admin-focus w-full min-w-[170px] rounded-xl border border-[#0A1547]/12 bg-white px-3 py-2 text-sm font-medium text-[#0A1547] outline-none"
                              aria-label={`Display name for ${adminUser.email || adminUser.userId}`}
                            />
                          ) : (
                            adminUser.displayName || "-"
                          )}
                        </BodyCell>
                        <BodyCell>{adminUser.email || "Email not stored yet"}</BodyCell>
                        <BodyCell>
                          {canManageAdminAccess ? (
                            <select
                              value={draft.role}
                              onChange={(event) => setAdminUserDraft(adminUser.userId, { role: event.target.value as AdminRole })}
                              disabled={isCurrentSuperAdminRow || isRowSaving}
                              className="admin-focus min-w-[150px] rounded-xl border border-[#0A1547]/12 bg-white px-3 py-2 text-sm font-medium text-[#0A1547] outline-none disabled:cursor-not-allowed disabled:opacity-55"
                              aria-label={`Role for ${adminUser.email || adminUser.userId}`}
                            >
                              {adminRoleOptions.map((role) => (
                                <option key={role} value={role}>{roleLabel(role)}</option>
                              ))}
                            </select>
                          ) : (
                            roleLabel(adminUser.role)
                          )}
                        </BodyCell>
                        <BodyCell>
                          <StatusBadge status={status} />
                        </BodyCell>
                        <BodyCell>{formatDate(adminUser.createdAt)}</BodyCell>
                        <BodyCell>{formatDate(adminUser.updatedAt)}</BodyCell>
                        <BodyCell>
                          <details className="min-w-[190px] rounded-xl border border-[#0A1547]/10 bg-[#F8F9FD] px-3 py-2">
                            <summary className="cursor-pointer text-xs font-extrabold uppercase tracking-[0.12em] text-[#0A1547]/45">
                              Technical details
                            </summary>
                            <dl className="mt-3 grid gap-3 text-xs">
                              <Detail label="Supabase Auth user ID" value={adminUser.userId} />
                            </dl>
                          </details>
                        </BodyCell>
                        {canManageAdminAccess && (
                          <BodyCell>
                            <div className="flex min-w-[210px] flex-col gap-2">
                              <div className="flex flex-wrap gap-2">
                                <button
                                  type="button"
                                  onClick={() => void handleSaveAdminUser(adminUser)}
                                  disabled={Boolean(savingAdminUserId)}
                                  className="admin-focus rounded-xl bg-[#0A1547] px-3 py-2 text-xs font-extrabold text-white transition hover:bg-[#1A2460] disabled:cursor-not-allowed disabled:opacity-55"
                                >
                                  {isRowSaving ? "Saving..." : "Save"}
                                </button>
                                {status === "active" ? (
                                  <button
                                    type="button"
                                    onClick={() => void handleSetAdminUserStatus(adminUser, "inactive")}
                                    disabled={Boolean(savingAdminUserId) || isCurrentUserRow}
                                    className="admin-focus rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs font-extrabold text-red-700 transition hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-55"
                                  >
                                    Deactivate
                                  </button>
                                ) : (
                                  <button
                                    type="button"
                                    onClick={() => void handleSetAdminUserStatus(adminUser, "active")}
                                    disabled={Boolean(savingAdminUserId)}
                                    className="admin-focus rounded-xl border border-[#02D99D]/35 bg-[#02D99D]/10 px-3 py-2 text-xs font-extrabold text-[#0A1547] transition hover:bg-[#02D99D]/15 disabled:cursor-not-allowed disabled:opacity-55"
                                  >
                                    Activate
                                  </button>
                                )}
                              </div>
                              {isCurrentSuperAdminRow && (
                                <p className="text-xs font-medium leading-5 text-[#0A1547]/55">
                                  You cannot deactivate or demote your own super admin access.
                                </p>
                              )}
                            </div>
                          </BodyCell>
                        )}
                      </tr>
                    );
                  })}
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
      <dd className="mt-1 break-words font-medium text-[#0A1547]">{formatNullable(value)}</dd>
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
    <td className="max-w-[260px] break-words px-4 py-4 align-top font-medium text-[#0A1547]">
      {children}
    </td>
  );
}

function StatusBadge({ status }: { status: "active" | "inactive" }) {
  const isActive = status === "active";
  return (
    <span className={`inline-flex rounded-full px-3 py-1 text-xs font-extrabold capitalize ${
      isActive ? "bg-[#02D99D]/12 text-[#0A1547]" : "bg-[#0A1547]/8 text-[#0A1547]/65"
    }`}
    >
      {status}
    </span>
  );
}
