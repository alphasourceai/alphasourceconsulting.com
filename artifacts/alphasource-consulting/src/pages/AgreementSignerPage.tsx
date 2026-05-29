import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from "react";
import type { RouteComponentProps } from "wouter";
import {
  AgreementApiError,
  createAgreementSession,
  signAgreement,
  type PublicAgreementSession,
  type PublicAgreementSignResponse,
} from "@/lib/agreementsApi";

function decodeToken(value: string | undefined): string {
  const raw = String(value || "").trim();
  if (!raw) {
    return "";
  }

  try {
    return decodeURIComponent(raw);
  } catch {
    return raw;
  }
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

function friendlyError(error: unknown, fallback: string): string {
  if (error instanceof AgreementApiError) {
    if (error.code === "missing_api_base_url") {
      return error.message;
    }

    if (error.status === 404 || error.code === "signing_link_unavailable") {
      return "This agreement link is unavailable or has expired.";
    }

    if (error.status === 0 || error.status >= 500) {
      return "Agreement signing is temporarily unavailable. Please contact alphaSource Consulting.";
    }

    return error.message || fallback;
  }

  return fallback;
}

export default function AgreementSignerPage({ params }: RouteComponentProps<{ token: string }>) {
  const token = useMemo(() => decodeToken(params.token), [params.token]);

  const [agreement, setAgreement] = useState<PublicAgreementSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [sessionError, setSessionError] = useState("");
  const [typedName, setTypedName] = useState("");
  const [title, setTitle] = useState("");
  const [authorityConfirmed, setAuthorityConfirmed] = useState(false);
  const [accepted, setAccepted] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [completed, setCompleted] = useState<PublicAgreementSignResponse | null>(null);
  const [hasSignature, setHasSignature] = useState(false);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const drawingRef = useRef(false);
  const hasStrokeRef = useRef(false);

  const prepareCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) {
      return;
    }

    const rect = canvas.getBoundingClientRect();
    if (!rect.width || !rect.height) {
      return;
    }

    const ratio = Math.max(window.devicePixelRatio || 1, 1);
    canvas.width = Math.floor(rect.width * ratio);
    canvas.height = Math.floor(rect.height * ratio);

    const ctx = canvas.getContext("2d");
    if (!ctx) {
      return;
    }

    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.scale(ratio, ratio);
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, rect.width, rect.height);
    ctx.strokeStyle = "#0A1547";
    ctx.lineWidth = 2.35;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
  }, []);

  const clearSignature = useCallback(() => {
    prepareCanvas();
    hasStrokeRef.current = false;
    setHasSignature(false);
  }, [prepareCanvas]);

  const loadSession = useCallback(async (signal?: AbortSignal) => {
    if (!token) {
      setAgreement(null);
      setSessionError("This agreement link is unavailable or has expired.");
      setLoading(false);
      return;
    }

    setLoading(true);
    setSessionError("");

    try {
      const response = await createAgreementSession(token, signal);
      setAgreement(response.agreement);
      setTypedName(response.agreement.signerName || "");
      setTitle(response.agreement.signerTitle || "");
      setAuthorityConfirmed(false);
      setAccepted(false);
      setCompleted(null);
      setSubmitError("");
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") {
        return;
      }

      setAgreement(null);
      setSessionError(friendlyError(error, "Agreement session could not be loaded."));
    } finally {
      if (!signal?.aborted) {
        setLoading(false);
      }
    }
  }, [token]);

  useEffect(() => {
    const controller = new AbortController();
    void loadSession(controller.signal);

    return () => {
      controller.abort();
    };
  }, [loadSession]);

  useEffect(() => {
    if (!agreement || loading || completed) {
      return undefined;
    }

    const frameId = window.requestAnimationFrame(() => {
      clearSignature();
    });

    const onResize = () => {
      clearSignature();
    };
    window.addEventListener("resize", onResize);

    return () => {
      window.cancelAnimationFrame(frameId);
      window.removeEventListener("resize", onResize);
    };
  }, [agreement, clearSignature, completed, loading]);

  const getPoint = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) {
      return { x: 0, y: 0 };
    }

    const rect = canvas.getBoundingClientRect();
    return {
      x: event.clientX - rect.left,
      y: event.clientY - rect.top,
    };
  };

  const handlePointerDown = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) {
      return;
    }

    const ctx = canvas.getContext("2d");
    if (!ctx) {
      return;
    }

    const point = getPoint(event);
    drawingRef.current = true;
    canvas.setPointerCapture(event.pointerId);
    ctx.beginPath();
    ctx.moveTo(point.x, point.y);
  };

  const handlePointerMove = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    if (!drawingRef.current) {
      return;
    }

    const canvas = canvasRef.current;
    if (!canvas) {
      return;
    }

    const ctx = canvas.getContext("2d");
    if (!ctx) {
      return;
    }

    const point = getPoint(event);
    ctx.lineTo(point.x, point.y);
    ctx.stroke();

    if (!hasStrokeRef.current) {
      hasStrokeRef.current = true;
      setHasSignature(true);
    }
  };

  const stopDrawing = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (canvas?.hasPointerCapture(event.pointerId)) {
      canvas.releasePointerCapture(event.pointerId);
    }
    drawingRef.current = false;
  };

  const handleSubmit = async () => {
    if (submitting) {
      return;
    }

    setSubmitError("");
    const isBaSigner = agreement?.signerRole === "ba";

    if (!token) {
      setSubmitError("This agreement link is unavailable or has expired.");
      return;
    }

    if (!typedName.trim()) {
      setSubmitError("Enter your full name before signing.");
      return;
    }

    if (!title.trim()) {
      setSubmitError("Enter your title before signing.");
      return;
    }

    if (!authorityConfirmed) {
      setSubmitError(isBaSigner ? "Confirm that you are authorized to countersign for alphaSource Consulting." : "Confirm that you are authorized to sign for the Covered Entity.");
      return;
    }

    if (!accepted) {
      setSubmitError("Confirm that you reviewed and accept the agreement.");
      return;
    }

    if (!hasSignature) {
      setSubmitError("Draw your signature before submitting.");
      return;
    }

    const canvas = canvasRef.current;
    if (!canvas) {
      setSubmitError("Signature panel is not available.");
      return;
    }

    setSubmitting(true);

    try {
      const response = await signAgreement({
        token,
        typedSignerName: typedName.trim(),
        signerTitle: title.trim(),
        authorityConfirmed,
        accepted,
        signatureImageDataUrl: canvas.toDataURL("image/png"),
      });
      setCompleted(response);
      setAgreement((current) => current ? {
        ...current,
        signedPdfUrl: response.signedPdfUrl,
        status: response.agreement.status,
      } : current);
    } catch (error) {
      setSubmitError(friendlyError(error, "Agreement could not be signed."));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="min-h-screen bg-[#F8F9FD] text-[#0A1547]">
      <header className="border-b border-[#0A1547]/10 bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-4 md:px-8">
          <img
            src={`${import.meta.env.BASE_URL}logo-dark-text.png`}
            alt="alphaSource Consulting"
            className="h-auto w-48 max-w-full object-contain sm:w-60"
          />
          <span className="rounded-full border border-[#A380F6]/25 bg-[#A380F6]/10 px-3 py-1 text-xs font-extrabold text-[#0A1547]">
            Secure signing
          </span>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-5 py-8 md:px-8">
        {loading ? (
          <StateCard title="Loading agreement" copy="Preparing your secure agreement review session." />
        ) : sessionError ? (
          <StateCard title="Agreement unavailable" copy={sessionError} />
        ) : completed ? (
          <CompletionCard response={completed} />
        ) : agreement ? (
          <div className="grid gap-6 lg:grid-cols-[minmax(0,1.25fr)_minmax(360px,0.75fr)]">
            <section className="overflow-hidden rounded-3xl border border-[#0A1547]/10 bg-white shadow-lg shadow-[#0A1547]/6">
              <div className="border-b border-[#0A1547]/10 px-5 py-4">
                <p className="text-xs font-extrabold uppercase tracking-[0.18em] text-[#A380F6]">BAA/Privacy Agreement</p>
                <h1 className="mt-2 text-2xl font-black text-[#0A1547] md:text-3xl">
                  {agreement.signerRole === "ba" ? "Countersign the BAA/Privacy Agreement" : "Review and sign the BAA/Privacy Agreement"}
                </h1>
                <div className="mt-3 grid gap-3 text-sm sm:grid-cols-3">
                  <Detail label="Covered Entity" value={agreement.clientLegalName} />
                  <Detail label="Effective Date" value={formatDate(agreement.effectiveDate)} />
                  <Detail label="Expires" value={formatDateTime(agreement.expiresAt)} />
                </div>
              </div>
              <div className="bg-[#F8F9FD] p-4">
                {agreement.draftPdfUrl ? (
                  <iframe
                    title="BAA/Privacy Agreement PDF"
                    src={agreement.draftPdfUrl}
                    className="h-[68vh] min-h-[520px] w-full rounded-2xl border border-[#0A1547]/10 bg-white"
                  />
                ) : (
                  <div className="rounded-2xl border border-[#0A1547]/10 bg-white p-6 text-sm font-bold text-[#0A1547]/62">
                    Agreement preview is temporarily unavailable.
                  </div>
                )}
              </div>
            </section>

            <aside className="rounded-3xl border border-[#0A1547]/10 bg-white p-5 shadow-lg shadow-[#0A1547]/6">
              <h2 className="text-xl font-black text-[#0A1547]">{agreement.signerRole === "ba" ? "Countersign Agreement" : "Sign Agreement"}</h2>
              <p className="mt-2 text-sm font-medium leading-6 text-[#0A1547]/62">
                {agreement.signerRole === "ba"
                  ? "Enter your alphaSource signer details, confirm authority and acceptance, then draw your countersignature."
                  : "Enter your signer details, confirm authority and acceptance, then draw your signature."}
              </p>

              <div className="mt-5 space-y-4">
                <label className="block">
                  <span className="text-xs font-extrabold uppercase tracking-[0.16em] text-[#0A1547]/50">Full name</span>
                  <input
                    type="text"
                    value={typedName}
                    onChange={(event) => setTypedName(event.target.value)}
                    className="mt-2 w-full rounded-xl border border-[#0A1547]/10 bg-[#F8F9FD] px-4 py-3 text-sm font-semibold text-[#0A1547] outline-none focus-visible:ring-4 focus-visible:ring-[#A380F6]/25"
                    placeholder="Your full legal name"
                  />
                </label>

                <label className="block">
                  <span className="text-xs font-extrabold uppercase tracking-[0.16em] text-[#0A1547]/50">Title</span>
                  <input
                    type="text"
                    value={title}
                    onChange={(event) => setTitle(event.target.value)}
                    className="mt-2 w-full rounded-xl border border-[#0A1547]/10 bg-[#F8F9FD] px-4 py-3 text-sm font-semibold text-[#0A1547] outline-none focus-visible:ring-4 focus-visible:ring-[#A380F6]/25"
                    placeholder={agreement.signerRole === "ba" ? "alphaSource signer title" : "Owner, administrator, or authorized title"}
                  />
                </label>

                <label className="flex items-start gap-3 rounded-2xl border border-[#0A1547]/10 bg-[#F8F9FD] p-4">
                  <input
                    type="checkbox"
                    checked={authorityConfirmed}
                    onChange={(event) => setAuthorityConfirmed(event.target.checked)}
                    className="mt-1 h-4 w-4 accent-[#A380F6]"
                  />
                  <span className="text-sm font-semibold leading-6 text-[#0A1547]/72">
                    {agreement.signerRole === "ba"
                      ? "I confirm I am authorized to countersign this agreement for alphaSource Consulting."
                      : "I confirm I am authorized to sign this agreement on behalf of the Covered Entity."}
                  </span>
                </label>

                <label className="flex items-start gap-3 rounded-2xl border border-[#0A1547]/10 bg-[#F8F9FD] p-4">
                  <input
                    type="checkbox"
                    checked={accepted}
                    onChange={(event) => setAccepted(event.target.checked)}
                    className="mt-1 h-4 w-4 accent-[#A380F6]"
                  />
                  <span className="text-sm font-semibold leading-6 text-[#0A1547]/72">
                    {agreement.signerRole === "ba"
                      ? "I have reviewed and accept the BAA/Privacy Agreement for countersignature."
                      : "I have reviewed and accept the BAA/Privacy Agreement."}
                  </span>
                </label>

                <div className="rounded-2xl border border-[#0A1547]/10 bg-white p-4">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-[#0A1547]/50">Signature</p>
                    <button
                      type="button"
                      onClick={clearSignature}
                      className="rounded-lg border border-[#0A1547]/10 px-3 py-1.5 text-xs font-extrabold text-[#0A1547] transition hover:border-[#A380F6]/50"
                    >
                      Clear
                    </button>
                  </div>
                  <canvas
                    ref={canvasRef}
                    onPointerDown={handlePointerDown}
                    onPointerMove={handlePointerMove}
                    onPointerUp={stopDrawing}
                    onPointerCancel={stopDrawing}
                    onPointerLeave={stopDrawing}
                    className="mt-3 h-44 w-full touch-none rounded-xl border border-[#0A1547]/10 bg-white"
                    aria-label="Signature pad"
                  />
                  <p className="mt-2 text-xs font-semibold text-[#0A1547]/45">
                    Draw with a mouse, trackpad, finger, or stylus.
                  </p>
                </div>

                {submitError && (
                  <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-700">
                    {submitError}
                  </p>
                )}

                <button
                  type="button"
                  onClick={() => void handleSubmit()}
                  disabled={submitting}
                  className="w-full rounded-xl bg-[#A380F6] px-5 py-4 text-sm font-extrabold text-white transition hover:bg-[#906cf2] disabled:opacity-45"
                >
                  {submitting ? "Submitting..." : agreement.signerRole === "ba" ? "Submit Countersignature" : "Submit Signature"}
                </button>
              </div>
            </aside>
          </div>
        ) : (
          <StateCard title="Agreement unavailable" copy="This agreement session could not be loaded." />
        )}
      </div>
    </main>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-[#0A1547]/10 bg-[#F8F9FD] p-3">
      <p className="text-[11px] font-extrabold uppercase tracking-[0.14em] text-[#0A1547]/42">{label}</p>
      <p className="mt-1 text-sm font-black text-[#0A1547]">{value || "-"}</p>
    </div>
  );
}

function StateCard({ title, copy }: { title: string; copy: string }) {
  return (
    <section className="mx-auto max-w-xl rounded-3xl border border-[#0A1547]/10 bg-white p-8 text-center shadow-lg shadow-[#0A1547]/6">
      <div className="mx-auto h-3 w-24 rounded-full bg-[#A380F6]" />
      <h1 className="mt-5 text-2xl font-black text-[#0A1547]">{title}</h1>
      <p className="mt-3 text-sm font-semibold leading-6 text-[#0A1547]/62">{copy}</p>
    </section>
  );
}

function CompletionCard({ response }: { response: PublicAgreementSignResponse }) {
  const pendingBaSignature = response.agreement.status === "pending_ba_signature" || response.agreement.signerRole === "client";
  const signedLabel = pendingBaSignature ? response.agreement.clientSignedAt : response.agreement.signedAt;

  return (
    <section className="mx-auto max-w-2xl rounded-3xl border border-[#0A1547]/10 bg-white p-8 text-center shadow-lg shadow-[#0A1547]/6">
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[#02D99D]/15 text-2xl font-black text-[#0A1547]">
        OK
      </div>
      <h1 className="mt-5 text-3xl font-black text-[#0A1547]">
        {pendingBaSignature ? "Client signature recorded." : "Agreement signed successfully."}
      </h1>
      <p className="mt-3 text-sm font-semibold leading-6 text-[#0A1547]/62">
        {pendingBaSignature
          ? "alphaSource Consulting will countersign next. Final signed copies are sent after the BA signature is complete."
          : "A signed copy has been saved securely. alphaSource Consulting and the signer will receive access according to the agreement delivery settings."}
      </p>
      <p className="mt-4 text-xs font-bold uppercase tracking-[0.16em] text-[#0A1547]/42">
        {pendingBaSignature ? "Client signed" : "Signed"} {formatDateTime(signedLabel)}
      </p>
      {!pendingBaSignature && response.signedPdfUrl && (
        <a
          href={response.signedPdfUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-6 inline-flex rounded-xl bg-[#0A1547] px-5 py-3 text-sm font-extrabold text-white transition hover:bg-[#1A2460]"
        >
          Open signed agreement
        </a>
      )}
    </section>
  );
}
