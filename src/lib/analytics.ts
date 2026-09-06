import { cacheSet, cacheGet, cacheIncrement } from "./cache";

const ANALYTICS_ENABLED = process.env.ANALYTICS_ENABLED !== "false";
const FLUSH_INTERVAL = 30000; // 30 seconds
const BATCH_SIZE = 50;

export type EventCategory =
  | "course"
  | "lesson"
  | "assignment"
  | "quiz"
  | "user"
  | "payment"
  | "engagement"
  | "system";

export interface AnalyticsEvent {
  id: string;
  event: string;
  category: EventCategory;
  userId?: string;
  sessionId?: string;
  properties: Record<string, unknown>;
  timestamp: number;
  context: {
    page?: string;
    referrer?: string;
    userAgent?: string;
    ip?: string;
    platform?: string;
    appVersion?: string;
  };
}

export interface EventProperties {
  [key: string]: string | number | boolean | null | undefined;
}

export interface UserProperties {
  id?: string;
  email?: string;
  name?: string;
  plan?: string;
  role?: string;
  joinedAt?: string;
}

export interface PageViewData {
  page: string;
  title?: string;
  referrer?: string;
  userId?: string;
  sessionId?: string;
}

export interface CourseAnalytics {
  courseId: string;
  views: number;
  enrollments: number;
  completions: number;
  averageRating: number;
  averageCompletionTime: number;
  dropoffRate: number;
}

export interface UserAnalytics {
  userId: string;
  coursesEnrolled: number;
  coursesCompleted: number;
  totalLearningTime: number;
  averageScore: number;
  streak: number;
  lastActiveAt: string;
}

let eventBuffer: AnalyticsEvent[] = [];
let flushTimer: ReturnType<typeof setInterval> | null = null;
let eventCounter = 0;

function generateEventId(): string {
  eventCounter++;
  return `evt_${Date.now()}_${eventCounter}_${Math.random().toString(36).slice(2, 8)}`;
}

function getContext(): AnalyticsEvent["context"] {
  if (typeof window === "undefined") {
    return { platform: "server" };
  }
  return {
    page: window.location.pathname,
    referrer: document.referrer || undefined,
    userAgent: navigator.userAgent,
    platform: navigator.platform,
    appVersion: process.env.NEXT_PUBLIC_APP_VERSION || "1.0.0",
  };
}

// Core tracking
export function trackEvent(
  event: string,
  category: EventCategory,
  properties: EventProperties = {},
  options: {
    userId?: string;
    sessionId?: string;
  } = {}
): void {
  if (!ANALYTICS_ENABLED) return;

  const analyticsEvent: AnalyticsEvent = {
    id: generateEventId(),
    event,
    category,
    userId: options.userId,
    sessionId: options.sessionId,
    properties,
    timestamp: Date.now(),
    context: getContext(),
  };

  eventBuffer.push(analyticsEvent);

  if (eventBuffer.length >= BATCH_SIZE) {
    flushEvents();
  }

  // Track in counters for quick access
  trackEventCounters(event, category);
}

async function trackEventCounters(
  event: string,
  category: EventCategory
): Promise<void> {
  const today = new Date().toISOString().split("T")[0];
  try {
    await cacheIncrement(`analytics:${category}:${today}`);
    await cacheIncrement(`analytics:event:${event}:${today}`);
  } catch {
    // Counter tracking is best-effort
  }
}

