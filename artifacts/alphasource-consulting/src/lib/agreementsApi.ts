export type PublicAgreementSession = {
  id: string;
  documentType: string;
  status: string;
  signerRole: "client" | "ba" | string;
  clientLegalName: string;
  effectiveDate: string | null;
  signerName: string | null;
  signerEmail: string | null;
  signerTitle: string | null;
  expiresAt: string | null;
  sentAt: string | null;
  openedAt: string | null;
  draftPdfUrl: string | null;
  signedPdfUrl: string | null;
};

export type PublicAgreementSessionResponse = {
  ok: true;
  agreement: PublicAgreementSession;
  expiresInSeconds: number;
};

export type PublicAgreementSignRequest = {
  token: string;
  typedSignerName: string;
  signerTitle: string;
  authorityConfirmed: boolean;
  accepted: boolean;
  signatureImageDataUrl: string;
};

export type PublicAgreementSignResponse = {
  ok: true;
  agreement: {
    id: string;
    status: string;
    signerRole: "client" | "ba" | string;
    signedAt: string | null;
    clientSignedAt?: string | null;
    baSignedAt?: string | null;
    signerName: string | null;
    signerTitle: string | null;
  };
  signedPdfUrl: string | null;
  expiresInSeconds: number;
};

type SafeApiError = {
  error?: {
    code?: string;
    message?: string;
  };
  detail?: string;
  message?: string;
};

export class AgreementApiError extends Error {
  readonly status: number;
  readonly code: string;

  constructor(message: string, status: number, code = "request_failed") {
    super(message);
    this.name = "AgreementApiError";
    this.status = status;
    this.code = code;
  }
}

function normalizeApiBaseUrl(value: unknown): string {
  return String(value || "").trim().replace(/\/$/, "");
}

function getAgreementsApiBaseUrl(): string {
  return (
    normalizeApiBaseUrl(import.meta.env.VITE_AGREEMENTS_API_BASE_URL) ||
    normalizeApiBaseUrl(import.meta.env.VITE_ADMIN_API_BASE_URL)
  );
}

async function readJson(response: Response): Promise<unknown> {
  try {
    return await response.json();
  } catch {
    return null;
  }
}

function readErrorMessage(payload: unknown): { code: string; message: string } {
  const safePayload = payload as SafeApiError | null;
  return {
    code: safePayload?.error?.code || "request_failed",
    message:
      safePayload?.error?.message ||
      safePayload?.detail ||
      safePayload?.message ||
      "The agreement request failed.",
  };
}

async function agreementRequest<T>(
  path: string,
  body: unknown,
  signal?: AbortSignal,
): Promise<T> {
  const apiBaseUrl = getAgreementsApiBaseUrl();
  if (!apiBaseUrl) {
    throw new AgreementApiError(
      "Agreement signing is not configured. Please contact alphaSource Consulting.",
      0,
      "missing_api_base_url",
    );
  }

  const response = await fetch(`${apiBaseUrl}${path}`, {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    credentials: "omit",
    body: JSON.stringify(body),
    signal,
  });

  const payload = await readJson(response);
  if (!response.ok) {
    const error = readErrorMessage(payload);
    throw new AgreementApiError(error.message, response.status, error.code);
  }

  return payload as T;
}

export function createAgreementSession(
  token: string,
  signal?: AbortSignal,
): Promise<PublicAgreementSessionResponse> {
  return agreementRequest<PublicAgreementSessionResponse>("/api/agreements/session", { token }, signal);
}

export function signAgreement(
  payload: PublicAgreementSignRequest,
  signal?: AbortSignal,
): Promise<PublicAgreementSignResponse> {
  return agreementRequest<PublicAgreementSignResponse>("/api/agreements/sign", payload, signal);
}
