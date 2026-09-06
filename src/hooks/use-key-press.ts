"use client";

import { useEffect, useRef, useCallback, useState } from "react";

export interface KeyBinding {
  key: string;
  ctrlKey?: boolean;
  shiftKey?: boolean;
  altKey?: boolean;
  metaKey?: boolean;
  preventDefault?: boolean;
}

export function useKeyPress(
  keyBinding: KeyBinding | string,
  callback: (event: KeyboardEvent) => void,
  options: { enabled?: boolean; target?: EventTarget | null } = {}
): void {
  const callbackRef = useRef(callback);
  callbackRef.current = callback;
  const { enabled = true, target } = options;

  useEffect(() => {
    if (!enabled) return;

    const binding: KeyBinding =
      typeof keyBinding === "string"
        ? { key: keyBinding }
        : keyBinding;

    const handler = (event: KeyboardEvent) => {
      if (event.key !== binding.key) return;
      if (binding.ctrlKey && !event.ctrlKey) return;
      if (binding.shiftKey && !event.shiftKey) return;
      if (binding.altKey && !event.altKey) return;
      if (binding.metaKey && !event.metaKey) return;

      // Skip if modifier is pressed but not expected
      if (!binding.ctrlKey && event.ctrlKey) return;
      if (!binding.shiftKey && event.shiftKey) return;
      if (!binding.altKey && event.altKey) return;
      if (!binding.metaKey && event.metaKey) return;

      if (binding.preventDefault !== false) {
        event.preventDefault();
      }

      callbackRef.current(event);
    };

    const targetElement = target || document;
    targetElement.addEventListener("keydown", handler as EventListener);

    return () => {
      targetElement.removeEventListener("keydown", handler as EventListener);
    };
  }, [keyBinding, enabled, target]);
}

export function useMultiKeyPress(
  bindings: Array<KeyBinding | string>,
  callback: (event: KeyboardEvent, index: number) => void,
  options: { enabled?: boolean; target?: EventTarget | null } = {}
): void {
  const callbackRef = useRef(callback);
  callbackRef.current = callback;
  const { enabled = true, target } = options;

  useEffect(() => {
    if (!enabled) return;

    const handler = (event: KeyboardEvent) => {
      for (let i = 0; i < bindings.length; i++) {
        const binding: KeyBinding =
          typeof bindings[i] === "string"
            ? { key: bindings[i] }
            : bindings[i];

        if (event.key !== binding.key) continue;
        if (binding.ctrlKey && !event.ctrlKey) continue;
        if (binding.shiftKey && !event.shiftKey) continue;
        if (binding.altKey && !event.altKey) continue;
        if (binding.metaKey && !event.metaKey) continue;

        if (binding.preventDefault !== false) {
          event.preventDefault();
        }

        callbackRef.current(event, i);
        break;
      }
    };

    const targetElement = target || document;
    targetElement.addEventListener("keydown", handler as EventListener);

    return () => {
      targetElement.removeEventListener("keydown", handler as EventListener);
    };
  }, [bindings, enabled, target]);
}

export function useKeyCombo(
  keys: string[],
  callback: () => void,
  options: {
    enabled?: boolean;
    timeout?: number;
    target?: EventTarget | null;
  } = {}
): void {
  const callbackRef = useRef(callback);
  callbackRef.current = callback;
  const { enabled = true, timeout = 500, target } = options;
  const pressedKeys = useRef<string[]>([]);
  const lastPressTime = useRef<number>(0);

  useEffect(() => {
    if (!enabled) return;

    const handler = (event: KeyboardEvent) => {
      const now = Date.now();

      // Reset if too much time has passed
      if (now - lastPressTime.current > timeout) {
        pressedKeys.current = [];
      }

      lastPressTime.current = now;

      if (!pressedKeys.current.includes(event.key)) {
        pressedKeys.current.push(event.key);
      }

      // Check if all required keys are pressed
      const allPressed = keys.every((key) =>
        pressedKeys.current.includes(key)
      );

      if (allPressed) {
        event.preventDefault();
        callbackRef.current();
        pressedKeys.current = [];
      }
    };

    const handleReset = () => {
      pressedKeys.current = [];
    };

    const targetElement = target || document;
    targetElement.addEventListener("keydown", handler as EventListener);
    targetElement.addEventListener("keyup", handleReset as EventListener);

    return () => {
      targetElement.removeEventListener("keydown", handler as EventListener);
      targetElement.removeEventListener("keyup", handleReset as EventListener);
    };
  }, [keys, enabled, timeout, target]);
}

export function useKeyboardNavigation<T>(
  items: T[],
  options: {
    onSelect?: (item: T, index: number) => void;
    onHighlight?: (index: number) => void;
    loop?: boolean;
    horizontal?: boolean;
    enabled?: boolean;
  } = {}
) {
  const {
    onSelect,
    onHighlight,
    loop = true,
    horizontal = false,
    enabled = true,
  } = options;

  const [highlightedIndex, setHighlightedIndex] = useState(-1);

  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (!enabled) return;

      const isNext = horizontal ? event.key === "ArrowRight" : event.key === "ArrowDown";
      const isPrev = horizontal ? event.key === "ArrowLeft" : event.key === "ArrowUp";

      if (isNext) {
        event.preventDefault();
        setHighlightedIndex((prev) => {
          const next = prev + 1;
          if (next >= items.length) {
            return loop ? 0 : prev;
          }
          return next;
        });
      } else if (isPrev) {
        event.preventDefault();
        setHighlightedIndex((prev) => {
          const next = prev - 1;
          if (next < 0) {
            return loop ? items.length - 1 : prev;
          }
          return next;
        });
      } else if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        if (highlightedIndex >= 0 && highlightedIndex < items.length) {
          onSelect?.(items[highlightedIndex], highlightedIndex);
        }
      } else if (event.key === "Home") {
        event.preventDefault();
        setHighlightedIndex(0);
      } else if (event.key === "End") {
        event.preventDefault();
        setHighlightedIndex(items.length - 1);
      }
    },
    [items, highlightedIndex, onSelect, loop, horizontal, enabled]
  );

  useEffect(() => {
    if (!enabled) return;

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown, enabled]);

  useEffect(() => {
    onHighlight?.(highlightedIndex);
  }, [highlightedIndex, onHighlight]);

  const resetHighlight = useCallback(() => {
    setHighlightedIndex(-1);
  }, []);

  return {
    highlightedIndex,
    setHighlightedIndex,
    resetHighlight,
  };
}
