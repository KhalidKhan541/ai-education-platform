import * as React from "react";

interface UseKeyPressOptions {
  target?: EventTarget | null;
  event?: "keydown" | "keyup";
  enabled?: boolean;
}

function useKeyPress(
  key: string | string[],
  callback: (event: KeyboardEvent) => void,
  options: UseKeyPressOptions = {}
): void {
  const { target = null, event = "keydown", enabled = true } = options;

  React.useEffect(() => {
    if (!enabled) return;

    const handleKeyPress = (e: KeyboardEvent) => {
      const keys = Array.isArray(key) ? key : [key];
      if (keys.includes(e.key)) {
        callback(e);
      }
    };

    const targetElement = target || document;
    targetElement.addEventListener(event, handleKeyPress as EventListener);

    return () => {
      targetElement.removeEventListener(event, handleKeyPress as EventListener);
    };
  }, [key, callback, target, event, enabled]);
}

function useKeyboardShortcuts(
  shortcuts: {
    keys: string[];
    callback: (event: KeyboardEvent) => void;
    description?: string;
  }[],
  options: UseKeyPressOptions = {}
): void {
  const { target = null, event = "keydown", enabled = true } = options;

  React.useEffect(() => {
    if (!enabled) return;

    const handleKeyPress = (e: KeyboardEvent) => {
      for (const shortcut of shortcuts) {
        const keys = Array.isArray(shortcut.keys)
          ? shortcut.keys
          : [shortcut.keys];
        const allPressed = keys.every((k) => {
          if (k.startsWith("ctrl+") || k.startsWith("cmd+")) {
            const modifier = k.startsWith("cmd+") ? "metaKey" : "ctrlKey";
            const key = k.replace("ctrl+", "").replace("cmd+", "");
            return e[modifier] && e.key.toLowerCase() === key.toLowerCase();
          }
          if (k.startsWith("shift+")) {
            const key = k.replace("shift+", "");
            return e.shiftKey && e.key.toLowerCase() === key.toLowerCase();
          }
          if (k.startsWith("alt+")) {
            const key = k.replace("alt+", "");
            return e.altKey && e.key.toLowerCase() === key.toLowerCase();
          }
          return e.key === k;
        });

        if (allPressed) {
          e.preventDefault();
          shortcut.callback(e);
          break;
        }
      }
    };

    const targetElement = target || document;
    targetElement.addEventListener(event, handleKeyPress as EventListener);

    return () => {
      targetElement.removeEventListener(event, handleKeyPress as EventListener);
    };
  }, [shortcuts, target, event, enabled]);
}

function useEscapeKey(
  callback: () => void,
  options?: { enabled?: boolean }
): void {
  useKeyPress("Escape", callback, { enabled: options?.enabled });
}

export { useKeyPress, useKeyboardShortcuts, useEscapeKey };
