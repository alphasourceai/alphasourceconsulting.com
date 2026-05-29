import { useCallback, useEffect, useMemo, useState, type FormEvent, type ReactNode } from "react";
import { useAuth } from "@/auth/AuthProvider";
import {
  AdminApiError,
  createAgreementDownloadUrl,
  getClientOptions,
  listAgreements,
  previewAgreementPdf,
  sendAgreement,
  voidAgreement,
} from "@/lib/adminApi";
import type {
  AdminClientOption,
  AgreementDownloadFileType,
  AgreementPreviewRequest,
  AgreementSummary,
} from "@/lib/types";

type AgreementFormState = {
  clientLegalName: string;
  state: string;
  effectiveDate: string;
  signerName: string;
  signerEmail: string;
  signerTitle: string;
  baSignerName: string;
  baSignerTitle: string;
  baSignerEmail: string;
};
type IconName = "archive" | "check" | "download" | "file" | "pen" | "search" | "send" | "shield" | "users";
type IconTone = "clients" | "agreements" | "success" | "warning" | "danger" | "neutral" | "lilac";

const defaultBaSigner = {
  name: "Jason Gardner",
  title: "Founder",
  email: "jason@alphasourceai.com",
};

const emptyForm: AgreementFormState = {
  clientLegalName: "",
  state: "",
  effectiveDate: todayIsoDate(),
  signerName: "",
  signerEmail: "",
  signerTitle: "",
  baSignerName: defaultBaSigner.name,
  baSignerTitle: defaultBaSigner.title,
  baSignerEmail: defaultBaSigner.email,
};

const sectionClassName = "rounded-lg border border-[#0A1547]/10 bg-white shadow-[0_12px_28px_rgba(10,21,71,0.05)]";
const inputClassName = "admin-focus mt-2 h-11 w-full rounded-lg border border-[#0A1547]/10 bg-[#F8F9FD] px-4 text-sm font-medium text-[#0A1547] placeholder:text-[#0A1547]/38";
const labelClassName = "text-[11px] font-medium uppercase tracking-[0.12em] text-[#0A1547]/38";

function todayIsoDate(): string {
  return new Date().toISOString().slice(0, 10);
}

