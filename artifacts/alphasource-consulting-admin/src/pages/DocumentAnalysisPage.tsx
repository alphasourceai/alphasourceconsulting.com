import { useCallback, useEffect, useMemo, useState, type FormEvent, type ReactNode } from "react";
import { Link } from "wouter";
import { useAuth } from "@/auth/AuthProvider";
import { ConsultantReviewExportControls } from "@/components/ConsultantReviewExportControls";
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
import { consultantReviewContextFromAnalysisData } from "@/lib/consultantReviewExport";
import type {
  AdminAnalysisData,
  AdminAnalysisIssue,
  AdminAnalysisJob,
  AdminAnalysisJobFile,
  AdminAnalysisProcessRequest,
  AdminAnalysisProviderStatus,
  AdminAnalysisTrend,
  AdminClientOption,
  StructuredAnalysis,
  StructuredEvidenceItem,
  StructuredRankedFinding,
  StructuredProviderStatus,
} from "@/lib/types";

type ClientMode = "existing" | "new";
type AnalysisKind = "financial" | "ar" | "claims";
type IconName =
  | "alert"
  | "arrow"
  | "check"
  | "clipboard"
  | "file"
  | "filter"
  | "lock"
  | "refresh"
  | "spark"
  | "upload"
  | "users";
type IconTone = "analysis" | "file" | "success" | "warning" | "danger" | "neutral" | "lilac";

type PromotionMetadata = {
  submissionId?: string | null;
  uploadId?: string | null;
  promoted?: boolean;
};

