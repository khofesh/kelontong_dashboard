import type { ApiEnvelope, ApiErrorDetail } from "~/types/api";

export type Fetcher = (
  url: string,
  options?: Record<string, unknown>,
) => Promise<unknown>;

export interface HttpClientOptions {
  onAuthFailure?: () => void;
}

export interface RequestOptions {
  method?: "GET" | "POST" | "PATCH" | "DELETE";
  query?: Record<string, unknown>;
  body?: unknown;
}

export class ApiError extends Error {
  readonly status: number;
  readonly code: string;
  readonly details?: ApiErrorDetail[];

  constructor(
    status: number,
    code: string,
    message: string,
    details?: ApiErrorDetail[],
  ) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

export interface HttpClient {
  request<T>(path: string, options?: RequestOptions): Promise<ApiEnvelope<T>>;
  get<T>(
    path: string,
    query?: Record<string, unknown>,
  ): Promise<ApiEnvelope<T>>;
  post<T>(path: string, body?: unknown): Promise<ApiEnvelope<T>>;
  patch<T>(path: string, body?: unknown): Promise<ApiEnvelope<T>>;
  delete(path: string): Promise<void>;
}

interface ErrorPayload {
  error?: {
    code?: string;
    message?: string;
    details?: ApiErrorDetail[];
  };
}

interface ErrorLike {
  status?: number;
  statusCode?: number;
  response?: { status?: number; _data?: ErrorPayload };
  data?: ErrorPayload | string;
  message?: string;
}

const NO_REFRESH_PATHS = [
  "/auth/login",
  "/auth/register",
  "/auth/refresh",
  "/auth/logout",
];

export function normalizeApiError(error: unknown): ApiError {
  if (error instanceof ApiError) return error;

  const candidate = (error ?? {}) as ErrorLike;
  const status =
    candidate.response?.status ?? candidate.status ?? candidate.statusCode ?? 0;
  const body =
    (typeof candidate.data === "object" ? candidate.data : undefined) ??
    candidate.response?._data;

  const payload = body?.error;
  const code =
    payload?.code ?? (status === 0 ? "NETWORK_ERROR" : "UNKNOWN_ERROR");
  const message =
    payload?.message ??
    (status === 0
      ? "Tidak dapat terhubung ke server. Periksa koneksi Anda."
      : "Terjadi kesalahan pada server");

  return new ApiError(status, code, message, payload?.details);
}

function unwrap<T>(result: unknown): ApiEnvelope<T> {
  if (result && typeof result === "object" && "data" in result) {
    return result as ApiEnvelope<T>;
  }
  return { data: result as T };
}

export function createHttp(
  fetcher: Fetcher,
  baseUrl: string,
  options: HttpClientOptions = {},
): HttpClient {
  let refreshPromise: Promise<void> | null = null;

  const refreshSession = (): Promise<void> => {
    if (!refreshPromise) {
      refreshPromise = fetcher(`${baseUrl}/auth/refresh`, {
        method: "POST",
        credentials: "include",
      })
        .then(() => undefined)
        .finally(() => {
          refreshPromise = null;
        });
    }
    return refreshPromise;
  };

  const request = async <T>(
    path: string,
    requestOptions: RequestOptions = {},
    isRetry = false,
  ): Promise<ApiEnvelope<T>> => {
    try {
      const result = await fetcher(`${baseUrl}${path}`, {
        method: requestOptions.method ?? "GET",
        query: requestOptions.query,
        body: requestOptions.body,
        credentials: "include",
        headers: { Accept: "application/json" },
      });
      return unwrap<T>(result);
    } catch (error) {
      const apiError = normalizeApiError(error);
      const canRefresh =
        apiError.status === 401 && !isRetry && !NO_REFRESH_PATHS.includes(path);

      if (canRefresh) {
        try {
          await refreshSession();
        } catch {
          options.onAuthFailure?.();
          throw apiError;
        }

        return request<T>(path, requestOptions, true);
      }
      if (apiError.status === 401 && isRetry) options.onAuthFailure?.();
      throw apiError;
    }
  };

  return {
    request,
    get<T>(path: string, query?: Record<string, unknown>) {
      return request<T>(path, { method: "GET", query });
    },
    post<T>(path: string, body?: unknown) {
      return request<T>(path, { method: "POST", body });
    },
    patch<T>(path: string, body?: unknown) {
      return request<T>(path, { method: "PATCH", body });
    },
    async delete(path: string) {
      await request<undefined>(path, { method: "DELETE" });
    },
  };
}
