"use client";

import { useState, useEffect, useCallback, useRef } from "react";

export interface UseFetchOptions<T> {
  immediate?: boolean;
  initialData?: T;
  onSuccess?: (data: T) => void;
  onError?: (error: Error) => void;
  retryCount?: number;
  retryDelay?: number;
  transform?: (data: unknown) => T;
}

export interface UseFetchResult<T> {
  data: T | undefined;
  error: Error | null;
  isLoading: boolean;
  isSuccess: boolean;
  isError: boolean;
  execute: (...args: unknown[]) => Promise<T | undefined>;
  reset: () => void;
  setData: (data: T | undefined) => void;
}

export function useFetch<T>(
  fetcher: (...args: unknown[]) => Promise<T>,
  options: UseFetchOptions<T> = {}
): UseFetchResult<T> {
  const {
    immediate = false,
    initialData,
    onSuccess,
    onError,
    retryCount = 0,
    retryDelay = 1000,
    transform,
  } = options;

  const [data, setData] = useState<T | undefined>(initialData);
  const [error, setError] = useState<Error | null>(null);
  const [isLoading, setIsLoading] = useState(immediate);

  const fetcherRef = useRef(fetcher);
  fetcherRef.current = fetcher;
  const mountedRef = useRef(true);
  const abortControllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    return () => {
      mountedRef.current = false;
      abortControllerRef.current?.abort();
    };
  }, []);

  const execute = useCallback(
    async (...args: unknown[]): Promise<T | undefined> => {
      abortControllerRef.current?.abort();
      abortControllerRef.current = new AbortController();

      setIsLoading(true);
      setError(null);

      let lastError: Error | null = null;

      for (let attempt = 0; attempt <= retryCount; attempt++) {
        try {
          const result = await fetcherRef.current(...args);

          if (!mountedRef.current) return undefined;

          const transformedResult = transform
            ? (transform(result as unknown) as T)
            : result;

          setData(transformedResult);
          setIsLoading(false);
          onSuccess?.(transformedResult);
          return transformedResult;
        } catch (err) {
          lastError =
            err instanceof Error ? err : new Error(String(err));

          if (attempt < retryCount) {
            await new Promise((resolve) =>
              setTimeout(resolve, retryDelay * (attempt + 1))
            );
          }
        }
      }

      if (mountedRef.current && lastError) {
        setError(lastError);
        setIsLoading(false);
        onError?.(lastError);
      }

      return undefined;
    },
    [retryCount, retryDelay, onSuccess, onError, transform]
  );

  const reset = useCallback(() => {
    setData(initialData);
    setError(null);
    setIsLoading(false);
  }, [initialData]);

  useEffect(() => {
    if (immediate) {
      execute();
    }
  }, [immediate]);

  return {
    data,
    error,
    isLoading,
    isSuccess: data !== undefined && error === null,
    isError: error !== null,
    execute,
    reset,
    setData,
  };
}

// Convenience hook for GET requests
export function useGet<T>(
  url: string | null,
  options: UseFetchOptions<T> & {
    headers?: Record<string, string>;
    params?: Record<string, string>;
  } = {}
): UseFetchResult<T> & { refetch: () => Promise<T | undefined> } {
  const { headers, params, ...fetchOptions } = options;

  const fetcher = useCallback(async () => {
    if (!url) throw new Error("URL is required");

    const searchParams = params
      ? "?" + new URLSearchParams(params).toString()
      : "";

    const response = await fetch(`${url}${searchParams}`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        ...headers,
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return response.json();
  }, [url, headers, params]);

  const result = useFetch<T>(fetcher, { ...fetchOptions, immediate: !!url });

  return {
    ...result,
    refetch: result.execute,
  };
}

// Convenience hook for POST requests
export function usePost<T, D = unknown>(
  url: string,
  options: UseFetchOptions<T> & {
    headers?: Record<string, string>;
  } = {}
): UseFetchResult<T> & {
  post: (data?: D) => Promise<T | undefined>;
} {
  const { headers, ...fetchOptions } = options;

  const fetcher = useCallback(
    async (data?: D) => {
      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...headers,
        },
        body: data ? JSON.stringify(data) : undefined,
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return response.json();
    },
    [url, headers]
  );

  const result = useFetch<T>(fetcher, fetchOptions);

  return {
    ...result,
    post: result.execute,
  };
}

// Convenience hook for mutation (POST/PUT/PATCH/DELETE)
export function useMutation<T, D = unknown>(
  fetcher: (data: D) => Promise<T>,
  options: UseFetchOptions<T> = {}
): UseFetchResult<T> & {
  mutate: (data: D) => Promise<T | undefined>;
} {
  const result = useFetch<T>(fetcher as (...args: unknown[]) => Promise<T>, options);

  return {
    ...result,
    mutate: result.execute,
  };
}

// Polling hook
export function usePolling<T>(
  fetcher: () => Promise<T>,
  interval: number,
  options: { enabled?: boolean; immediate?: boolean } = {}
): UseFetchResult<T> {
  const { enabled = true, immediate = true } = options;
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const result = useFetch<T>(fetcher, { immediate });

  useEffect(() => {
    if (!enabled || interval <= 0) return;

    if (immediate) {
      result.execute();
    }

    intervalRef.current = setInterval(() => {
      result.execute();
    }, interval);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [enabled, interval, immediate]);

  return result;
}

// Infinite scroll / load more
export function useInfiniteScroll<T>(
  fetcher: (page: number) => Promise<{ data: T[]; hasMore: boolean }>,
  options: {
    pageSize?: number;
    enabled?: boolean;
  } = {}
) {
  const { pageSize = 20, enabled = true } = options;
  const [data, setData] = useState<T[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const loadMore = useCallback(async () => {
    if (isLoading || !hasMore || !enabled) return;

    setIsLoading(true);
    try {
      const result = await fetcher(page);
      setData((prev) => [...prev, ...result.data]);
      setHasMore(result.hasMore);
      setPage((prev) => prev + 1);
    } catch (err) {
      setError(
        err instanceof Error ? err : new Error(String(err))
      );
    } finally {
      setIsLoading(false);
    }
  }, [page, isLoading, hasMore, enabled, fetcher]);

  const reset = useCallback(() => {
    setData([]);
    setPage(1);
    setHasMore(true);
    setError(null);
  }, []);

  useEffect(() => {
    if (enabled && page === 1) {
      loadMore();
    }
  }, [enabled]);

  return {
    data,
    isLoading,
    error,
    hasMore,
    loadMore,
    reset,
  };
}
