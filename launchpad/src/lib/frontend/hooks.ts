"use client";

/**
 * Data-fetching hooks with explicit loading / error / empty handling.
 *
 * Demo fallback: when the backend can't answer (server down, or DB not
 * configured yet → 5xx), read-only views fall back to mock data and flag
 * `demo: true` so the UI can show a "datos de demo" hint. Mutations never
 * fall back — they surface the real error.
 *
 * Disable the fallback entirely (e.g. in production) with
 * NEXT_PUBLIC_DEMO_FALLBACK=false.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { ApiClientError } from "./api-client";

const DEMO_FALLBACK_ENABLED = process.env.NEXT_PUBLIC_DEMO_FALLBACK !== "false";

/** True for failures that mean "backend/DB unavailable", not user errors. */
export function isBackendUnavailable(err: unknown): boolean {
  return err instanceof ApiClientError ? err.status === 0 || err.status >= 500 : false;
}

export interface UseApiResult<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
  /** HTTP status of the failure (0 = network), null while ok/loading. */
  errorStatus: number | null;
  /** True when `data` comes from mock fallback instead of the API. */
  demo: boolean;
  refetch: () => void;
  /** Optimistic local updates (e.g. after an upvote). */
  setData: React.Dispatch<React.SetStateAction<T | null>>;
}

export function useApi<T>(
  fetcher: () => Promise<T>,
  options: {
    /**
     * Mock data used when the backend is unavailable (read-only views).
     * Return null/undefined when there is no mock equivalent (e.g. unknown
     * slug) — the hook then falls through to the error state.
     */
    fallback?: () => T | null | undefined;
    /** Re-run when these change. */
    deps?: unknown[];
    /** Skip fetching (e.g. waiting for session). */
    enabled?: boolean;
  } = {}
): UseApiResult<T> {
  const { fallback, deps = [], enabled = true } = options;
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(enabled);
  const [error, setError] = useState<string | null>(null);
  const [errorStatus, setErrorStatus] = useState<number | null>(null);
  const [demo, setDemo] = useState(false);
  const [tick, setTick] = useState(0);

  // Keep latest callbacks without retriggering the effect.
  const fetcherRef = useRef(fetcher);
  fetcherRef.current = fetcher;
  const fallbackRef = useRef(fallback);
  fallbackRef.current = fallback;

  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    setErrorStatus(null);

    fetcherRef
      .current()
      .then((result) => {
        if (cancelled) return;
        setData(result);
        setDemo(false);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        const fb = fallbackRef.current;
        if (fb && DEMO_FALLBACK_ENABLED && isBackendUnavailable(err)) {
          const mock = fb();
          if (mock !== null && mock !== undefined) {
            setData(mock);
            setDemo(true);
            return;
          }
        }
        setError(err instanceof Error ? err.message : "Algo salió mal.");
        setErrorStatus(err instanceof ApiClientError ? err.status : null);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, tick, ...deps]);

  const refetch = useCallback(() => setTick((t) => t + 1), []);

  return { data, loading, error, errorStatus, demo, refetch, setData };
}

/** Standard state for submit-style mutations. */
export interface MutationState {
  submitting: boolean;
  error: string | null;
}

export function useMutation<Args extends unknown[], R>(fn: (...args: Args) => Promise<R>) {
  const [state, setState] = useState<MutationState>({ submitting: false, error: null });

  const mutate = useCallback(
    async (...args: Args): Promise<R | null> => {
      setState({ submitting: true, error: null });
      try {
        const result = await fn(...args);
        setState({ submitting: false, error: null });
        return result;
      } catch (err) {
        setState({
          submitting: false,
          error: err instanceof Error ? err.message : "Algo salió mal.",
        });
        return null;
      }
    },
    [fn]
  );

  const clearError = useCallback(() => setState((s) => ({ ...s, error: null })), []);

  return { ...state, mutate, clearError };
}
