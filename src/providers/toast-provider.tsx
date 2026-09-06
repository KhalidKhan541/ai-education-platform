"use client";

import React, { createContext, useContext, useCallback, useState, useEffect } from "react";
import { createPortal } from "react-dom";

export type ToastType = "success" | "error" | "warning" | "info";

export interface Toast {
  id: string;
  type: ToastType;
  title?: string;
  message: string;
  duration?: number;
  action?: {
    label: string;
    onClick: () => void;
  };
  onDismiss?: () => void;
  createdAt: number;
}

interface ToastContextType {
  toasts: Toast[];
  addToast: (toast: Omit<Toast, "id" | "createdAt">) => string;
  removeToast: (id: string) => void;
  clearToasts: () => void;
  success: (message: string, options?: Partial<Omit<Toast, "id" | "createdAt" | "type">>) => string;
  error: (message: string, options?: Partial<Omit<Toast, "id" | "createdAt" | "type">>) => string;
  warning: (message: string, options?: Partial<Omit<Toast, "id" | "createdAt" | "type">>) => string;
  info: (message: string, options?: Partial<Omit<Toast, "id" | "createdAt" | "type">>) => string;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

let toastCounter = 0;

interface ToastProviderProps {
  children: React.ReactNode;
  position?: "top-right" | "top-left" | "bottom-right" | "bottom-left" | "top-center" | "bottom-center";
  maxToasts?: number;
  defaultDuration?: number;
}

export function ToastProvider({
  children,
  position = "bottom-right",
  maxToasts = 5,
  defaultDuration = 4000,
}: ToastProviderProps) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
    return () => setIsMounted(false);
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => {
      const toast = prev.find((t) => t.id === id);
      if (toast?.onDismiss) toast.onDismiss();
      return prev.filter((t) => t.id !== id);
    });
  }, []);

  const addToast = useCallback(
    (toast: Omit<Toast, "id" | "createdAt">): string => {
      const id = `toast_${++toastCounter}`;
      const duration = toast.duration ?? defaultDuration;

      setToasts((prev) => {
        const newToasts = [...prev, { ...toast, id, createdAt: Date.now() }];
        return newToasts.slice(-maxToasts);
      });

      if (duration > 0) {
        setTimeout(() => {
          removeToast(id);
        }, duration);
      }

      return id;
    },
    [defaultDuration, maxToasts, removeToast]
  );

  const clearToasts = useCallback(() => {
    setToasts([]);
  }, []);

  const success = useCallback(
    (message: string, options?: Partial<Omit<Toast, "id" | "createdAt" | "type">>) => {
      return addToast({ type: "success", message, ...options });
    },
    [addToast]
  );

  const error = useCallback(
    (message: string, options?: Partial<Omit<Toast, "id" | "createdAt" | "type">>) => {
      return addToast({ type: "error", message, duration: 8000, ...options });
    },
    [addToast]
  );

  const warning = useCallback(
    (message: string, options?: Partial<Omit<Toast, "id" | "createdAt" | "type">>) => {
      return addToast({ type: "warning", message, duration: 6000, ...options });
    },
    [addToast]
  );

  const info = useCallback(
    (message: string, options?: Partial<Omit<Toast, "id" | "createdAt" | "type">>) => {
      return addToast({ type: "info", message, ...options });
    },
    [addToast]
  );

  const value: ToastContextType = {
    toasts,
    addToast,
    removeToast,
    clearToasts,
    success,
    error,
    warning,
    info,
  };

  const positionStyles = getPositionStyles(position);

  return (
    <ToastContext.Provider value={value}>
      {children}
      {isMounted &&
        createPortal(
          <div
            aria-live="polite"
            aria-label="Notifications"
            className="fixed z-[9999] flex flex-col gap-2 p-4"
            style={positionStyles}
          >
            {toasts.map((toast) => (
              <ToastItem
                key={toast.id}
                toast={toast}
                onDismiss={removeToast}
              />
            ))}
          </div>,
          document.body
        )}
    </ToastContext.Provider>
  );
}

