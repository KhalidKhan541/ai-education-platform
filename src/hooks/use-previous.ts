"use client";

import { useEffect, useRef, useState } from "react";

export function usePrevious<T>(value: T): T | undefined {
  const ref = useRef<T | undefined>(undefined);

  useEffect(() => {
    ref.current = value;
  }, [value]);

  return ref.current;
}

export function usePreviousDistinct<T>(
  value: T,
  compare?: (a: T, b: T) => boolean
): T | undefined {
  const ref = useRef<T | undefined>(undefined);
  const currentRef = useRef<T>(value);

  useEffect(() => {
    if (compare) {
      if (!compare(currentRef.current, value)) {
        ref.current = currentRef.current;
        currentRef.current = value;
      }
    } else {
      if (currentRef.current !== value) {
        ref.current = currentRef.current;
        currentRef.current = value;
      }
    }
  }, [value, compare]);

  return ref.current;
}

export function usePreviousWithInitial<T>(initialValue: T): [T, T | undefined] {
  const [value, setValue] = useState<T>(initialValue);
  const previousValue = usePrevious(value);

  return [value, previousValue];
}

export function useChangeDetection<T>(
  value: T,
  callback: (current: T, previous: T | undefined) => void
): void {
  const previousValue = usePrevious(value);
  const callbackRef = useRef(callback);
  callbackRef.current = callback;

  useEffect(() => {
    callbackRef.current(value, previousValue);
  }, [value, previousValue]);
}

export function useHasChanged<T>(value: T): boolean {
  const previousValue = usePrevious(value);
  return previousValue !== value;
}

export function useHasBeenMounted(): boolean {
  const hasMounted = useRef(false);

  useEffect(() => {
    hasMounted.current = true;
  }, []);

  return hasMounted.current;
}

export function useFirstMount(): boolean {
  const isFirst = useRef(true);

  useEffect(() => {
    isFirst.current = false;
  }, []);

  return isFirst.current;
}

export function useUpdateCount(): number {
  const [count, setCount] = useState(0);

  useEffect(() => {
    setCount((c) => c + 1);
  });

  return count;
}

export function useRerender(): () => void {
  const [, setCount] = useState(0);
  return () => setCount((c) => c + 1);
}

export function useLatest<T>(value: T): React.MutableRefObject<T> {
  const ref = useRef(value);
  ref.current = value;
  return ref;
}

export function useConstant<T>(fn: () => T): T {
  const ref = useRef<{ value: T } | null>(null);
  if (ref.current === null) {
    ref.current = { value: fn() };
  }
  return ref.current.value;
}

export function useIsFirstRender(): boolean {
  const isFirst = useRef(true);

  if (isFirst.current) {
    isFirst.current = false;
    return true;
  }

  return false;
}

export function useIsMounted(): () => boolean {
  const isMountedRef = useRef(false);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  return () => isMountedRef.current;
}

export function useIsFirstUpdate(): boolean {
  const isFirstUpdate = useRef(true);

  useEffect(() => {
    if (isFirstUpdate.current) {
      isFirstUpdate.current = false;
    }
  }, []);

  return isFirstUpdate.current;
}

// React import for usePreviousWithInitial
import type React from "react";
