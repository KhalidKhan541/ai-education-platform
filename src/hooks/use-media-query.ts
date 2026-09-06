"use client";

import { useState, useEffect, useCallback, useRef } from "react";

export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(false);
  const queryRef = useRef<string>(query);
  queryRef.current = query;

  useEffect(() => {
    if (typeof window === "undefined") return;

    const mediaQuery = window.matchMedia(query);
    setMatches(mediaQuery.matches);

    const handler = (event: MediaQueryListEvent) => {
      setMatches(event.matches);
    };

    mediaQuery.addEventListener("change", handler);
    return () => mediaQuery.removeEventListener("change", handler);
  }, [query]);

  return matches;
}

// Predefined breakpoints
export function useIsMobile(): boolean {
  return useMediaQuery("(max-width: 639px)");
}

export function useIsTablet(): boolean {
  return useMediaQuery("(min-width: 640px) and (max-width: 1023px)");
}

export function useIsDesktop(): boolean {
  return useMediaQuery("(min-width: 1024px)");
}

export function useIsLargeDesktop(): boolean {
  return useMediaQuery("(min-width: 1280px)");
}

export function usePrefersReducedMotion(): boolean {
  return useMediaQuery("(prefers-reduced-motion: reduce)");
}

export function usePrefersDarkMode(): boolean {
  return useMediaQuery("(prefers-color-scheme: dark)");
}

export function useIsPrint(): boolean {
  return useMediaQuery("print");
}

// Match multiple queries
export function useMediaQueries<T extends Record<string, string>>(
  queries: T
): Record<keyof T, boolean> {
  const [results, setResults] = useState<Record<keyof T, boolean>>(() => {
    const initial = {} as Record<keyof T, boolean>;
    if (typeof window === "undefined") {
      for (const key of Object.keys(queries)) {
        initial[key as keyof T] = false;
      }
      return initial;
    }
    for (const [key, query] of Object.entries(queries)) {
      initial[key as keyof T] = window.matchMedia(query).matches;
    }
    return initial;
  });

  useEffect(() => {
    if (typeof window === "undefined") return;

    const mediaQueries = Object.entries(queries).map(([key, query]) => {
      const mq = window.matchMedia(query);
      return { key: key as keyof T, mq };
    });

    const handler = () => {
      const newResults = {} as Record<keyof T, boolean>;
      for (const { key, mq } of mediaQueries) {
        newResults[key] = mq.matches;
      }
      setResults(newResults);
    };

    for (const { mq } of mediaQueries) {
      mq.addEventListener("change", handler);
    }

    return () => {
      for (const { mq } of mediaQueries) {
        mq.removeEventListener("change", handler);
      }
    };
  }, []);

  return results;
}

// Responsive value
export function useResponsiveValue<T>(
  values: {
    mobile?: T;
    tablet?: T;
    desktop: T;
    largeDesktop?: T;
  },
  defaultFallback?: T
): T {
  const isMobile = useIsMobile();
  const isTablet = useIsTablet();
  const isDesktop = useIsDesktop();
  const isLargeDesktop = useIsLargeDesktop();

  if (isLargeDesktop && values.largeDesktop !== undefined) {
    return values.largeDesktop;
  }
  if (isDesktop) return values.desktop;
  if (isTablet && values.tablet !== undefined) return values.tablet;
  if (isMobile && values.mobile !== undefined) return values.mobile;

  return values.desktop ?? defaultFallback!;
}

// Container queries (CSS-based approach helper)
export function useContainerSize(
  ref: React.RefObject<HTMLElement | null>
): { width: number; height: number } {
  const [size, setSize] = useState({ width: 0, height: 0 });

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        setSize({ width: Math.round(width), height: Math.round(height) });
      }
    });

    observer.observe(element);
    return () => observer.disconnect();
  }, [ref]);

  return size;
}

// Window size
export function useWindowSize(): { width: number; height: number } {
  const [size, setSize] = useState({ width: 0, height: 0 });

  useEffect(() => {
    const handler = () => {
      setSize({ width: window.innerWidth, height: window.innerHeight });
    };

    handler();
    window.addEventListener("resize", handler);
    return () => window.removeEventListener("resize", handler);
  }, []);

  return size;
}

// Orientation
export function useOrientation(): "portrait" | "landscape" {
  const [orientation, setOrientation] = useState<"portrait" | "landscape">(
    "landscape"
  );

  useEffect(() => {
    const handler = () => {
      setOrientation(
        window.innerWidth > window.innerHeight ? "landscape" : "portrait"
      );
    };

    handler();
    window.addEventListener("resize", handler);
    return () => window.removeEventListener("resize", handler);
  }, []);

  return orientation;
}

// Scroll position
export function useScrollPosition(): { x: number; y: number } {
  const [position, setPosition] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const handler = () => {
      setPosition({ x: window.scrollX, y: window.scrollY });
    };

    window.addEventListener("scroll", handler, { passive: true });
    return () => window.removeEventListener("scroll", handler);
  }, []);

  return position;
}

// Scroll direction
export function useScrollDirection(): "up" | "down" | null {
  const [direction, setDirection] = useState<"up" | "down" | null>(null);
  const lastScrollY = useRef(0);

  useEffect(() => {
    const handler = () => {
      const currentScrollY = window.scrollY;
      if (currentScrollY < 10) {
        setDirection(null);
      } else if (currentScrollY > lastScrollY.current) {
        setDirection("down");
      } else if (currentScrollY < lastScrollY.current) {
        setDirection("up");
      }
      lastScrollY.current = currentScrollY;
    };

    window.addEventListener("scroll", handler, { passive: true });
    return () => window.removeEventListener("scroll", handler);
  }, []);

  return direction;
}