function getPositionStyles(position: string): React.CSSProperties {
  switch (position) {
    case "top-right":
      return { top: 0, right: 0 };
    case "top-left":
      return { top: 0, left: 0 };
    case "bottom-right":
      return { bottom: 0, right: 0 };
    case "bottom-left":
      return { bottom: 0, left: 0 };
    case "top-center":
      return { top: 0, left: "50%", transform: "translateX(-50%)" };
    case "bottom-center":
      return { bottom: 0, left: "50%", transform: "translateX(-50%)" };
    default:
      return { bottom: 0, right: 0 };
  }
}

interface ToastItemProps {
  toast: Toast;
  onDismiss: (id: string) => void;
}

function ToastItem({ toast, onDismiss }: ToastItemProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [isExiting, setIsExiting] = useState(false);

  useEffect(() => {
    requestAnimationFrame(() => setIsVisible(true));
  }, []);

  const handleDismiss = () => {
    setIsExiting(true);
    setTimeout(() => onDismiss(toast.id), 300);
  };

  const icon = getIcon(toast.type);
  const bgColor = getBackgroundColor(toast.type);
  const borderColor = getBorderColor(toast.type);

  return (
    <div
      role="alert"
      className={`
        flex items-start gap-3 min-w-[320px] max-w-[420px] rounded-lg border p-4
        shadow-lg backdrop-blur-sm
        transition-all duration-300 ease-out
        ${isVisible && !isExiting ? "translate-x-0 opacity-100" : "translate-x-full opacity-0"}
      `}
      style={{ backgroundColor: bgColor, borderColor }}
    >
      <span className="text-lg flex-shrink-0 mt-0.5">{icon}</span>
      <div className="flex-1 min-w-0">
        {toast.title && (
          <p className="font-semibold text-sm text-foreground mb-0.5">
            {toast.title}
          </p>
        )}
        <p className="text-sm text-foreground/80 break-words">{toast.message}</p>
      </div>
      <div className="flex items-center gap-2 flex-shrink-0">
        {toast.action && (
          <button
            onClick={() => {
              toast.action!.onClick();
              handleDismiss();
            }}
            className="text-sm font-medium text-primary hover:underline"
          >
            {toast.action.label}
          </button>
        )}
        <button
          onClick={handleDismiss}
          className="text-foreground/40 hover:text-foreground/60 transition-colors"
          aria-label="Dismiss"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>
  );
}

function getIcon(type: ToastType): string {
  switch (type) {
    case "success":
      return "\u2705";
    case "error":
      return "\u274C";
    case "warning":
      return "\u26A0\uFE0F";
    case "info":
      return "\u2139\uFE0F";
    default:
      return "\u2139\uFE0F";
  }
}

function getBackgroundColor(type: ToastType): string {
  switch (type) {
    case "success":
      return "rgba(34, 197, 94, 0.1)";
    case "error":
      return "rgba(239, 68, 68, 0.1)";
    case "warning":
      return "rgba(245, 158, 11, 0.1)";
    case "info":
      return "rgba(59, 130, 246, 0.1)";
    default:
      return "rgba(255, 255, 255, 0.95)";
  }
}

function getBorderColor(type: ToastType): string {
  switch (type) {
    case "success":
      return "rgba(34, 197, 94, 0.3)";
    case "error":
      return "rgba(239, 68, 68, 0.3)";
    case "warning":
      return "rgba(245, 158, 11, 0.3)";
    case "info":
      return "rgba(59, 130, 246, 0.3)";
    default:
      return "rgba(229, 231, 235, 1)";
  }
}

export function useToast(): ToastContextType {
  const context = useContext(ToastContext);
  if (!context) {
    // Return no-op functions when used outside provider
    return {
      toasts: [],
      addToast: () => "",
      removeToast: () => {},
      clearToasts: () => {},
      success: () => "",
      error: () => "",
      warning: () => "",
      info: () => "",
    };
  }
  return context;
}
