"use client";

import React, { useState } from "react";
import { QueryClient, QueryClientProvider, HydrationBoundary } from "@tanstack/react-query";

interface QueryProviderProps {
  children: React.ReactNode;
  dehydratedState?: unknown;
}

function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 60 * 1000, // 1 minute
        gcTime: 5 * 60 * 1000, // 5 minutes
        refetchOnWindowFocus: true,
        refetchOnReconnect: true,
        retry: 3,
        retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
      },
      mutations: {
        retry: 1,
      },
    },
  });
}

let browserQueryClient: QueryClient | null = null;

function getQueryClient() {
  if (typeof window === "undefined") {
    // Server: always make a new query client
    return makeQueryClient();
  }
  // Browser: make a new query client if we don't already have one
  if (!browserQueryClient) {
    browserQueryClient = makeQueryClient();
  }
  return browserQueryClient;
}

export function QueryProvider({ children, dehydratedState }: QueryProviderProps) {
  const [queryClient] = useState(getQueryClient);

  return (
    <QueryClientProvider client={queryClient}>
      <HydrationBoundary state={dehydratedState}>
        {children}
      </HydrationBoundary>
    </QueryClientProvider>
  );
}

// Custom hooks for common query patterns
export { useQueryClient } from "@tanstack/react-query";

// Query key factories
export const queryKeys = {
  // Auth
  auth: {
    me: ["auth", "me"] as const,
    session: ["auth", "session"] as const,
  },

  // Users
  users: {
    all: ["users"] as const,
    detail: (id: string) => ["users", id] as const,
    profile: (id: string) => ["users", id, "profile"] as const,
    stats: (id: string) => ["users", id, "stats"] as const,
  },

  // Courses
  courses: {
    all: ["courses"] as const,
    list: (filters?: Record<string, unknown>) =>
      ["courses", { filters }] as const,
    detail: (id: string) => ["courses", id] as const,
    modules: (courseId: string) => ["courses", courseId, "modules"] as const,
    module: (courseId: string, moduleId: string) =>
      ["courses", courseId, "modules", moduleId] as const,
    lessons: (courseId: string, moduleId: string) =>
      ["courses", courseId, "modules", moduleId, "lessons"] as const,
    reviews: (courseId: string) => ["courses", courseId, "reviews"] as const,
    featured: ["courses", "featured"] as const,
    popular: ["courses", "popular"] as const,
    search: (query: string) => ["courses", "search", query] as const,
    instructor: (instructorId: string) =>
      ["courses", "instructor", instructorId] as const,
  },

  // Enrollments
  enrollments: {
    all: ["enrollments"] as const,
    list: (userId: string) => ["enrollments", userId] as const,
    detail: (userId: string, courseId: string) =>
      ["enrollments", userId, courseId] as const,
    progress: (userId: string, courseId: string) =>
      ["enrollments", userId, courseId, "progress"] as const,
  },

  // Lessons
  lessons: {
    all: ["lessons"] as const,
    detail: (id: string) => ["lessons", id] as const,
    content: (id: string) => ["lessons", id, "content"] as const,
    progress: (id: string) => ["lessons", id, "progress"] as const,
    notes: (id: string) => ["lessons", id, "notes"] as const,
    bookmarks: (id: string) => ["lessons", id, "bookmarks"] as const,
    discussion: (id: string) => ["lessons", id, "discussion"] as const,
    transcript: (id: string, lang: string) =>
      ["lessons", id, "transcript", lang] as const,
  },

  // Assignments
  assignments: {
    all: ["assignments"] as const,
    detail: (id: string) => ["assignments", id] as const,
    submissions: (id: string) => ["assignments", id, "submissions"] as const,
    submission: (assignmentId: string, userId: string) =>
      ["assignments", assignmentId, "submissions", userId] as const,
    rubric: (id: string) => ["assignments", id, "rubric"] as const,
    stats: (id: string) => ["assignments", id, "stats"] as const,
  },

  // Quizzes
  quizzes: {
    all: ["quizzes"] as const,
    detail: (id: string) => ["quizzes", id] as const,
    attempts: (id: string) => ["quizzes", id, "attempts"] as const,
    attempt: (quizId: string, attemptId: string) =>
      ["quizzes", quizId, "attempts", attemptId] as const,
    result: (quizId: string, attemptId: string) =>
      ["quizzes", quizId, "attempts", attemptId, "result"] as const,
    stats: (id: string) => ["quizzes", id, "stats"] as const,
  },

  // Certificates
  certificates: {
    all: ["certificates"] as const,
    detail: (id: string) => ["certificates", id] as const,
    verify: (code: string) => ["certificates", "verify", code] as const,
    user: (userId: string) => ["certificates", "user", userId] as const,
  },

  // Notifications
  notifications: {
    all: ["notifications"] as const,
    list: (params?: Record<string, unknown>) =>
      ["notifications", { params }] as const,
    unreadCount: ["notifications", "unread"] as const,
  },

  // Analytics
  analytics: {
    dashboard: ["analytics", "dashboard"] as const,
    course: (courseId: string) => ["analytics", "course", courseId] as const,
    user: (userId: string) => ["analytics", "user", userId] as const,
  },

  // Search
  search: {
    results: (query: string, type?: string) =>
      ["search", query, type] as const,
    suggestions: (query: string) => ["search", "suggestions", query] as const,
  },

  // Settings
  settings: {
    profile: ["settings", "profile"] as const,
    notifications: ["settings", "notifications"] as const,
    billing: ["settings", "billing"] as const,
  },
};

// Mutation key factories
export const mutationKeys = {
  auth: {
    login: ["auth", "login"] as const,
    register: ["auth", "register"] as const,
    logout: ["auth", "logout"] as const,
    forgotPassword: ["auth", "forgotPassword"] as const,
    resetPassword: ["auth", "resetPassword"] as const,
  },

  courses: {
    create: ["courses", "create"] as const,
    update: (id: string) => ["courses", "update", id] as const,
    delete: (id: string) => ["courses", "delete", id] as const,
    publish: (id: string) => ["courses", "publish", id] as const,
  },

  enrollments: {
    enroll: ["enrollments", "enroll"] as const,
    unenroll: (courseId: string) =>
      ["enrollments", "unenroll", courseId] as const,
  },

  lessons: {
    updateProgress: (id: string) =>
      ["lessons", id, "updateProgress"] as const,
    addNote: (id: string) => ["lessons", id, "addNote"] as const,
    addBookmark: (id: string) => ["lessons", id, "addBookmark"] as const,
  },

  assignments: {
    submit: (id: string) => ["assignments", id, "submit"] as const,
    grade: (submissionId: string) =>
      ["assignments", "grade", submissionId] as const,
  },

  quizzes: {
    start: (id: string) => ["quizzes", id, "start"] as const,
    submit: (id: string) => ["quizzes", id, "submit"] as const,
  },

  profile: {
    update: ["profile", "update"] as const,
    uploadAvatar: ["profile", "uploadAvatar"] as const,
  },
};

// Optimistic update helpers
export function createOptimisticUpdater<T>(
  queryKey: readonly unknown[],
  updater: (old: T | undefined) => T
) {
  return {
    onMutate: async () => {
      // Cancel outgoing refetches
      // Optimistically update
      return { previousData: undefined };
    },
    onError: () => {
      // Rollback on error
    },
    onSettled: () => {
      // Refetch after error or success
    },
  };
}