// Predefined event trackers
export const analytics = {
  // Course events
  courseViewed: (
    courseId: string,
    userId?: string,
    properties?: EventProperties
  ) =>
    trackEvent("course.viewed", "course", { courseId, ...properties }, { userId }),

  courseEnrolled: (
    courseId: string,
    userId: string,
    properties?: EventProperties
  ) =>
    trackEvent("course.enrolled", "course", { courseId, ...properties }, { userId }),

  courseCompleted: (
    courseId: string,
    userId: string,
    properties?: EventProperties
  ) =>
    trackEvent("course.completed", "course", { courseId, ...properties }, { userId }),

  courseDropped: (
    courseId: string,
    userId: string,
    progress: number,
    properties?: EventProperties
  ) =>
    trackEvent("course.dropped", "course", { courseId, progress, ...properties }, { userId }),

  // Lesson events
  lessonStarted: (
    lessonId: string,
    courseId: string,
    userId: string,
    properties?: EventProperties
  ) =>
    trackEvent(
      "lesson.started",
      "lesson",
      { lessonId, courseId, ...properties },
      { userId }
    ),

  lessonCompleted: (
    lessonId: string,
    courseId: string,
    userId: string,
    duration: number,
    properties?: EventProperties
  ) =>
    trackEvent(
      "lesson.completed",
      "lesson",
      { lessonId, courseId, duration, ...properties },
      { userId }
    ),

  // Assignment events
  assignmentSubmitted: (
    assignmentId: string,
    courseId: string,
    userId: string,
    properties?: EventProperties
  ) =>
    trackEvent(
      "assignment.submitted",
      "assignment",
      { assignmentId, courseId, ...properties },
      { userId }
    ),

  assignmentGraded: (
    assignmentId: string,
    courseId: string,
    userId: string,
    score: number,
    maxScore: number,
    properties?: EventProperties
  ) =>
    trackEvent(
      "assignment.graded",
      "assignment",
      { assignmentId, courseId, score, maxScore, ...properties },
      { userId }
    ),

  // Quiz events
  quizStarted: (
    quizId: string,
    courseId: string,
    userId: string,
    properties?: EventProperties
  ) =>
    trackEvent(
      "quiz.started",
      "quiz",
      { quizId, courseId, ...properties },
      { userId }
    ),

  quizCompleted: (
    quizId: string,
    courseId: string,
    userId: string,
    score: number,
    timeTaken: number,
    properties?: EventProperties
  ) =>
    trackEvent(
      "quiz.completed",
      "quiz",
      { quizId, courseId, score, timeTaken, ...properties },
      { userId }
    ),

  // User events
  userSignedUp: (
    userId: string,
    method: string,
    properties?: EventProperties
  ) =>
    trackEvent("user.signup", "user", { method, ...properties }, { userId }),

  userLoggedIn: (
    userId: string,
    method: string,
    properties?: EventProperties
  ) =>
    trackEvent("user.login", "user", { method, ...properties }, { userId }),

  userProfileUpdated: (
    userId: string,
    fields: string[],
    properties?: EventProperties
  ) =>
    trackEvent(
      "user.profile_updated",
      "user",
      { fields, ...properties },
      { userId }
    ),

  // Payment events
  paymentStarted: (
    courseId: string,
    userId: string,
    amount: number,
    currency: string,
    properties?: EventProperties
  ) =>
    trackEvent(
      "payment.started",
      "payment",
      { courseId, amount, currency, ...properties },
      { userId }
    ),

  paymentCompleted: (
    courseId: string,
    userId: string,
    amount: number,
    currency: string,
    paymentMethod: string,
    properties?: EventProperties
  ) =>
    trackEvent(
      "payment.completed",
      "payment",
      { courseId, amount, currency, paymentMethod, ...properties },
      { userId }
    ),

  paymentFailed: (
    courseId: string,
    userId: string,
    amount: number,
    error: string,
    properties?: EventProperties
  ) =>
    trackEvent(
      "payment.failed",
      "payment",
      { courseId, amount, error, ...properties },
      { userId }
    ),

  // Engagement events
  searchPerformed: (
    query: string,
    resultsCount: number,
    userId?: string,
    properties?: EventProperties
  ) =>
    trackEvent(
      "engagement.search",
      "engagement",
      { query, resultsCount, ...properties },
      { userId }
    ),

  contentShared: (
    contentType: string,
    contentId: string,
    platform: string,
    userId: string,
    properties?: EventProperties
  ) =>
    trackEvent(
      "engagement.share",
      "engagement",
      { contentType, contentId, platform, ...properties },
      { userId }
    ),

  certificateDownloaded: (
    certificateId: string,
    courseId: string,
    userId: string,
    properties?: EventProperties
  ) =>
    trackEvent(
      "engagement.certificate_downloaded",
      "engagement",
      { certificateId, courseId, ...properties },
      { userId }
    ),

  // Page views
  pageViewed: (data: PageViewData) =>
    trackEvent(
      "system.page_view",
      "system",
      { page: data.page, title: data.title },
      { userId: data.userId, sessionId: data.sessionId }
    ),
};

// Event buffering and flushing
async function flushEvents(): Promise<void> {
  if (eventBuffer.length === 0) return;

  const events = [...eventBuffer];
  eventBuffer = [];

  try {
    // In production, this would send to your analytics backend
    // For now, we store in Redis for querying
    for (const event of events) {
      const key = `analytics:events:${event.category}:${event.timestamp}`;
      await cacheSet(key, event, { ttl: 86400 * 30 }); // 30 days
    }
  } catch (error) {
    console.error("[Analytics] Failed to flush events:", error);
    // Re-add failed events to buffer
    eventBuffer.unshift(...events);
  }
}

export function startAnalyticsFlush(): void {
  if (flushTimer) return;
  flushTimer = setInterval(flushEvents, FLUSH_INTERVAL);
}

export function stopAnalyticsFlush(): void {
  if (flushTimer) {
    clearInterval(flushTimer);
    flushTimer = null;
  }
  flushEvents(); // Final flush
}

// Analytics queries
export async function getEventCounts(
  category: EventCategory,
  startDate: string,
  endDate: string
): Promise<Record<string, number>> {
  const counts: Record<string, number> = {};
  const start = new Date(startDate);
  const end = new Date(endDate);

  for (
    let d = new Date(start);
    d <= end;
    d.setDate(d.getDate() + 1)
  ) {
    const dateStr = d.toISOString().split("T")[0];
    const count = await cacheGet<number>(
      `analytics:${category}:${dateStr}`
    );
    counts[dateStr] = count || 0;
  }

  return counts;
}

export async function getTopEvents(
  startDate: string,
  endDate: string,
  limit = 10
): Promise<Array<{ event: string; count: number }>> {
  // This would need a more sophisticated implementation in production
  // For now, return empty array as placeholder
  return [];
}

export async function getUserEngagement(
  userId: string
): Promise<UserAnalytics | null> {
  const data = await cacheGet<UserAnalytics>(
    `analytics:user:${userId}`
  );
  return data;
}

export async function getCourseEngagement(
  courseId: string
): Promise<CourseAnalytics | null> {
  const data = await cacheGet<CourseAnalytics>(
    `analytics:course:${courseId}`
  );
  return data;
}

// Session tracking
export function generateSessionId(): string {
  return `ses_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

// Performance tracking
export function trackPerformance(
  metric: string,
  value: number,
  unit = "ms",
  properties?: EventProperties
): void {
  trackEvent("system.performance", "system", {
    metric,
    value,
    unit,
    ...properties,
  });
}

export function trackError(
  error: Error,
  context?: EventProperties
): void {
  trackEvent("system.error", "system", {
    message: error.message,
    stack: error.stack?.slice(0, 500),
    name: error.name,
    ...context,
  });
}

// Initialize on import
if (typeof window !== "undefined") {
  startAnalyticsFlush();
}
