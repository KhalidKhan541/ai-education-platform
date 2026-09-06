export interface Assignment {
  id: string;
  moduleId: string;
  courseId: string;
  title: string;
  slug: string;
  description: string;
  instructions: string;
  htmlInstructions?: string;
  type: AssignmentType;
  maxScore: number;
  passingScore: number;
  weight: number;
  dueDate?: string;
  allowLateSubmission: boolean;
  latePenalty?: number; // percentage per day
  maxAttempts: number;
  timeLimit?: number; // minutes
  rubric?: RubricItem[];
  resources: AssignmentResource[];
  submissionType: SubmissionType;
  allowedFileTypes?: string[];
  maxFileSize?: number; // bytes
  codeConfig?: CodeAssignmentConfig;
  order: number;
  isPublished: boolean;
  createdAt: string;
  updatedAt: string;
}

export type AssignmentType =
  | "file-upload"
  | "text"
  | "code"
  | "quiz"
  | "project"
  | "peer-review"
  | "group";

export type SubmissionType =
  | "file"
  | "text"
  | "url"
  | "code"
  | "multi";

export interface CodeAssignmentConfig {
  language: string;
  template: string;
  testCases: TestCase[];
  starterCode?: string;
  solutionCode?: string;
  constraints?: string[];
  timeLimit?: number; // ms per test
  memoryLimit?: number; // MB
}

export interface TestCase {
  id: string;
  input: string;
  expectedOutput: string;
  isHidden: boolean;
  description?: string;
  weight: number;
}

export interface AssignmentResource {
  id: string;
  name: string;
  type: string;
  url: string;
  size: number;
}

export interface RubricItem {
  id: string;
  criterion: string;
  description: string;
  maxPoints: number;
  levels: RubricLevel[];
  category?: string;
}

export interface RubricLevel {
  name: string;
  description: string;
  points: number;
}

// Submission
export interface AssignmentSubmission {
  id: string;
  assignmentId: string;
  userId: string;
  attemptNumber: number;
  status: SubmissionStatus;
  content: SubmissionContent;
  score?: number;
  maxScore: number;
  percentage?: number;
  passed: boolean;
  feedback?: SubmissionFeedback;
  rubricScores?: RubricScore[];
  gradedBy?: string;
  gradedAt?: string;
  submittedAt: string;
  updatedAt: string;
  isLate: boolean;
  timeSpent: number; // seconds
}

export type SubmissionStatus =
  | "draft"
  | "submitted"
  | "grading"
  | "graded"
  | "returned"
  | "resubmitted"
  | "expired"
  | "failed";

export interface SubmissionContent {
  type: SubmissionType;
  text?: string;
  files?: SubmissionFile[];
  url?: string;
  code?: CodeSubmission;
  answers?: QuizAnswer[];
}

export interface SubmissionFile {
  id: string;
  name: string;
  url: string;
  size: number;
  mimeType: string;
  uploadedAt: string;
}

export interface CodeSubmission {
  code: string;
  language: string;
  testResults?: TestResult[];
  executionTime?: number;
  memoryUsed?: number;
  passed: boolean;
}

export interface TestResult {
  testCaseId: string;
  passed: boolean;
  input: string;
  expectedOutput: string;
  actualOutput: string;
  executionTime: number;
  memoryUsed: number;
  error?: string;
}

export interface QuizAnswer {
  questionId: string;
  answer: string | string[];
  isCorrect?: boolean;
  points?: number;
}

export interface SubmissionFeedback {
  text?: string;
  audioUrl?: string;
  videoUrl?: string;
  attachments?: SubmissionFile[];
  rubricFeedback?: RubricFeedbackItem[];
}

export interface RubricFeedbackItem {
  rubricItemId: string;
  levelId: string;
  points: number;
  comment?: string;
}

export interface RubricScore {
  rubricItemId: string;
  levelId?: string;
  points: number;
  comment?: string;
}

// Draft
export interface AssignmentDraft {
  id: string;
  assignmentId: string;
  userId: string;
  content: SubmissionContent;
  lastSavedAt: string;
}

// Peer Review
export interface PeerReview {
  id: string;
  assignmentId: string;
  submissionId: string;
  reviewerId: string;
  status: PeerReviewStatus;
  scores: PeerReviewScore[];
  comments: string;
  submittedAt?: string;
  createdAt: string;
}

export type PeerReviewStatus = "pending" | "in-progress" | "completed";

export interface PeerReviewScore {
  rubricItemId: string;
  points: number;
  comment?: string;
}

// Grading
export interface GradingResult {
  submissionId: string;
  score: number;
  maxScore: number;
  percentage: number;
  passed: boolean;
  rubricScores: RubricScore[];
  feedback: SubmissionFeedback;
  gradedAt: string;
  gradedBy: string;
}

export interface BulkGradingInput {
  submissionIds: string[];
  score?: number;
  feedback?: string;
  passed?: boolean;
}

// Statistics
export interface AssignmentStats {
  assignmentId: string;
  totalSubmissions: number;
  averageScore: number;
  medianScore: number;
  highestScore: number;
  lowestScore: number;
  passRate: number;
  averageTimeSpent: number;
  lateSubmissions: number;
  scoreDistribution: ScoreDistribution[];
}

export interface ScoreDistribution {
  range: string;
  count: number;
  percentage: number;
}

// Input types
export interface CreateAssignmentInput {
  moduleId: string;
  title: string;
  description: string;
  instructions: string;
  type: AssignmentType;
  maxScore: number;
  passingScore: number;
  weight: number;
  dueDate?: string;
  allowLateSubmission?: boolean;
  latePenalty?: number;
  maxAttempts?: number;
  timeLimit?: number;
  submissionType: SubmissionType;
  allowedFileTypes?: string[];
  maxFileSize?: number;
  codeConfig?: CodeAssignmentConfig;
  rubric?: Omit<RubricItem, "id">[];
}

export interface UpdateAssignmentInput extends Partial<Omit<CreateAssignmentInput, "moduleId">> {
  order?: number;
  isPublished?: boolean;
}

export interface GradeSubmissionInput {
  submissionId: string;
  score: number;
  rubricScores?: RubricScore[];
  feedback?: SubmissionFeedback;
  passed?: boolean;
}
