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
type IconName = "check" | "lock" | "plus" | "refresh" | "shield" | "user" | "users" | "warning";
type IconTone = "clients" | "success" | "warning" | "danger" | "neutral" | "lilac";

const sectionClassName = "rounded-lg border border-[#0A1547]/10 bg-white shadow-[0_12px_28px_rgba(10,21,71,0.05)]";
const compactRowClassName = "rounded-lg border border-[#0A1547]/10 bg-white p-4";
const inputClassName = "admin-focus mt-2 h-11 w-full rounded-lg border border-[#0A1547]/10 bg-[#F8F9FD] px-4 text-sm font-medium text-[#0A1547] placeholder:text-[#0A1547]/38";
const selectClassName = "admin-focus mt-2 h-11 w-full rounded-lg border border-[#0A1547]/10 bg-[#F8F9FD] px-4 text-sm font-medium leading-tight text-[#0A1547]";
const labelClassName = "text-[11px] font-medium uppercase tracking-[0.12em] text-[#0A1547]/38";

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
  const activeAdminCount = adminUsers.filter((adminUser) => normalizeAdminStatus(adminUser.status) === "active").length;
  const inactiveAdminCount = adminUsers.filter((adminUser) => normalizeAdminStatus(adminUser.status) === "inactive").length;

  return (
    <div className="space-y-5">
      <section className={`${sectionClassName} px-5 py-4`}>
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex min-w-0 items-start gap-3">
            <IconBadge icon="shield" tone="lilac" />
            <div className="min-w-0">
              <h2 className="text-2xl font-black text-[#0A1547]">Admin Access</h2>
              <p className="mt-1 text-sm font-medium leading-6 text-[#0A1547]/58">
                Manage dashboard users, role assignments, and active access.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => void loadAdminAccess()}
            disabled={loading}
            className="admin-focus inline-flex items-center justify-center gap-2 rounded-lg bg-[#0A1547] px-4 py-2.5 text-sm font-bold text-white transition hover:bg-[#1A2460] disabled:cursor-not-allowed disabled:opacity-55"
          >
            <Icon name="refresh" size={15} />
            {loading ? "Refreshing..." : "Refresh"}
          </button>
        </div>
      </section>

      {loading && (
        <div className={`${sectionClassName} p-8 text-center text-sm font-medium text-[#0A1547]/58`}>
          Loading admin access...
        </div>
      )}

      {error && !loading && (
        <Alert tone="danger">{error}</Alert>
      )}

      {!loading && !error && currentAdmin && (
        <section className={`${sectionClassName} p-5`}>
          <SectionHeader
            icon="user"
            iconTone="clients"
            title="Current session"
            helper="Signed-in admin context for this dashboard session."
            trailing={<StatusBadge status={normalizeAdminStatus(currentAdmin.status)} />}
          />
          <div className="mt-4 grid gap-3 text-sm md:grid-cols-3">
            <Fact label="Email" value={currentAdmin.email} />
            <Fact label="Role" value={roleLabel(currentAdmin.role)} />
            <Fact label="Status" value={currentAdmin.status} />
          </div>
        </section>
      )}

      {!loading && !error && (
        <section className={`${compactRowClassName} flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between`}>
          <div className="flex min-w-0 items-center gap-3">
            <IconBadge icon={canManageAdminAccess ? "check" : "lock"} tone={canManageAdminAccess ? "success" : "warning"} compact />
            <div className="min-w-0">
              <p className="text-sm font-semibold text-[#0A1547]">
                {canManageAdminAccess ? "Access management enabled" : "Read-only admin access view"}
              </p>
              <p className="mt-1 text-sm font-medium text-[#0A1547]/54">
                {canManageAdminAccess
                  ? "Add, edit, activate, and deactivate admins without deleting access history."
                  : "Role editing and activation controls require admin access management permission."}
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <MetricChip label="Active" tone="success" value={activeAdminCount} />
            <MetricChip label="Inactive" tone="neutral" value={inactiveAdminCount} />
          </div>
        </section>
      )}

      {!loading && !error && canManageAdminAccess && (
        <section className={`${sectionClassName} p-5`}>
          <SectionHeader
            icon="plus"
            iconTone="success"
            title="Add admin access"
            helper="Invite a dashboard user with the correct role."
          />

          <form onSubmit={handleAddAdminAccess} className="mt-5 grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_180px_auto] lg:items-end">
            <label className="block">
              <span className={labelClassName}>Name</span>
              <input
                type="text"
                value={newAdminName}
                onChange={(event) => setNewAdminName(event.target.value)}
                placeholder="Jane Smith"
                className={inputClassName}
              />
            </label>
            <label className="block">
              <span className={labelClassName}>Email</span>
              <input
                type="email"
                value={newAdminEmail}
                onChange={(event) => setNewAdminEmail(event.target.value)}
                placeholder="person@example.com"
                className={inputClassName}
              />
            </label>
            <label className="block">
              <span className={labelClassName}>Role</span>
              <select
                value={newAdminRole}
                onChange={(event) => setNewAdminRole(event.target.value as CreateAdminUserAccessRequest["role"])}
                className={selectClassName}
              >
                {adminRoleOptions.map((role) => (
                  <option key={role} value={role}>{roleLabel(role)}</option>
                ))}
              </select>
            </label>
            <button
              type="submit"
              disabled={savingAdminAccess}
              className="admin-focus h-11 rounded-lg bg-[#0A1547] px-5 text-sm font-bold text-white transition hover:bg-[#1A2460] disabled:cursor-not-allowed disabled:opacity-55"
            >
              {savingAdminAccess ? "Adding..." : "Add access"}
            </button>
          </form>

          {saveSuccess && (
            <Alert tone="success" className="mt-4">{saveSuccess}</Alert>
          )}

          {saveError && (
            <Alert tone="danger" className="mt-4">{saveError}</Alert>
          )}
        </section>
      )}

      {!loading && !error && (
        <section className={`${sectionClassName} overflow-hidden`}>
          <div className="border-b border-[#0A1547]/10 p-5">
            <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
              <SectionHeader
                icon="users"
                iconTone="clients"
                title="Admin users"
                helper={canManageAdminAccess
                  ? "Edit names and roles or activate/deactivate access."
                  : "Role editing and activation controls require management permission."}
              />
              <div className="shrink-0">
                <p className={labelClassName}>Filter</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {adminStatusFilters.map((filter) => (
                    <button
                      key={filter}
                      type="button"
                      onClick={() => setStatusFilter(filter)}
                      className={`admin-focus rounded-lg px-3 py-2 text-xs font-semibold capitalize transition ${
                        statusFilter === filter
                          ? "bg-[#0A1547] text-white"
                          : "border border-[#0A1547]/10 bg-white text-[#0A1547]/68 hover:border-[#02ABE0]/45 hover:text-[#0A1547]"
                      }`}
                    >
                      {filter}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {editSuccess && (
              <Alert tone="success" className="mt-4">{editSuccess}</Alert>
            )}

            {editError && (
              <Alert tone="danger" className="mt-4">{editError}</Alert>
            )}
          </div>

          {adminUsers.length === 0 ? (
            <div className="p-8 text-center text-sm font-medium text-[#0A1547]/58">
              No admin access rows were returned.
            </div>
          ) : filteredAdminUsers.length === 0 ? (
            <div className="p-8 text-center text-sm font-medium text-[#0A1547]/58">
              No admin access rows match the selected filter.
            </div>
          ) : (
            <div className="space-y-3 bg-[#F8F9FD] p-4">
              {filteredAdminUsers.map((adminUser) => {
                const draft = adminUserDrafts[adminUser.userId] || adminUserDraftFromUser(adminUser);
                const status = normalizeAdminStatus(adminUser.status);
                const isCurrentUserRow = currentAdmin?.id === adminUser.userId;
                const isCurrentSuperAdminRow = isCurrentUserRow && normalizeAdminRole(currentAdmin?.role) === "super_admin";
                const isRowSaving = savingAdminUserId === adminUser.userId;

                return (
                  <article key={adminUser.userId} className={compactRowClassName}>
                    <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                      <div className="flex min-w-0 flex-1 gap-3">
                        <IconBadge icon={status === "active" ? "user" : "lock"} tone={status === "active" ? "clients" : "neutral"} compact />
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                            <div className="min-w-0">
                              {canManageAdminAccess ? (
                                <label className="block">
                                  <span className={labelClassName}>Name</span>
                                  <input
                                    type="text"
                                    value={draft.displayName}
                                    onChange={(event) => setAdminUserDraft(adminUser.userId, { displayName: event.target.value })}
                                    className="admin-focus mt-2 h-10 w-full min-w-[220px] rounded-lg border border-[#0A1547]/10 bg-[#F8F9FD] px-3 text-sm font-semibold text-[#0A1547] outline-none"
                                    aria-label={`Display name for ${adminUser.email || "admin user"}`}
                                  />
                                </label>
                              ) : (
                                <h3 className="truncate text-base font-bold text-[#0A1547]">
                                  {adminUser.displayName || "Unnamed admin"}
                                </h3>
                              )}
                              <p className="mt-2 break-all text-sm font-medium text-[#0A1547]/58">
                                {adminUser.email || "Email not stored yet"}
                              </p>
                              <div className="mt-3 flex flex-wrap gap-2">
                                <RoleBadge role={draft.role} />
                                <StatusBadge status={status} />
                                {isCurrentUserRow && (
                                  <span className="inline-flex rounded-full border border-[#A380F6]/25 bg-[#A380F6]/10 px-2.5 py-0.5 text-[11px] font-semibold text-[#0A1547]/72">
                                    Current session
                                  </span>
                                )}
                              </div>
                            </div>
                            <div className="grid min-w-[220px] gap-2 text-sm sm:grid-cols-2 lg:max-w-[360px]">
                              <Fact label="Created" value={formatDate(adminUser.createdAt)} />
                              <Fact label="Updated" value={formatDate(adminUser.updatedAt)} />
                            </div>
                          </div>

                          {canManageAdminAccess && (
                            <div className="mt-4 grid gap-3 border-t border-[#0A1547]/10 pt-4 lg:grid-cols-[220px_minmax(0,1fr)] lg:items-end">
                              <label className="block">
                                <span className={labelClassName}>Role</span>
                                <select
                                  value={draft.role}
                                  onChange={(event) => setAdminUserDraft(adminUser.userId, { role: event.target.value as AdminRole })}
                                  disabled={isCurrentSuperAdminRow || isRowSaving}
                                  className="admin-focus mt-2 h-10 w-full rounded-lg border border-[#0A1547]/10 bg-[#F8F9FD] px-3 text-sm font-medium text-[#0A1547] outline-none disabled:cursor-not-allowed disabled:opacity-55"
                                  aria-label={`Role for ${adminUser.email || "admin user"}`}
                                >
                                  {adminRoleOptions.map((role) => (
                                    <option key={role} value={role}>{roleLabel(role)}</option>
                                  ))}
                                </select>
                              </label>
                              <div className="flex flex-wrap gap-2 lg:justify-end">
                                <button
                                  type="button"
                                  onClick={() => void handleSaveAdminUser(adminUser)}
                                  disabled={Boolean(savingAdminUserId)}
                                  className="admin-focus rounded-lg bg-[#0A1547] px-3 py-2 text-xs font-bold text-white transition hover:bg-[#1A2460] disabled:cursor-not-allowed disabled:opacity-55"
                                >
                                  {isRowSaving ? "Saving..." : "Save"}
                                </button>
                                {status === "active" ? (
                                  <button
                                    type="button"
                                    onClick={() => void handleSetAdminUserStatus(adminUser, "inactive")}
                                    disabled={Boolean(savingAdminUserId) || isCurrentUserRow}
                                    className="admin-focus rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-bold text-red-700 transition hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-55"
                                  >
                                    Deactivate
                                  </button>
                                ) : (
                                  <button
                                    type="button"
                                    onClick={() => void handleSetAdminUserStatus(adminUser, "active")}
                                    disabled={Boolean(savingAdminUserId)}
                                    className="admin-focus rounded-lg border border-[#02D99D]/30 bg-[#02D99D]/10 px-3 py-2 text-xs font-bold text-[#0A1547] transition hover:bg-[#02D99D]/15 disabled:cursor-not-allowed disabled:opacity-55"
                                  >
                                    Activate
                                  </button>
                                )}
                              </div>
                            </div>
                          )}

                          {isCurrentSuperAdminRow && (
                            <p className="mt-3 text-xs font-medium leading-5 text-[#0A1547]/52">
                              You cannot deactivate or demote your own super admin access.
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>
      )}
    </div>
  );
}

function SectionHeader({
  helper,
  icon,
  iconTone,
  title,
  trailing,
}: {
  helper?: string;
  icon: IconName;
  iconTone: IconTone;
  title: string;
  trailing?: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
      <div className="flex min-w-0 items-start gap-3">
        <IconBadge icon={icon} tone={iconTone} compact />
        <div className="min-w-0">
          <h3 className="text-base font-bold text-[#0A1547]">{title}</h3>
          {helper && (
            <p className="mt-1 text-sm font-medium leading-6 text-[#0A1547]/55">
              {helper}
            </p>
          )}
        </div>
      </div>
      {trailing}
    </div>
  );
}

function Fact({ label, value }: { label: string; value: string | number | null | undefined }) {
  return (
    <div className="min-w-0 rounded-lg border border-[#0A1547]/10 bg-[#F8F9FD] px-3 py-2.5">
      <p className={labelClassName}>{label}</p>
      <p className="mt-1 truncate text-sm font-semibold text-[#0A1547]/82">{formatNullable(value)}</p>
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

function StatusBadge({ status }: { status: "active" | "inactive" }) {
  const isActive = status === "active";
  return (
    <span className={`inline-flex rounded-full border px-2.5 py-0.5 text-[11px] font-semibold capitalize ${
      isActive ? "border-[#02D99D]/30 bg-[#02D99D]/10 text-[#0A1547]/78" : "border-[#0A1547]/10 bg-[#F8F9FD] text-[#0A1547]/58"
    }`}
    >
      {status}
    </span>
  );
}

function RoleBadge({ role }: { role: string | null | undefined }) {
  const normalizedRole = normalizeAdminRole(role);
  const toneClassName = normalizedRole === "super_admin"
    ? "border-[#A380F6]/25 bg-[#A380F6]/10 text-[#0A1547]/78"
    : "border-[#02ABE0]/20 bg-[#02ABE0]/10 text-[#0A1547]/72";

  return (
    <span className={`inline-flex rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${toneClassName}`}>
      {roleLabel(normalizedRole)}
    </span>
  );
}

function Alert({ children, className = "", tone }: { children: ReactNode; className?: string; tone: "danger" | "success" }) {
  const toneClassName = tone === "success"
    ? "border-[#02D99D]/25 bg-[#02D99D]/10 text-[#0A1547]"
    : "border-red-200 bg-red-50 text-red-700";

  return (
    <div className={`rounded-lg border p-4 text-sm font-semibold ${toneClassName} ${className}`}>
      {children}
    </div>
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
    case "success":
      return "text-[#02D99D]";
    case "warning":
      return "text-[#F59E0B]";
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
    case "check":
      return (
        <>
          <path d="M20 6 9 17l-5-5" />
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
    case "refresh":
      return (
        <>
          <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16" />
          <path d="M3 21v-5h5" />
          <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8" />
          <path d="M16 8h5V3" />
        </>
      );
    case "shield":
      return (
        <>
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z" />
          <path d="m9 12 2 2 4-4" />
        </>
      );
    case "warning":
      return (
        <>
          <path d="m21.73 18-8-14a2 2 0 0 0-3.46 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
          <path d="M12 9v4" />
          <path d="M12 17h.01" />
        </>
      );
    case "users":
      return (
        <>
          <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
          <circle cx="9" cy="7" r="4" />
          <path d="M22 21v-2a4 4 0 0 0-3-3.9" />
          <path d="M16 3.1a4 4 0 0 1 0 7.8" />
        </>
      );
    case "user":
    default:
      return (
        <>
          <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
          <circle cx="12" cy="7" r="4" />
        </>
      );
  }
}
