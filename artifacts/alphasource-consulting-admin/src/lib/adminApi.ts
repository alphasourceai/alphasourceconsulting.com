import { getAdminApiBaseUrl } from "@/lib/env";
import type {
  AdminAnalysisJobResponse,
  AdminAnalysisJobPromotionResponse,
  AdminClientOptionsResponse,
  AdminClientsResponse,
  AdminMeResponse,
  BillingOverviewResponse,
  BillingOverviewStatus,
  ClientBillingDetailResponse,
  CreateCheckoutSessionRequest,
  CreateCheckoutSessionResponse,
  SafeApiError,
} from "@/lib/types";

type RequestOptions = {
  token: string;
  signal?: AbortSignal;
  method?: "GET" | "POST";
  body?: unknown;
};

type ClientsQuery = {
  search?: string;
  limit?: number;
  offset?: number;
};

type ClientOptionsQuery = {
  search?: string;
  limit?: number;
};

type BillingOverviewQuery = {
  status?: BillingOverviewStatus;
  search?: string;
  limit?: number;
  offset?: number;
};

export class AdminApiError extends Error {
  readonly status: number;
  readonly code: string;

  constructor(message: string, status: number, code = "request_failed") {
    super(message);
    this.name = "AdminApiError";
    this.status = status;
    this.code = code;
  }
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
    message: safePayload?.error?.message || "The admin API request failed.",
  };
}

async function adminRequest<T>(path: string, options: RequestOptions): Promise<T> {
  const isFormData = options.body instanceof FormData;
  let requestBody: BodyInit | undefined;
  const headers: HeadersInit = {
    Accept: "application/json",
    Authorization: `Bearer ${options.token}`,
  };

  if (options.body !== undefined && !isFormData) {
    headers["Content-Type"] = "application/json";
  }

  if (options.body instanceof FormData) {
    requestBody = options.body;
  } else if (options.body !== undefined) {
    requestBody = JSON.stringify(options.body);
  }

  const response = await fetch(`${getAdminApiBaseUrl()}${path}`, {
    method: options.method ?? "GET",
    headers,
    body: requestBody,
    signal: options.signal,
  });
  const payload = await readJson(response);

  if (!response.ok) {
    const error = readErrorMessage(payload);
    throw new AdminApiError(error.message, response.status, error.code);
  }

  return payload as T;
}

export function getAdminMe(token: string, signal?: AbortSignal): Promise<AdminMeResponse> {
  return adminRequest<AdminMeResponse>("/api/admin/me", { token, signal });
}

export function getAdminClients(
  token: string,
  query: ClientsQuery = {},
  signal?: AbortSignal,
): Promise<AdminClientsResponse> {
  const params = new URLSearchParams();
  params.set("limit", String(query.limit ?? 25));
  params.set("offset", String(query.offset ?? 0));

  const search = query.search?.trim();
  if (search) {
    params.set("search", search);
  }

  return adminRequest<AdminClientsResponse>(`/api/admin/clients?${params.toString()}`, {
    token,
    signal,
  });
}

export function getClientOptions(
  token: string,
  query: ClientOptionsQuery = {},
  signal?: AbortSignal,
): Promise<AdminClientOptionsResponse> {
  const params = new URLSearchParams();
  params.set("limit", String(query.limit ?? 75));

  const search = query.search?.trim();
  if (search) {
    params.set("search", search);
  }

  return adminRequest<AdminClientOptionsResponse>(`/api/admin/client-options?${params.toString()}`, {
    token,
    signal,
  });
}

export function createFinancialIntakeJob(
  token: string,
  formData: FormData,
  signal?: AbortSignal,
): Promise<AdminAnalysisJobResponse> {
  return adminRequest<AdminAnalysisJobResponse>("/api/admin/analysis-jobs/financial-intake", {
    token,
    signal,
    method: "POST",
    body: formData,
  });
}

export function getAnalysisJob(
  token: string,
  jobId: string,
  signal?: AbortSignal,
): Promise<AdminAnalysisJobResponse> {
  return adminRequest<AdminAnalysisJobResponse>(`/api/admin/analysis-jobs/${encodeURIComponent(jobId)}`, {
    token,
    signal,
  });
}

export function cancelAnalysisJob(
  token: string,
  jobId: string,
  signal?: AbortSignal,
): Promise<AdminAnalysisJobResponse> {
  return adminRequest<AdminAnalysisJobResponse>(`/api/admin/analysis-jobs/${encodeURIComponent(jobId)}/cancel`, {
    token,
    signal,
    method: "POST",
  });
}

export function processFinancialAnalysisJob(
  token: string,
  jobId: string,
  signal?: AbortSignal,
): Promise<AdminAnalysisJobResponse> {
  return adminRequest<AdminAnalysisJobResponse>(`/api/admin/analysis-jobs/${encodeURIComponent(jobId)}/process-financial`, {
    token,
    signal,
    method: "POST",
  });
}

export function promoteFinancialAnalysisJob(
  token: string,
  jobId: string,
  signal?: AbortSignal,
): Promise<AdminAnalysisJobPromotionResponse> {
  return adminRequest<AdminAnalysisJobPromotionResponse>(`/api/admin/analysis-jobs/${encodeURIComponent(jobId)}/promote-financial`, {
    token,
    signal,
    method: "POST",
  });
}

export function getClientBillingDetail(
  token: string,
  email: string,
  signal?: AbortSignal,
): Promise<ClientBillingDetailResponse> {
  const params = new URLSearchParams();
  params.set("email", email);

  return adminRequest<ClientBillingDetailResponse>(`/api/admin/billing/client?${params.toString()}`, {
    token,
    signal,
  });
}

export function createCheckoutSession(
  token: string,
  payload: CreateCheckoutSessionRequest,
  signal?: AbortSignal,
): Promise<CreateCheckoutSessionResponse> {
  return adminRequest<CreateCheckoutSessionResponse>("/api/admin/billing/checkout-sessions", {
    token,
    signal,
    method: "POST",
    body: payload,
  });
}

export function getBillingOverview(
  token: string,
  query: BillingOverviewQuery = {},
  signal?: AbortSignal,
): Promise<BillingOverviewResponse> {
  const params = new URLSearchParams();
  params.set("status", query.status ?? "open");
  params.set("limit", String(query.limit ?? 10));
  params.set("offset", String(query.offset ?? 0));

  const search = query.search?.trim();
  if (search) {
    params.set("search", search);
  }

  return adminRequest<BillingOverviewResponse>(`/api/admin/billing/overview?${params.toString()}`, {
    token,
    signal,
  });
}
