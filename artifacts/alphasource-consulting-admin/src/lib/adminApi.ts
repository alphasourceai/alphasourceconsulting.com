import { getAdminApiBaseUrl } from "@/lib/env";
import type {
  AdminClientsResponse,
  AdminMeResponse,
  ClientBillingDetailResponse,
  SafeApiError,
} from "@/lib/types";

type RequestOptions = {
  token: string;
  signal?: AbortSignal;
};

type ClientsQuery = {
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
  const response = await fetch(`${getAdminApiBaseUrl()}${path}`, {
    method: "GET",
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${options.token}`,
    },
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
