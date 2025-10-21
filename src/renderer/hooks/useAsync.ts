import { useCallback, useRef, useState } from "react";

/**
 * Small helper hook to manage loading/error state for async tasks.
 * It standardizes try/catch/finally and exposes a stable `run` function.
 */
export function useAsyncTask() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const mounted = useRef(true);

  // Track mounted to avoid state updates on unmounted components
  // (can happen with rapid route changes)
  const setSafeState = useCallback(<T extends any>(setter: (v: T) => void, value: T) => {
    if (mounted.current) setter(value);
  }, []);

  const run = useCallback(async <T>(fn: () => Promise<T>): Promise<T> => {
    setSafeState(setLoading, true);
    setSafeState(setError, null);
    try {
      return await fn();
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setSafeState(setError, message);
      throw err;
    } finally {
      setSafeState(setLoading, false);
    }
  }, [setSafeState]);

  const reset = useCallback(() => {
    setSafeState(setLoading, false);
    setSafeState(setError, null);
  }, [setSafeState]);

  const setMounted = useCallback((is: boolean) => {
    mounted.current = is;
  }, []);

  return { loading, error, run, reset, setMounted } as const;
}

/**
 * Wraps ContextBridge calls: ensures a uniform contract.
 * - Returns the `data` when `success` is true
 * - Throws an Error with the provided message otherwise
 */
export async function callIpc<T>(call: () => Promise<{ success: boolean; data?: T; error?: string }>, fallbackError?: string): Promise<T> {
  const res = await call();
  if (res.success) {
    return res.data as T;
  }
  throw new Error(res.error || fallbackError || "IPC call failed");
}

