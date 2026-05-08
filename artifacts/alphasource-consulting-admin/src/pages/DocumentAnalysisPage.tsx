import { useCallback, useEffect, useMemo, useState, type FormEvent, type ReactNode } from "react";
import { useAuth } from "@/auth/AuthProvider";
import {
  AdminApiError,
  cancelAnalysisJob,
  createFinancialIntakeJob,
  getAnalysisJob,
  getClientOptions,
} from "@/lib/adminApi";
import type { AdminAnalysisJob, AdminClientOption } from "@/lib/types";

type ClientMode = "existing" | "new";

type ClientFormState = {
  clientEmail: string;
  firstName: string;
  lastName: string;
  officeName: string;
  orgType: string;
  phone: string;
  ghlCid: string;
};

const emptyClientForm: ClientFormState = {
  clientEmail: "",
  firstName: "",
  lastName: "",
  officeName: "",
  orgType: "",
  phone: "",
  ghlCid: "",
};

const activeJobStatuses = new Set(["queued", "processing", "intake_pending"]);
const terminalJobStatuses = new Set(["completed", "error", "canceled", "cancelled"]);
const allowedFinancialExtensions = [".csv", ".xlsx", ".pdf"];

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

function formatBytes(value: number | null): string {
  if (value === null || value === undefined) {
    return "—";
  }

  if (value < 1024) {
    return `${value} B`;
  }

  if (value < 1024 * 1024) {
    return `${(value / 1024).toFixed(1)} KB`;
  }

  return `${(value / (1024 * 1024)).toFixed(1)} MB`;
}

function fileExtension(filename: string): string {
  const index = filename.lastIndexOf(".");
  return index >= 0 ? filename.slice(index).toLowerCase() : "";
}

function isJobActive(status: string | null): boolean {
  return activeJobStatuses.has((status || "").toLowerCase());
}

function statusTone(status: string | null): string {
  const normalized = (status || "").toLowerCase();

  if (terminalJobStatuses.has(normalized) && normalized !== "completed") {
    return "border-red-200 bg-red-50 text-red-700";
  }

  if (normalized === "completed") {
    return "border-[#02D99D]/30 bg-[#02D99D]/12 text-[#0A1547]";
  }

  if (normalized === "cancel_requested") {
    return "border-[#A380F6]/30 bg-[#A380F6]/10 text-[#0A1547]";
  }

  return "border-[#02ABE0]/25 bg-[#02ABE0]/10 text-[#0A1547]";
}

function optionLabel(option: AdminClientOption): string {
  const name = [option.firstName, option.lastName].filter(Boolean).join(" ");
  const details = [name, option.officeName].filter(Boolean).join(" · ");
  return details ? `${option.email} — ${details}` : option.email;
}

function formFromOption(option: AdminClientOption): ClientFormState {
  return {
    clientEmail: option.email || "",
    firstName: option.firstName || "",
    lastName: option.lastName || "",
    officeName: option.officeName || "",
    orgType: option.orgType || "",
    phone: option.phone || "",
    ghlCid: option.ghlCid || "",
  };
}

