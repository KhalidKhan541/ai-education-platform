import * as React from "react";

interface UseFetchOptions<T> {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  body?: unknown;
  headers?: Record<string, string>;
  initialData?: T;
  onSuccess?: (data: T) => void;
  onError?: (error: Error) => void;
  enabled?: boolean;
}

interface UseFetchResult<T> {
  data: T | undefined;
  error: Error | null;
  loading: boolean;
  refetch: () => Promise<void>;
}

function useFetch<T>(
  url: string,
  options: UseFetchOptions<T> = {}
): UseFetchResult<T> {
  const {
    method = "GET",
    body,
    headers = {},
    initialData,
    onSuccess,
    onError,
    enabled = true,
  } = options;

  const [data, setData] = React.useState<T | undefined>(initialData);
  const [error, setError] = React.useState<Error | null>(null);
  const [loading, setLoading] = React.useState<boolean>(false);
  const abortControllerRef = React.useRef<AbortController | null>(null);

  const fetchData = React.useCallback(async () => {
    if (!enabled) return;

    setLoading(true);
    setError(null);

    abortControllerRef.current?.abort();
    abortControllerRef.current = new AbortController();

    try {
      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          ...headers,
        },
        body: body ? JSON.stringify(body) : undefined,
        signal: abortControllerRef.current.signal,
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      setData(result);
      onSuccess?.(result);
    } catch (err) {
      if (err instanceof Error && err.name !== "AbortError") {
        setError(err);
        onError?.(err);
      }
    } finally {
      setLoading(false);
    }
  }, [url, method, body, headers, enabled, onSuccess, onError]);

  React.useEffect(() => {
    fetchData();

    return () => {
      abortControllerRef.current?.abort();
    };
  }, [fetchData]);

  return { data, error, loading, refetch: fetchData };
}

function useMutation<TData, TVariables = unknown>(
  options: {
    mutationFn: (variables: TVariables) => Promise<TData>;
    onSuccess?: (data: TData, variables: TVariables) => void;
    onError?: (error: Error, variables: TVariables) => void;
    onSettled?: (
      data: TData | undefined,
      error: Error | null,
      variables: TVariables
    ) => void;
  }
) {
  const [data, setData] = React.useState<TData | undefined>(undefined);
  const [error, setError] = React.useState<Error | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [variables, setVariables] = React.useState<TVariables | undefined>(
    undefined
  );

  const mutate = React.useCallback(
    async (vars: TVariables) => {
      setLoading(true);
      setError(null);
      setVariables(vars);

      try {
        const result = await options.mutationFn(vars);
        setData(result);
        options.onSuccess?.(result, vars);
        options.onSettled?.(result, null, vars);
        return result;
      } catch (err) {
        const error =
          err instanceof Error ? err : new Error("Unknown error");
        setError(error);
        options.onError?.(error, vars);
        options.onSettled?.(undefined, error, vars);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [options]
  );

  const reset = React.useCallback(() => {
    setData(undefined);
    setError(null);
    setLoading(false);
    setVariables(undefined);
  }, []);

  return { data, error, loading, variables, mutate, reset };
}

export { useFetch, useMutation };
