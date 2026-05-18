import { useEffect, useRef, useState, type ChangeEvent, type FormEvent } from "react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

type OrgType = "" | "Location" | "Group";
type JobStatus = "idle" | "queued" | "processing" | "cancel_requested" | "canceled" | "completed" | "error";
type LockableField = "firstName" | "lastName" | "email" | "officeName" | "phone";

type AnalyzerApiResponse = {
  ok?: boolean;
  job_id?: string;
  status?: JobStatus;
  error?: {
    code?: string;
    message?: string;
  };
  error_code?: string | null;
  error_message?: string | null;
};

type GhlPrefillResponse = {
  ok?: boolean;
  cid?: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  officeName?: string;
  phone?: string;
  lockedFields?: string[];
  error?: {
    code?: string;
    message?: string;
  };
};

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_ALLOWED_PATTERN = /^[0-9+\-().\s xX]+$/;
const ALLOWED_EXTENSIONS = [".pdf", ".csv", ".xlsx"];
const POLL_INTERVAL_MS = 3000;
const INITIAL_FORM = {
  firstName: "",
  lastName: "",
  officeName: "",
  email: "",
  phone: "",
  orgType: "" as OrgType,
  companyWebsite: "",
};

export default function AnalyzerPage() {
  const [form, setForm] = useState(INITIAL_FORM);
  const [file, setFile] = useState<File | null>(null);
  const [financialOnlyAcknowledgement, setFinancialOnlyAcknowledgement] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [canceling, setCanceling] = useState(false);
  const [status, setStatus] = useState<JobStatus>("idle");
  const [jobId, setJobId] = useState("");
  const [error, setError] = useState("");
  const [stopRequestMessage, setStopRequestMessage] = useState("");
  const [cid, setCid] = useState("");
  const [lockedFields, setLockedFields] = useState<LockableField[]>([]);
  const [prefillNotice, setPrefillNotice] = useState("");
  const [prefillWarning, setPrefillWarning] = useState("");
  const pollTimerRef = useRef<number | null>(null);
  const activeJobIdRef = useRef("");
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    void loadGhlPrefill();
    return () => stopPolling();
  }, []);

  const stopPolling = () => {
    if (pollTimerRef.current) {
      window.clearInterval(pollTimerRef.current);
      pollTimerRef.current = null;
    }
  };

  const getApiBaseUrl = () => {
    return import.meta.env.VITE_ANALYZER_API_BASE_URL?.trim().replace(/\/$/, "") || "";
  };

  const getCidFromUrl = () => {
    return new URLSearchParams(window.location.search).get("cid")?.trim() || "";
  };

  const isLockedField = (field: LockableField) => lockedFields.includes(field);

  const getResetForm = () => {
    const nextForm = { ...INITIAL_FORM };
    lockedFields.forEach((field) => {
      nextForm[field] = form[field];
    });
    return nextForm;
  };

  const updateField = (field: keyof typeof form, value: string) => {
    setForm((currentForm) => ({ ...currentForm, [field]: value }));
  };

  const readGhlPrefillPayload = async (response: Response): Promise<GhlPrefillResponse> => {
    try {
      return await response.json();
    } catch {
      return {};
    }
  };

  const normalizeLockedFields = (fields: string[] | undefined) => {
    const allowedFields: LockableField[] = ["firstName", "lastName", "email", "officeName", "phone"];
    return allowedFields.filter((field) => fields?.includes(field));
  };

  const loadGhlPrefill = async () => {
    const nextCid = getCidFromUrl();
    if (!nextCid) {
      return;
    }

    setCid(nextCid);
    const apiBaseUrl = getApiBaseUrl();
    if (!apiBaseUrl) {
      setPrefillWarning("Lead information could not be loaded. You can still complete the form manually.");
      return;
    }

    try {
      const response = await fetch(`${apiBaseUrl}/api/public-analyzer/ghl-prefill?cid=${encodeURIComponent(nextCid)}`, {
        method: "GET",
        headers: {
          Accept: "application/json",
        },
      });
      const payload = await readGhlPrefillPayload(response);

      if (!response.ok || payload.ok === false) {
        throw new Error("Prefill failed.");
      }

      const nextLockedFields = normalizeLockedFields(payload.lockedFields);
      setForm((currentForm) => ({
        ...currentForm,
        firstName: payload.firstName || currentForm.firstName,
        lastName: payload.lastName || currentForm.lastName,
        email: payload.email || currentForm.email,
        officeName: payload.officeName || currentForm.officeName,
        phone: payload.phone || currentForm.phone,
      }));
      setLockedFields(nextLockedFields);
      setPrefillNotice("Lead information loaded from alphaSource.");
      setPrefillWarning("");
    } catch {
      setLockedFields([]);
      setPrefillNotice("");
      setPrefillWarning("Lead information could not be loaded. You can still complete the form manually.");
    }
  };

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    setFile(event.target.files?.[0] || null);
  };

  const clearSelectedFile = () => {
    setFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleNewAnalysis = () => {
    stopPolling();
    setForm(getResetForm());
    clearSelectedFile();
    setFinancialOnlyAcknowledgement(false);
    setSubmitting(false);
    setCanceling(false);
    setStatus("idle");
    setJobId("");
    activeJobIdRef.current = "";
    setError("");
    setStopRequestMessage("");
    setPrefillWarning("");
  };

  const getFileExtension = (fileName: string) => {
    const dotIndex = fileName.lastIndexOf(".");
    return dotIndex >= 0 ? fileName.slice(dotIndex).toLowerCase() : "";
  };

  const validateForm = () => {
    const trimmedForm = {
      firstName: form.firstName.trim(),
      lastName: form.lastName.trim(),
      officeName: form.officeName.trim(),
      email: form.email.trim(),
      phone: form.phone.trim(),
      orgType: form.orgType,
      companyWebsite: form.companyWebsite.trim(),
    };

    if (!trimmedForm.firstName || !trimmedForm.lastName || !trimmedForm.officeName || !trimmedForm.email || !trimmedForm.phone || !trimmedForm.orgType) {
      return { ok: false as const, message: "Please complete all required fields." };
    }

    if (!EMAIL_PATTERN.test(trimmedForm.email)) {
      return { ok: false as const, message: "Please enter a valid email address." };
    }

    if (!isValidPhone(trimmedForm.phone)) {
      return { ok: false as const, message: "Please enter a valid phone number." };
    }

    if (!financialOnlyAcknowledgement) {
      return { ok: false as const, message: "Please confirm the upload acknowledgement before selecting a file." };
    }

    if (!file) {
      return { ok: false as const, message: "Please upload a PDF, CSV, or XLSX file." };
    }

    if (!ALLOWED_EXTENSIONS.includes(getFileExtension(file.name))) {
      return { ok: false as const, message: "Please upload a .pdf, .csv, or .xlsx file." };
    }

    return { ok: true as const, trimmedForm };
  };

  const isValidPhone = (phoneValue: string) => {
    const digits = phoneValue.replace(/\D/g, "");
    return PHONE_ALLOWED_PATTERN.test(phoneValue) && digits.length >= 7;
  };

  const readApiPayload = async (response: Response): Promise<AnalyzerApiResponse> => {
    try {
      return await response.json();
    } catch {
      return {};
    }
  };

  const getSafeApiError = (payload: AnalyzerApiResponse, fallback: string) => {
    return payload.error?.message || payload.error_message || fallback;
  };

  const handleCancelAccepted = () => {
    stopPolling();
    activeJobIdRef.current = "";
    setJobId("");
    setSubmitting(false);
    setCanceling(false);
    setStatus("idle");
    clearSelectedFile();
    setError("");
    setStopRequestMessage("Stop request received. We'll stop before final results are saved if processing has not already finalized.");
  };

  const handleCanceledJob = () => {
    stopPolling();
    activeJobIdRef.current = "";
    setSubmitting(false);
    setCanceling(false);
    setStatus("canceled");
    setJobId("");
    clearSelectedFile();
    setError("");
    setStopRequestMessage("");
  };

  const pollJob = async (nextJobId: string, apiBaseUrl: string) => {
    if (activeJobIdRef.current !== nextJobId) {
      return;
    }

    try {
      const response = await fetch(`${apiBaseUrl}/api/public-analyzer/submissions/${encodeURIComponent(nextJobId)}`, {
        method: "GET",
        headers: {
          Accept: "application/json",
        },
      });
      const payload = await readApiPayload(response);

      if (!response.ok || payload.ok === false) {
        throw new Error(getSafeApiError(payload, "We could not retrieve your analyzer status."));
      }

      if (activeJobIdRef.current !== nextJobId) {
        return;
      }

      if (
        payload.status === "queued" ||
        payload.status === "processing" ||
        payload.status === "cancel_requested" ||
        payload.status === "canceled" ||
        payload.status === "completed" ||
        payload.status === "error"
      ) {
        setStatus(payload.status);
      } else {
        throw new Error("We could not retrieve your analyzer status.");
      }

      if (payload.status === "completed") {
        stopPolling();
        setCanceling(false);
        setError("");
      }

      if (payload.status === "canceled") {
        handleCanceledJob();
      }

      if (payload.status === "error") {
        stopPolling();
        setCanceling(false);
        setError(payload.error_message || "The analyzer could not complete your submission. Please try again.");
      }
    } catch (pollError) {
      if (activeJobIdRef.current !== nextJobId) {
        return;
      }

      stopPolling();
      setStatus("error");
      setError(pollError instanceof Error ? pollError.message : "We could not retrieve your analyzer status.");
    }
  };

  const startPolling = (nextJobId: string, apiBaseUrl: string) => {
    stopPolling();
    activeJobIdRef.current = nextJobId;
    pollTimerRef.current = window.setInterval(() => {
      void pollJob(nextJobId, apiBaseUrl);
    }, POLL_INTERVAL_MS);
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError("");
    setStopRequestMessage("");
    stopPolling();
    activeJobIdRef.current = "";

    const apiBaseUrl = getApiBaseUrl();
    if (!apiBaseUrl) {
      setStatus("error");
      setError("The analyzer is not configured yet. Please try again later.");
      return;
    }

    const validation = validateForm();
    if (!validation.ok) {
      setStatus("error");
      setError(validation.message);
      return;
    }
    const selectedFile = file;
    if (!selectedFile) {
      setStatus("error");
      setError("Please upload a PDF, CSV, or XLSX file.");
      return;
    }

    const payload = new FormData();
    payload.append("first_name", validation.trimmedForm.firstName);
    payload.append("last_name", validation.trimmedForm.lastName);
    payload.append("office_name", validation.trimmedForm.officeName);
    payload.append("email", validation.trimmedForm.email);
    payload.append("phone", validation.trimmedForm.phone);
    payload.append("org_type", validation.trimmedForm.orgType);
    payload.append("financial_only_acknowledgement", "true");
    payload.append("source_path", `${window.location.pathname}${window.location.search}`);
    payload.append("companyWebsite", validation.trimmedForm.companyWebsite);
    if (cid) {
      payload.append("cid", cid);
    }
    payload.append("file", selectedFile);

    setSubmitting(true);
    setStatus("queued");
    setJobId("");
    activeJobIdRef.current = "";

    try {
      const response = await fetch(`${apiBaseUrl}/api/public-analyzer/submissions`, {
        method: "POST",
        headers: {
          Accept: "application/json",
        },
        body: payload,
      });
      const responsePayload = await readApiPayload(response);

      if (!response.ok || responsePayload.ok === false) {
        throw new Error(getSafeApiError(responsePayload, "We could not submit your analyzer file."));
      }

      if (!responsePayload.job_id) {
        throw new Error("The analyzer did not return a tracking ID.");
      }

      const nextStatus = responsePayload.status || "queued";
      setJobId(responsePayload.job_id);
      activeJobIdRef.current = responsePayload.job_id;
      setStatus(nextStatus);

      if (nextStatus === "completed") {
        setError("");
      } else if (nextStatus === "canceled") {
        handleCanceledJob();
      } else if (nextStatus === "queued" || nextStatus === "processing" || nextStatus === "cancel_requested") {
        startPolling(responsePayload.job_id, apiBaseUrl);
      } else {
        throw new Error("The analyzer returned an unexpected status.");
      }
    } catch (submitError) {
      setStatus("error");
      setError(submitError instanceof Error ? submitError.message : "We could not submit your analyzer file.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancelAnalysis = async () => {
    if (!jobId || canceling || status === "completed" || status === "error" || status === "canceled") {
      return;
    }

    const cancelJobId = jobId;
    const confirmed = window.confirm("Stop this analysis? If cancellation is accepted before final processing, no results will be saved.");
    if (!confirmed) {
      return;
    }

    const apiBaseUrl = getApiBaseUrl();
    if (!apiBaseUrl) {
      setError("The analyzer is not configured yet. Please try again later.");
      return;
    }

    setCanceling(true);
    setError("");
    setStopRequestMessage("");

    try {
      const response = await fetch(`${apiBaseUrl}/api/public-analyzer/submissions/${encodeURIComponent(cancelJobId)}/cancel`, {
        method: "POST",
        headers: {
          Accept: "application/json",
        },
      });
      const payload = await readApiPayload(response);

      if (!response.ok || payload.ok === false) {
        const code = payload.error?.code || payload.error_code;
        if (code === "job_already_finished") {
          setError("This analysis had already finished and could not be stopped.");
          if (activeJobIdRef.current === cancelJobId) {
            void pollJob(cancelJobId, apiBaseUrl);
          }
          return;
        }
        if (code === "job_already_finalizing") {
          setError("This analysis is already finalizing and may not be stopped.");
          if (activeJobIdRef.current === cancelJobId) {
            void pollJob(cancelJobId, apiBaseUrl);
          }
          return;
        }
        throw new Error(getSafeApiError(payload, "We could not stop this analysis."));
      }

      if (payload.status === "canceled") {
        handleCanceledJob();
        return;
      }

      if (payload.status === "cancel_requested" || payload.status === "queued" || payload.status === "processing") {
        handleCancelAccepted();
        return;
      }

      handleCancelAccepted();
    } catch (cancelError) {
      setError(cancelError instanceof Error ? cancelError.message : "We could not stop this analysis.");
    } finally {
      setCanceling(false);
    }
  };

  const inputClass =
    "w-full px-4 py-3 rounded-xl bg-gray-50 border border-gray-200 text-[#0A1547] text-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#A380F6]/30 focus:border-[#A380F6] transition-all";
  const fieldLabelClass = "block text-xs font-bold text-[#0A1547]/60 uppercase tracking-wider mb-2";
  const requiredMark = <span className="text-[#A380F6]" aria-hidden="true">*</span>;
  const trimmedContact = {
    firstName: form.firstName.trim(),
    lastName: form.lastName.trim(),
    officeName: form.officeName.trim(),
    email: form.email.trim(),
    phone: form.phone.trim(),
    orgType: form.orgType,
  };
  const contactFieldsValid = Boolean(
    trimmedContact.firstName &&
      trimmedContact.lastName &&
      trimmedContact.officeName &&
      EMAIL_PATTERN.test(trimmedContact.email) &&
      isValidPhone(trimmedContact.phone) &&
      trimmedContact.orgType,
  );
  const canShowFileUpload = contactFieldsValid && financialOnlyAcknowledgement;
  const isAnalyzing = submitting || status === "queued" || status === "processing" || status === "cancel_requested";
  const canCancelAnalysis = Boolean(jobId) && (status === "queued" || status === "processing" || status === "cancel_requested");
  const isCompleted = status === "completed";
  const statusLabel =
    status === "queued"
      ? "Queued"
      : status === "processing"
        ? "Processing"
        : status === "cancel_requested"
          ? "Stop request received"
          : status === "canceled"
            ? "Canceled"
            : status === "completed"
              ? "Completed"
              : status === "error"
                ? "Error"
                : "Ready";
  const statusMessage =
    status === "completed"
      ? "Analysis complete. The alphaSource Consulting team will review the results and follow up with next steps."
      : status === "canceled"
        ? "Analysis canceled. No results were saved. You can choose a new file when you are ready."
      : status === "error"
        ? "We could not complete this analyzer submission. Please review the message shown here or try again."
        : status === "cancel_requested"
          ? "Stop request received. We'll stop before final results are saved if processing has not already finalized."
        : status === "queued"
          ? "Your upload is queued. The analyzer will begin processing shortly."
          : status === "processing"
            ? "Your file is being processed by the analyzer. Keep this page open while status updates continue."
            : "Complete the required fields, acknowledge the upload terms, and select a supported file to begin.";

  return (
    <div className="min-h-screen bg-white font-sans">
      <Navbar />

      {/* Hero */}
      <section className="relative pt-32 pb-20 gradient-hero-dark overflow-hidden">
        <div
          className="absolute inset-0 pointer-events-none"
          style={{ background: "radial-gradient(ellipse at 30% 60%, rgba(2,171,224,0.15) 0%, transparent 55%), radial-gradient(ellipse at 80% 20%, rgba(163,128,246,0.2) 0%, transparent 50%)" }}
        />
        <div className="relative max-w-4xl mx-auto px-6 lg:px-8 text-center">
          <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-white/20 bg-white/5 text-xs font-bold text-white/80 uppercase tracking-wider mb-6">
            <div className="w-2 h-2 rounded-full bg-[#02ABE0] animate-pulse" />
            AI-Powered Tool
          </span>
          <h1 className="text-5xl lg:text-6xl font-black text-white mb-6 leading-tight">
            Dental Operations{" "}
            <span className="text-gradient-brand">Analyzer</span>
          </h1>
          <p className="text-xl text-white/65 leading-relaxed max-w-2xl mx-auto">
            An AI-powered tool designed to quickly identify trends and opportunities hidden in your practice's operational data — giving you clarity to act in minutes, not months.
          </p>
        </div>
      </section>

      {/* Analyzer Section */}
      <section className="py-20 bg-[#F8F9FD]">
        <div className="max-w-5xl mx-auto px-6 lg:px-8">
          <div className="grid md:grid-cols-3 gap-4 mb-8">
            <div className="rounded-2xl bg-white border border-gray-100 p-5 shadow-sm">
              <p className="text-xs font-bold text-[#A380F6] uppercase tracking-wider mb-2">What It Does</p>
              <p className="text-sm text-[#0A1547]/60 leading-relaxed">
                Reviews supported practice financial and operations files to identify trends, risks, and improvement opportunities.
              </p>
            </div>
            <div className="rounded-2xl bg-white border border-gray-100 p-5 shadow-sm">
              <p className="text-xs font-bold text-[#A380F6] uppercase tracking-wider mb-2">Self-Submit</p>
              <p className="text-sm text-[#0A1547]/60 leading-relaxed">
                Upload financial and practice operations files only, such as exported reports in PDF, CSV, or XLSX format.
              </p>
            </div>
            <div className="rounded-2xl bg-white border border-gray-100 p-5 shadow-sm">
              <p className="text-xs font-bold text-[#A380F6] uppercase tracking-wider mb-2">Team-Assisted</p>
              <p className="text-sm text-[#0A1547]/60 leading-relaxed">
                AR reports, claims reports, and any files that may contain PHI require a HIPAA-compliant workflow with the alphaSource Consulting team.
              </p>
            </div>
          </div>

          <div className="w-full rounded-3xl border border-gray-100 bg-white shadow-sm overflow-hidden">
            <div className="grid lg:grid-cols-[1.3fr_0.7fr]">
              <form onSubmit={handleSubmit} className="p-8 lg:p-10 space-y-5">
                <div className="rounded-2xl bg-[#F8F9FD] border border-gray-100 p-5">
                  <p className="text-sm font-black text-[#0A1547] mb-3">Before You Upload</p>
                  <ul className="list-disc pl-5 space-y-2 text-sm text-[#0A1547]/60 leading-relaxed">
                    <li>Upload practice financial and operations files only.</li>
                    <li>Do not upload HIPAA-protected PHI through this public analyzer.</li>
                    <li>AR and claims reports require working with the alphaSource Consulting team through a HIPAA-compliant upload workflow.</li>
                  </ul>
                </div>

                {prefillNotice && (
                  <p className="rounded-2xl border border-[#02D99D]/20 bg-[#02D99D]/10 px-4 py-3 text-sm font-semibold text-[#0A1547]/70">
                    {prefillNotice}
                  </p>
                )}

                {prefillWarning && (
                  <p className="rounded-2xl border border-[#A380F6]/20 bg-[#A380F6]/5 px-4 py-3 text-sm font-semibold text-[#0A1547]/65">
                    {prefillWarning}
                  </p>
                )}

                <div className="absolute left-[-9999px]" aria-hidden="true">
                  <label>
                    Company Website
                    <input
                      type="text"
                      name="companyWebsite"
                      tabIndex={-1}
                      autoComplete="off"
                      value={form.companyWebsite}
                      onChange={(event) => updateField("companyWebsite", event.target.value)}
                    />
                  </label>
                </div>

                <div className="grid md:grid-cols-2 gap-5">
                  <div>
                    <label className={fieldLabelClass}>First Name {requiredMark}</label>
                    <input
                      type="text"
                      required
                      value={form.firstName}
                      onChange={(event) => updateField("firstName", event.target.value)}
                      disabled={isLockedField("firstName")}
                      placeholder="Jane"
                      className={`${inputClass} disabled:cursor-not-allowed disabled:bg-[#F8F9FD] disabled:text-[#0A1547]/70`}
                    />
                  </div>
                  <div>
                    <label className={fieldLabelClass}>Last Name {requiredMark}</label>
                    <input
                      type="text"
                      required
                      value={form.lastName}
                      onChange={(event) => updateField("lastName", event.target.value)}
                      disabled={isLockedField("lastName")}
                      placeholder="Smith"
                      className={`${inputClass} disabled:cursor-not-allowed disabled:bg-[#F8F9FD] disabled:text-[#0A1547]/70`}
                    />
                  </div>
                </div>

                <div className="grid md:grid-cols-2 gap-5">
                  <div>
                    <label className={fieldLabelClass}>Office/Group Name {requiredMark}</label>
                    <input
                      type="text"
                      required
                      value={form.officeName}
                      onChange={(event) => updateField("officeName", event.target.value)}
                      disabled={isLockedField("officeName")}
                      placeholder="Acme Dental"
                      className={`${inputClass} disabled:cursor-not-allowed disabled:bg-[#F8F9FD] disabled:text-[#0A1547]/70`}
                    />
                  </div>
                  <div>
                    <label className={fieldLabelClass}>Email Address {requiredMark}</label>
                    <input
                      type="email"
                      required
                      value={form.email}
                      onChange={(event) => updateField("email", event.target.value)}
                      disabled={isLockedField("email")}
                      placeholder="jane@mypractice.com"
                      className={`${inputClass} disabled:cursor-not-allowed disabled:bg-[#F8F9FD] disabled:text-[#0A1547]/70`}
                    />
                  </div>
                </div>

                <div className="grid md:grid-cols-2 gap-5">
                  <div>
                    <label className={fieldLabelClass}>Phone Number {requiredMark}</label>
                    <input
                      type="tel"
                      required
                      value={form.phone}
                      onChange={(event) => updateField("phone", event.target.value)}
                      disabled={isLockedField("phone")}
                      placeholder="(602) 555-0100"
                      className={`${inputClass} disabled:cursor-not-allowed disabled:bg-[#F8F9FD] disabled:text-[#0A1547]/70`}
                    />
                  </div>
                  <div>
                    <label className={fieldLabelClass}>Organization Type {requiredMark}</label>
                    <select
                      required
                      value={form.orgType}
                      onChange={(event) => updateField("orgType", event.target.value as OrgType)}
                      className={`${inputClass} h-[46px]`}
                    >
                      <option value="">Select one</option>
                      <option value="Location">Location</option>
                      <option value="Group">Group</option>
                    </select>
                  </div>
                </div>

                <label className="flex gap-3 rounded-2xl border border-[#A380F6]/20 bg-[#A380F6]/5 p-4 text-sm text-[#0A1547]/65 leading-relaxed">
                  <input
                    type="checkbox"
                    checked={financialOnlyAcknowledgement}
                    onChange={(event) => setFinancialOnlyAcknowledgement(event.target.checked)}
                    className="mt-1 h-4 w-4 rounded border-gray-300 accent-[#A380F6]"
                  />
                  <span>
                    I confirm that I am uploading financial or practice operations files only, that I am not uploading HIPAA-protected PHI, and that I am authorized to share this file with alphaSource Consulting.
                  </span>
                </label>

                {canShowFileUpload ? (
                  <div>
                    <label className={fieldLabelClass}>Upload File {requiredMark}</label>
                    <div className="w-full min-h-[46px] px-3 py-2 rounded-xl bg-gray-50 border border-gray-200 flex items-center gap-3 text-sm text-[#0A1547] focus-within:ring-2 focus-within:ring-[#A380F6]/30 focus-within:border-[#A380F6] transition-all">
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept=".pdf,.csv,.xlsx"
                        onChange={handleFileChange}
                        className="sr-only"
                      />
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="inline-flex shrink-0 items-center gap-2 rounded-full bg-[#A380F6]/10 px-4 py-2 text-sm font-bold text-[#0A1547] hover:bg-[#A380F6]/20 transition-colors"
                      >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                          <polyline points="17 8 12 3 7 8" />
                          <line x1="12" y1="3" x2="12" y2="15" />
                        </svg>
                        Choose File
                      </button>
                      <span className="min-w-0 truncate text-[#0A1547]/55">
                        {file ? file.name : "No file selected"}
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className="rounded-2xl border border-dashed border-[#A380F6]/30 bg-gray-50 p-5 text-sm text-[#0A1547]/55">
                    Complete the required contact fields, select an organization type, and confirm the acknowledgement to unlock file upload.
                  </div>
                )}

                {error && (
                  <p className="text-sm font-semibold text-red-600" role="alert">
                    {error}
                  </p>
                )}

                {stopRequestMessage && (
                  <p className="rounded-2xl border border-[#02D99D]/25 bg-[#02D99D]/10 px-4 py-3 text-sm font-semibold leading-6 text-[#0A1547]/75" role="status">
                    {stopRequestMessage}
                  </p>
                )}

                <button
                  type="submit"
                  disabled={isAnalyzing || isCompleted}
                  className="w-full py-3.5 text-sm font-bold text-white rounded-full transition-all hover:opacity-90 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-70"
                  style={{ background: "linear-gradient(135deg, #A380F6 0%, #8b63f0 100%)" }}
                >
                  {submitting ? "Submitting..." : status === "queued" || status === "processing" || status === "cancel_requested" ? "Analyzing..." : "Run Analyzer"}
                </button>

                <div className="space-y-1 text-xs font-medium leading-5 text-[#0A1547]/45">
                  <p>* Analysis may take approximately 1–2 minutes for standard files and 3–5 minutes for image-based or scanned PDF files. Please keep this page open until status shows complete.</p>
                </div>

                {canCancelAnalysis && (
                  <button
                    type="button"
                    onClick={handleCancelAnalysis}
                    disabled={canceling || status === "cancel_requested"}
                    className="w-full py-2.5 text-xs font-bold text-red-700 rounded-full border border-red-200 bg-white hover:bg-red-50 transition-all active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-70"
                  >
                    {canceling ? "Stopping..." : status === "cancel_requested" ? "Stop request received" : "Stop Analysis"}
                  </button>
                )}

                {isCompleted && (
                  <button
                    type="button"
                    onClick={handleNewAnalysis}
                    className="w-full py-3.5 text-sm font-bold text-[#0A1547] rounded-full border border-[#A380F6]/30 bg-white hover:bg-[#A380F6]/10 transition-all active:scale-[0.99]"
                  >
                    Start New Analysis
                  </button>
                )}

              </form>

              <div className="bg-[#0A1547] p-8 lg:p-10 text-white flex flex-col justify-between">
                <div>
                  <div className="w-16 h-16 rounded-3xl bg-white/10 flex items-center justify-center mb-6">
                    <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="#02ABE0" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                      <polyline points="14 2 14 8 20 8" />
                      <line x1="16" y1="13" x2="8" y2="13" />
                      <line x1="16" y1="17" x2="8" y2="17" />
                      <polyline points="10 9 9 9 8 9" />
                    </svg>
                  </div>
                  <p className="text-xs font-bold text-white/50 uppercase tracking-wider mb-2">Status</p>
                  <h3 className="text-2xl font-black mb-4">{statusLabel}</h3>
                  <p className="text-sm text-white/60 leading-relaxed">
                    {statusMessage}
                  </p>

                </div>

                {status === "completed" && (
                  <div className="mt-10 rounded-2xl bg-[#02D99D]/15 border border-[#02D99D]/20 p-5">
                    <p className="text-sm font-bold text-white mb-1">Submission received</p>
                    <p className="text-sm text-white/60">
                      The analyzer has completed processing your upload.
                    </p>
                  </div>
                )}

                {status === "canceled" && (
                  <div className="mt-10 rounded-2xl bg-white/10 border border-white/15 p-5">
                    <p className="text-sm font-bold text-white mb-1">Analysis stopped</p>
                    <p className="text-sm text-white/60">
                      Analysis canceled. No results were saved.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="mt-6 text-right">
            <a
              href="https://alphasource-consulting-admin.onrender.com"
              target="_blank"
              rel="noreferrer"
              className="text-xs font-semibold text-[#0A1547]/30 hover:text-[#0A1547]/50 transition-colors"
            >
              Admin access
            </a>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