export default function DocumentAnalysisPage() {
  const { session } = useAuth();
  const token = session?.access_token || "";
  const [mode, setMode] = useState<ClientMode>("existing");
  const [clientForm, setClientForm] = useState<ClientFormState>(emptyClientForm);
  const [clientSearch, setClientSearch] = useState("");
  const [clientOptions, setClientOptions] = useState<AdminClientOption[]>([]);
  const [selectedClientEmail, setSelectedClientEmail] = useState("");
  const [clientOptionsLoading, setClientOptionsLoading] = useState(false);
  const [clientOptionsError, setClientOptionsError] = useState("");
  const [financialFile, setFinancialFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [job, setJob] = useState<AdminAnalysisJob | null>(null);
  const [jobError, setJobError] = useState("");
  const [canceling, setCanceling] = useState(false);

  const updateClientField = (field: keyof ClientFormState, value: string) => {
    setClientForm((current) => ({ ...current, [field]: value }));
  };

  const loadClientOptions = useCallback(async (signal?: AbortSignal) => {
    if (!token || mode !== "existing") {
      return;
    }

    setClientOptionsLoading(true);
    setClientOptionsError("");

    try {
      const response = await getClientOptions(token, {
        search: clientSearch,
        limit: 75,
      }, signal);
      setClientOptions(response.items);
    } catch (optionsError) {
      if (optionsError instanceof DOMException && optionsError.name === "AbortError") {
        return;
      }

      if (optionsError instanceof AdminApiError) {
        setClientOptionsError(optionsError.message);
      } else {
        setClientOptionsError("Client options could not be loaded.");
      }
    } finally {
      if (!signal?.aborted) {
        setClientOptionsLoading(false);
      }
    }
  }, [clientSearch, mode, token]);

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
    if (!job || !token || !isJobActive(job.status)) {
      return undefined;
    }

    const interval = window.setInterval(async () => {
      try {
        const response = await getAnalysisJob(token, job.id);
        setJob(response.job);
        setJobError("");
      } catch (pollError) {
        if (pollError instanceof AdminApiError) {
          setJobError(pollError.message);
        } else {
          setJobError("Analysis job status could not be refreshed.");
        }
      }
    }, 3000);

    return () => {
      window.clearInterval(interval);
    };
  }, [job, token]);

  const selectedClient = useMemo(() => {
    return clientOptions.find((option) => option.email === selectedClientEmail) || null;
  }, [clientOptions, selectedClientEmail]);

  const handleModeChange = (nextMode: ClientMode) => {
    setMode(nextMode);
    setSelectedClientEmail("");
    setClientOptionsError("");
    setSubmitError("");
    setClientForm(emptyClientForm);
  };

  const handleSelectedClientChange = (email: string) => {
    setSelectedClientEmail(email);
    const option = clientOptions.find((clientOption) => clientOption.email === email);
    setClientForm(option ? formFromOption(option) : emptyClientForm);
  };

  const validateForm = (): string => {
    if (!clientForm.clientEmail.trim()) {
      return "Client email is required.";
    }
    if (!clientForm.firstName.trim()) {
      return "First name is required.";
    }
    if (!clientForm.lastName.trim()) {
      return "Last name is required.";
    }
    if (!clientForm.officeName.trim()) {
      return "Office or group name is required.";
    }
    if (!clientForm.orgType.trim()) {
      return "Organization type is required.";
    }
    if (!financialFile) {
      return "Financial Analyzer source file is required.";
    }
    if (!allowedFinancialExtensions.includes(fileExtension(financialFile.name))) {
      return "Financial file must be a .csv, .xlsx, or .pdf file.";
    }

    return "";
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setSubmitError("");
    setJobError("");

    const validationMessage = validateForm();
    if (validationMessage) {
      setSubmitError(validationMessage);
      return;
    }

    if (!financialFile) {
      setSubmitError("Financial Analyzer source file is required.");
      return;
    }

    const formData = new FormData();
    formData.append("clientMode", mode);
    formData.append("clientEmail", clientForm.clientEmail.trim());
    formData.append("firstName", clientForm.firstName.trim());
    formData.append("lastName", clientForm.lastName.trim());
    formData.append("officeName", clientForm.officeName.trim());
    formData.append("orgType", clientForm.orgType.trim());
    if (clientForm.phone.trim()) {
      formData.append("phone", clientForm.phone.trim());
    }
    if (clientForm.ghlCid.trim()) {
      formData.append("ghlCid", clientForm.ghlCid.trim());
    }
    formData.append("financialFile", financialFile);

    setSubmitting(true);

    try {
      const response = await createFinancialIntakeJob(token, formData);
      setJob(response.job);
    } catch (intakeError) {
      if (intakeError instanceof AdminApiError) {
        setSubmitError(intakeError.message);
      } else {
        setSubmitError("Financial intake job could not be created.");
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancel = async () => {
    if (!job || !token) {
      return;
    }

    setCanceling(true);
    setJobError("");

    try {
      const response = await cancelAnalysisJob(token, job.id);
      setJob(response.job);
    } catch (cancelError) {
      if (cancelError instanceof AdminApiError) {
        setJobError(cancelError.message);
      } else {
        setJobError("Analysis job could not be canceled.");
      }
    } finally {
      setCanceling(false);
    }
  };

  return (
    <div className="space-y-6">
      <section className="admin-card p-5">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="text-xs font-extrabold uppercase tracking-[0.18em] text-[#A380F6]">DA-3A intake</p>
            <h2 className="mt-2 text-2xl font-black text-[#0A1547]">Document Analysis</h2>
            <p className="mt-2 max-w-3xl text-sm font-semibold leading-6 text-[#0A1547]/62">
              Financial file intake is enabled. AI analysis execution will be added in the next phase.
            </p>
          </div>
          <span className="w-fit rounded-full border border-[#02ABE0]/25 bg-[#02ABE0]/10 px-3 py-1 text-xs font-extrabold text-[#0A1547]">
            Intake only
          </span>
        </div>
      </section>

      <form onSubmit={handleSubmit} className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
        <section className="admin-card p-5">
          <StepHeader
            eyebrow="Step 1"
            title="Select or create client"
            description="Use an existing client record when available, or enter new client details for this intake job."
          />

          <div className="mt-5 flex rounded-2xl border border-[#0A1547]/10 bg-[#F8F9FD] p-1">
            {(["existing", "new"] as const).map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => handleModeChange(option)}
                className={`admin-focus flex-1 rounded-xl px-4 py-2 text-sm font-extrabold transition ${
                  mode === option
                    ? "bg-[#0A1547] text-white"
                    : "text-[#0A1547]/62 hover:bg-white hover:text-[#0A1547]"
                }`}
              >
                {option === "existing" ? "Existing client" : "New client"}
              </button>
            ))}
          </div>

          {mode === "existing" && (
            <div className="mt-5 grid gap-4">
              <label className="block">
                <span className="text-sm font-extrabold text-[#0A1547]">Search clients</span>
                <input
                  type="search"
                  value={clientSearch}
                  onChange={(event) => setClientSearch(event.target.value)}
                  placeholder="Search email, name, office, phone"
                  className={inputClassName}
                />
              </label>

              <label className="block">
                <span className="text-sm font-extrabold text-[#0A1547]">Client</span>
                <select
                  value={selectedClientEmail}
                  onChange={(event) => handleSelectedClientChange(event.target.value)}
                  className={selectClassName}
                >
                  <option value="">
                    {clientOptionsLoading ? "Loading clients..." : "Select a client"}
                  </option>
                  {clientOptions.map((option) => (
                    <option key={option.email} value={option.email}>
                      {optionLabel(option)}
                    </option>
                  ))}
                </select>
              </label>

              {clientOptionsError && <ErrorMessage message={clientOptionsError} />}

              {selectedClient && (
                <div className="rounded-2xl border border-[#02D99D]/25 bg-[#02D99D]/10 p-4">
                  <p className="text-sm font-black text-[#0A1547]">Client loaded</p>
                  <p className="mt-1 text-sm font-semibold text-[#0A1547]/62">
                    Latest submission: {formatDate(selectedClient.latestSubmittedAt)}
                  </p>
                </div>
              )}
            </div>
          )}

          <ClientFields
            form={clientForm}
            onChange={updateClientField}
          />
        </section>

        <section className="admin-card p-5">
          <StepHeader
            eyebrow="Step 2"
            title="Upload source file"
            description="Only Financial Analyzer intake is active in this phase. The file is stored and linked to a durable job record."
          />

          <div className="mt-5 grid gap-4">
            <AnalyzerToolCard
              active
              description="Accepts .csv, .xlsx, and .pdf financial files for storage-only intake."
              title="Financial Analyzer"
            >
              <label className="block">
                <span className="text-sm font-extrabold text-[#0A1547]">Financial source file</span>
                <input
                  type="file"
                  accept=".csv,.xlsx,.pdf"
                  onChange={(event) => setFinancialFile(event.target.files?.[0] ?? null)}
                  className="admin-focus mt-2 w-full rounded-xl border border-[#0A1547]/10 bg-[#F8F9FD] px-4 py-3 text-sm font-semibold text-[#0A1547] file:mr-4 file:rounded-lg file:border-0 file:bg-[#0A1547] file:px-4 file:py-2 file:text-sm file:font-extrabold file:text-white"
                  disabled={submitting}
                />
              </label>
              {financialFile && (
                <p className="mt-3 text-sm font-bold text-[#0A1547]/62">
                  Selected: {financialFile.name} · {formatBytes(financialFile.size)}
                </p>
              )}
            </AnalyzerToolCard>

            <AnalyzerToolCard
              description="Team-assisted AR workflow will be added after financial intake and job execution are stable."
              title="AR Analyzer"
            />
            <AnalyzerToolCard
              description="Insurance claim analysis remains disabled until the API flow supports this tool."
              title="Insurance Claim Analyzer"
            />
          </div>

          <div className="mt-5 rounded-2xl border border-[#A380F6]/20 bg-[#A380F6]/10 p-4">
            <p className="text-sm font-black text-[#0A1547]">This does not run analysis yet.</p>
            <p className="mt-1 text-sm font-semibold leading-6 text-[#0A1547]/62">
              Submitting creates a durable intake job and links the stored file audit record. It does not create a ClientSubmission, Upload, report, email, GHL update, or payment action.
            </p>
          </div>

          {submitError && <ErrorMessage message={submitError} />}

          <button
            type="submit"
            disabled={submitting}
            className="admin-focus mt-5 w-full rounded-xl bg-[#A380F6] px-5 py-3 text-sm font-extrabold text-white shadow-lg shadow-[#A380F6]/20 transition hover:bg-[#906cf2] disabled:opacity-60"
          >
            {submitting ? "Creating intake job..." : "Create Financial Intake Job"}
          </button>
        </section>
      </form>

      {job && (
        <JobStatusCard
          canceling={canceling}
          job={job}
          jobError={jobError}
          onCancel={() => void handleCancel()}
        />
      )}
    </div>
  );
}

