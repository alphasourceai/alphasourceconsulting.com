import { useCallback, useEffect, useMemo, useState, type FormEvent, type ReactNode } from "react";
import { Link } from "wouter";
import { useAuth } from "@/auth/AuthProvider";
import {
  AdminApiError,
  cancelAnalysisJob,
  createArIntakeJob,
  createClaimsIntakeJob,
  createFinancialIntakeJob,
  getAnalysisJob,
  getClientOptions,
  processArAnalysisJob,
  processClaimsAnalysisJob,
  processFinancialAnalysisJob,
  promoteArAnalysisJob,
  promoteClaimsAnalysisJob,
  promoteFinancialAnalysisJob,
} from "@/lib/adminApi";
import type {
  AdminAnalysisData,
  AdminAnalysisIssue,
  AdminAnalysisJob,
  AdminAnalysisProviderStatus,
  AdminAnalysisTrend,
  AdminClientOption,
} from "@/lib/types";

type ClientMode = "existing" | "new";
type AnalysisKind = "financial" | "ar" | "claims";

type PromotionMetadata = {
  submissionId?: string | null;
  uploadId?: string | null;
  promoted?: boolean;
};

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
const manualProcessingStatuses = new Set(["queued", "processing"]);
const terminalJobStatuses = new Set(["completed", "error", "canceled", "cancelled"]);
const allowedFinancialExtensions = [".csv", ".xlsx", ".pdf"];
const processableFinancialExtensions = new Set([".csv", ".xlsx"]);
const allowedArExtensions = [".csv", ".xlsx"];
const processableArExtensions = new Set(allowedArExtensions);
const allowedClaimsExtensions = [".csv", ".xlsx"];
const processableClaimsExtensions = new Set(allowedClaimsExtensions);
const financialAnalyzerToolName = "Financial Analyzer";
const arAnalyzerToolName = "AR Analyzer";
const claimsAnalyzerToolName = "Insurance Claim Analyzer";

const analysisCreateLabels: Record<AnalysisKind, string> = {
  financial: "Create Financial Analysis",
  ar: "Create AR Analysis",
  claims: "Create Claims Analysis",
};

const analysisRunLabels: Record<AnalysisKind, string> = {
  financial: "Run Financial Analysis",
  ar: "Run AR Analysis",
  claims: "Run Claims Analysis",
};

const analysisProcessingTitles: Record<AnalysisKind, string> = {
  financial: "Financial analysis processing",
  ar: "AR analysis processing",
  claims: "Claims analysis processing",
};

function formatNullable(value: string | number | null | undefined): string {
  if (value === null || value === undefined || value === "") {
    return "—";
  }

  return String(value);
}

