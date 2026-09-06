"use client";

import React, { createContext, useContext, useEffect, useState, useCallback } from "react";

type Theme = "light" | "dark" | "system";
type ResolvedTheme = "light" | "dark";

interface ThemeContextType {
  theme: Theme;
  resolvedTheme: ResolvedTheme;
  setTheme: (theme: Theme) => void;
  systemTheme: ResolvedTheme;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

const STORAGE_KEY = "aiedu-theme";

interface ThemeProviderProps {
  children: React.ReactNode;
  defaultTheme?: Theme;
  storageKey?: string;
  enableSystem?: boolean;
  disableTransitionOnChange?: boolean;
}

export function ThemeProvider({
  children,
  defaultTheme = "system",
  storageKey = STORAGE_KEY,
  enableSystem = true,
  disableTransitionOnChange = true,
}: ThemeProviderProps) {
  const [theme, setThemeState] = useState<Theme>(defaultTheme);
  const [systemTheme, setSystemTheme] = useState<ResolvedTheme>("light");
  const [resolvedTheme, setResolvedTheme] = useState<ResolvedTheme>("light");

  // Get system preference
  useEffect(() => {
    if (typeof window === "undefined") return;

    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    setSystemTheme(mediaQuery.matches ? "dark" : "light");

    const handler = (event: MediaQueryListEvent) => {
      setSystemTheme(event.matches ? "dark" : "light");
    };

    mediaQuery.addEventListener("change", handler);
    return () => mediaQuery.removeEventListener("change", handler);
  }, []);

  // Resolve theme
  useEffect(() => {
    const resolved = theme === "system" ? systemTheme : theme;
    setResolvedTheme(resolved);

    if (typeof document === "undefined") return;

    const root = document.documentElement;
    root.classList.remove("light", "dark");
    root.classList.add(resolved);
    root.setAttribute("data-theme", resolved);
    root.style.colorScheme = resolved;

    // Store preference
    try {
      localStorage.setItem(storageKey, theme);
    } catch {
      // localStorage might not be available
    }
  }, [theme, systemTheme, storageKey]);

  // Handle system theme changes when theme is "system"
  useEffect(() => {
    if (theme !== "system") return;

    const resolved = systemTheme;
    setResolvedTheme(resolved);

    if (typeof document !== "undefined") {
      const root = document.documentElement;
      root.classList.remove("light", "dark");
      root.classList.add(resolved);
      root.setAttribute("data-theme", resolved);
      root.style.colorScheme = resolved;
    }
  }, [systemTheme, theme]);

  // Load from storage
  useEffect(() => {
    if (typeof window === "undefined") return;

    try {
      const stored = localStorage.getItem(storageKey) as Theme | null;
      if (stored && ["light", "dark", "system"].includes(stored)) {
        setThemeState(stored);
      }
    } catch {
      // Ignore errors
    }
  }, [storageKey]);

  // Disable transitions during theme change
  useEffect(() => {
    if (!disableTransitionOnChange || typeof document === "undefined") return;

    const css = document.createElement("style");
    css.appendChild(
      document.createTextNode(
        `*, *::before, *::after { transition: none !important; }`
      )
    );
    document.head.appendChild(css);

    // Force reflow
    void document.body.offsetHeight;

    // Remove transition-blocking style after a frame
    const timeout = setTimeout(() => {
      document.head.removeChild(css);
    }, 0);

    return () => {
      clearTimeout(timeout);
      if (css.parentNode) {
        document.head.removeChild(css);
      }
    };
  }, [resolvedTheme, disableTransitionOnChange]);

  const setTheme = useCallback((newTheme: Theme) => {
    setThemeState(newTheme);
  }, []);

  const value: ThemeContextType = {
    theme,
    resolvedTheme,
    setTheme,
    systemTheme,
  };

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextType {
  const context = useContext(ThemeContext);
  if (!context) {
    // Return default values when used outside provider
    return {
      theme: "system",
      resolvedTheme: "light",
      setTheme: () => {},
      systemTheme: "light",
    };
  }
  return context;
}

// CSS-in-JS helper for theme values
export const themeColors = {
  light: {
    background: "#ffffff",
    foreground: "#0a0a0a",
    card: "#ffffff",
    cardForeground: "#0a0a0a",
    popover: "#ffffff",
    popoverForeground: "#0a0a0a",
    primary: "#667eea",
    primaryForeground: "#ffffff",
    secondary: "#f5f3ff",
    secondaryForeground: "#1e1b4b",
    muted: "#f5f5f5",
    mutedForeground: "#737373",
    accent: "#f5f3ff",
    accentForeground: "#1e1b4b",
    destructive: "#ef4444",
    destructiveForeground: "#ffffff",
    border: "#e5e5e5",
    input: "#e5e5e5",
    ring: "#667eea",
  },
  dark: {
    background: "#0a0a0a",
    foreground: "#fafafa",
    card: "#1a1a1a",
    cardForeground: "#fafafa",
    popover: "#1a1a1a",
    popoverForeground: "#fafafa",
    primary: "#667eea",
    primaryForeground: "#ffffff",
    secondary: "#1e1b4b",
    secondaryForeground: "#c7d2fe",
    muted: "#262626",
    mutedForeground: "#a3a3a3",
    accent: "#1e1b4b",
    accentForeground: "#c7d2fe",
    destructive: "#dc2626",
    destructiveForeground: "#ffffff",
    border: "#262626",
    input: "#262626",
    ring: "#667eea",
  },
} as const;

export function getThemeColor(color: keyof typeof themeColors.light) {
  return `var(--color-${color})`;
}