const inputClassName = "admin-focus mt-2 w-full rounded-xl border border-[#0A1547]/10 bg-[#F8F9FD] px-4 py-3 text-sm font-semibold text-[#0A1547] placeholder:text-[#0A1547]/38";
const selectClassName = "admin-focus mt-2 h-[46px] w-full rounded-xl border border-[#0A1547]/10 bg-[#F8F9FD] px-4 py-3 text-sm font-semibold leading-tight text-[#0A1547]";

function ClientFields({
  form,
  onChange,
}: {
  form: ClientFormState;
  onChange: (field: keyof ClientFormState, value: string) => void;
}) {
  return (
    <div className="mt-5 grid gap-4 md:grid-cols-2">
      <TextField label="First name" value={form.firstName} onChange={(value) => onChange("firstName", value)} required />
      <TextField label="Last name" value={form.lastName} onChange={(value) => onChange("lastName", value)} required />
      <TextField label="Office / group" value={form.officeName} onChange={(value) => onChange("officeName", value)} required />
      <TextField label="Client email" type="email" value={form.clientEmail} onChange={(value) => onChange("clientEmail", value)} required />
      <label className="block">
        <span className="text-sm font-extrabold text-[#0A1547]">Type <span className="text-red-600">*</span></span>
        <select
          value={form.orgType}
          onChange={(event) => onChange("orgType", event.target.value)}
          className={selectClassName}
        >
          <option value="">Select type</option>
          <option value="Location">Location</option>
          <option value="Group">Group</option>
        </select>
      </label>
      <TextField label="Phone" value={form.phone} onChange={(value) => onChange("phone", value)} />
      <TextField label="GHL CID" value={form.ghlCid} onChange={(value) => onChange("ghlCid", value)} />
    </div>
  );
}