type PhiAcknowledgmentState = {
  kind: AnalysisKind;
  confirmed: boolean;
  initials: string;
  error: string;
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
const allowedArExtensions = [".csv", ".xlsx", ".pdf"];
const processableArExtensions = new Set(allowedArExtensions);
const allowedClaimsExtensions = [".csv", ".xlsx", ".pdf"];
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
const phiAcknowledgmentVersion = "admin_document_analysis_phi_ack_v1";
const sectionClassName = "rounded-lg border border-[#0A1547]/10 bg-white shadow-[0_12px_28px_rgba(10,21,71,0.05)]";
const inputClassName = "admin-focus mt-2 h-11 w-full rounded-lg border border-[#0A1547]/10 bg-[#F8F9FD] px-4 text-sm font-medium text-[#0A1547] placeholder:text-[#0A1547]/38";
const selectClassName = "admin-focus mt-2 h-11 w-full rounded-lg border border-[#0A1547]/10 bg-[#F8F9FD] px-4 text-sm font-medium leading-tight text-[#0A1547]";
const fileInputClassName = "admin-focus mt-2 w-full rounded-lg border border-[#0A1547]/10 bg-[#F8F9FD] px-4 py-3 text-sm font-medium text-[#0A1547] file:mr-4 file:rounded-lg file:border-0 file:bg-[#0A1547] file:px-4 file:py-2 file:text-sm file:font-bold file:text-white";
const labelClassName = "text-[11px] font-medium uppercase tracking-[0.12em] text-[#0A1547]/38";

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

function formatStructuredLabel(value: string | null | undefined): string {
  if (!value) {
    return "—";
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

function IconBadge({ compact = false, icon, tone }: { compact?: boolean; icon: IconName; tone: IconTone }) {
  return (
    <span className={`flex shrink-0 items-center justify-center rounded-lg border border-[#0A1547]/10 bg-white ${compact ? "h-9 w-9" : "h-10 w-10"} ${iconToneClassName(tone)} [&_svg]:stroke-[2.6]`}>
      <Icon name={icon} size={compact ? 17 : 18} />
    </span>
  );
}

function iconToneClassName(tone: IconTone): string {
  switch (tone) {
    case "analysis":
      return "text-[#00CFC8]";
    case "file":
      return "text-[#02ABE0]";
    case "success":
      return "text-[#02D99D]";
    case "warning":
      return "text-[#F59E0B]";
    case "danger":
      return "text-[#EF4444]";
    case "lilac":
      return "text-[#A380F6]";
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
  const [phiAcknowledgment, setPhiAcknowledgment] = useState<PhiAcknowledgmentState | null>(null);

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
        return "AR file must be a .csv, .xlsx, or .pdf file.";
      }
    }
    if (analysisKind === "claims") {
      if (!claimsFile) {
        return "Claims Analyzer source file is required.";
      }
      if (!allowedClaimsExtensions.includes(fileExtension(claimsFile.name))) {
        return "Claims file must be a .csv, .xlsx, or .pdf file.";
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

  const setProcessingForKind = (kind: AnalysisKind, value: boolean) => {
    if (kind === "financial") {
      setProcessingFinancial(value);
    } else if (kind === "ar") {
      setProcessingAr(value);
    } else {
      setProcessingClaims(value);
    }
  };

  const isProcessingKind = (kind: AnalysisKind | null): boolean => {
    if (kind === "financial") {
      return processingFinancial;
    }
    if (kind === "ar") {
      return processingAr;
    }
    if (kind === "claims") {
      return processingClaims;
    }
    return false;
  };

  const handleOpenPhiAcknowledgment = (kind: AnalysisKind) => {
    if (!job || !token || !canWriteAnalysis) {
      return;
    }

    setJobError("");
    setPhiAcknowledgment({
      kind,
      confirmed: false,
      initials: "",
      error: "",
    });
  };

  const handleClosePhiAcknowledgment = () => {
    if (isProcessingKind(phiAcknowledgment?.kind ?? null)) {
      return;
    }
    setPhiAcknowledgment(null);
  };

  const handlePhiAcknowledgmentChange = (updates: Partial<PhiAcknowledgmentState>) => {
    setPhiAcknowledgment((current) => (current ? { ...current, ...updates, error: "" } : current));
  };

  const handleConfirmPhiAcknowledgment = async () => {
    if (!job || !token || !canWriteAnalysis || !phiAcknowledgment) {
      return;
    }

    const initials = phiAcknowledgment.initials.trim();
    if (!phiAcknowledgment.confirmed) {
      setPhiAcknowledgment((current) => (
        current ? { ...current, error: "Confirm the file is approved for AI-assisted analysis before processing." } : current
      ));
      return;
    }
    if (!initials) {
      setPhiAcknowledgment((current) => (
        current ? { ...current, error: "Initials are required before processing." } : current
      ));
      return;
    }

    const payload: AdminAnalysisProcessRequest = {
      phiAcknowledgment: {
        confirmedNoPhi: true,
        initials,
        acknowledgmentVersion: phiAcknowledgmentVersion,
      },
    };
    const kind = phiAcknowledgment.kind;
    setProcessingForKind(kind, true);
    setJobError("");
    setPhiAcknowledgment((current) => (current ? { ...current, initials, error: "" } : current));

    try {
      const response = kind === "financial"
        ? await processFinancialAnalysisJob(token, job.id, payload)
        : kind === "ar"
          ? await processArAnalysisJob(token, job.id, payload)
          : await processClaimsAnalysisJob(token, job.id, payload);
      setJob(response.job);
      setPhiAcknowledgment(null);
    } catch (processError) {
      const message = processError instanceof AdminApiError
        ? processError.message
        : kind === "financial"
          ? "Financial analysis could not be processed."
          : kind === "ar"
            ? "AR analysis could not be processed."
            : "Claims analysis could not be processed.";
      setJobError(message);
      setPhiAcknowledgment((current) => (current ? { ...current, error: message } : current));
    } finally {
      setProcessingForKind(kind, false);
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
        setJobError("Financial analysis could not be published to client records.");
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
        setJobError("AR analysis could not be published to client records.");
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
        setJobError("Claims analysis could not be published to client records.");
      }
    } finally {
      setPromotingClaims(false);
    }
  };

  const phiAcknowledgmentFile = job && phiAcknowledgment ? getJobAnalysisFile(job) : null;
  const phiAcknowledgmentLoading = isProcessingKind(phiAcknowledgment?.kind ?? null);

  return (
    <div className="space-y-5">
      <section className={`${sectionClassName} px-5 py-4`}>
        <SectionHeader
          action={(
            <StatusPill className="border-[#F59E0B]/25 bg-[#F59E0B]/10 text-[#0A1547]/72">
              Approved files only
            </StatusPill>
          )}
          description="Analyze approved Financial, AR, and Claims files for internal review. Secure Uploads remains separate for sensitive or PHI-related intake."
          icon="spark"
          iconTone="analysis"
          title="Document Analysis"
        />
      </section>

      {canWriteAnalysis ? (
        <form onSubmit={handleSubmit} className="grid gap-5 xl:grid-cols-[1.05fr_0.95fr]">
          <section className={`${sectionClassName} p-5`}>
            <StepHeader
              icon="users"
              iconTone="lilac"
              eyebrow="Step 1"
              title="Select or create client"
              description="Use an existing client record when available, or enter new client details for this intake job."
            />

            <div className="mt-5 flex rounded-lg border border-[#0A1547]/10 bg-[#F8F9FD] p-1">
              {(["existing", "new"] as const).map((option) => (
                <button
                  key={option}
                  type="button"
                  onClick={() => handleModeChange(option)}
                  className={`admin-focus flex-1 rounded-lg px-4 py-2 text-sm font-semibold transition ${
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
                  <span className={labelClassName}>Search clients</span>
                  <input
                    type="search"
                    value={clientSearch}
                    onChange={(event) => setClientSearch(event.target.value)}
                    placeholder="Search email, name, office, phone"
                    className={inputClassName}
                  />
                </label>

                <label className="block">
                  <span className={labelClassName}>Client</span>
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
                  <div className="flex items-start gap-3 rounded-lg border border-[#02D99D]/25 bg-[#02D99D]/10 p-4">
                    <IconBadge compact icon="check" tone="success" />
                    <div>
                      <p className="text-sm font-semibold text-[#0A1547]">Client loaded</p>
                      <p className="mt-1 text-sm font-medium text-[#0A1547]/58">
                        Latest submission: {formatDate(selectedClient.latestSubmittedAt)}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            )}

            <ClientFields
              form={clientForm}
              onChange={updateClientField}
            />
          </section>

          <section className={`${sectionClassName} p-5`}>
            <StepHeader
              icon="upload"
              iconTone="file"
              eyebrow="Step 2"
              title="Choose analysis and upload file"
              description="Choose the analysis type, attach the approved source file, then create the intake record."
            />

            <div className="mt-5 grid gap-4">
              <div className="grid gap-2 rounded-lg border border-[#0A1547]/10 bg-[#F8F9FD] p-1 sm:grid-cols-3">
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
                description="Accepts .csv, .xlsx, and .pdf financial files. CSV and XLSX processing can be run manually; Financial PDF processing remains limited in this phase."
                title="Financial Analyzer"
              >
                <label className="block">
                  <span className={labelClassName}>Financial source file</span>
                  <input
                    type="file"
                    accept=".csv,.xlsx,.pdf"
                    onChange={(event) => setFinancialFile(event.target.files?.[0] ?? null)}
                    className={fileInputClassName}
                    disabled={submitting}
                  />
                </label>
                {financialFile && (
                  <p className="mt-3 text-sm font-medium text-[#0A1547]/58">
                    Selected: {financialFile.name} · {formatBytes(financialFile.size)}
                  </p>
                )}
              </AnalyzerToolCard>
            )}

            {analysisKind === "ar" && (
              <AnalyzerToolCard
                active
                description="Accepts .csv, .xlsx, and .pdf AR files. PDFs can include scanned files when OCR can read them."
                title="AR Analyzer"
              >
                <label className="block">
                  <span className={labelClassName}>AR source file</span>
                  <input
                    type="file"
                    accept=".csv,.xlsx,.pdf"
                    onChange={(event) => setArFile(event.target.files?.[0] ?? null)}
                    className={fileInputClassName}
                    disabled={submitting}
                  />
                </label>
                {arFile && (
                  <p className="mt-3 text-sm font-medium text-[#0A1547]/58">
                    Selected: {arFile.name} · {formatBytes(arFile.size)}
                  </p>
                )}
              </AnalyzerToolCard>
            )}

            {analysisKind === "claims" && (
              <AnalyzerToolCard
                active
                description="Accepts .csv, .xlsx, and .pdf Claims files. PDFs can include scanned files when OCR can read them."
                title="Insurance Claim Analyzer"
              >
                <label className="block">
                  <span className={labelClassName}>Claims source file</span>
                  <input
                    type="file"
                    accept=".csv,.xlsx,.pdf"
                    onChange={(event) => setClaimsFile(event.target.files?.[0] ?? null)}
                    className={fileInputClassName}
                    disabled={submitting}
                  />
                </label>
                {claimsFile && (
                  <p className="mt-3 text-sm font-medium text-[#0A1547]/58">
                    Selected: {claimsFile.name} · {formatBytes(claimsFile.size)}
                  </p>
                )}
              </AnalyzerToolCard>
            )}
          </div>

          <details className="mt-5 rounded-lg border border-[#A380F6]/20 bg-[#A380F6]/10 px-4 py-3">
            <summary className="cursor-pointer text-sm font-semibold text-[#0A1547]">
              Intake and processing boundaries
            </summary>
            <div className="mt-3 space-y-2 text-sm font-medium leading-6 text-[#0A1547]/62">
              <p>
                Creating the analysis stores the uploaded file and analysis record. Files with current processing support can then be processed after admin review.
              </p>
              <p>
                This is not secure PHI intake and does not create a client report, email, GHL update, PDF, report delivery, or payment action.
              </p>
            </div>
          </details>

          {submitError && <ErrorMessage message={submitError} />}

          <button
            type="submit"
            disabled={submitting}
            className="admin-focus mt-5 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-[#A380F6] px-5 py-3 text-sm font-bold text-white shadow-lg shadow-[#A380F6]/20 transition hover:bg-[#906cf2] disabled:opacity-60"
          >
            <Icon name="upload" size={15} />
            {submitting ? "Creating analysis..." : analysisCreateLabels[analysisKind]}
          </button>
          </section>
        </form>
      ) : (
        <section className={`${sectionClassName} p-5`}>
          <div className="flex items-start gap-3">
            <IconBadge icon="lock" tone="lilac" />
            <div>
              <p className="text-sm font-semibold text-[#0A1547]">Read-only analysis access</p>
              <p className="mt-1 text-sm font-medium leading-6 text-[#0A1547]/58">
                You can view analysis data available to your role. Intake, processing, cancel, and publishing actions are hidden or disabled unless your role includes analysis write permission.
              </p>
            </div>
          </div>
        </section>
      )}

      {job && (
        <JobStatusCard
          canWriteAnalysis={canWriteAnalysis}
          canceling={canceling}
          job={job}
          jobError={jobError}
          onCancel={() => void handleCancel()}
          onProcessAr={() => handleOpenPhiAcknowledgment("ar")}
          onProcessClaims={() => handleOpenPhiAcknowledgment("claims")}
          onProcessFinancial={() => handleOpenPhiAcknowledgment("financial")}
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
      {job && phiAcknowledgment && (
        <PhiAcknowledgmentModal
          confirmed={phiAcknowledgment.confirmed}
          error={phiAcknowledgment.error}
          file={phiAcknowledgmentFile}
          initials={phiAcknowledgment.initials}
          kind={phiAcknowledgment.kind}
          loading={phiAcknowledgmentLoading}
          onChange={handlePhiAcknowledgmentChange}
          onClose={handleClosePhiAcknowledgment}
          onConfirm={() => void handleConfirmPhiAcknowledgment()}
        />
      )}
    </div>
  );
}

function PhiAcknowledgmentModal({
  confirmed,
  error,
  file,
  initials,
  kind,
  loading,
  onChange,
  onClose,
  onConfirm,
}: {
  confirmed: boolean;
  error: string;
  file: AdminAnalysisJobFile | null;
  initials: string;
  kind: AnalysisKind;
  loading: boolean;
  onChange: (updates: Partial<PhiAcknowledgmentState>) => void;
  onClose: () => void;
  onConfirm: () => void;
}) {
  const canConfirm = confirmed && initials.trim().length > 0 && !loading;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0A1547]/45 p-4">
      <form
        aria-labelledby="phi-acknowledgment-title"
        aria-modal="true"
        role="dialog"
        onSubmit={(event) => {
          event.preventDefault();
          onConfirm();
        }}
        className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-lg bg-white shadow-2xl"
      >
        <div className="flex items-start justify-between gap-4 border-b border-[#0A1547]/10 px-5 py-4">
          <div className="flex min-w-0 items-start gap-3">
            <IconBadge icon="alert" tone="warning" />
            <div className="min-w-0">
              <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-[#0A1547]/38">
                {analysisProcessingTitles[kind]}
              </p>
              <h3 id="phi-acknowledgment-title" className="mt-1 text-lg font-black text-[#0A1547]">
                PHI/HIPAA acknowledgment
              </h3>
              <p className="mt-1 max-w-xl text-sm font-medium leading-6 text-[#0A1547]/62">
                Confirm this file has been reviewed, sanitized, and approved for AI-assisted analysis before processing.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="admin-focus rounded-lg border border-[#0A1547]/10 bg-white px-4 py-2 text-sm font-semibold text-[#0A1547]/82 transition hover:border-[#A380F6]/60 disabled:cursor-not-allowed disabled:opacity-55"
          >
            Back
          </button>
        </div>

        <div className="grid gap-5 p-5">
          <div className="rounded-lg border border-[#02ABE0]/20 bg-[#02ABE0]/[0.08] p-4">
            <dl className="grid gap-3 text-sm md:grid-cols-2">
              <Detail label="Analysis type" value={analysisProcessingTitles[kind]} />
              <Detail label="File" value={file?.originalFilename || null} />
            </dl>
          </div>

          <label className="flex gap-3 rounded-lg border border-[#F59E0B]/25 bg-[#F59E0B]/10 p-4">
            <input
              type="checkbox"
              checked={confirmed}
              onChange={(event) => onChange({ confirmed: event.target.checked })}
              className="admin-focus mt-1 h-4 w-4 rounded border-[#0A1547]/20 text-[#A380F6]"
              disabled={loading}
            />
            <span className="text-sm font-medium leading-6 text-[#0A1547]/75">
              I confirm this file contains no unsanitized PHI and is approved for AI-assisted analysis.
            </span>
          </label>

          <label className="block">
            <span className={labelClassName}>Initials</span>
            <input
              type="text"
              value={initials}
              onChange={(event) => onChange({ initials: event.target.value })}
              maxLength={12}
              placeholder="JG"
              className={inputClassName}
              disabled={loading}
            />
          </label>

          <p className="rounded-lg border border-[#A380F6]/20 bg-[#A380F6]/10 px-4 py-3 text-sm font-medium leading-6 text-[#0A1547]/68">
            Secure Uploads remains separate for potentially sensitive files. Do not process unsanitized secure-upload files through Document Analysis.
          </p>

          {error && <ErrorMessage message={error} />}

          <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="admin-focus rounded-lg border border-[#0A1547]/10 bg-white px-4 py-2 text-sm font-semibold text-[#0A1547]/82 transition hover:border-[#A380F6]/60 disabled:cursor-not-allowed disabled:opacity-55"
            >
              Back
            </button>
            <button
              type="submit"
              disabled={!canConfirm}
              className="admin-focus rounded-lg bg-[#0A1547] px-4 py-2 text-sm font-bold text-white transition hover:bg-[#1A2460] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? "Running analysis..." : analysisRunLabels[kind]}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}

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
        <span className={labelClassName}>Type <span className="text-red-600">*</span></span>
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
      <span className={labelClassName}>
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
  icon,
  iconTone,
  title,
}: {
  description: string;
  eyebrow: string;
  icon: IconName;
  iconTone: IconTone;
  title: string;
}) {
  return (
    <div className="flex items-start gap-3">
      <IconBadge icon={icon} tone={iconTone} />
      <div>
        <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-[#0A1547]/38">{eyebrow}</p>
        <h3 className="mt-1 text-lg font-black text-[#0A1547]">{title}</h3>
        <p className="mt-1 text-sm font-medium leading-6 text-[#0A1547]/56">{description}</p>
      </div>
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
      className={`admin-focus rounded-lg px-4 py-2 text-sm font-semibold transition ${
        active
          ? "bg-[#0A1547] text-white"
          : "text-[#0A1547]/62 hover:bg-white hover:text-[#0A1547]"
      } disabled:text-[#0A1547]/36 disabled:hover:bg-transparent`}
    >
      {label}
      {disabled && <span className="ml-2 text-xs font-medium">(coming later)</span>}
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
    <div className={`rounded-lg border p-4 ${active ? "border-[#02ABE0]/25 bg-[#02ABE0]/[0.08]" : "border-[#0A1547]/10 bg-[#F8F9FD]"}`}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-3">
          <IconBadge compact icon="file" tone="file" />
          <div className="min-w-0">
            <p className="text-base font-semibold text-[#0A1547]">{title}</p>
            <p className="mt-1 text-sm font-medium leading-6 text-[#0A1547]/58">{description}</p>
          </div>
        </div>
        {!active && (
          <StatusPill className="border-[#0A1547]/10 bg-white text-[#0A1547]/58">
            Coming later
          </StatusPill>
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
    analysisKind === "financial" && analysisFile && fileExtension === ".pdf",
  );
  const supportsPdfProcessing = analysisKind === "ar" || analysisKind === "claims";
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
    <section className={`${sectionClassName} p-5`}>
      <SectionHeader
        action={(
          <div className="flex flex-wrap items-center gap-2">
            <StatusPill className={statusTone(job.status)}>
              {formatNullable(job.status)}
            </StatusPill>
            {canCancel && (
              <button
                type="button"
                onClick={onCancel}
                disabled={canceling}
                className="admin-focus rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm font-semibold text-red-700 transition hover:bg-red-100 disabled:opacity-60"
              >
                {canceling ? "Canceling..." : "Cancel"}
              </button>
            )}
          </div>
        )}
        description="Track intake, processing, and client record links for this analysis."
        icon="clipboard"
        iconTone="analysis"
        title="Intake job status"
      />

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

      <div className="mt-5 rounded-lg border border-[#02ABE0]/20 bg-[#02ABE0]/[0.08] p-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-sm font-semibold text-[#0A1547]">
              {analysisKind ? analysisProcessingTitles[analysisKind] : "Analysis processing"}
            </p>
            <p className="mt-1 text-sm font-medium leading-6 text-[#0A1547]/58">
              {supportsPdfProcessing ? "CSV, XLSX, and supported PDF files can be processed from this record. Scanned AR and Claims PDFs may work through OCR when the scan quality is readable." : "CSV and XLSX files can be processed from this record."} Processed output remains internal review material, not a final client report.
            </p>
          </div>
          {analysisKind && canProcess && (
            <button
              type="button"
              onClick={onProcess}
              disabled={processing}
              className="admin-focus inline-flex w-full items-center justify-center gap-2 rounded-lg bg-[#0A1547] px-4 py-2 text-sm font-bold text-white transition hover:bg-[#1A2460] disabled:opacity-60 lg:w-auto"
            >
              <Icon name="spark" size={15} />
              {processing ? "Running analysis..." : analysisRunLabels[analysisKind]}
            </button>
          )}
        </div>
        {showPdfProcessingNote && (
          <p className="mt-3 rounded-lg border border-[#A380F6]/20 bg-white px-4 py-3 text-sm font-medium text-[#0A1547]/68">
            CSV and XLSX processing are available now. PDF processing will be added later.
          </p>
        )}
        {!canWriteAnalysis && (
          <p className="mt-3 rounded-lg border border-[#A380F6]/20 bg-white px-4 py-3 text-sm font-medium text-[#0A1547]/68">
            Analysis write permission is required to process, cancel, or publish analysis records.
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
          <article key={file.id} className="rounded-lg border border-[#0A1547]/10 bg-[#F8F9FD] p-4">
            <div className="flex min-w-0 items-start gap-3">
              <IconBadge compact icon="file" tone="file" />
              <div className="min-w-0">
                <p className="break-words text-sm font-semibold text-[#0A1547]">{formatNullable(file.originalFilename)}</p>
                <p className="mt-1 text-xs font-medium text-[#0A1547]/50">{formatNullable(file.toolName)}</p>
              </div>
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
    <div className="mt-5 rounded-lg border border-[#02D99D]/25 bg-[#02D99D]/10 p-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div className="flex min-w-0 items-start gap-3">
          <IconBadge compact icon="arrow" tone="success" />
          <div className="min-w-0">
            <p className="text-sm font-semibold text-[#0A1547]">Client record publishing</p>
            <p className="mt-1 text-sm font-medium leading-6 text-[#0A1547]/68">
              Publishing makes this completed analysis available in Clients and PDF Reports.
            </p>
            <p className="mt-1 text-sm font-medium leading-6 text-[#0A1547]/62">
              No email, GHL update, PDF, or report delivery is triggered.
            </p>
          </div>
        </div>
        {canPromote && (
          <button
            type="button"
            onClick={onPromote}
            disabled={promoting}
            className="admin-focus inline-flex w-full items-center justify-center gap-2 rounded-lg bg-[#0A1547] px-4 py-2 text-sm font-bold text-white transition hover:bg-[#1A2460] disabled:opacity-60 lg:w-auto"
          >
            <Icon name="arrow" size={15} />
            {promoting ? "Publishing..." : "Publish to Client Records"}
          </button>
        )}
      </div>

      {hasLinkedRecord && (
        <div className="mt-4 rounded-lg border border-[#02D99D]/25 bg-white p-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <p className="text-sm font-semibold text-[#0A1547]">Linked client records</p>
              <dl className="mt-3 grid gap-3 text-sm md:grid-cols-3">
                <Detail label="Submission ID" value={submissionId} />
                <Detail label="Upload ID" value={linkedUploadId} />
                {showPromoted && (
                  <Detail label="Published" value={metadata?.promoted ? "true" : "false"} />
                )}
              </dl>
            </div>
            {clientEmail && (
              <Link
                href={clientDetailHref(clientEmail)}
                className="admin-focus w-full rounded-lg border border-[#0A1547]/10 bg-[#F8F9FD] px-4 py-2 text-center text-sm font-semibold text-[#0A1547]/82 transition hover:border-[#A380F6]/50 lg:w-auto"
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
    <div className="rounded-lg border border-[#0A1547]/10 bg-[#F8F9FD] p-4">
      <p className={labelClassName}>{label}</p>
      <p className="mt-2 break-all text-sm font-semibold text-[#0A1547]/82">{value}</p>
    </div>
  );
}

function Detail({ label, value }: { label: string; value: string | null }) {
  return (
    <div className="min-w-0">
      <dt className={labelClassName}>{label}</dt>
      <dd className="mt-1 break-all font-medium text-[#0A1547]/72">{formatNullable(value)}</dd>
    </div>
  );
}

function ProcessedOutput({ analysisData }: { analysisData: AdminAnalysisData }) {
  const providerStatuses = analysisData.provider_statuses ? Object.entries(analysisData.provider_statuses) : [];
  const structuredProviderStatuses = analysisData.structured_provider_statuses
    ? Object.entries(analysisData.structured_provider_statuses)
    : [];
  const structuredAnalysis = hasStructuredReviewContent(analysisData.structured_analysis)
    ? analysisData.structured_analysis
    : null;
  const issues = analysisData.deduplicated_issues || [];
  const trends = analysisData.all_trends || [];
  const rawOutputs = analysisData.raw_analyses ? Object.entries(analysisData.raw_analyses) : [];

  return (
    <div className="mt-5 rounded-lg border border-[#A380F6]/20 bg-white p-4">
      <SectionHeader
        action={(
          <StatusPill className="border-[#02D99D]/25 bg-[#02D99D]/10 text-[#0A1547]/80">
            {formatNullable(analysisData.sourceFormat || "processed")}
          </StatusPill>
        )}
        description="Internal processing output only. This is not the final client report, PDF, email, or delivery record."
        icon="spark"
        iconTone="analysis"
        title="Processed admin job output"
      />

      <div className="mt-4 grid gap-3 md:grid-cols-2">
        <Fact label="Total issues" value={formatNullable(analysisData.total_issue_count)} />
        <Fact label="Processed at" value={formatDate(analysisData.generatedAt || null)} />
      </div>

      {structuredAnalysis && (
        <ConsultantReviewPanel
          analysisData={analysisData}
          rawOutputs={rawOutputs}
          structuredAnalysis={structuredAnalysis}
          providerStatuses={structuredProviderStatuses}
        />
      )}

      {providerStatuses.length > 0 && (
        <div className="mt-5">
          <p className="text-sm font-semibold text-[#0A1547]">Provider statuses</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {providerStatuses.map(([provider, status]) => (
              <ProviderStatusPill key={provider} provider={provider} status={status} />
            ))}
          </div>
        </div>
      )}

      {issues.length > 0 && (
        <div className="mt-5">
          <p className="text-sm font-semibold text-[#0A1547]">Deduplicated issues</p>
          <div className="mt-3 grid gap-3">
            {issues.slice(0, 5).map((issue, index) => (
              <IssueCard key={`${issue.title || "issue"}-${index}`} issue={issue} />
            ))}
          </div>
          {issues.length > 5 && (
            <p className="mt-3 text-xs font-medium text-[#0A1547]/50">
              Showing 5 of {issues.length} issues.
            </p>
          )}
        </div>
      )}

      {trends.length > 0 && (
        <div className="mt-5">
          <p className="text-sm font-semibold text-[#0A1547]">Trends</p>
          <ul className="mt-3 grid gap-2">
            {trends.slice(0, 6).map((trend, index) => (
              <TrendItem key={`${trend.text || "trend"}-${index}`} trend={trend} />
            ))}
          </ul>
          {trends.length > 6 && (
            <p className="mt-3 text-xs font-medium text-[#0A1547]/50">
              Showing 6 of {trends.length} trends.
            </p>
          )}
        </div>
      )}

      {rawOutputs.length > 0 && (
        <details className="mt-5 rounded-lg border border-[#0A1547]/10 bg-[#F8F9FD] p-4">
          <summary className="cursor-pointer text-sm font-semibold text-[#0A1547]">
            Technical details
          </summary>
          <div className="mt-4 grid gap-3">
            {rawOutputs.map(([provider, output]) => (
              <details key={provider} className="rounded-lg border border-[#0A1547]/10 bg-white p-3">
                <summary className="cursor-pointer text-sm font-semibold text-[#0A1547]">
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

function hasStructuredReviewContent(value: StructuredAnalysis | null | undefined): value is StructuredAnalysis {
  if (!value) {
    return false;
  }

  const summary = value.executiveSummary;
  return Boolean(
    summary?.summary
      || summary?.primaryConcern
      || summary?.recommendedFocus
      || value.rankedFindings?.length
      || value.dataQualityNotes?.length
      || value.implementationPriorities?.length
      || value.consultantChecklist?.length
      || value.suggestedReportSections?.length,
  );
}

function ConsultantReviewPanel({
  analysisData,
  rawOutputs,
  structuredAnalysis,
  providerStatuses,
}: {
  analysisData: AdminAnalysisData;
  rawOutputs: Array<[string, string]>;
  structuredAnalysis: StructuredAnalysis;
  providerStatuses: Array<[string, StructuredProviderStatus | null]>;
}) {
  const summary = structuredAnalysis.executiveSummary || {};
  const findings = (structuredAnalysis.rankedFindings || []).filter(hasFindingContent);
  const dataQualityNotes = structuredAnalysis.dataQualityNotes || [];
  const implementationPriorities = structuredAnalysis.implementationPriorities || [];
  const consultantChecklist = structuredAnalysis.consultantChecklist || [];
  const suggestedReportSections = structuredAnalysis.suggestedReportSections || [];

  return (
    <section className={`${sectionClassName} mt-5 p-5`}>
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <SectionHeader
          description="Structured internal review output for consultant validation before client-facing reporting."
          icon="clipboard"
          iconTone="analysis"
          title="Consultant Review"
        />
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <StatusPill className="border-[#02D99D]/25 bg-[#02D99D]/10 text-[#0A1547]/80">
            {formatStructuredLabel(structuredAnalysis.toolType)}
          </StatusPill>
          <ConsultantReviewExportControls
            context={consultantReviewContextFromAnalysisData(analysisData)}
            providerStatuses={providerStatuses}
            rawOutputs={rawOutputs}
            structuredAnalysis={structuredAnalysis}
          />
        </div>
      </div>

      {(summary.summary || summary.primaryConcern || summary.recommendedFocus) && (
        <div className="mt-5">
          <p className="text-sm font-semibold text-[#0A1547]">Executive Summary</p>
          <div className="mt-3 grid gap-3 lg:grid-cols-3">
            <StructuredSummaryCard label="Summary" value={summary.summary} />
            <StructuredSummaryCard label="Primary concern" value={summary.primaryConcern} />
            <StructuredSummaryCard label="Recommended focus" value={summary.recommendedFocus} />
          </div>
        </div>
      )}

      {findings.length > 0 && (
        <div className="mt-5">
          <p className="text-sm font-semibold text-[#0A1547]">Ranked Findings</p>
          <div className="mt-3 grid gap-3">
            {findings.map((finding, index) => (
              <StructuredFindingCard
                key={`${finding.rank || index}-${finding.title || "finding"}`}
                finding={finding}
                fallbackRank={index + 1}
              />
            ))}
          </div>
        </div>
      )}

      <div className="mt-5 grid gap-3 lg:grid-cols-2">
        <StructuredListSection title="Data Quality Notes" items={dataQualityNotes} />
        <StructuredListSection title="Implementation Priorities" items={implementationPriorities} />
        <StructuredChecklistSection items={consultantChecklist} />
        <StructuredReportSections items={suggestedReportSections} />
      </div>

      {providerStatuses.length > 0 && (
        <details className="mt-5 rounded-lg border border-[#0A1547]/10 bg-[#F8F9FD] p-4">
          <summary className="cursor-pointer text-sm font-semibold text-[#0A1547]">
            Structured parsing status
          </summary>
          <div className="mt-3 flex flex-wrap gap-2">
            {providerStatuses.map(([provider, status]) => (
              <StructuredProviderStatusPill key={provider} provider={provider} status={status} />
            ))}
          </div>
        </details>
      )}
    </section>
  );
}

function hasFindingContent(finding: StructuredRankedFinding): boolean {
  return Boolean(
    finding.title
      || finding.operationalImplication
      || finding.recommendedAction
      || finding.clientFacingSummary
      || finding.internalReviewerNotes,
  );
}

function StructuredSummaryCard({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div className="rounded-lg border border-[#0A1547]/10 bg-[#F8F9FD] p-4">
      <p className={labelClassName}>{label}</p>
      <p className="mt-2 break-words text-sm font-semibold leading-6 text-[#0A1547]/72">
        {formatNullable(value)}
      </p>
    </div>
  );
}

function StructuredFindingCard({
  finding,
  fallbackRank,
}: {
  finding: StructuredRankedFinding;
  fallbackRank: number;
}) {
  const evidence = finding.evidence || [];
  const rank = finding.rank || fallbackRank;

  return (
    <article className="rounded-lg border border-[#0A1547]/10 bg-[#F8F9FD] p-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-[#A380F6]">
            Finding {rank}
          </p>
          <h4 className="mt-1 break-words text-base font-semibold text-[#0A1547]">
            {formatNullable(finding.title)}
          </h4>
          {finding.category && (
            <p className="mt-1 text-xs font-medium uppercase tracking-[0.12em] text-[#0A1547]/45">
              {formatStructuredLabel(finding.category)}
            </p>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          <StructuredMetricPill label="Severity" value={finding.severity} tone={structuredSeverityTone(finding.severity)} />
          <StructuredMetricPill label="Confidence" value={finding.confidence} tone="blue" />
          <StructuredMetricPill label="Difficulty" value={finding.implementationDifficulty} tone="neutral" />
        </div>
      </div>

      <div className="mt-4 grid gap-3 lg:grid-cols-3">
        <StructuredCompactFact label="Impact category" value={formatStructuredLabel(finding.estimatedImpactCategory)} />
        <StructuredCompactFact label="Financial value" value={finding.financialValue} />
        <StructuredCompactFact label="Confidence" value={formatStructuredLabel(finding.confidence)} />
      </div>

      {evidence.length > 0 && (
        <div className="mt-4">
          <p className={labelClassName}>Evidence</p>
          <div className="mt-2 grid gap-2 md:grid-cols-2">
            {evidence.map((item, index) => (
              <StructuredEvidenceCard key={`${item.label || "evidence"}-${index}`} item={item} />
            ))}
          </div>
        </div>
      )}

      <div className="mt-4 grid gap-3 lg:grid-cols-2">
        <StructuredTextBlock label="Operational implication" value={finding.operationalImplication} />
        <StructuredTextBlock label="Recommended action" value={finding.recommendedAction} />
        <StructuredTextBlock label="Follow-up question" value={finding.followUpQuestion} />
        <StructuredTextBlock label="Client-facing summary" value={finding.clientFacingSummary} />
      </div>

      {finding.internalReviewerNotes && (
        <div className="mt-3 rounded-lg border border-[#A380F6]/20 bg-white p-3">
          <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-[#A380F6]">
            Internal reviewer notes
          </p>
          <p className="mt-2 max-h-32 overflow-auto break-words text-sm font-semibold leading-6 text-[#0A1547]/72">
            {finding.internalReviewerNotes}
          </p>
        </div>
      )}
    </article>
  );
}

function StructuredMetricPill({
  label,
  value,
  tone,
}: {
  label: string;
  value: string | null | undefined;
  tone: "red" | "amber" | "blue" | "green" | "neutral";
}) {
  const toneClass = {
    red: "border-red-200 bg-red-50 text-red-700",
    amber: "border-amber-200 bg-amber-50 text-amber-700",
    blue: "border-[#A380F6]/30 bg-[#A380F6]/10 text-[#0A1547]",
    green: "border-[#02D99D]/30 bg-[#02D99D]/10 text-[#0A1547]",
    neutral: "border-[#0A1547]/10 bg-white text-[#0A1547]/70",
  }[tone];

  return (
    <StatusPill className={toneClass}>
      {label}: {formatStructuredLabel(value)}
    </StatusPill>
  );
}

function structuredSeverityTone(value: string | null | undefined): "red" | "amber" | "blue" | "green" | "neutral" {
  const normalized = (value || "").toLowerCase();
  if (normalized === "critical" || normalized === "high") {
    return "red";
  }
  if (normalized === "medium") {
    return "blue";
  }
  if (normalized === "low") {
    return "green";
  }
  return "neutral";
}

function StructuredCompactFact({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div className="rounded-lg border border-[#0A1547]/10 bg-white px-3 py-2">
      <p className={labelClassName}>{label}</p>
      <p className="mt-1 break-words text-sm font-semibold text-[#0A1547]/82">{formatNullable(value)}</p>
    </div>
  );
}

function StructuredEvidenceCard({ item }: { item: StructuredEvidenceItem }) {
  return (
    <div className="rounded-lg border border-[#0A1547]/10 bg-white px-3 py-2">
      <p className="break-words text-sm font-semibold text-[#0A1547]">{formatNullable(item.label)}</p>
      <p className="mt-1 break-words text-sm font-medium text-[#0A1547]/72">{formatNullable(item.value)}</p>
      {item.sourceHint && (
        <p className="mt-1 break-words text-xs font-medium text-[#0A1547]/45">{item.sourceHint}</p>
      )}
    </div>
  );
}

function StructuredTextBlock({ label, value }: { label: string; value: string | null | undefined }) {
  if (!value) {
    return null;
  }

  return (
    <div>
      <p className={labelClassName}>{label}</p>
      <p className="mt-1 break-words text-sm font-medium leading-6 text-[#0A1547]/72">{value}</p>
    </div>
  );
}

function StructuredListSection({ title, items }: { title: string; items: string[] }) {
  if (items.length === 0) {
    return null;
  }

  return (
    <div className="rounded-lg border border-[#0A1547]/10 bg-[#F8F9FD] p-4">
      <p className="text-sm font-semibold text-[#0A1547]">{title}</p>
      <ul className="mt-3 space-y-2">
        {items.map((item, index) => (
          <li key={`${title}-${index}`} className="break-words text-sm font-medium leading-6 text-[#0A1547]/72">
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}

function StructuredChecklistSection({ items }: { items: string[] }) {
  if (items.length === 0) {
    return null;
  }

  return (
    <div className="rounded-lg border border-[#0A1547]/10 bg-[#F8F9FD] p-4">
      <p className="text-sm font-semibold text-[#0A1547]">Consultant Checklist</p>
      <ul className="mt-3 space-y-2">
        {items.map((item, index) => (
          <li key={`checklist-${index}`} className="flex gap-2 text-sm font-medium leading-6 text-[#0A1547]/72">
            <span className="mt-1.5 h-3 w-3 shrink-0 rounded border border-[#02D99D]/55 bg-white" aria-hidden="true" />
            <span className="break-words">{item}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function StructuredReportSections({ items }: { items: string[] }) {
  if (items.length === 0) {
    return null;
  }

  return (
    <div className="rounded-lg border border-[#0A1547]/10 bg-[#F8F9FD] p-4">
      <p className="text-sm font-semibold text-[#0A1547]">Suggested Report Sections</p>
      <div className="mt-3 flex flex-wrap gap-2">
        {items.map((item, index) => (
          <span
            key={`report-section-${index}`}
            className="max-w-full break-words rounded-full border border-[#A380F6]/25 bg-white px-3 py-1 text-xs font-semibold text-[#0A1547]/82"
          >
            {item}
          </span>
        ))}
      </div>
    </div>
  );
}

function StructuredProviderStatusPill({
  provider,
  status,
}: {
  provider: string;
  status: StructuredProviderStatus | null;
}) {
  const normalizedStatus = status?.status || "missing";
  const parsed = normalizedStatus === "parsed";

  return (
    <StatusPill className={
      parsed
        ? "border-[#02D99D]/30 bg-[#02D99D]/10 text-[#0A1547]"
        : "border-[#A380F6]/30 bg-[#A380F6]/10 text-[#0A1547]"
    }
    >
      {formatProviderName(provider)}: {formatStructuredLabel(normalizedStatus)}
    </StatusPill>
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
    <StatusPill className={
      ok
        ? "border-[#02D99D]/30 bg-[#02D99D]/10 text-[#0A1547]"
        : "border-[#A380F6]/30 bg-[#A380F6]/10 text-[#0A1547]"
    }
    >
      {formatProviderName(provider)}: {ok ? "Processed" : "Unavailable"}
      {!ok && status.errorType ? ` (${status.errorType})` : ""}
    </StatusPill>
  );
}

function IssueCard({ issue }: { issue: AdminAnalysisIssue }) {
  return (
    <article className="rounded-lg border border-[#0A1547]/10 bg-[#F8F9FD] p-4">
      <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
        <p className="text-sm font-semibold text-[#0A1547]">{formatNullable(issue.title)}</p>
        {issue.count !== undefined && (
          <StatusPill className="border-[#02ABE0]/25 bg-[#02ABE0]/10 text-[#0A1547]/80">
            {issue.count} source{issue.count === 1 ? "" : "s"}
          </StatusPill>
        )}
      </div>
      {issue.impact && (
        <p className="mt-2 text-sm font-medium leading-6 text-[#0A1547]/68">
          <span className="font-semibold text-[#0A1547]">Impact:</span> {issue.impact}
        </p>
      )}
      {issue.recommendation && (
        <p className="mt-1 text-sm font-medium leading-6 text-[#0A1547]/68">
          <span className="font-semibold text-[#0A1547]">Recommendation:</span> {issue.recommendation}
        </p>
      )}
      {issue.sources && issue.sources.length > 0 && (
        <p className="mt-2 text-xs font-medium text-[#0A1547]/50">
          Sources: {issue.sources.join(", ")}
        </p>
      )}
    </article>
  );
}

function TrendItem({ trend }: { trend: AdminAnalysisTrend }) {
  return (
    <li className="rounded-lg border border-[#0A1547]/10 bg-[#F8F9FD] px-4 py-3">
      <p className="text-sm font-medium leading-6 text-[#0A1547]/72">{formatNullable(trend.text)}</p>
      {trend.source && (
        <p className="mt-1 text-xs font-medium text-[#0A1547]/48">{trend.source}</p>
      )}
    </li>
  );
}

function ErrorMessage({ message }: { message: string }) {
  return (
    <p className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
      {message}
    </p>
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
    case "alert":
      return (
        <>
          <path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z" />
          <path d="M12 9v4" />
          <path d="M12 17h.01" />
        </>
      );
    case "arrow":
      return (
        <>
          <path d="M5 12h14" />
          <path d="m13 6 6 6-6 6" />
        </>
      );
    case "check":
      return <path d="m5 12 4 4L19 6" />;
    case "clipboard":
      return (
        <>
          <rect height="16" rx="2" width="14" x="5" y="5" />
          <path d="M9 5a3 3 0 0 1 6 0" />
          <path d="M9 12h6" />
          <path d="M9 16h4" />
        </>
      );
    case "file":
      return (
        <>
          <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8Z" />
          <path d="M14 3v5h5" />
        </>
      );
    case "filter":
      return (
        <>
          <path d="M4 6h16" />
          <path d="M7 12h10" />
          <path d="M10 18h4" />
        </>
      );
    case "lock":
      return (
        <>
          <rect height="11" rx="2" width="16" x="4" y="10" />
          <path d="M8 10V7a4 4 0 0 1 8 0v3" />
        </>
      );
    case "refresh":
      return (
        <>
          <path d="M21 12a9 9 0 0 1-15.5 6.2" />
          <path d="M3 12A9 9 0 0 1 18.5 5.8" />
          <path d="M3 18v-5h5" />
          <path d="M21 6v5h-5" />
        </>
      );
    case "spark":
      return (
        <>
          <path d="M12 2v5" />
          <path d="M12 17v5" />
          <path d="m4.9 4.9 3.5 3.5" />
          <path d="m15.6 15.6 3.5 3.5" />
          <path d="M2 12h5" />
          <path d="M17 12h5" />
          <path d="m4.9 19.1 3.5-3.5" />
          <path d="m15.6 8.4 3.5-3.5" />
        </>
      );
    case "upload":
      return (
        <>
          <path d="M12 21V9" />
          <path d="m7 14 5-5 5 5" />
          <path d="M5 21h14" />
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
