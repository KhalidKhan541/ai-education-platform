import prisma from "@/lib/prisma";

export interface CreateQuizData {
  courseId: string;
  lessonId?: string;
  title: string;
  description?: string;
  instructions?: string;
  timeLimit?: number;
  maxAttempts?: number;
  passingScore?: number;
  shuffleQuestions?: boolean;
  showResults?: boolean;
  showCorrectAnswers?: boolean;
  isPublished?: boolean;
}

export interface QuizAnswer {
  questionId: string;
  answer: unknown;
}

export interface QuizResult {
  quizAttemptId: string;
  score: number;
  passed: boolean;
  totalPoints: number;
  earnedPoints: number;
  answers: Array<{
    questionId: string;
    correct: boolean;
    points: number;
    explanation?: string;
  }>;
}

export class QuizService {
  static async getQuizzesByCourse(courseId: string) {
    return prisma.quiz.findMany({
      where: { courseId },
      include: {
        _count: { select: { questions: true, attempts: true } },
      },
      orderBy: { createdAt: "desc" },
    });
  }

  static async getQuizById(id: string) {
    return prisma.quiz.findUnique({
      where: { id },
      include: {
        questions: { orderBy: { sortOrder: "asc" } },
        course: { select: { id: true, title: true } },
        _count: { select: { attempts: true } },
      },
    });
  }

  static async createQuiz(data: CreateQuizData) {
    return prisma.quiz.create({
      data: {
        courseId: data.courseId,
        lessonId: data.lessonId,
        title: data.title,
        description: data.description,
        instructions: data.instructions,
        timeLimit: data.timeLimit,
        maxAttempts: data.maxAttempts ?? 3,
        passingScore: data.passingScore ?? 70,
        shuffleQuestions: data.shuffleQuestions ?? false,
        showResults: data.showResults ?? true,
        showCorrectAnswers: data.showCorrectAnswers ?? true,
        isPublished: data.isPublished ?? false,
      },
    });
  }

  static async updateQuiz(id: string, data: Partial<CreateQuizData>) {
    return prisma.quiz.update({ where: { id }, data });
  }

  static async deleteQuiz(id: string) {
    return prisma.quiz.delete({ where: { id } });
  }

  static async startAttempt(quizId: string, userId: string) {
    const quiz = await prisma.quiz.findUnique({
      where: { id: quizId },
      include: { _count: { select: { attempts: { where: { userId } } } } },
    });

    if (!quiz) throw new Error("Quiz not found");
    if (!quiz.isPublished) throw new Error("Quiz is not published");
    if (quiz._count.attempts >= quiz.maxAttempts) throw new Error("Maximum attempts reached");

    return prisma.quizAttempt.create({
      data: {
        quizId,
        userId,
        status: "IN_PROGRESS",
        startedAt: new Date(),
      },
      include: {
        quiz: {
          include: { questions: { orderBy: { sortOrder: "asc" } } },
        },
      },
    });
  }

  static async submitAttempt(attemptId: string, answers: QuizAnswer[]): Promise<QuizResult> {
    const attempt = await prisma.quizAttempt.findUnique({
      where: { id: attemptId },
      include: {
        quiz: { include: { questions: true } },
      },
    });

    if (!attempt) throw new Error("Attempt not found");
    if (attempt.status !== "IN_PROGRESS") throw new Error("Attempt already submitted");

    const results = answers.map((answer) => {
      const question = attempt.quiz.questions.find((q) => q.id === answer.questionId);
      if (!question) return { questionId: answer.questionId, correct: false, points: 0 };

      let correct = false;
      if (question.questionType === "MULTIPLE_CHOICE" || question.questionType === "TRUE_FALSE") {
        correct = answer.answer === question.correctAnswer;
      } else if (question.questionType === "SHORT_ANSWER") {
        correct = String(answer.answer).toLowerCase().trim() === String(question.correctAnswer).toLowerCase().trim();
      }

      return {
        questionId: question.id,
        correct,
        points: correct ? question.points : 0,
        explanation: question.explanation ?? undefined,
      };
    });

    const totalPoints = attempt.quiz.questions.reduce((sum, q) => sum + q.points, 0);
    const earnedPoints = results.reduce((sum, r) => sum + r.points, 0);
    const score = totalPoints > 0 ? (earnedPoints / totalPoints) * 100 : 0;
    const passed = score >= attempt.quiz.passingScore;

    const updatedAttempt = await prisma.quizAttempt.update({
      where: { id: attemptId },
      data: {
        answers: JSON.stringify(answers),
        score,
        passed,
        totalPoints,
        earnedPoints,
        status: "COMPLETED",
        completedAt: new Date(),
      },
    });

    return {
      quizAttemptId: updatedAttempt.id,
      score,
      passed,
      totalPoints,
      earnedPoints,
      answers: results,
    };
  }

  static async getUserAttempts(quizId: string, userId: string) {
    return prisma.quizAttempt.findMany({
      where: { quizId, userId },
      orderBy: { startedAt: "desc" },
    });
  }

  static async canAttempt(quizId: string, userId: string): Promise<boolean> {
    const quiz = await prisma.quiz.findUnique({
      where: { id: quizId },
      include: { _count: { select: { attempts: { where: { userId } } } } },
    });

    if (!quiz || !quiz.isPublished) return false;
    return quiz._count.attempts < quiz.maxAttempts;
  }

  static async getQuizStats(quizId: string) {
    const [attempts, passedAttempts, scores] = await Promise.all([
      prisma.quizAttempt.count({ where: { quizId, status: "COMPLETED" } }),
      prisma.quizAttempt.count({ where: { quizId, status: "COMPLETED", passed: true } }),
      prisma.quizAttempt.findMany({
        where: { quizId, status: "COMPLETED" },
        select: { score: true },
      }),
    ]);

    const scoreValues = scores.map((s) => s.score ?? 0);
    const avgScore = scoreValues.length > 0 ? scoreValues.reduce((a, b) => a + b, 0) / scoreValues.length : 0;

    return {
      totalAttempts: attempts,
      passedAttempts,
      passRate: attempts > 0 ? (passedAttempts / attempts) * 100 : 0,
      avgScore,
      highestScore: scoreValues.length > 0 ? Math.max(...scoreValues) : 0,
      lowestScore: scoreValues.length > 0 ? Math.min(...scoreValues) : 0,
    };
  }

  static async getBestScore(quizId: string, userId: string): Promise<number> {
    const best = await prisma.quizAttempt.findFirst({
      where: { quizId, userId, status: "COMPLETED" },
      orderBy: { score: "desc" },
      select: { score: true },
    });
    return best?.score ?? 0;
  }
}