function formatDate(value: string | null | undefined): string {
  if (!value) {
    return "-";
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat(undefined, { dateStyle: "medium" }).format(parsed);
}

function formatDateTime(value: string | null | undefined): string {
  if (!value) {
    return "-";
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(parsed);
}

function displayText(value: string | null | undefined): string {
  return value?.trim() || "-";
}

function clientDisplayName(client: AdminClientOption): string {
  const personName = [client.firstName, client.lastName].filter(Boolean).join(" ").trim();
  return client.officeName || personName || client.email;
}

function signerNameFromClient(client: AdminClientOption): string {
  return [client.firstName, client.lastName].filter(Boolean).join(" ").trim();
}

function statusPillClassName(status: string): string {
  switch (status.toLowerCase()) {
    case "signed":
      return "border-[#02D99D]/35 bg-[#02D99D]/12 text-[#0A1547]";
    case "sent":
      return "border-[#02ABE0]/35 bg-[#02ABE0]/12 text-[#0A1547]";
    case "pending_ba_signature":
      return "border-[#A380F6]/35 bg-[#A380F6]/12 text-[#0A1547]";
    case "voided":
      return "border-red-200 bg-red-50 text-red-700";
    case "superseded":
      return "border-[#0A1547]/10 bg-[#0A1547]/6 text-[#0A1547]/62";
    default:
      return "border-[#A380F6]/30 bg-[#A380F6]/12 text-[#0A1547]";
  }
}

function agreementStatusLabel(status: string): string {
  if (status.toLowerCase() === "pending_ba_signature") {
    return "Pending BA Signature";
  }

  return status
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .replace(/\b\w/g, (match) => match.toUpperCase());
}

function SectionHeader({
  action,
  description,
  icon,
  iconTone,
  title,
}: {
  action?: ReactNode;
  description?: string;
  icon: IconName;
  iconTone: IconTone;
  title: string;
}) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
      <div className="flex min-w-0 items-start gap-3">
        <IconBadge icon={icon} tone={iconTone} />
        <div className="min-w-0">
          <h3 className="text-lg font-black text-[#0A1547]">{title}</h3>
          {description && (
            <p className="mt-1 max-w-2xl text-sm font-medium leading-6 text-[#0A1547]/56">
              {description}
            </p>
          )}
        </div>
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}

function FormGroup({
  children,
  icon,
  title,
}: {
  children: ReactNode;
  icon: IconName;
  title: string;
}) {
  return (
    <section className="rounded-lg border border-[#0A1547]/10 bg-white p-4">
      <div className="flex items-center gap-3">
        <IconBadge compact icon={icon} tone="agreements" />
        <h4 className="text-sm font-semibold text-[#0A1547]">{title}</h4>
      </div>
      <div className="mt-4 grid gap-4 md:grid-cols-2">
        {children}
      </div>
    </section>
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
      return "text-[#A380F6]";
    case "agreements":
    case "lilac":
      return "text-[#7C5CF2]";
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

function StatusPill({ children, className }: { children: ReactNode; className: string }) {
  return (
    <span className={`inline-flex rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${className}`}>
      {children}
    </span>
  );
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

function iconPath(name: IconName): ReactNode {
  switch (name) {
    case "archive":
      return (
        <>
          <path d="M4 7h16" />
          <path d="M6 7v12h12V7" />
          <path d="M9 11h6" />
          <path d="M5 4h14v3H5z" />
        </>
      );
    case "check":
      return <path d="m5 12 4 4L19 6" />;
    case "download":
      return (
        <>
          <path d="M12 3v12" />
          <path d="m7 10 5 5 5-5" />
          <path d="M5 21h14" />
        </>
      );
    case "file":
      return (
        <>
          <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8Z" />
          <path d="M14 3v5h5" />
        </>
      );
    case "pen":
      return (
        <>
          <path d="M12 20h9" />
          <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" />
        </>
      );
    case "search":
      return (
        <>
          <circle cx="11" cy="11" r="7" />
          <path d="m16 16 4 4" />
        </>
      );
    case "send":
      return (
        <>
          <path d="m22 2-7 20-4-9-9-4Z" />
          <path d="M22 2 11 13" />
        </>
      );
    case "shield":
      return <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z" />;
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

export default function AgreementsPage() {
  const { permissions, session } = useAuth();
  const token = session?.access_token || "";
  const canWriteAgreements = permissions.canWriteAgreements;

  const [clientSearch, setClientSearch] = useState("");
  const [clientOptions, setClientOptions] = useState<AdminClientOption[]>([]);
  const [selectedClient, setSelectedClient] = useState<AdminClientOption | null>(null);
  const [clientLoading, setClientLoading] = useState(false);
  const [clientError, setClientError] = useState("");

  const [form, setForm] = useState<AgreementFormState>(emptyForm);
  const [formError, setFormError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [previewBusy, setPreviewBusy] = useState(false);
  const [sendBusy, setSendBusy] = useState(false);
  const [previewUrl, setPreviewUrl] = useState("");
  const [previewOpen, setPreviewOpen] = useState(false);

  const [agreements, setAgreements] = useState<AgreementSummary[]>([]);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [historyError, setHistoryError] = useState("");
  const [actionBusyKey, setActionBusyKey] = useState("");

  const selectedClientEmail = selectedClient?.email || "";

  const loadClients = useCallback(async (signal?: AbortSignal) => {
    if (!token) {
      return;
    }

    setClientLoading(true);
    setClientError("");

    try {
      const response = await getClientOptions(token, {
        search: clientSearch,
        limit: 20,
      }, signal);
      setClientOptions(response.items);
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") {
        return;
      }

      setClientError(error instanceof AdminApiError ? error.message : "Client options could not be loaded.");
    } finally {
      if (!signal?.aborted) {
        setClientLoading(false);
      }
    }
  }, [clientSearch, token]);

  const loadAgreementHistory = useCallback(async (signal?: AbortSignal) => {
    if (!token) {
      return;
    }

    if (!selectedClientEmail) {
      setAgreements([]);
      setHistoryLoading(false);
      setHistoryError("");
      return;
    }

    setHistoryLoading(true);
    setHistoryError("");

    try {
      const response = await listAgreements(token, {
        clientEmail: selectedClientEmail || undefined,
        limit: 25,
      }, signal);
      setAgreements(response.items);
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") {
        return;
      }

      setHistoryError(error instanceof AdminApiError ? error.message : "Agreement history could not be loaded.");
    } finally {
      if (!signal?.aborted) {
        setHistoryLoading(false);
      }
    }
  }, [selectedClientEmail, token]);

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

  useEffect(() => {
    const controller = new AbortController();
    void loadAgreementHistory(controller.signal);

    return () => {
      controller.abort();
    };
  }, [loadAgreementHistory]);

  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  const selectedClientDetails = useMemo(() => {
    if (!selectedClient) {
      return [];
    }

    return [
      ["Email", selectedClient.email],
      ["Office/group", selectedClient.officeName],
      ["Contact", signerNameFromClient(selectedClient)],
      ["Organization type", selectedClient.orgType],
      ["Phone", selectedClient.phone],
    ];
  }, [selectedClient]);

  const updateForm = (field: keyof AgreementFormState, value: string) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const resetSelectedClient = () => {
    setSelectedClient(null);
    setClientSearch("");
    setAgreements([]);
    setHistoryLoading(false);
    setHistoryError("");
    setFormError("");
    setSuccessMessage("");
    setPreviewOpen(false);
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
      setPreviewUrl("");
    }
    setForm((current) => ({
      ...current,
      clientLegalName: "",
      state: "",
      effectiveDate: todayIsoDate(),
      signerName: "",
      signerEmail: "",
      signerTitle: "",
      baSignerName: current.baSignerName,
      baSignerTitle: current.baSignerTitle,
      baSignerEmail: current.baSignerEmail,
    }));
  };

  const handleClientSearchChange = (value: string) => {
    setClientSearch(value);
    if (selectedClient && value.trim() !== selectedClient.email) {
      resetSelectedClient();
      setClientSearch(value);
    }
  };

  const selectClient = (client: AdminClientOption) => {
    setSelectedClient(client);
    setClientSearch(client.email);
    setForm((current) => ({
      ...current,
      clientLegalName: client.officeName || clientDisplayName(client),
      state: "",
      effectiveDate: current.effectiveDate || todayIsoDate(),
      signerName: signerNameFromClient(client),
      signerEmail: client.email,
      signerTitle: "",
    }));
    setFormError("");
    setSuccessMessage("");
  };

  const buildPayload = (): AgreementPreviewRequest | null => {
    if (!selectedClient) {
      setFormError("Select a client before generating an agreement.");
      return null;
    }

    const payload: AgreementPreviewRequest = {
      clientEmail: selectedClient.email.trim(),
      clientLegalName: form.clientLegalName.trim(),
      officeName: selectedClient.officeName?.trim() || null,
      orgType: selectedClient.orgType?.trim() || null,
      phone: selectedClient.phone?.trim() || null,
      state: form.state.trim(),
      effectiveDate: form.effectiveDate,
      documentType: "baa_privacy_agreement",
      signerName: form.signerName.trim() || null,
      signerEmail: form.signerEmail.trim(),
      signerTitle: form.signerTitle.trim() || null,
      baSignerName: form.baSignerName.trim(),
      baSignerTitle: form.baSignerTitle.trim(),
      baSignerEmail: form.baSignerEmail.trim(),
      baSignatureMode: "tokenized_link",
    };

    if (!payload.clientLegalName || !payload.state || !payload.effectiveDate || !payload.signerEmail || !payload.baSignerName || !payload.baSignerTitle || !payload.baSignerEmail) {
      setFormError("Client legal name, state, effective date, signer email, and BA signer fields are required.");
      return null;
    }

    if (!payload.signerEmail.includes("@")) {
      setFormError("Enter a valid signer email.");
      return null;
    }

    if (!payload.baSignerEmail.includes("@")) {
      setFormError("Enter a valid BA signer email.");
      return null;
    }

    setFormError("");
    return payload;
  };

  const handlePreview = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!token || previewBusy || !canWriteAgreements) {
      return;
    }

    const payload = buildPayload();
    if (!payload) {
      return;
    }

    setPreviewBusy(true);
    setSuccessMessage("");

    try {
      const blob = await previewAgreementPdf(token, payload);
      const nextUrl = URL.createObjectURL(blob);
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
      setPreviewUrl(nextUrl);
      setPreviewOpen(true);
    } catch (error) {
      setFormError(error instanceof AdminApiError ? error.message : "Agreement preview could not be generated.");
    } finally {
      setPreviewBusy(false);
    }
  };

  const closePreview = () => {
    setPreviewOpen(false);
  };

  const handleSend = async () => {
    if (!token || sendBusy || !canWriteAgreements) {
      return;
    }

    const payload = buildPayload();
    if (!payload) {
      return;
    }

    setSendBusy(true);
    setFormError("");
    setSuccessMessage("");

    try {
      const response = await sendAgreement(token, payload);
      setSuccessMessage(`BAA/Privacy Agreement sent to ${response.agreement.signerEmail}. The BA signer receives a countersign link after the client signs.`);
      setPreviewOpen(false);
      await loadAgreementHistory();
    } catch (error) {
      setFormError(error instanceof AdminApiError ? error.message : "Agreement could not be sent for signature.");
    } finally {
      setSendBusy(false);
    }
  };

  const handleDownload = async (agreement: AgreementSummary, fileType: AgreementDownloadFileType) => {
    if (!token || actionBusyKey) {
      return;
    }

    const busyKey = `${agreement.id}:${fileType}`;
    setActionBusyKey(busyKey);
    setHistoryError("");

    try {
      const response = await createAgreementDownloadUrl(token, agreement.id, fileType);
      window.open(response.url, "_blank", "noopener,noreferrer");
    } catch (error) {
      setHistoryError(error instanceof AdminApiError ? error.message : "Agreement PDF could not be opened.");
    } finally {
      setActionBusyKey("");
    }
  };

  const handleVoid = async (agreement: AgreementSummary) => {
    if (!token || actionBusyKey || !canWriteAgreements) {
      return;
    }

    const reason = window.prompt("Reason for voiding this agreement");
    if (reason === null) {
      return;
    }

    const trimmedReason = reason.trim();
    if (!trimmedReason) {
      setHistoryError("A void reason is required.");
      return;
    }

    setActionBusyKey(`${agreement.id}:void`);
    setHistoryError("");

    try {
      await voidAgreement(token, agreement.id, trimmedReason);
      setSuccessMessage("Agreement voided.");
      await loadAgreementHistory();
    } catch (error) {
      setHistoryError(error instanceof AdminApiError ? error.message : "Agreement could not be voided.");
    } finally {
      setActionBusyKey("");
    }
  };

  const formDisabled = !canWriteAgreements || previewBusy || sendBusy;

  return (
    <div className="space-y-5">
      <section className={`${sectionClassName} px-5 py-4`}>
        <SectionHeader
          action={(
            <StatusPill className="border-[#A380F6]/25 bg-[#A380F6]/10 text-[#0A1547]/72">
              Agreement documents stay private and are opened through time-limited backend URLs.
            </StatusPill>
          )}
          description="Generate, preview, send, and retrieve BAA/Privacy Agreements for clients."
          icon="shield"
          iconTone="agreements"
          title="Agreements"
        />
      </section>

      {!canWriteAgreements && (
        <section className={`${sectionClassName} p-5`}>
          <p className="text-sm font-medium text-[#0A1547]/70">
            Your role can review agreement history. Preview, send, and void actions require Agreements write permission.
          </p>
        </section>
      )}

      <section className="grid gap-5 xl:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
        <div className={`${sectionClassName} p-5`}>
          <SectionHeader
            description="Search existing records, then confirm legal details before previewing."
            icon="users"
            iconTone="clients"
            title="Select client"
          />

          <label className="relative mt-5 block">
            <span className={labelClassName}>Client search</span>
            <span className="pointer-events-none absolute left-3 top-[2.45rem] text-[#02ABE0]">
              <Icon name="search" size={17} />
            </span>
            <input
              type="search"
              value={clientSearch}
              onChange={(event) => handleClientSearchChange(event.target.value)}
              placeholder="Search email, name, office, phone"
              className={`${inputClassName} pl-10`}
            />
          </label>

          {clientError && (
            <p className="mt-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
              {clientError}
            </p>
          )}

          <div className="mt-4 max-h-80 space-y-2 overflow-y-auto pr-1">
            {clientLoading ? (
              <p className="rounded-lg border border-[#0A1547]/10 bg-[#F8F9FD] px-4 py-3 text-sm font-medium text-[#0A1547]/54">
                Loading clients...
              </p>
            ) : clientOptions.length ? (
              clientOptions.map((client) => {
                const selected = selectedClient?.email === client.email;
                return (
                  <button
                    key={client.email}
                    type="button"
                    onClick={() => selectClient(client)}
                    className={`admin-focus w-full rounded-lg border px-4 py-3 text-left transition ${
                      selected
                        ? "border-[#A380F6] bg-[#A380F6]/12"
                        : "border-[#0A1547]/10 bg-white hover:border-[#A380F6]/45 hover:bg-[#F8F9FD]"
                    }`}
                  >
                    <span className="flex min-w-0 items-start gap-3">
                      <IconBadge compact icon="users" tone="clients" />
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-semibold text-[#0A1547]">{clientDisplayName(client)}</span>
                        <span className="mt-1 block break-all text-xs font-medium text-[#0A1547]/52">{client.email}</span>
                      </span>
                    </span>
                  </button>
                );
              })
            ) : (
              <p className="rounded-lg border border-[#0A1547]/10 bg-[#F8F9FD] px-4 py-3 text-sm font-medium text-[#0A1547]/54">
                No clients match that search.
              </p>
            )}
          </div>

          {selectedClient && (
            <div className="mt-5 rounded-lg border border-[#0A1547]/10 bg-[#F8F9FD] p-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-3">
                  <IconBadge compact icon="users" tone="clients" />
                  <p className="text-sm font-semibold text-[#0A1547]">Selected client</p>
                </div>
                <button
                  type="button"
                  onClick={resetSelectedClient}
                  className="admin-focus rounded-lg border border-[#0A1547]/10 bg-white px-3 py-2 text-xs font-semibold text-[#0A1547]/72 transition hover:border-[#A380F6]/50 hover:text-[#0A1547]"
                >
                  Clear client
                </button>
              </div>
              <div className="mt-3 grid gap-3 text-sm">
                {selectedClientDetails.map(([label, value]) => (
                  <div key={label} className="flex items-start justify-between gap-4 border-b border-[#0A1547]/8 pb-2 last:border-b-0 last:pb-0">
                    <span className="font-medium text-[#0A1547]/50">{label}</span>
                    <span className="break-words text-right font-semibold text-[#0A1547]/82">{displayText(value)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <form onSubmit={handlePreview} className={`${sectionClassName} p-5`}>
          <SectionHeader
            action={(
              <StatusPill className="border-[#02D99D]/30 bg-[#02D99D]/12 text-[#0A1547]">
                BAA/Privacy
              </StatusPill>
            )}
            description="The backend renders the approved template. Confirm legal name and state here."
            icon="pen"
            iconTone="agreements"
            title="Agreement fields"
          />

          <div className="mt-5 grid gap-4">
            <FormGroup icon="file" title="Client / legal details">
            <label className="block md:col-span-2">
              <span className={labelClassName}>Client legal name</span>
              <input
                type="text"
                value={form.clientLegalName}
                onChange={(event) => updateForm("clientLegalName", event.target.value)}
                placeholder="Covered Entity legal name"
                disabled={formDisabled}
                className={inputClassName}
              />
            </label>

            <label className="block">
              <span className={labelClassName}>State</span>
              <input
                type="text"
                value={form.state}
                onChange={(event) => updateForm("state", event.target.value)}
                placeholder="Admin-confirmed state"
                disabled={formDisabled}
                className={inputClassName}
              />
            </label>

            <label className="block">
              <span className={labelClassName}>Effective date</span>
              <input
                type="date"
                value={form.effectiveDate}
                onChange={(event) => updateForm("effectiveDate", event.target.value)}
                disabled={formDisabled}
                className={inputClassName}
              />
            </label>
            </FormGroup>

            <FormGroup icon="users" title="Client signer">
            <label className="block">
              <span className={labelClassName}>Signer name</span>
              <input
                type="text"
                value={form.signerName}
                onChange={(event) => updateForm("signerName", event.target.value)}
                placeholder="Client signer name"
                disabled={formDisabled}
                className={inputClassName}
              />
            </label>

            <label className="block">
              <span className={labelClassName}>Signer email</span>
              <input
                type="email"
                value={form.signerEmail}
                onChange={(event) => updateForm("signerEmail", event.target.value)}
                placeholder="client@example.com"
                disabled={formDisabled}
                className={inputClassName}
              />
            </label>

            <label className="block md:col-span-2">
              <span className={labelClassName}>Signer title</span>
              <input
                type="text"
                value={form.signerTitle}
                onChange={(event) => updateForm("signerTitle", event.target.value)}
                placeholder="Owner, Practice Administrator, or authorized title"
                disabled={formDisabled}
                className={inputClassName}
              />
            </label>
            </FormGroup>

            <FormGroup icon="shield" title="BA signer">
            <label className="block">
              <span className={labelClassName}>BA signer name</span>
              <input
                type="text"
                value={form.baSignerName}
                onChange={(event) => updateForm("baSignerName", event.target.value)}
                placeholder="alphaSource signer"
                disabled={formDisabled}
                className={inputClassName}
              />
            </label>

            <label className="block">
              <span className={labelClassName}>BA signer title</span>
              <input
                type="text"
                value={form.baSignerTitle}
                onChange={(event) => updateForm("baSignerTitle", event.target.value)}
                placeholder="Title"
                disabled={formDisabled}
                className={inputClassName}
              />
            </label>

            <label className="block md:col-span-2">
              <span className={labelClassName}>BA signer email</span>
              <input
                type="email"
                value={form.baSignerEmail}
                onChange={(event) => updateForm("baSignerEmail", event.target.value)}
                placeholder="ba-signer@alphasourceconsulting.com"
                disabled={formDisabled}
                className={inputClassName}
              />
            </label>
            </FormGroup>
          </div>

          {formError && (
            <p className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
              {formError}
            </p>
          )}

          {successMessage && (
            <p className="mt-4 rounded-lg border border-[#02D99D]/35 bg-[#02D99D]/12 px-4 py-3 text-sm font-semibold text-[#0A1547]">
              {successMessage}
            </p>
          )}

          <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs font-medium leading-5 text-[#0A1547]/50">
              Preview before sending. The signing email is only sent by the Send for Signature action.
            </p>
            <button
              type="submit"
              disabled={formDisabled || !selectedClient}
              className="admin-focus inline-flex items-center gap-2 rounded-lg bg-[#A380F6] px-5 py-3 text-sm font-bold text-white transition hover:bg-[#906cf2] disabled:opacity-45"
            >
              <Icon name="file" size={15} />
              {previewBusy ? "Generating..." : "Generate Preview"}
            </button>
          </div>
        </form>
      </section>

      <section className={`${sectionClassName} p-5`}>
        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <SectionHeader
            description={selectedClient ? `Showing agreements for ${selectedClient.email}.` : "Select a client to view agreement history."}
            icon="archive"
            iconTone="agreements"
            title="Agreement history"
          />
          {selectedClient && (
            <button
              type="button"
              onClick={resetSelectedClient}
              className="admin-focus rounded-lg border border-[#0A1547]/10 bg-white px-4 py-2 text-sm font-semibold text-[#0A1547]/82 transition hover:border-[#A380F6]/50"
            >
              Clear selected client
            </button>
          )}
        </div>

        {historyError && (
          <p className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
            {historyError}
          </p>
        )}

        <div className="mt-5 overflow-hidden rounded-lg border border-[#0A1547]/10">
          <div className="grid grid-cols-[1.4fr_1fr_0.7fr_0.9fr_0.9fr_1.2fr] gap-3 bg-[#F8F9FD] px-4 py-3 text-[11px] font-medium uppercase tracking-[0.12em] text-[#0A1547]/38 max-xl:hidden">
            <span>Client</span>
            <span>Signer</span>
            <span>Status</span>
            <span>Effective</span>
            <span>Signed</span>
            <span>Actions</span>
          </div>

          {historyLoading ? (
            <p className="px-4 py-6 text-sm font-medium text-[#0A1547]/54">Loading agreement history...</p>
          ) : agreements.length ? (
            <div className="divide-y divide-[#0A1547]/8">
              {agreements.map((agreement) => {
                const normalizedStatus = agreement.status.toLowerCase();
                const canVoid = canWriteAgreements && !["voided", "superseded"].includes(normalizedStatus);
                const showSignedPdf = normalizedStatus === "signed" && agreement.hasSignedPdf;
                const showDraftPreview = !showSignedPdf && agreement.hasDraftPdf;
                return (
                  <div key={agreement.id} className="grid gap-4 px-4 py-4 text-sm xl:grid-cols-[1.4fr_1fr_0.7fr_0.9fr_0.9fr_1.2fr] xl:items-center">
                    <div className="flex min-w-0 items-start gap-3">
                      <IconBadge compact icon="shield" tone="agreements" />
                      <div className="min-w-0">
                        <p className="font-semibold text-[#0A1547]">{displayText(agreement.clientLegalName)}</p>
                        <p className="mt-1 break-all text-xs font-medium text-[#0A1547]/50">{agreement.clientEmail}</p>
                        <p className="mt-1 text-xs font-medium text-[#0A1547]/45">{agreement.documentType}</p>
                      </div>
                    </div>
                    <div>
                      <p className="break-all font-medium text-[#0A1547]/80">{displayText(agreement.signerEmail)}</p>
                      <p className="mt-1 text-xs font-medium text-[#0A1547]/50">{displayText(agreement.signerName)}</p>
                    </div>
                    <div>
                      <StatusPill className={statusPillClassName(agreement.status)}>
                        {agreementStatusLabel(agreement.status)}
                      </StatusPill>
                    </div>
                    <div className="font-medium text-[#0A1547]/64">
                      {formatDate(agreement.effectiveDate)}
                    </div>
                    <div className="font-medium text-[#0A1547]/64">
                      {formatDateTime(agreement.signedAt || agreement.baSignedAt || agreement.clientSignedAt || agreement.sentAt)}
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {showDraftPreview && (
                        <button
                          type="button"
                          onClick={() => void handleDownload(agreement, "draft")}
                          disabled={Boolean(actionBusyKey)}
                          className="admin-focus inline-flex items-center gap-1.5 rounded-lg border border-[#0A1547]/10 bg-white px-3 py-2 text-xs font-semibold text-[#0A1547]/82 transition hover:border-[#A380F6]/50 disabled:opacity-45"
                        >
                          <Icon name="download" size={14} />
                          Draft Preview
                        </button>
                      )}
                      {showSignedPdf && (
                        <button
                          type="button"
                          onClick={() => void handleDownload(agreement, "signed")}
                          disabled={Boolean(actionBusyKey)}
                          className="admin-focus inline-flex items-center gap-1.5 rounded-lg bg-[#0A1547] px-3 py-2 text-xs font-bold text-white transition hover:bg-[#1A2460] disabled:opacity-45"
                        >
                          <Icon name="download" size={14} />
                          Signed PDF
                        </button>
                      )}
                      {canVoid && (
                        <button
                          type="button"
                          onClick={() => void handleVoid(agreement)}
                          disabled={Boolean(actionBusyKey)}
                          className="admin-focus rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-semibold text-red-700 transition hover:bg-red-100 disabled:opacity-45"
                        >
                          Void
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="px-4 py-6 text-sm font-medium text-[#0A1547]/54">
              {selectedClient ? "No agreements found." : "Select a client to load agreement history."}
            </p>
          )}
        </div>
      </section>

      {previewOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-[#0A1547]/72 px-4 py-6"
          role="dialog"
          aria-modal="true"
          aria-label="Agreement preview"
        >
          <div className="flex max-h-[92vh] w-full max-w-6xl flex-col overflow-hidden rounded-lg bg-white shadow-2xl">
            <div className="flex flex-col gap-3 border-b border-[#0A1547]/10 px-5 py-4 md:flex-row md:items-center md:justify-between">
              <div className="flex min-w-0 items-start gap-3">
                <IconBadge icon="file" tone="agreements" />
                <div>
                  <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-[#0A1547]/38">Preview</p>
                  <h3 className="mt-1 text-xl font-black text-[#0A1547]">BAA/Privacy Agreement</h3>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={closePreview}
                  disabled={sendBusy}
                  className="admin-focus rounded-lg border border-[#0A1547]/10 bg-white px-4 py-3 text-sm font-semibold text-[#0A1547]/82 transition hover:border-[#A380F6]/50 disabled:opacity-45"
                >
                  Close
                </button>
                <button
                  type="button"
                  onClick={() => void handleSend()}
                  disabled={!canWriteAgreements || sendBusy}
                  className="admin-focus inline-flex items-center gap-2 rounded-lg bg-[#A380F6] px-4 py-3 text-sm font-bold text-white transition hover:bg-[#906cf2] disabled:opacity-45"
                >
                  <Icon name="send" size={15} />
                  {sendBusy ? "Sending..." : "Send for Signature"}
                </button>
              </div>
            </div>
            <div className="min-h-0 flex-1 bg-[#F8F9FD] p-4">
              {previewUrl ? (
                <iframe
                  title="BAA/Privacy Agreement preview"
                  src={previewUrl}
                  className="h-[72vh] w-full rounded-lg border border-[#0A1547]/10 bg-white"
                />
              ) : (
                <p className="rounded-lg border border-[#0A1547]/10 bg-white p-6 text-sm font-medium text-[#0A1547]/54">
                  Preview is not available.
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
