import { useEffect, useRef, useState, type ChangeEvent, type FormEvent } from "react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

type OrgType = "" | "Location" | "Group";
type JobStatus = "idle" | "queued" | "processing" | "completed" | "error";

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

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const ALLOWED_EXTENSIONS = [".pdf", ".csv", ".xlsx"];
const POLL_INTERVAL_MS = 3000;

export default function AnalyzerPage() {
  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    officeName: "",
    email: "",
    orgType: "" as OrgType,
    companyWebsite: "",
  });
  const [file, setFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [status, setStatus] = useState<JobStatus>("idle");
  const [jobId, setJobId] = useState("");
  const [error, setError] = useState("");
  const pollTimerRef = useRef<number | null>(null);

  useEffect(() => {
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

  const updateField = (field: keyof typeof form, value: string) => {
    setForm((currentForm) => ({ ...currentForm, [field]: value }));
  };

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    setFile(event.target.files?.[0] || null);
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
      orgType: form.orgType,
      companyWebsite: form.companyWebsite.trim(),
    };

    if (!trimmedForm.firstName || !trimmedForm.lastName || !trimmedForm.officeName || !trimmedForm.email || !trimmedForm.orgType) {
      return { ok: false as const, message: "Please complete all required fields." };
    }

    if (!EMAIL_PATTERN.test(trimmedForm.email)) {
      return { ok: false as const, message: "Please enter a valid email address." };
    }

    if (!file) {
      return { ok: false as const, message: "Please upload a PDF, CSV, or XLSX file." };
    }

    if (!ALLOWED_EXTENSIONS.includes(getFileExtension(file.name))) {
      return { ok: false as const, message: "Please upload a .pdf, .csv, or .xlsx file." };
    }

    return { ok: true as const, trimmedForm };
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

  const pollJob = async (nextJobId: string, apiBaseUrl: string) => {
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

      if (payload.status === "queued" || payload.status === "processing" || payload.status === "completed" || payload.status === "error") {
        setStatus(payload.status);
      } else {
        throw new Error("We could not retrieve your analyzer status.");
      }

      if (payload.status === "completed") {
        stopPolling();
        setError("");
      }

      if (payload.status === "error") {
        stopPolling();
        setError(payload.error_message || "The analyzer could not complete your submission. Please try again.");
      }
    } catch (pollError) {
      stopPolling();
      setStatus("error");
      setError(pollError instanceof Error ? pollError.message : "We could not retrieve your analyzer status.");
    }
  };

  const startPolling = (nextJobId: string, apiBaseUrl: string) => {
    stopPolling();
    pollTimerRef.current = window.setInterval(() => {
      void pollJob(nextJobId, apiBaseUrl);
    }, POLL_INTERVAL_MS);
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError("");
    stopPolling();

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
    payload.append("org_type", validation.trimmedForm.orgType);
    payload.append("source_path", window.location.pathname);
    payload.append("companyWebsite", validation.trimmedForm.companyWebsite);
    payload.append("file", selectedFile);

    setSubmitting(true);
    setStatus("queued");
    setJobId("");

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
      setStatus(nextStatus);

      if (nextStatus === "completed") {
        setError("");
      } else if (nextStatus === "queued" || nextStatus === "processing") {
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

  const inputClass =
    "w-full px-4 py-3 rounded-xl bg-gray-50 border border-gray-200 text-[#0A1547] text-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#A380F6]/30 focus:border-[#A380F6] transition-all";
  const isAnalyzing = submitting || status === "queued" || status === "processing";
  const statusLabel =
    status === "queued"
      ? "Queued"
      : status === "processing"
        ? "Processing"
        : status === "completed"
          ? "Completed"
          : status === "error"
            ? "Error"
            : "Ready";

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

      {/* Analyzer Tool */}
      <section className="py-20 bg-[#F8F9FD]">
        <div className="max-w-5xl mx-auto px-6 lg:px-8">
          <div className="text-center mb-10">
            <h2 className="text-2xl font-black text-[#0A1547] mb-3">Analyzer Tool</h2>
            <p className="text-[#0A1547]/55 max-w-lg mx-auto text-sm">
              Upload your practice data and the analyzer will process your file securely.
            </p>
          </div>

          <div className="w-full rounded-3xl border border-gray-100 bg-white shadow-sm overflow-hidden">
            <div className="grid lg:grid-cols-[1.3fr_0.7fr]">
              <form onSubmit={handleSubmit} className="p-8 lg:p-10 space-y-5">
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
                    <label className="block text-xs font-bold text-[#0A1547]/60 uppercase tracking-wider mb-2">First Name</label>
                    <input
                      type="text"
                      required
                      value={form.firstName}
                      onChange={(event) => updateField("firstName", event.target.value)}
                      placeholder="Jane"
                      className={inputClass}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-[#0A1547]/60 uppercase tracking-wider mb-2">Last Name</label>
                    <input
                      type="text"
                      required
                      value={form.lastName}
                      onChange={(event) => updateField("lastName", event.target.value)}
                      placeholder="Smith"
                      className={inputClass}
                    />
                  </div>
                </div>

                <div className="grid md:grid-cols-2 gap-5">
                  <div>
                    <label className="block text-xs font-bold text-[#0A1547]/60 uppercase tracking-wider mb-2">Office Name</label>
                    <input
                      type="text"
                      required
                      value={form.officeName}
                      onChange={(event) => updateField("officeName", event.target.value)}
                      placeholder="Acme Dental"
                      className={inputClass}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-[#0A1547]/60 uppercase tracking-wider mb-2">Email Address</label>
                    <input
                      type="email"
                      required
                      value={form.email}
                      onChange={(event) => updateField("email", event.target.value)}
                      placeholder="jane@mypractice.com"
                      className={inputClass}
                    />
                  </div>
                </div>

                <div className="grid md:grid-cols-2 gap-5">
                  <div>
                    <label className="block text-xs font-bold text-[#0A1547]/60 uppercase tracking-wider mb-2">Organization Type</label>
                    <select
                      required
                      value={form.orgType}
                      onChange={(event) => updateField("orgType", event.target.value as OrgType)}
                      className={inputClass}
                    >
                      <option value="">Select one</option>
                      <option value="Location">Location</option>
                      <option value="Group">Group</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-[#0A1547]/60 uppercase tracking-wider mb-2">Upload File</label>
                    <input
                      type="file"
                      required
                      accept=".pdf,.csv,.xlsx"
                      onChange={handleFileChange}
                      className={`${inputClass} file:mr-4 file:rounded-full file:border-0 file:bg-[#A380F6]/10 file:px-4 file:py-2 file:text-sm file:font-bold file:text-[#0A1547]`}
                    />
                  </div>
                </div>

                {error && (
                  <p className="text-sm font-semibold text-red-600" role="alert">
                    {error}
                  </p>
                )}

                <button
                  type="submit"
                  disabled={isAnalyzing}
                  className="w-full py-3.5 text-sm font-bold text-white rounded-full transition-all hover:opacity-90 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-70"
                  style={{ background: "linear-gradient(135deg, #A380F6 0%, #8b63f0 100%)" }}
                >
                  {submitting ? "Submitting..." : status === "queued" || status === "processing" ? "Analyzing..." : "Run Analyzer"}
                </button>
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
                    {status === "completed"
                      ? "Analysis complete. We will follow up with the results and next steps."
                      : status === "error"
                        ? "The analyzer needs attention before this submission can continue."
                        : status === "queued"
                          ? "Your file is queued for analysis."
                          : status === "processing"
                            ? "Your file is being analyzed."
                            : "Submit a supported file to start the analyzer."}
                  </p>

                  {jobId && (
                    <p className="mt-6 text-xs text-white/35 break-all">
                      Job ID: {jobId}
                    </p>
                  )}
                </div>

                {status === "completed" && (
                  <div className="mt-10 rounded-2xl bg-[#02D99D]/15 border border-[#02D99D]/20 p-5">
                    <p className="text-sm font-bold text-white mb-1">Submission received</p>
                    <p className="text-sm text-white/60">
                      The analyzer has completed processing your upload.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="mt-6 text-right">
            <a
              href="https://dental-analysis-tools.onrender.com/uploads?page=admin"
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
