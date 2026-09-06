"use client";

import { useState, useCallback, useRef, useEffect } from "react";

export interface UseCopyToClipboardOptions {
  timeout?: number;
  onSuccess?: (text: string) => void;
  onError?: (error: Error) => void;
}

export interface UseCopyToClipboardResult {
  copiedText: string | null;
  isCopied: boolean;
  error: Error | null;
  copy: (text: string) => Promise<boolean>;
  reset: () => void;
}

export function useCopyToClipboard(
  options: UseCopyToClipboardOptions = {}
): UseCopyToClipboardResult {
  const { timeout = 2000, onSuccess, onError } = options;
  const [copiedText, setCopiedText] = useState<string | null>(null);
  const [isCopied, setIsCopied] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  const copy = useCallback(
    async (text: string): Promise<boolean> => {
      try {
        // Try modern clipboard API first
        if (navigator.clipboard && window.isSecureContext) {
          await navigator.clipboard.writeText(text);
        } else {
          // Fallback for non-secure contexts
          const textarea = document.createElement("textarea");
          textarea.value = text;
          textarea.style.position = "fixed";
          textarea.style.left = "-9999px";
          textarea.style.top = "-9999px";
          document.body.appendChild(textarea);
          textarea.focus();
          textarea.select();
          const success = document.execCommand("copy");
          document.body.removeChild(textarea);
          if (!success) {
            throw new Error("Copy command failed");
          }
        }

        setCopiedText(text);
        setIsCopied(true);
        setError(null);
        onSuccess?.(text);

        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
        }

        timeoutRef.current = setTimeout(() => {
          setIsCopied(false);
          setCopiedText(null);
        }, timeout);

        return true;
      } catch (err) {
        const error =
          err instanceof Error ? err : new Error(String(err));
        setError(error);
        setIsCopied(false);
        setCopiedText(null);
        onError?.(error);
        return false;
      }
    },
    [timeout, onSuccess, onError]
  );

  const reset = useCallback(() => {
    setCopiedText(null);
    setIsCopied(false);
    setError(null);
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
  }, []);

  return {
    copiedText,
    isCopied,
    error,
    copy,
    reset,
  };
}

// Copy specific types of content
export function useCopyLink(options: UseCopyToClipboardOptions = {}) {
  const { copy, ...rest } = useCopyToClipboard(options);

  const copyLink = useCallback(
    async (url: string): Promise<boolean> => {
      return copy(url);
    },
    [copy]
  );

  const copyCurrentPage = useCallback(async (): Promise<boolean> => {
    return copy(window.location.href);
  }, [copy]);

  return { ...rest, copyLink, copyCurrentPage };
}

export function useCopyCode(options: UseCopyToClipboardOptions = {}) {
  const { copy, ...rest } = useCopyToClipboard(options);

  const copyCode = useCallback(
    async (code: string, language?: string): Promise<boolean> => {
      // Strip HTML tags if present
      const cleanCode = code
        .replace(/<[^>]*>/g, "")
        .replace(/&amp;/g, "&")
        .replace(/&lt;/g, "<")
        .replace(/&gt;/g, ">")
        .replace(/&quot;/g, '"')
        .replace(/&#039;/g, "'");
      return copy(cleanCode);
    },
    [copy]
  );

  return { ...rest, copyCode };
}

export function useCopyEmail(options: UseCopyToClipboardOptions = {}) {
  const { copy, ...rest } = useCopyToClipboard(options);

  const copyEmail = useCallback(
    async (email: string): Promise<boolean> => {
      return copy(email);
    },
    [copy]
  );

  return { ...rest, copyEmail };
}

// Share API wrapper
export interface UseShareOptions {
  title?: string;
  text?: string;
  url?: string;
  files?: File[];
}

export function useShare() {
  const [isSupported, setIsSupported] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    setIsSupported(typeof navigator !== "undefined" && !!navigator.share);
  }, []);

  const share = useCallback(async (options: UseShareOptions): Promise<boolean> => {
    if (!navigator.share) {
      setError(new Error("Web Share API is not supported"));
      return false;
    }

    try {
      await navigator.share({
        title: options.title,
        text: options.text,
        url: options.url,
        files: options.files,
      });
      setError(null);
      return true;
    } catch (err) {
      if ((err as Error).name === "AbortError") {
        // User cancelled - not an error
        return false;
      }
      const error = err instanceof Error ? err : new Error(String(err));
      setError(error);
      return false;
    }
  }, []);

  return { share, isSupported, error };
}
