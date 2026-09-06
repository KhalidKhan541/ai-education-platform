export interface Quiz {
  id: string;
  moduleId: string;
  courseId: string;
  title: string;
  slug: string;
  description: string;
  instructions?: string;
  questions: QuizQuestion[];
  timeLimit?: number; // minutes
  maxAttempts: number;
  passingScore: number;
  shuffleQuestions: boolean;
  shuffleOptions: boolean;
  showAnswers: boolean;
  showScore: boolean;
  weight: number;
  points: number;
  estimatedDuration: number;
  order: number;
  isPublished: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface QuizQuestion {
  id: string;
  type: QuestionType;
  content: string;
  htmlContent?: string;
  image?: string;
  options: QuestionOption[];
  correctAnswer: string | string[];
  explanation?: string;
  points: number;
  order: number;
  required: boolean;
  hint?: string;
  videoUrl?: string;
  codeConfig?: CodeQuestionConfig;
  matchingPairs?: MatchingPair[];
  fillInBlanks?: FillInBlank[];
}

export type QuestionType =
  | "multiple-choice"
  | "multiple-select"
  | "true-false"
  | "short-answer"
  | "essay"
  | "fill-in-blank"
  | "matching"
  | "ordering"
  | "code"
  | "file-upload";

export interface QuestionOption {
  id: string;
  text: string;
  htmlText?: string;
  image?: string;
  isCorrect: boolean;
  explanation?: string;
}

export interface CodeQuestionConfig {
  language: string;
  template: string;
  testCases: QuizTestCase[];
  timeLimit?: number;
  memoryLimit?: number;
}

export interface QuizTestCase {
  input: string;
  expectedOutput: string;
  isHidden: boolean;
}

export interface MatchingPair {
  left: string;
  right: string;
  leftId: string;
  rightId: string;
}

export interface FillInBlank {
  id: string;
  position: number;
  correctAnswer: string;
  acceptableAnswers?: string[];
  caseSensitive: boolean;
}

// Quiz attempt
export interface QuizAttempt {
  id: string;
  quizId: string;
  userId: string;
  attemptNumber: number;
  status: AttemptStatus;
  answers: QuizAnswer[];
  score: number;
  maxScore: number;
  percentage: number;
  passed: boolean;
  startedAt: string;
  submittedAt?: string;
  timeSpent: number; // seconds
  timeRemaining?: number; // seconds
  ipAddress?: string;
}

export type AttemptStatus =
  | "in-progress"
  | "submitted"
  | "graded"
  | "timed-out"
  | "abandoned";

export interface QuizAnswer {
  questionId: string;
  answer: string | string[];
  isCorrect: boolean;
  points: number;
  timeSpent: number; // seconds
  submittedAt: string;
}

// Quiz results
export interface QuizResult {
  attemptId: string;
  quizId: string;
  userId: string;
  score: number;
  maxScore: number;
  percentage: number;
  passed: boolean;
  passingScore: number;
  answers: QuizResultAnswer[];
  totalCorrect: number;
  totalIncorrect: number;
  totalSkipped: number;
  timeSpent: number;
  rank?: number;
  percentile?: number;
}

export interface QuizResultAnswer {
  questionId: string;
  question: string;
  userAnswer: string | string[];
  correctAnswer: string | string[];
  isCorrect: boolean;
  points: number;
  maxPoints: number;
  explanation?: string;
  timeSpent: number;
}

// Quiz statistics
export interface QuizStats {
  quizId: string;
  totalAttempts: number;
  uniqueAttempts: number;
  averageScore: number;
  medianScore: number;
  highestScore: number;
  lowestScore: number;
  passRate: number;
  averageTimeSpent: number;
  questionStats: QuestionStats[];
  scoreDistribution: ScoreDistribution[];
}

export interface QuestionStats {
  questionId: string;
  type: QuestionType;
  correctRate: number;
  averageTimeSpent: number;
  skipRate: number;
  optionStats: OptionStats[];
}

export interface OptionStats {
  optionId: string;
  text: string;
  selectedCount: number;
  percentage: number;
}

export interface ScoreDistribution {
  range: string;
  count: number;
  percentage: number;
}

// Quiz session (for real-time quizzes)
export interface QuizSession {
  id: string;
  quizId: string;
  userId: string;
  currentQuestionIndex: number;
  answers: Map<string, string | string[]>;
  startedAt: string;
  timeRemaining: number;
  isComplete: boolean;
}

// Quiz filters
export interface QuizFilters {
  courseId?: string;
  moduleId?: string;
  status?: "published" | "draft" | "all";
  sortBy?: "newest" | "popular" | "score";
}

// Input types
export interface CreateQuizInput {
  moduleId: string;
  title: string;
  description: string;
  instructions?: string;
  timeLimit?: number;
  maxAttempts?: number;
  passingScore?: number;
  shuffleQuestions?: boolean;
  shuffleOptions?: boolean;
  showAnswers?: boolean;
  showScore?: boolean;
  weight?: number;
}

export interface CreateQuestionInput {
  type: QuestionType;
  content: string;
  options?: Omit<QuestionOption, "id">[];
  correctAnswer: string | string[];
  explanation?: string;
  points?: number;
  required?: boolean;
  hint?: string;
  image?: string;
  codeConfig?: CodeQuestionConfig;
  matchingPairs?: Omit<MatchingPair, "leftId" | "rightId">[];
  fillInBlanks?: Omit<FillInBlank, "id">[];
}

export interface UpdateQuizInput extends Partial<Omit<CreateQuizInput, "moduleId">> {
  isPublished?: boolean;
}

export interface SubmitQuizAttemptInput {
  quizId: string;
  answers: Array<{
    questionId: string;
    answer: string | string[];
  }>;
  timeSpent: number;
}
