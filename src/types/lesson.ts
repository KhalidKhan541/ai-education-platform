export interface Lesson {
  id: string;
  moduleId: string;
  courseId: string;
  title: string;
  slug: string;
  description: string;
  type: LessonType;
  content: string;
  htmlContent?: string;
  videoUrl?: string;
  videoThumbnail?: string;
  videoDuration?: number;
  videoProvider?: VideoProvider;
  resources: LessonResource[];
  order: number;
  isPreview: boolean;
  isPublished: boolean;
  estimatedDuration: number;
  objectives: string[];
  transcripts?: VideoTranscript[];
  createdAt: string;
  updatedAt: string;
}

export type LessonType =
  | "video"
  | "text"
  | "interactive"
  | "quiz"
  | "assignment"
  | "live"
  | "download";

export type VideoProvider = "youtube" | "vimeo" | "s3" | "cloudflare" | "custom";

export interface LessonResource {
  id: string;
  name: string;
  description?: string;
  type: ResourceType;
  url: string;
  size: number;
  mimeType: string;
  downloadCount: number;
}

export type ResourceType =
  | "pdf"
  | "document"
  | "spreadsheet"
  | "presentation"
  | "image"
  | "archive"
  | "code"
  | "link"
  | "other";

export interface VideoTranscript {
  id: string;
  language: string;
  content: string;
  segments: TranscriptSegment[];
}

export interface TranscriptSegment {
  start: number; // seconds
  end: number;
  text: string;
}

// Lesson navigation
export interface LessonNavigation {
  previous: LessonNavEntry | null;
  next: LessonNavEntry | null;
  current: LessonNavEntry;
  siblings: LessonNavEntry[];
}

export interface LessonNavEntry {
  id: string;
  title: string;
  type: LessonType;
  isCompleted: boolean;
  isPreview: boolean;
  moduleId: string;
  moduleTitle: string;
}

// Lesson progress tracking
export interface LessonProgress {
  lessonId: string;
  userId: string;
  status: LessonStatus;
  startedAt: string;
  completedAt?: string;
  lastAccessedAt: string;
  videoPosition: number; // seconds
  videoWatchedPercentage: number;
  timeSpent: number; // seconds
  notes: LessonNote[];
  bookmarks: LessonBookmark[];
  completionCriteria: CompletionCriteria;
  isCompleted: boolean;
}

export type LessonStatus =
  | "not-started"
  | "in-progress"
  | "completed"
  | "skipped";

export interface CompletionCriteria {
  requireVideoWatch: boolean;
  requireVideoPercentage: number; // 0-100
  requireQuiz: boolean;
  requireQuizScore?: number;
  requireAssignment: boolean;
  requireManualMarking: boolean;
}

export interface LessonNote {
  id: string;
  userId: string;
  lessonId: string;
  content: string;
  timestamp?: number; // video timestamp in seconds
  createdAt: string;
  updatedAt: string;
}

export interface LessonBookmark {
  id: string;
  userId: string;
  lessonId: string;
  title: string;
  timestamp: number; // seconds
  createdAt: string;
}

// Lesson content types
export interface TextLessonContent {
  markdown: string;
  html: string;
  wordCount: number;
  readingTimeMinutes: number;
}

export interface VideoLessonContent {
  url: string;
  thumbnail?: string;
  duration: number;
  provider: VideoProvider;
  qualities: VideoQuality[];
  subtitles: VideoSubtitle[];
}

export interface VideoQuality {
  label: string;
  url: string;
  width: number;
  height: number;
  bitrate?: number;
}

export interface VideoSubtitle {
  language: string;
  label: string;
  url: string;
}

export interface InteractiveLessonContent {
  type: "simulation" | "exercise" | "lab";
  config: Record<string, unknown>;
  instructions: string;
  hints: string[];
  solution?: string;
}

// Discussion
export interface LessonDiscussion {
  id: string;
  lessonId: string;
  userId: string;
  userName: string;
  userAvatar: string;
  content: string;
  parentId?: string;
  replies: LessonDiscussion[];
  upvotes: number;
  downvotes: number;
  isResolved: boolean;
  createdAt: string;
  updatedAt: string;
}

// Analytics
export interface LessonAnalytics {
  lessonId: string;
  totalViews: number;
  uniqueViews: number;
  averageWatchTime: number;
  completionRate: number;
  averageScore?: number;
  dropoffPoints: DropoffPoint[];
  engagementHeatmap: EngagementData[];
}

export interface DropoffPoint {
  timestamp: number;
  percentage: number;
  count: number;
}

export interface EngagementData {
  timestamp: number;
  engagement: number; // 0-100
}

// Input types for creating/updating lessons
export interface CreateLessonInput {
  moduleId: string;
  title: string;
  description: string;
  type: LessonType;
  content: string;
  videoUrl?: string;
  resources?: Omit<LessonResource, "id" | "downloadCount">[];
  isPreview?: boolean;
  estimatedDuration?: number;
  objectives?: string[];
}

export interface UpdateLessonInput extends Partial<Omit<CreateLessonInput, "moduleId">> {
  order?: number;
  isPublished?: boolean;
}

export interface ReorderLessonsInput {
  moduleId: string;
  lessonIds: string[];
}
