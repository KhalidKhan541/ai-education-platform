import * as React from "react";

interface UseCopyToClipboardOptions {
  timeout?: number;
  onSuccess?: () => void;
  onError?: (error: Error) => void;
}

interface UseCopyToClipboardResult {
  copiedText: string | null;
  isCopied: boolean;
  copy: (text: string) => Promise<boolean>;
  reset: () => void;
}

function useCopyToClipboard(
  options: UseCopyToClipboardOptions = {}
): UseCopyToClipboardResult {
  const { timeout = 2000, onSuccess, onError } = options;
  const [copiedText, setCopiedText] = React.useState<string | null>(null);
  const [isCopied, setIsCopied] = React.useState(false);
  const timeoutRef = React.useRef<NodeJS.Timeout | null>(null);

  React.useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  const copy = React.useCallback(
    async (text: string): Promise<boolean> => {
      if (!navigator.clipboard) {
        // Fallback for older browsers
        try {
          const textArea = document.createElement("textarea");
          textArea.value = text;
          textArea.style.position = "fixed";
          textArea.style.left = "-999999px";
          textArea.style.top = "-999999px";
          document.body.appendChild(textArea);
          textArea.focus();
          textArea.select();

          const result = document.execCommand("copy");
          document.body.removeChild(textArea);

          if (result) {
            setCopiedText(text);
            setIsCopied(true);
            onSuccess?.();

            if (timeoutRef.current) {
              clearTimeout(timeoutRef.current);
            }

            timeoutRef.current = setTimeout(() => {
              setIsCopied(false);
              setCopiedText(null);
            }, timeout);

            return true;
          }

          throw new Error("Copy command failed");
        } catch (error) {
          onError?.(error instanceof Error ? error : new Error("Copy failed"));
          return false;
        }
      }

      try {
        await navigator.clipboard.writeText(text);
        setCopiedText(text);
        setIsCopied(true);
        onSuccess?.();

        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
        }

        timeoutRef.current = setTimeout(() => {
          setIsCopied(false);
          setCopiedText(null);
        }, timeout);

        return true;
      } catch (error) {
        onError?.(error instanceof Error ? error : new Error("Copy failed"));
        return false;
      }
    },
    [timeout, onSuccess, onError]
  );

  const reset = React.useCallback(() => {
    setCopiedText(null);
    setIsCopied(false);
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
  }, []);

  return { copiedText, isCopied, copy, reset };
}

export { useCopyToClipboard };
