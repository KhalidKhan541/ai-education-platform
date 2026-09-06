export interface Course {
  id: string;
  title: string;
  slug: string;
  description: string;
  shortDescription: string;
  thumbnail: string;
  previewVideo?: string;
  instructorId: string;
  instructor: CourseInstructor;
  categoryId: string;
  category: CourseCategory;
  level: CourseLevel;
  language: string;
  price: number;
  currency: string;
  isPublished: boolean;
  isFeatured: boolean;
  enrollmentCount: number;
  rating: number;
  reviewCount: number;
  moduleCount: number;
  lessonCount: number;
  estimatedDuration: number; // minutes
  prerequisites: string[];
  learningObjectives: string[];
  tags: string[];
  modules: CourseModule[];
  syllabus: SyllabusSection[];
  createdAt: string;
  updatedAt: string;
  publishedAt?: string;
}

export interface CourseModule {
  id: string;
  courseId: string;
  title: string;
  description: string;
  order: number;
  isPublished: boolean;
  lessons: CourseLesson[];
  assignments: CourseAssignment[];
  quizzes: CourseQuiz[];
  estimatedDuration: number;
  objectives: string[];
}

export interface CourseLesson {
  id: string;
  moduleId: string;
  title: string;
  description: string;
  type: LessonType;
  content: string;
  videoUrl?: string;
  videoDuration?: number;
  resources: LessonResource[];
  order: number;
  isPreview: boolean;
  isPublished: boolean;
  estimatedDuration: number;
}

export interface CourseAssignment {
  id: string;
  moduleId: string;
  title: string;
  description: string;
  type: AssignmentType;
  maxScore: number;
  passingScore: number;
  weight: number;
  dueDate?: string;
  allowLateSubmission: boolean;
  latePenalty?: number;
  maxAttempts: number;
  rubric?: RubricItem[];
  resources: LessonResource[];
  order: number;
}

export interface CourseQuiz {
  id: string;
  moduleId: string;
  title: string;
  description: string;
  questions: QuizQuestion[];
  timeLimit?: number; // minutes
  maxAttempts: number;
  passingScore: number;
  shuffleQuestions: boolean;
  showAnswers: boolean;
  weight: number;
  order: number;
}

export interface SyllabusSection {
  title: string;
  description: string;
  weeks?: number;
  topics: string[];
}

export interface CourseInstructor {
  id: string;
  name: string;
  email: string;
  avatar: string;
  bio: string;
  title: string;
  socialLinks?: Record<string, string>;
  courseCount: number;
  studentCount: number;
  rating: number;
}

export interface CourseCategory {
  id: string;
  name: string;
  slug: string;
  description?: string;
  icon?: string;
  color?: string;
  courseCount: number;
}

export interface CourseReview {
  id: string;
  courseId: string;
  userId: string;
  userName: string;
  userAvatar: string;
  rating: number;
  title: string;
  content: string;
  helpful: number;
  response?: string;
  createdAt: string;
  updatedAt: string;
}

export type CourseLevel = "beginner" | "intermediate" | "advanced" | "all-levels";
export type LessonType = "video" | "text" | "quiz" | "assignment" | "interactive" | "live";
export type AssignmentType = "file-upload" | "text" | "code" | "quiz" | "project";

export interface LessonResource {
  id: string;
  name: string;
  type: string;
  url: string;
  size: number;
}

export interface RubricItem {
  criterion: string;
  description: string;
  maxPoints: number;
  levels: RubricLevel[];
}

export interface RubricLevel {
  name: string;
  description: string;
  points: number;
}

// Course filters and search
export interface CourseFilters {
  category?: string;
  level?: CourseLevel;
  priceRange?: { min: number; max: number };
  rating?: number;
  language?: string;
  duration?: { min: number; max: number };
  sortBy?: CourseSortBy;
  search?: string;
  tags?: string[];
}

export type CourseSortBy =
  | "popular"
  | "newest"
  | "highest-rated"
  | "price-low"
  | "price-high"
  | "duration";

export interface CourseSearchResult {
  courses: Course[];
  total: number;
  page: number;
  pageSize: number;
  filters: CourseFilters;
  suggestions: string[];
}

// Enrollment
export interface Enrollment {
  id: string;
  userId: string;
  courseId: string;
  course: Course;
  status: EnrollmentStatus;
  progress: EnrollmentProgress;
  enrolledAt: string;
  completedAt?: string;
  lastAccessedAt: string;
  certificateId?: string;
}

export type EnrollmentStatus =
  | "active"
  | "completed"
  | "paused"
  | "dropped"
  | "expired";

export interface EnrollmentProgress {
  overall: number; // 0-100
  modules: ModuleProgress[];
  completedLessons: string[];
  completedAssignments: string[];
  completedQuizzes: string[];
  totalTimeSpent: number; // seconds
  lastLessonId?: string;
  lastPosition?: number; // video position in seconds
}

export interface ModuleProgress {
  moduleId: string;
  completed: number;
  total: number;
  percentage: number;
  isCompleted: boolean;
}

// Course creation/update
export interface CreateCourseInput {
  title: string;
  description: string;
  shortDescription: string;
  categoryId: string;
  level: CourseLevel;
  language: string;
  price: number;
  currency: string;
  prerequisites?: string[];
  learningObjectives?: string[];
  tags?: string[];
}

export interface UpdateCourseInput extends Partial<CreateCourseInput> {
  thumbnail?: string;
  previewVideo?: string;
  isPublished?: boolean;
  isFeatured?: boolean;
}

export interface CreateModuleInput {
  title: string;
  description: string;
  objectives?: string[];
}

export interface CreateLessonInput {
  title: string;
  description: string;
  type: LessonType;
  content: string;
  videoUrl?: string;
  resources?: LessonResource[];
  isPreview?: boolean;
  estimatedDuration?: number;
}
