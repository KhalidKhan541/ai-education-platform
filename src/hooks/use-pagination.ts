"use client";

import { useState, useCallback, useMemo } from "react";

export interface UsePaginationOptions {
  initialPage?: number;
  initialPageSize?: number;
  totalItems?: number;
  siblingCount?: number;
  onPageChange?: (page: number) => void;
}

export interface PaginationItem {
  type: "page" | "ellipsis" | "prev" | "next" | "first" | "last";
  page?: number;
  isActive: boolean;
  isDisabled: boolean;
}

export function usePagination(options: UsePaginationOptions = {}) {
  const {
    initialPage = 1,
    initialPageSize = 10,
    totalItems: externalTotalItems,
    siblingCount = 1,
    onPageChange,
  } = options;

  const [currentPage, setCurrentPage] = useState(initialPage);
  const [pageSize, setPageSize] = useState(initialPageSize);
  const [totalItems, setTotalItems] = useState(externalTotalItems || 0);

  const totalPages = useMemo(
    () => Math.max(1, Math.ceil(totalItems / pageSize)),
    [totalItems, pageSize]
  );

  const hasNextPage = currentPage < totalPages;
  const hasPrevPage = currentPage > 1;

  const setPage = useCallback(
    (page: number) => {
      const validPage = Math.max(1, Math.min(page, totalPages));
      if (validPage !== currentPage) {
        setCurrentPage(validPage);
        onPageChange?.(validPage);
      }
    },
    [currentPage, totalPages, onPageChange]
  );

  const nextPage = useCallback(() => {
    if (hasNextPage) setPage(currentPage + 1);
  }, [currentPage, hasNextPage, setPage]);

  const prevPage = useCallback(() => {
    if (hasPrevPage) setPage(currentPage - 1);
  }, [currentPage, hasPrevPage, setPage]);

  const firstPage = useCallback(() => setPage(1), [setPage]);
  const lastPage = useCallback(() => setPage(totalPages), [setPage, totalPages]);

  const goToPage = useCallback(
    (page: number | ((current: number) => number)) => {
      const newPage = typeof page === "function" ? page(currentPage) : page;
      setPage(newPage);
    },
    [currentPage, setPage]
  );

  const changePageSize = useCallback(
    (newSize: number) => {
      const firstItemIndex = (currentPage - 1) * pageSize;
      setPageSize(newSize);
      const newPage = Math.floor(firstItemIndex / newSize) + 1;
      setCurrentPage(Math.min(newPage, Math.ceil(totalItems / newSize)));
    },
    [currentPage, pageSize, totalItems]
  );

  // Generate page numbers
  const pages = useMemo(() => {
    const range = (start: number, end: number) => {
      const result: number[] = [];
      for (let i = start; i <= end; i++) {
        result.push(i);
      }
      return result;
    };

    const totalPageNumbers = siblingCount * 2 + 5; // siblings + current + first + last + 2 ellipses

    if (totalPages <= totalPageNumbers) {
      return range(1, totalPages);
    }

    const leftSiblingIndex = Math.max(currentPage - siblingCount, 1);
    const rightSiblingIndex = Math.min(currentPage + siblingCount, totalPages);

    const shouldShowLeftDots = leftSiblingIndex > 2;
    const shouldShowRightDots = rightSiblingIndex < totalPages - 1;

    if (!shouldShowLeftDots && shouldShowRightDots) {
      const leftItemCount = 3 + 2 * siblingCount;
      const leftRange = range(1, leftItemCount);
      return [...leftRange, "ellipsis" as const, totalPages];
    }

    if (shouldShowLeftDots && !shouldShowRightDots) {
      const rightItemCount = 3 + 2 * siblingCount;
      const rightRange = range(
        totalPages - rightItemCount + 1,
        totalPages
      );
      return [1, "ellipsis" as const, ...rightRange];
    }

    const middleRange = range(leftSiblingIndex, rightSiblingIndex);
    return [1, "ellipsis" as const, ...middleRange, "ellipsis" as const, totalPages];
  }, [currentPage, totalPages, siblingCount]);

  // Pagination items for rendering
  const paginationItems: PaginationItem[] = useMemo(() => {
    const items: PaginationItem[] = [];

    // Previous button
    items.push({
      type: "prev",
      isActive: false,
      isDisabled: !hasPrevPage,
    });

    // Page numbers
    for (const page of pages) {
      if (page === "ellipsis") {
        items.push({
          type: "ellipsis",
          isActive: false,
          isDisabled: true,
        });
      } else {
        items.push({
          type: "page",
          page: page as number,
          isActive: page === currentPage,
          isDisabled: false,
        });
      }
    }

    // Next button
    items.push({
      type: "next",
      isActive: false,
      isDisabled: !hasNextPage,
    });

    return items;
  }, [pages, currentPage, hasPrevPage, hasNextPage]);

  // Slice data for current page (helper)
  const sliceForPage = useCallback(
    <T>(data: T[]): T[] => {
      const start = (currentPage - 1) * pageSize;
      return data.slice(start, start + pageSize);
    },
    [currentPage, pageSize]
  );

  // Get offset for API calls
  const getOffset = useCallback(() => {
    return (currentPage - 1) * pageSize;
  }, [currentPage, pageSize]);

  // Get limit for API calls
  const getLimit = useCallback(() => pageSize, [pageSize]);

  return {
    currentPage,
    pageSize,
    totalItems,
    totalPages,
    hasNextPage,
    hasPrevPage,
    pages,
    paginationItems,
    setPage,
    nextPage,
    prevPage,
    firstPage,
    lastPage,
    goToPage,
    changePageSize,
    setTotalItems,
    sliceForPage,
    getOffset,
    getLimit,
  };
}

// URL-based pagination
export function useUrlPagination(options: {
  basePath?: string;
  initialPage?: number;
  initialPageSize?: number;
} = {}) {
  const { basePath = "", initialPage = 1, initialPageSize = 10 } = options;

  const getPageFromUrl = (): number => {
    if (typeof window === "undefined") return initialPage;
    const params = new URLSearchParams(window.location.search);
    return parseInt(params.get("page") || String(initialPage), 10);
  };

  const [currentPage, setCurrentPage] = useState(getPageFromUrl);

  const setPage = useCallback(
    (page: number) => {
      setCurrentPage(page);
      const url = new URL(window.location.href);
      url.searchParams.set("page", String(page));
      window.history.pushState({}, "", url.toString());
    },
    []
  );

  return {
    currentPage,
    setPage,
  };
}

// Cursor-based pagination
export function useCursorPagination<T>(
  fetcher: (cursor: string | null) => Promise<{
    data: T[];
    nextCursor: string | null;
    hasMore: boolean;
  }>
) {
  const [data, setData] = useState<T[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const loadMore = useCallback(async () => {
    if (isLoading || !hasMore) return;

    setIsLoading(true);
    try {
      const result = await fetcher(cursor);
      setData((prev) => [...prev, ...result.data]);
      setCursor(result.nextCursor);
      setHasMore(result.hasMore);
    } catch (err) {
      setError(err instanceof Error ? err : new Error(String(err)));
    } finally {
      setIsLoading(false);
    }
  }, [cursor, isLoading, hasMore, fetcher]);

  const reset = useCallback(() => {
    setData([]);
    setCursor(null);
    setHasMore(true);
    setError(null);
  }, []);

  return {
    data,
    isLoading,
    error,
    hasMore,
    loadMore,
    reset,
  };
}
