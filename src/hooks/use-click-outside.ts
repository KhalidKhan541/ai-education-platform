"use client";

import { useEffect, useRef, useCallback } from "react";

type Event = MouseEvent | TouchEvent;

export function useClickOutside<T extends HTMLElement = HTMLElement>(
  handler: () => void,
  options: {
    enabled?: boolean;
    ignoreClicksOn?: string[];
    excludeRefs?: React.RefObject<HTMLElement>[];
  } = {}
): React.RefObject<T> {
  const ref = useRef<T>(null);
  const handlerRef = useRef(handler);
  handlerRef.current = handler;

  const { enabled = true, ignoreClicksOn = [], excludeRefs = [] } = options;

  useEffect(() => {
    if (!enabled) return;

    const listener = (event: Event) => {
      const target = event.target as Node;

      // Ignore if clicking on specified elements
      if (
        ignoreClicksOn.length > 0 &&
        target instanceof HTMLElement &&
        ignoreClicksOn.some(
          (selector) =>
            target.matches(selector) || target.closest(selector)
        )
      ) {
        return;
      }

      // Ignore if clicking on excluded refs
      if (
        excludeRefs.some(
          (excludeRef) =>
            excludeRef.current?.contains(target) || false
        )
      ) {
        return;
      }

      // Ignore if clicking inside the ref
      if (ref.current?.contains(target)) {
        return;
      }

      handlerRef.current();
    };

    document.addEventListener("mousedown", listener);
    document.addEventListener("touchstart", listener, { passive: true });

    return () => {
      document.removeEventListener("mousedown", listener);
      document.removeEventListener("touchstart", listener);
    };
  }, [enabled, ignoreClicksOn, excludeRefs]);

  return ref;
}

export function useClickOutsideMultiple(
  handler: () => void,
  refs: React.RefObject<HTMLElement>[],
  options: { enabled?: boolean } = {}
): void {
  const handlerRef = useRef(handler);
  handlerRef.current = handler;
  const { enabled = true } = options;

  useEffect(() => {
    if (!enabled) return;

    const listener = (event: Event) => {
      const target = event.target as Node;

      // Ignore if clicking inside any of the refs
      if (refs.some((ref) => ref.current?.contains(target))) {
        return;
      }

      handlerRef.current();
    };

    document.addEventListener("mousedown", listener);
    document.addEventListener("touchstart", listener, { passive: true });

    return () => {
      document.removeEventListener("mousedown", listener);
      document.removeEventListener("touchstart", listener);
    };
  }, [enabled, refs]);
}

export function useEscapeKey(
  handler: () => void,
  options: { enabled?: boolean; target?: EventTarget | null } = {}
): void {
  const handlerRef = useRef(handler);
  handlerRef.current = handler;
  const { enabled = true, target } = options;

  useEffect(() => {
    if (!enabled) return;

    const listener = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        handlerRef.current();
      }
    };

    const targetElement = target || document;
    targetElement.addEventListener("keydown", listener as EventListener);

    return () => {
      targetElement.removeEventListener("keydown", listener as EventListener);
    };
  }, [enabled, target]);
}

export function useClickOutsideRef<T extends HTMLElement = HTMLElement>(
  options: {
    enabled?: boolean;
    excludeRefs?: React.RefObject<HTMLElement>[];
  } = {}
): {
  ref: React.RefObject<T>;
  isOutside: boolean;
  setIsOutside: React.Dispatch<React.SetStateAction<boolean>>;
} {
  const ref = useRef<T>(null);
  const [isOutside, setIsOutside] = React.useState(false);
  const { enabled = true, excludeRefs = [] } = options;

  useEffect(() => {
    if (!enabled) return;

    const listener = (event: Event) => {
      const target = event.target as Node;

      if (excludeRefs.some((excludeRef) => excludeRef.current?.contains(target))) {
        setIsOutside(false);
        return;
      }

      setIsOutside(!ref.current?.contains(target));
    };

    document.addEventListener("mousedown", listener);
    document.addEventListener("touchstart", listener, { passive: true });

    return () => {
      document.removeEventListener("mousedown", listener);
      document.removeEventListener("touchstart", listener);
    };
  }, [enabled, excludeRefs]);

  return { ref, isOutside, setIsOutside };
}

// React import for useState in useClickOutsideRef
import React from "react";