function TextField({
  label,
  onChange,
  required,
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
      <span className="text-sm font-extrabold text-[#0A1547]">
        {label} {required && <span className="text-red-600">*</span>}
      </span>
      <input
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className={inputClassName}
      />
    </label>
  );
}

function StepHeader({
  description,
  eyebrow,
  title,
}: {
  description: string;
  eyebrow: string;
  title: string;
}) {
  return (
    <div>
      <p className="text-xs font-extrabold uppercase tracking-[0.18em] text-[#A380F6]">{eyebrow}</p>
      <h3 className="mt-2 text-xl font-black text-[#0A1547]">{title}</h3>
      <p className="mt-1 text-sm font-semibold leading-6 text-[#0A1547]/62">{description}</p>
    </div>
  );
}

function AnalyzerToolCard({
  active,
  children,
  description,
  title,
}: {
  active?: boolean;
  children?: ReactNode;
  description: string;
  title: string;
}) {
  return (
    <div className={`rounded-2xl border p-4 ${active ? "border-[#02ABE0]/25 bg-[#02ABE0]/[0.08]" : "border-[#0A1547]/10 bg-[#F8F9FD]"}`}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-base font-black text-[#0A1547]">{title}</p>
          <p className="mt-1 text-sm font-semibold leading-6 text-[#0A1547]/60">{description}</p>
        </div>
        {!active && (
          <span className="rounded-full border border-[#0A1547]/10 bg-white px-3 py-1 text-xs font-extrabold text-[#0A1547]/58">
            Coming later
          </span>
        )}
      </div>
      {children && <div className="mt-4">{children}</div>}
    </div>
  );
}

function JobStatusCard({
  canceling,
  job,
  jobError,
  onCancel,
}: {
  canceling: boolean;
  job: AdminAnalysisJob;
  jobError: string;
  onCancel: () => void;
}) {
  const canCancel = isJobActive(job.status);

  return (
    <section className="admin-card p-5">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="text-xs font-extrabold uppercase tracking-[0.18em] text-[#A380F6]">Step 3</p>
          <h3 className="mt-2 text-xl font-black text-[#0A1547]">Intake job status</h3>
          <p className="mt-1 text-sm font-semibold text-[#0A1547]/62">
            This status reflects file intake only, not AI analysis execution.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <span className={`rounded-full border px-3 py-1 text-xs font-extrabold ${statusTone(job.status)}`}>
            {formatNullable(job.status)}
          </span>
          {canCancel && (
            <button
              type="button"
              onClick={onCancel}
              disabled={canceling}
              className="admin-focus rounded-xl border border-red-200 bg-red-50 px-4 py-2 text-sm font-extrabold text-red-700 transition hover:bg-red-100 disabled:opacity-60"
            >
              {canceling ? "Canceling..." : "Cancel"}
            </button>
          )}
        </div>
      </div>

      <div className="mt-5 grid gap-4 md:grid-cols-4">
        <Fact label="Job ID" value={job.id} />
        <Fact label="Current step" value={formatNullable(job.currentStep)} />
        <Fact label="Progress" value={`${job.progressPercent ?? 0}%`} />
        <Fact label="Run ID" value={formatNullable(job.analysisRunId)} />
      </div>

      {job.error && (
        <ErrorMessage message={job.error.message || "The intake job reported an error."} />
      )}
      {jobError && <ErrorMessage message={jobError} />}

      <div className="mt-5 grid gap-3">
        {job.files.map((file) => (
          <article key={file.id} className="rounded-2xl border border-[#0A1547]/10 bg-[#F8F9FD] p-4">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="text-sm font-black text-[#0A1547]">{formatNullable(file.originalFilename)}</p>
                <p className="mt-1 text-xs font-bold text-[#0A1547]/50">{formatNullable(file.toolName)}</p>
              </div>
              <span className={`w-fit rounded-full border px-3 py-1 text-xs font-extrabold ${statusTone(file.status)}`}>
                {formatNullable(file.status)}
              </span>
            </div>
            <dl className="mt-4 grid gap-3 text-sm md:grid-cols-3">
              <Detail label="UploadFile ID" value={file.uploadFileId} />
              <Detail label="Size" value={formatBytes(file.byteSize)} />
              <Detail label="Content type" value={file.contentType} />
            </dl>
          </article>
        ))}
      </div>
    </section>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-[#F8F9FD] p-4">
      <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-[#0A1547]/42">{label}</p>
      <p className="mt-2 break-all text-sm font-black text-[#0A1547]">{value}</p>
    </div>
  );
}

function Detail({ label, value }: { label: string; value: string | null }) {
  return (
    <div>
      <dt className="text-xs font-extrabold uppercase tracking-[0.14em] text-[#0A1547]/42">{label}</dt>
      <dd className="mt-1 break-all font-black text-[#0A1547]">{formatNullable(value)}</dd>
    </div>
  );
}

function ErrorMessage({ message }: { message: string }) {
  return (
    <p className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-700">
      {message}
    </p>
  );
}
