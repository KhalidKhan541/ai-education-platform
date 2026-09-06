import axios, {
  AxiosInstance,
  AxiosRequestConfig,
  AxiosResponse,
  AxiosError,
  InternalAxiosRequestConfig,
} from "axios";

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000/api";
const TIMEOUT = 30000;
const MAX_RETRIES = 3;
const RETRY_DELAY = 1000;

export interface ApiResponse<T = unknown> {
  data: T;
  success: boolean;
  message?: string;
  timestamp: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  meta: {
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

export interface ApiError {
  message: string;
  code: string;
  status: number;
  details?: Record<string, string[]>;
  timestamp: string;
}

export interface RequestConfig extends AxiosRequestConfig {
  retry?: number;
  retryDelay?: number;
  silent?: boolean;
}

let httpClient: AxiosInstance | null = null;
let accessToken: string | null = null;

function getHttpClient(): AxiosInstance {
  if (httpClient) return httpClient;

  httpClient = axios.create({
    baseURL: BASE_URL,
    timeout: TIMEOUT,
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
  });

  // Request interceptor
  httpClient.interceptors.request.use(
    (config: InternalAxiosRequestConfig) => {
      if (accessToken && config.headers) {
        config.headers.Authorization = `Bearer ${accessToken}`;
      }
      return config;
    },
    (error) => Promise.reject(error)
  );

  // Response interceptor
  httpClient.interceptors.response.use(
    (response: AxiosResponse) => response,
    async (error: AxiosError) => {
      const config = error.config as RequestConfig & { _retry?: number };

      // Retry logic
      if (
        config &&
        !config._retry &&
        error.response?.status !== 401 &&
        error.response?.status !== 403 &&
        error.response?.status !== 404
      ) {
        const maxRetries = config.retry ?? MAX_RETRIES;
        const retryDelay = config.retryDelay ?? RETRY_DELAY;
        config._retry = (config._retry || 0) + 1;

        if (config._retry <= maxRetries) {
          const delay = retryDelay * Math.pow(2, config._retry - 1);
          await new Promise((resolve) => setTimeout(resolve, delay));
          return httpClient!.request(config);
        }
      }

      // Token refresh on 401
      if (error.response?.status === 401 && accessToken) {
        const refreshToken = getRefreshToken();
        if (refreshToken) {
          try {
            const response = await axios.post(`${BASE_URL}/auth/refresh`, {
              refreshToken,
            });
            const { accessToken: newToken } = response.data.data;
            setAccessToken(newToken);

            if (config) {
              config.headers = config.headers || {};
              config.headers.Authorization = `Bearer ${newToken}`;
              return httpClient!.request(config);
            }
          } catch {
            clearAccessToken();
            if (typeof window !== "undefined") {
              window.dispatchEvent(new CustomEvent("auth:logout"));
            }
          }
        }
      }

      return Promise.reject(error);
    }
  );

  return httpClient;
}

function getRefreshToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("refreshToken");
}

export function setAccessToken(token: string | null): void {
  accessToken = token;
}

export function clearAccessToken(): void {
  accessToken = null;
}

function formatError(error: AxiosError): ApiError {
  if (error.response?.data) {
    const data = error.response.data as Record<string, unknown>;
    return {
      message:
        (data.message as string) || error.message || "An error occurred",
      code: (data.code as string) || "UNKNOWN_ERROR",
      status: error.response.status,
      details: data.details as Record<string, string[]> | undefined,
      timestamp: new Date().toISOString(),
    };
  }

  if (error.code === "ECONNABORTED") {
    return {
      message: "Request timed out. Please try again.",
      code: "TIMEOUT",
      status: 408,
      timestamp: new Date().toISOString(),
    };
  }

  if (!error.response) {
    return {
      message: "Network error. Please check your connection.",
      code: "NETWORK_ERROR",
      status: 0,
      timestamp: new Date().toISOString(),
    };
  }

  return {
    message: error.message || "An unexpected error occurred",
    code: "UNKNOWN_ERROR",
    status: error.response?.status || 500,
    timestamp: new Date().toISOString(),
  };
}

// Typed request functions
export async function httpGet<T>(
  url: string,
  config?: RequestConfig
): Promise<T> {
  const client = getHttpClient();
  const response = await client.get<ApiResponse<T>>(url, config);
  return response.data.data;
}

export async function httpPost<T>(
  url: string,
  data?: unknown,
  config?: RequestConfig
): Promise<T> {
  const client = getHttpClient();
  const response = await client.post<ApiResponse<T>>(url, data, config);
  return response.data.data;
}

export async function httpPut<T>(
  url: string,
  data?: unknown,
  config?: RequestConfig
): Promise<T> {
  const client = getHttpClient();
  const response = await client.put<ApiResponse<T>>(url, data, config);
  return response.data.data;
}

export async function httpPatch<T>(
  url: string,
  data?: unknown,
  config?: RequestConfig
): Promise<T> {
  const client = getHttpClient();
  const response = await client.patch<ApiResponse<T>>(url, data, config);
  return response.data.data;
}

export async function httpDelete<T>(
  url: string,
  config?: RequestConfig
): Promise<T> {
  const client = getHttpClient();
  const response = await client.delete<ApiResponse<T>>(url, config);
  return response.data.data;
}

export async function httpGetPaginated<T>(
  url: string,
  params?: Record<string, unknown>,
  config?: RequestConfig
): Promise<PaginatedResponse<T>> {
  const client = getHttpClient();
  const response = await client.get<ApiResponse<PaginatedResponse<T>>>(url, {
    ...config,
    params: { ...config?.params, ...params },
  });
  return response.data.data;
}

// File upload
export async function uploadFile<T>(
  url: string,
  file: File | Blob,
  fieldName = "file",
  additionalData?: Record<string, unknown>,
  onProgress?: (progress: number) => void
): Promise<T> {
  const client = getHttpClient();
  const formData = new FormData();
  formData.append(fieldName, file);

  if (additionalData) {
    for (const [key, value] of Object.entries(additionalData)) {
      formData.append(key, String(value));
    }
  }

  const response = await client.post<ApiResponse<T>>(url, formData, {
    headers: { "Content-Type": "multipart/form-data" },
    onUploadProgress: (progressEvent) => {
      if (onProgress && progressEvent.total) {
        onProgress(Math.round((progressEvent.loaded * 100) / progressEvent.total));
      }
    },
  });

  return response.data.data;
}

// Download file
export async function downloadFile(
  url: string,
  filename: string
): Promise<void> {
  const client = getHttpClient();
  const response = await client.get(url, { responseType: "blob" });
  const blob = new Blob([response.data]);
  const downloadUrl = window.URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = downloadUrl;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(downloadUrl);
}

// Request cancellation
export function createAbortController(): AbortController {
  return new AbortController();
}

// Health check
export async function healthCheck(): Promise<boolean> {
  try {
    const client = getHttpClient();
    await client.get("/health", { timeout: 5000 });
    return true;
  } catch {
    return false;
  }
}

// Batch requests
export async function batchRequests<T>(
  requests: Array<() => Promise<T>>
): Promise<(T | Error)[]> {
  const results = await Promise.allSettled(requests.map((fn) => fn()));
  return results.map((result) =>
    result.status === "fulfilled" ? result.value : new Error(result.reason?.message || "Request failed")
  );
}

// Interceptors
export function addRequestInterceptor(
  onFulfilled: (config: InternalAxiosRequestConfig) => InternalAxiosRequestConfig | Promise<InternalAxiosRequestConfig>,
  onRejected?: (error: unknown) => unknown
): number {
  const client = getHttpClient();
  return client.interceptors.request.use(onFulfilled, onRejected);
}

export function addResponseInterceptor(
  onFulfilled: (response: AxiosResponse) => AxiosResponse | Promise<AxiosResponse>,
  onRejected?: (error: unknown) => unknown
): number {
  const client = getHttpClient();
  return client.interceptors.response.use(onFulfilled, onRejected);
}

export { formatError, getHttpClient };