function hasRecordId(value: string | null | undefined): boolean {
  return Boolean(value?.trim());
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

function formatProviderName(value: string): string {
  if (value.toLowerCase() === "xai") {
    return "xAI";
  }

  return value
    .replace(/_/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function fileExtension(filename: string): string {
  const index = filename.lastIndexOf(".");
  return index >= 0 ? filename.slice(index).toLowerCase() : "";
}

function fileExtensionFromNullable(filename: string | null): string {
  return filename ? fileExtension(filename) : "";
}

function isJobActive(status: string | null): boolean {
  return activeJobStatuses.has((status || "").toLowerCase());
}

function isJobEligibleForManualProcessing(job: AdminAnalysisJob): boolean {
  const normalizedStatus = (job.status || "").toLowerCase();
  const analysisKind = getJobAnalysisKind(job);
  const analysisFile = getJobAnalysisFile(job);

  if (!analysisKind || !analysisFile || !manualProcessingStatuses.has(normalizedStatus)) {
    return false;
  }

  const extension = fileExtensionFromNullable(analysisFile.originalFilename || null);
  if (analysisKind === "financial") {
    return processableFinancialExtensions.has(extension);
  }

  if (analysisKind === "ar") {
    return processableArExtensions.has(extension);
  }

  return processableClaimsExtensions.has(extension);
}

function getFinancialJobFile(job: AdminAnalysisJob) {
  return job.files.find((file) => file.toolName === financialAnalyzerToolName) || null;
}

function getArJobFile(job: AdminAnalysisJob) {
  return job.files.find((file) => file.toolName === arAnalyzerToolName) || null;
}

function getClaimsJobFile(job: AdminAnalysisJob) {
  return job.files.find((file) => file.toolName === claimsAnalyzerToolName) || null;
}

function getJobAnalysisKind(job: AdminAnalysisJob): AnalysisKind | null {
  if (getFinancialJobFile(job)) {
    return "financial";
  }

  if (getArJobFile(job)) {
    return "ar";
  }

  if (getClaimsJobFile(job)) {
    return "claims";
  }

  return null;
}

function getJobAnalysisFile(job: AdminAnalysisJob) {
  const analysisKind = getJobAnalysisKind(job);

  if (analysisKind === "financial") {
    return getFinancialJobFile(job);
  }

  if (analysisKind === "ar") {
    return getArJobFile(job);
  }

  if (analysisKind === "claims") {
    return getClaimsJobFile(job);
  }

  return null;
}

function clientDetailHref(email: string): string {
  return `/clients/${encodeURIComponent(email)}`;
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
  const { permissions, session } = useAuth();
  const token = session?.access_token || "";
  const canWriteAnalysis = permissions.canWriteAnalysis;
  const [mode, setMode] = useState<ClientMode>("existing");
  const [clientForm, setClientForm] = useState<ClientFormState>(emptyClientForm);
  const [clientSearch, setClientSearch] = useState("");
  const [clientOptions, setClientOptions] = useState<AdminClientOption[]>([]);
  const [selectedClientEmail, setSelectedClientEmail] = useState("");
  const [clientOptionsLoading, setClientOptionsLoading] = useState(false);
  const [clientOptionsError, setClientOptionsError] = useState("");
  const [analysisKind, setAnalysisKind] = useState<AnalysisKind>("financial");
  const [financialFile, setFinancialFile] = useState<File | null>(null);
  const [arFile, setArFile] = useState<File | null>(null);
  const [claimsFile, setClaimsFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [job, setJob] = useState<AdminAnalysisJob | null>(null);
  const [jobError, setJobError] = useState("");
  const [canceling, setCanceling] = useState(false);
  const [processingFinancial, setProcessingFinancial] = useState(false);
  const [processingAr, setProcessingAr] = useState(false);
  const [processingClaims, setProcessingClaims] = useState(false);
  const [promotingFinancial, setPromotingFinancial] = useState(false);
  const [promotingAr, setPromotingAr] = useState(false);
  const [promotingClaims, setPromotingClaims] = useState(false);
  const [promotionMetadata, setPromotionMetadata] = useState<PromotionMetadata | null>(null);

  const updateClientField = (field: keyof ClientFormState, value: string) => {
    setClientForm((current) => ({ ...current, [field]: value }));
  };

  const loadClientOptions = useCallback(async (signal?: AbortSignal) => {
    if (!token || mode !== "existing" || !canWriteAnalysis) {
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
  }, [canWriteAnalysis, clientSearch, mode, token]);

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

  const handleAnalysisKindChange = (nextAnalysisKind: AnalysisKind) => {
    setAnalysisKind(nextAnalysisKind);
    setSubmitError("");
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
    if (analysisKind === "financial") {
      if (!financialFile) {
        return "Financial Analyzer source file is required.";
      }
      if (!allowedFinancialExtensions.includes(fileExtension(financialFile.name))) {
        return "Financial file must be a .csv, .xlsx, or .pdf file.";
      }
    }
    if (analysisKind === "ar") {
      if (!arFile) {
        return "AR Analyzer source file is required.";
      }
      if (!allowedArExtensions.includes(fileExtension(arFile.name))) {
        return "AR file must be a .csv or .xlsx file.";
      }
    }
    if (analysisKind === "claims") {
      if (!claimsFile) {
        return "Claims Analyzer source file is required.";
      }
      if (!allowedClaimsExtensions.includes(fileExtension(claimsFile.name))) {
        return "Claims file must be a .csv or .xlsx file.";
      }
    }

    return "";
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setSubmitError("");
    setJobError("");

    if (!canWriteAnalysis) {
      setSubmitError("Analysis write permission is required to create intake jobs.");
      return;
    }

    const validationMessage = validateForm();
    if (validationMessage) {
      setSubmitError(validationMessage);
      return;
    }

    const selectedFile = analysisKind === "financial"
      ? financialFile
      : analysisKind === "ar"
        ? arFile
        : claimsFile;
    if (!selectedFile) {
      setSubmitError(
        analysisKind === "financial"
          ? "Financial Analyzer source file is required."
          : analysisKind === "ar"
            ? "AR Analyzer source file is required."
            : "Claims Analyzer source file is required.",
      );
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
    const fileFieldName = analysisKind === "financial"
      ? "financialFile"
      : analysisKind === "ar"
        ? "arFile"
        : "claimsFile";
    formData.append(fileFieldName, selectedFile);

    setSubmitting(true);

    try {
      const response = analysisKind === "financial"
        ? await createFinancialIntakeJob(token, formData)
        : analysisKind === "ar"
          ? await createArIntakeJob(token, formData)
          : await createClaimsIntakeJob(token, formData);
      setPromotionMetadata(null);
      setJob(response.job);
    } catch (intakeError) {
      if (intakeError instanceof AdminApiError) {
        setSubmitError(intakeError.message);
      } else {
        setSubmitError(
          analysisKind === "financial"
            ? "Financial intake job could not be created."
            : analysisKind === "ar"
              ? "AR intake job could not be created."
              : "Claims intake job could not be created.",
        );
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancel = async () => {
    if (!job || !token || !canWriteAnalysis) {
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

  const handleProcessFinancial = async () => {
    if (!job || !token || !canWriteAnalysis) {
      return;
    }

    setProcessingFinancial(true);
    setJobError("");

    try {
      const response = await processFinancialAnalysisJob(token, job.id);
      setJob(response.job);
    } catch (processError) {
      if (processError instanceof AdminApiError) {
        setJobError(processError.message);
      } else {
        setJobError("Financial analysis could not be processed.");
      }
    } finally {
      setProcessingFinancial(false);
    }
  };

  const handleProcessAr = async () => {
    if (!job || !token || !canWriteAnalysis) {
      return;
    }

    setProcessingAr(true);
    setJobError("");

    try {
      const response = await processArAnalysisJob(token, job.id);
      setJob(response.job);
    } catch (processError) {
      if (processError instanceof AdminApiError) {
        setJobError(processError.message);
      } else {
        setJobError("AR analysis could not be processed.");
      }
    } finally {
      setProcessingAr(false);
    }
  };

  const handleProcessClaims = async () => {
    if (!job || !token || !canWriteAnalysis) {
      return;
    }

    setProcessingClaims(true);
    setJobError("");

    try {
      const response = await processClaimsAnalysisJob(token, job.id);
      setJob(response.job);
    } catch (processError) {
      if (processError instanceof AdminApiError) {
        setJobError(processError.message);
      } else {
        setJobError("Claims analysis could not be processed.");
      }
    } finally {
      setProcessingClaims(false);
    }
  };

  const handlePromoteFinancial = async () => {
    if (!job || !token || !canWriteAnalysis) {
      return;
    }

    setPromotingFinancial(true);
    setJobError("");
    setPromotionMetadata(null);

    try {
      const response = await promoteFinancialAnalysisJob(token, job.id);
      setJob(response.job);
      setPromotionMetadata({
        submissionId: response.submissionId,
        uploadId: response.uploadId,
        promoted: response.promoted,
      });
    } catch (promoteError) {
      if (promoteError instanceof AdminApiError) {
        setJobError(promoteError.message);
      } else {
        setJobError("Financial analysis could not be promoted to client records.");
      }
    } finally {
      setPromotingFinancial(false);
    }
  };

  const handlePromoteAr = async () => {
    if (!job || !token || !canWriteAnalysis) {
      return;
    }

    setPromotingAr(true);
    setJobError("");
    setPromotionMetadata(null);

    try {
      const response = await promoteArAnalysisJob(token, job.id);
      setJob(response.job);
      setPromotionMetadata({
        submissionId: response.submissionId,
        uploadId: response.uploadId,
        promoted: response.promoted,
      });
    } catch (promoteError) {
      if (promoteError instanceof AdminApiError) {
        setJobError(promoteError.message);
      } else {
        setJobError("AR analysis could not be promoted to client records.");
      }
    } finally {
      setPromotingAr(false);
    }
  };

  const handlePromoteClaims = async () => {
    if (!job || !token || !canWriteAnalysis) {
      return;
    }

    setPromotingClaims(true);
    setJobError("");
    setPromotionMetadata(null);

    try {
      const response = await promoteClaimsAnalysisJob(token, job.id);
      setJob(response.job);
      setPromotionMetadata({
        submissionId: response.submissionId,
        uploadId: response.uploadId,
        promoted: response.promoted,
      });
    } catch (promoteError) {
      if (promoteError instanceof AdminApiError) {
        setJobError(promoteError.message);
      } else {
        setJobError("Claims analysis could not be promoted to client records.");
      }
    } finally {
      setPromotingClaims(false);
    }
  };

  return (
    <div className="space-y-6">
      <section className="admin-card p-5">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="text-xs font-extrabold uppercase tracking-[0.18em] text-[#A380F6]">Manual analysis</p>
            <h2 className="mt-2 text-2xl font-black text-[#0A1547]">Document Analysis</h2>
            <p className="mt-2 max-w-3xl text-sm font-semibold leading-6 text-[#0A1547]/62">
              Financial, AR, and Claims intake are enabled. CSV and XLSX processing can be run manually after intake; PDF processing will be added later.
            </p>
          </div>
          <span className="w-fit rounded-full border border-[#02ABE0]/25 bg-[#02ABE0]/10 px-3 py-1 text-xs font-extrabold text-[#0A1547]">
            Manual CSV/XLSX processing
          </span>
        </div>
      </section>

      {canWriteAnalysis ? (
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
              title="Choose analysis and upload source file"
              description="Financial, AR, and Claims Analyzer intake are active. Processing stays manual after the durable job record is created."
            />

          <div className="mt-5 grid gap-4">
            <div className="grid gap-2 rounded-2xl border border-[#0A1547]/10 bg-[#F8F9FD] p-1 sm:grid-cols-3">
              <AnalysisChoiceButton
                active={analysisKind === "financial"}
                label="Financial Analysis"
                onClick={() => handleAnalysisKindChange("financial")}
              />
              <AnalysisChoiceButton
                active={analysisKind === "ar"}
                label="AR Analysis"
                onClick={() => handleAnalysisKindChange("ar")}
              />
              <AnalysisChoiceButton
                active={analysisKind === "claims"}
                label="Claims Analysis"
                onClick={() => handleAnalysisKindChange("claims")}
              />
            </div>

            {analysisKind === "financial" && (
              <AnalyzerToolCard
                active
                description="Accepts .csv, .xlsx, and .pdf financial files. CSV and XLSX processing can be run manually after intake."
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
            )}

            {analysisKind === "ar" && (
              <AnalyzerToolCard
                active
                description="Accepts .csv and .xlsx AR files. Processing can be run manually after intake."
                title="AR Analyzer"
              >
                <label className="block">
                  <span className="text-sm font-extrabold text-[#0A1547]">AR source file</span>
                  <input
                    type="file"
                    accept=".csv,.xlsx"
                    onChange={(event) => setArFile(event.target.files?.[0] ?? null)}
                    className="admin-focus mt-2 w-full rounded-xl border border-[#0A1547]/10 bg-[#F8F9FD] px-4 py-3 text-sm font-semibold text-[#0A1547] file:mr-4 file:rounded-lg file:border-0 file:bg-[#0A1547] file:px-4 file:py-2 file:text-sm file:font-extrabold file:text-white"
                    disabled={submitting}
                  />
                </label>
                {arFile && (
                  <p className="mt-3 text-sm font-bold text-[#0A1547]/62">
                    Selected: {arFile.name} · {formatBytes(arFile.size)}
                  </p>
                )}
              </AnalyzerToolCard>
            )}

            {analysisKind === "claims" && (
              <AnalyzerToolCard
                active
                description="Accepts .csv and .xlsx Claims files. CSV and XLSX processing are available now. PDF processing will be added later."
                title="Insurance Claim Analyzer"
              >
                <label className="block">
                  <span className="text-sm font-extrabold text-[#0A1547]">Claims source file</span>
                  <input
                    type="file"
                    accept=".csv,.xlsx"
                    onChange={(event) => setClaimsFile(event.target.files?.[0] ?? null)}
                    className="admin-focus mt-2 w-full rounded-xl border border-[#0A1547]/10 bg-[#F8F9FD] px-4 py-3 text-sm font-semibold text-[#0A1547] file:mr-4 file:rounded-lg file:border-0 file:bg-[#0A1547] file:px-4 file:py-2 file:text-sm file:font-extrabold file:text-white"
                    disabled={submitting}
                  />
                </label>
                {claimsFile && (
                  <p className="mt-3 text-sm font-bold text-[#0A1547]/62">
                    Selected: {claimsFile.name} · {formatBytes(claimsFile.size)}
                  </p>
                )}
              </AnalyzerToolCard>
            )}
          </div>

          <div className="mt-5 rounded-2xl border border-[#A380F6]/20 bg-[#A380F6]/10 p-4">
            <p className="text-sm font-black text-[#0A1547]">Intake and processing are separate steps.</p>
            <p className="mt-1 text-sm font-semibold leading-6 text-[#0A1547]/62">
              Creating the analysis stores the source file and durable job record. CSV and XLSX jobs can then be processed manually; this still does not create a client report, email, GHL update, PDF, report delivery, or payment action.
            </p>
          </div>

          {submitError && <ErrorMessage message={submitError} />}

          <button
            type="submit"
            disabled={submitting}
            className="admin-focus mt-5 w-full rounded-xl bg-[#A380F6] px-5 py-3 text-sm font-extrabold text-white shadow-lg shadow-[#A380F6]/20 transition hover:bg-[#906cf2] disabled:opacity-60"
          >
            {submitting ? "Creating analysis..." : analysisCreateLabels[analysisKind]}
          </button>
          </section>
        </form>
      ) : (
        <section className="rounded-2xl border border-[#A380F6]/25 bg-[#A380F6]/10 p-5">
          <p className="text-sm font-black text-[#0A1547]">Read-only analysis access</p>
          <p className="mt-1 text-sm font-semibold leading-6 text-[#0A1547]/62">
            You can view analysis data available to your role, but intake, processing, cancel, and promotion actions require analysis write permission.
          </p>
        </section>
      )}

      {job && (
        <JobStatusCard
          canWriteAnalysis={canWriteAnalysis}
          canceling={canceling}
          job={job}
          jobError={jobError}
          onCancel={() => void handleCancel()}
          onProcessAr={() => void handleProcessAr()}
          onProcessClaims={() => void handleProcessClaims()}
          onProcessFinancial={() => void handleProcessFinancial()}
          onPromoteAr={() => void handlePromoteAr()}
          onPromoteClaims={() => void handlePromoteClaims()}
          onPromoteFinancial={() => void handlePromoteFinancial()}
          processingAr={processingAr}
          processingClaims={processingClaims}
          processingFinancial={processingFinancial}
          promotingAr={promotingAr}
          promotingClaims={promotingClaims}
          promotingFinancial={promotingFinancial}
          promotionMetadata={promotionMetadata}
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

function AnalysisChoiceButton({
  active,
  disabled,
  label,
  onClick,
}: {
  active?: boolean;
  disabled?: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`admin-focus rounded-xl px-4 py-2 text-sm font-extrabold transition ${
        active
          ? "bg-[#0A1547] text-white"
          : "text-[#0A1547]/62 hover:bg-white hover:text-[#0A1547]"
      } disabled:text-[#0A1547]/36 disabled:hover:bg-transparent`}
    >
      {label}
      {disabled && <span className="ml-2 text-xs font-bold">(coming later)</span>}
    </button>
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
  canWriteAnalysis,
  canceling,
  job,
  jobError,
  onCancel,
  onProcessAr,
  onProcessClaims,
  onProcessFinancial,
  onPromoteAr,
  onPromoteClaims,
  onPromoteFinancial,
  processingAr,
  processingClaims,
  processingFinancial,
  promotingAr,
  promotingClaims,
  promotingFinancial,
  promotionMetadata,
}: {
  canWriteAnalysis: boolean;
  canceling: boolean;
  job: AdminAnalysisJob;
  jobError: string;
  onCancel: () => void;
  onProcessAr: () => void;
  onProcessClaims: () => void;
  onProcessFinancial: () => void;
  onPromoteAr: () => void;
  onPromoteClaims: () => void;
  onPromoteFinancial: () => void;
  processingAr: boolean;
  processingClaims: boolean;
  processingFinancial: boolean;
  promotingAr: boolean;
  promotingClaims: boolean;
  promotingFinancial: boolean;
  promotionMetadata: PromotionMetadata | null;
}) {
  const canCancel = canWriteAnalysis && isJobActive(job.status);
  const analysisKind = getJobAnalysisKind(job);
  const analysisFile = getJobAnalysisFile(job);
  const canProcess = canWriteAnalysis && isJobEligibleForManualProcessing(job);
  const fileExtension = fileExtensionFromNullable(analysisFile?.originalFilename || null);
  const jobCompleted = (job.status || "").toLowerCase() === "completed";
  const hasSubmissionLink = hasRecordId(job.submissionId);
  const hasUploadLink = hasRecordId(analysisFile?.uploadId);
  const hasAnyLinkedClientRecord = hasSubmissionLink || hasUploadLink;
  const hasCompleteLinkedClientRecords = hasSubmissionLink && hasUploadLink;
  const canPromote = Boolean(
    canWriteAnalysis
    && jobCompleted
    && analysisKind
    && analysisFile
    && analysisFile.analysisData
    && !hasCompleteLinkedClientRecords,
  );
  const showLinkedRecords = Boolean(promotionMetadata || hasAnyLinkedClientRecord);
  const showPdfProcessingNote = Boolean(
    (analysisKind === "financial" && analysisFile && fileExtension === ".pdf")
    || analysisKind === "claims",
  );
  const processing = analysisKind === "ar"
    ? processingAr
    : analysisKind === "claims"
      ? processingClaims
      : processingFinancial;
  const promoting = analysisKind === "ar"
    ? promotingAr
    : analysisKind === "claims"
      ? promotingClaims
      : promotingFinancial;
  const onProcess = analysisKind === "ar"
    ? onProcessAr
    : analysisKind === "claims"
      ? onProcessClaims
      : onProcessFinancial;
  const onPromote = analysisKind === "ar"
    ? onPromoteAr
    : analysisKind === "claims"
      ? onPromoteClaims
      : onPromoteFinancial;

  return (
    <section className="admin-card p-5">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="text-xs font-extrabold uppercase tracking-[0.18em] text-[#A380F6]">Step 3</p>
          <h3 className="mt-2 text-xl font-black text-[#0A1547]">Intake job status</h3>
          <p className="mt-1 text-sm font-semibold text-[#0A1547]/62">
            This status tracks intake, manual processing, and client record links for this admin job.
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

      <div className="mt-5 rounded-2xl border border-[#02ABE0]/20 bg-[#02ABE0]/[0.08] p-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-sm font-black text-[#0A1547]">
              {analysisKind ? analysisProcessingTitles[analysisKind] : "Analysis processing"}
            </p>
            <p className="mt-1 text-sm font-semibold leading-6 text-[#0A1547]/62">
              CSV and XLSX processing are manual in this phase. Processed output remains internal admin job output, not a final client report.
            </p>
          </div>
          {analysisKind && canProcess && (
            <button
              type="button"
              onClick={onProcess}
              disabled={processing}
              className="admin-focus w-full rounded-xl bg-[#0A1547] px-4 py-2 text-sm font-extrabold text-white transition hover:bg-[#1A2460] disabled:opacity-60 lg:w-auto"
            >
              {processing ? "Running analysis..." : analysisRunLabels[analysisKind]}
            </button>
          )}
        </div>
        {showPdfProcessingNote && (
          <p className="mt-3 rounded-xl border border-[#A380F6]/20 bg-white px-4 py-3 text-sm font-bold text-[#0A1547]/68">
            CSV and XLSX processing are available now. PDF processing will be added later.
          </p>
        )}
        {!canWriteAnalysis && (
          <p className="mt-3 rounded-xl border border-[#A380F6]/20 bg-white px-4 py-3 text-sm font-bold text-[#0A1547]/68">
            Analysis write permission is required to run, cancel, or promote jobs.
          </p>
        )}
      </div>

      {(canPromote || showLinkedRecords) && (
        <PromotionSection
          canPromote={canPromote}
          clientEmail={job.clientEmail}
          jobSubmissionId={job.submissionId}
          metadata={promotionMetadata}
          onPromote={onPromote}
          promoting={promoting}
          uploadId={analysisFile?.uploadId || null}
        />
      )}

      <div className="mt-5 grid gap-3">
        {job.files.map((file) => (
          <article key={file.id} className="rounded-2xl border border-[#0A1547]/10 bg-[#F8F9FD] p-4">
            <div>
              <p className="text-sm font-black text-[#0A1547]">{formatNullable(file.originalFilename)}</p>
              <p className="mt-1 text-xs font-bold text-[#0A1547]/50">{formatNullable(file.toolName)}</p>
            </div>
            <dl className="mt-4 grid gap-3 text-sm md:grid-cols-3">
              <Detail label="UploadFile ID" value={file.uploadFileId} />
              <Detail label="Size" value={formatBytes(file.byteSize)} />
              <Detail label="Content type" value={file.contentType} />
            </dl>
            {file.analysisData && <ProcessedOutput analysisData={file.analysisData} />}
          </article>
        ))}
      </div>
    </section>
  );
}

function PromotionSection({
  canPromote,
  clientEmail,
  jobSubmissionId,
  metadata,
  onPromote,
  promoting,
  uploadId,
}: {
  canPromote: boolean;
  clientEmail: string | null;
  jobSubmissionId: string | null;
  metadata: PromotionMetadata | null;
  onPromote: () => void;
  promoting: boolean;
  uploadId: string | null;
}) {
  const submissionId = hasRecordId(metadata?.submissionId) ? metadata?.submissionId || null : jobSubmissionId;
  const linkedUploadId = hasRecordId(metadata?.uploadId) ? metadata?.uploadId || null : uploadId;
  const showPromoted = typeof metadata?.promoted === "boolean";
  const hasLinkedRecord = hasRecordId(submissionId) || hasRecordId(linkedUploadId) || showPromoted;

  return (
    <div className="mt-5 rounded-2xl border border-[#02D99D]/25 bg-[#02D99D]/10 p-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="text-sm font-black text-[#0A1547]">Client records promotion</p>
          <p className="mt-1 text-sm font-semibold leading-6 text-[#0A1547]/68">
            Promotion makes this admin job visible to Client Submissions and PDF Generator.
          </p>
          <p className="mt-1 text-sm font-semibold leading-6 text-[#0A1547]/62">
            No email, GHL update, PDF, or report delivery is triggered.
          </p>
        </div>
        {canPromote && (
          <button
            type="button"
            onClick={onPromote}
            disabled={promoting}
            className="admin-focus w-full rounded-xl bg-[#0A1547] px-4 py-2 text-sm font-extrabold text-white transition hover:bg-[#1A2460] disabled:opacity-60 lg:w-auto"
          >
            {promoting ? "Promoting..." : "Promote to Client Records"}
          </button>
        )}
      </div>

      {hasLinkedRecord && (
        <div className="mt-4 rounded-xl border border-[#02D99D]/25 bg-white p-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <p className="text-sm font-black text-[#0A1547]">Linked client records</p>
              <dl className="mt-3 grid gap-3 text-sm md:grid-cols-3">
                <Detail label="Submission ID" value={submissionId} />
                <Detail label="Upload ID" value={linkedUploadId} />
                {showPromoted && (
                  <Detail label="Promoted" value={metadata?.promoted ? "true" : "false"} />
                )}
              </dl>
            </div>
            {clientEmail && (
              <Link
                href={clientDetailHref(clientEmail)}
                className="admin-focus w-full rounded-xl border border-[#0A1547]/10 bg-[#F8F9FD] px-4 py-2 text-center text-sm font-extrabold text-[#0A1547] transition hover:border-[#A380F6]/50 lg:w-auto"
              >
                Open client detail
              </Link>
            )}
          </div>
        </div>
      )}
    </div>
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

function ProcessedOutput({ analysisData }: { analysisData: AdminAnalysisData }) {
  const providerStatuses = analysisData.provider_statuses ? Object.entries(analysisData.provider_statuses) : [];
  const issues = analysisData.deduplicated_issues || [];
  const trends = analysisData.all_trends || [];
  const rawOutputs = analysisData.raw_analyses ? Object.entries(analysisData.raw_analyses) : [];

  return (
    <div className="mt-5 rounded-2xl border border-[#A380F6]/20 bg-white p-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-[#A380F6]">
            Processed admin job output
          </p>
          <p className="mt-2 text-sm font-semibold leading-6 text-[#0A1547]/62">
            Internal processing output only. This is not the final client report, PDF, email, or delivery record.
          </p>
        </div>
        <span className="w-fit rounded-full border border-[#02D99D]/25 bg-[#02D99D]/10 px-3 py-1 text-xs font-extrabold text-[#0A1547]">
          {formatNullable(analysisData.sourceFormat || "processed")}
        </span>
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-2">
        <Fact label="Total issues" value={formatNullable(analysisData.total_issue_count)} />
        <Fact label="Processed at" value={formatDate(analysisData.generatedAt || null)} />
      </div>

      {providerStatuses.length > 0 && (
        <div className="mt-5">
          <p className="text-sm font-black text-[#0A1547]">Provider statuses</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {providerStatuses.map(([provider, status]) => (
              <ProviderStatusPill key={provider} provider={provider} status={status} />
            ))}
          </div>
        </div>
      )}

      {issues.length > 0 && (
        <div className="mt-5">
          <p className="text-sm font-black text-[#0A1547]">Deduplicated issues</p>
          <div className="mt-3 grid gap-3">
            {issues.slice(0, 5).map((issue, index) => (
              <IssueCard key={`${issue.title || "issue"}-${index}`} issue={issue} />
            ))}
          </div>
          {issues.length > 5 && (
            <p className="mt-3 text-xs font-bold text-[#0A1547]/50">
              Showing 5 of {issues.length} issues.
            </p>
          )}
        </div>
      )}

      {trends.length > 0 && (
        <div className="mt-5">
          <p className="text-sm font-black text-[#0A1547]">Trends</p>
          <ul className="mt-3 grid gap-2">
            {trends.slice(0, 6).map((trend, index) => (
              <TrendItem key={`${trend.text || "trend"}-${index}`} trend={trend} />
            ))}
          </ul>
          {trends.length > 6 && (
            <p className="mt-3 text-xs font-bold text-[#0A1547]/50">
              Showing 6 of {trends.length} trends.
            </p>
          )}
        </div>
      )}

      {rawOutputs.length > 0 && (
        <details className="mt-5 rounded-xl border border-[#0A1547]/10 bg-[#F8F9FD] p-4">
          <summary className="cursor-pointer text-sm font-extrabold text-[#0A1547]">
            Technical details
          </summary>
          <div className="mt-4 grid gap-3">
            {rawOutputs.map(([provider, output]) => (
              <details key={provider} className="rounded-xl border border-[#0A1547]/10 bg-white p-3">
                <summary className="cursor-pointer text-sm font-extrabold text-[#0A1547]">
                  {provider}
                </summary>
                <pre className="mt-3 max-h-72 overflow-auto whitespace-pre-wrap rounded-lg bg-[#0A1547] p-3 text-xs font-semibold leading-5 text-white">
                  {output}
                </pre>
              </details>
            ))}
          </div>
        </details>
      )}
    </div>
  );
}

function ProviderStatusPill({
  provider,
  status,
}: {
  provider: string;
  status: AdminAnalysisProviderStatus;
}) {
  const ok = Boolean(status.ok);

  return (
    <span className={`rounded-full border px-3 py-1 text-xs font-extrabold ${
      ok
        ? "border-[#02D99D]/30 bg-[#02D99D]/10 text-[#0A1547]"
        : "border-[#A380F6]/30 bg-[#A380F6]/10 text-[#0A1547]"
    }`}
    >
      {formatProviderName(provider)}: {ok ? "Processed" : "Unavailable"}
      {!ok && status.errorType ? ` (${status.errorType})` : ""}
    </span>
  );
}

function IssueCard({ issue }: { issue: AdminAnalysisIssue }) {
  return (
    <article className="rounded-xl border border-[#0A1547]/10 bg-[#F8F9FD] p-4">
      <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
        <p className="text-sm font-black text-[#0A1547]">{formatNullable(issue.title)}</p>
        {issue.count !== undefined && (
          <span className="w-fit rounded-full border border-[#02ABE0]/25 bg-[#02ABE0]/10 px-2.5 py-1 text-xs font-extrabold text-[#0A1547]">
            {issue.count} source{issue.count === 1 ? "" : "s"}
          </span>
        )}
      </div>
      {issue.impact && (
        <p className="mt-2 text-sm font-semibold leading-6 text-[#0A1547]/68">
          <span className="font-black text-[#0A1547]">Impact:</span> {issue.impact}
        </p>
      )}
      {issue.recommendation && (
        <p className="mt-1 text-sm font-semibold leading-6 text-[#0A1547]/68">
          <span className="font-black text-[#0A1547]">Recommendation:</span> {issue.recommendation}
        </p>
      )}
      {issue.sources && issue.sources.length > 0 && (
        <p className="mt-2 text-xs font-bold text-[#0A1547]/50">
          Sources: {issue.sources.join(", ")}
        </p>
      )}
    </article>
  );
}

function TrendItem({ trend }: { trend: AdminAnalysisTrend }) {
  return (
    <li className="rounded-xl border border-[#0A1547]/10 bg-[#F8F9FD] px-4 py-3">
      <p className="text-sm font-semibold leading-6 text-[#0A1547]/72">{formatNullable(trend.text)}</p>
      {trend.source && (
        <p className="mt-1 text-xs font-bold text-[#0A1547]/48">{trend.source}</p>
      )}
    </li>
  );
}

function ErrorMessage({ message }: { message: string }) {
  return (
    <p className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-700">
      {message}
    </p>
  );
}
