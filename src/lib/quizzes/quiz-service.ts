import prisma from "@/lib/prisma";
import { generateId } from "@/lib/utils";
import type { Quiz, QuizQuestion, QuizAttempt, QuestionType, Prisma } from "@prisma/client";

// ── Types ──────────────────────────────────────────────────────────────

export type QuizWithQuestions = Quiz & {
  questions: (QuizQuestion & {
    options: { id: string; text: string; isCorrect: boolean; order: number }[];
  })[];
  _count: { attempts: number };
};

export type AttemptWithAnswers = QuizAttempt & {
  quiz: { id: string; title: string; maxScore: number; timeLimit: number | null };
  answers: {
    id: string;
    questionId: string;
    selectedOptionId: string | null;
    textAnswer: string | null;
    isCorrect: boolean | null;
    score: number | null;
  }[];
  user: { id: string; name: string | null; email: string };
};

export interface CreateQuizInput {
  lessonId: string;
  title: string;
  description?: string;
  timeLimit?: number;
  maxAttempts?: number;
  passingScore: number;
  maxScore: number;
  shuffleQuestions?: boolean;
  showAnswers?: boolean;
  showScore?: boolean;
  questions: CreateQuestionInput[];
}

export interface UpdateQuizInput {
  title?: string;
  description?: string;
  timeLimit?: number;
  maxAttempts?: number;
  passingScore?: number;
  maxScore?: number;
  shuffleQuestions?: boolean;
  showAnswers?: boolean;
  showScore?: boolean;
}

export interface CreateQuestionInput {
  type: QuestionType;
  text: string;
  explanation?: string;
  points?: number;
  order?: number;
  options?: { text: string; isCorrect: boolean; order?: number }[];
  correctAnswer?: string;
  placeholder?: string;
  minLength?: number;
  maxLength?: number;
  rubric?: string;
  sampleAnswer?: string;
}

export interface UpdateQuestionInput {
  text?: string;
  explanation?: string;
  points?: number;
  order?: number;
  options?: { id?: string; text: string; isCorrect: boolean; order?: number }[];
  correctAnswer?: string;
  placeholder?: string;
  minLength?: number;
  maxLength?: number;
  rubric?: string;
  sampleAnswer?: string;
}

export interface StartAttemptInput {
  quizId: string;
  userId: string;
}

export interface SubmitAttemptInput {
  attemptId: string;
  answers: AnswerInput[];
}

export interface AnswerInput {
  questionId: string;
  selectedOptionId?: string;
  textAnswer?: string;
}

export interface QuizFilter {
  lessonId?: string;
  courseId?: string;
  search?: string;
  page?: number;
  limit?: number;
}

export interface QuizAnalytics {
  totalAttempts: number;
  averageScore: number;
  medianScore: number;
  passRate: number;
  averageTimeTaken: number;
  scoreDistribution: { range: string; count: number }[];
  questionAnalytics: QuestionAnalytics[];
  attemptTrend: { date: string; count: number }[];
}

export interface QuestionAnalytics {
  questionId: string;
  text: string;
  type: string;
  correctRate: number;
  averageScore: number;
  skipRate: number;
  optionBreakdown?: { optionId: string; text: string; selectedCount: number; percentage: number }[];
}

// ── Service ────────────────────────────────────────────────────────────

export const QuizService = {
  // ── Quiz CRUD ──────────────────────────────────────────────────────

  async create(input: CreateQuizInput): Promise<Quiz> {
    const lesson = await prisma.lesson.findUnique({
      where: { id: input.lessonId },
    });
    if (!lesson) throw new Error("Lesson not found");

    return prisma.$transaction(async (tx) => {
      const quiz = await tx.quiz.create({
        data: {
          id: generateId(),
          lessonId: input.lessonId,
          title: input.title,
          description: input.description,
          timeLimit: input.timeLimit,
          maxAttempts: input.maxAttempts ?? 3,
          passingScore: input.passingScore,
          maxScore: input.maxScore,
          shuffleQuestions: input.shuffleQuestions ?? false,
          showAnswers: input.showAnswers ?? false,
          showScore: input.showScore ?? true,
        },
      });

      for (const question of input.questions) {
        const q = await tx.quizQuestion.create({
          data: {
            id: generateId(),
            quizId: quiz.id,
            type: question.type,
            text: question.text,
            explanation: question.explanation,
            points: question.points ?? 1,
            order: question.order ?? 0,
            correctAnswer: question.correctAnswer,
            placeholder: question.placeholder,
            minLength: question.minLength,
            maxLength: question.maxLength,
            rubric: question.rubric,
            sampleAnswer: question.sampleAnswer,
          },
        });

        if (question.options?.length) {
          await tx.questionOption.createMany({
            data: question.options.map((opt, i) => ({
              id: generateId(),
              questionId: q.id,
              text: opt.text,
              isCorrect: opt.isCorrect,
              order: opt.order ?? i,
            })),
          });
        }
      }

      return quiz;
    });
  },

  async getById(id: string): Promise<QuizWithQuestions | null> {
    return prisma.quiz.findUnique({
      where: { id },
      include: {
        questions: {
          include: {
            options: { orderBy: { order: "asc" } },
          },
          orderBy: { order: "asc" },
        },
        _count: { select: { attempts: true } },
      },
    });
  },

  async update(id: string, input: UpdateQuizInput): Promise<Quiz> {
    return prisma.quiz.update({ where: { id }, data: input });
  },

  async delete(id: string): Promise<void> {
    const attemptCount = await prisma.quizAttempt.count({
      where: { quizId: id },
    });
    if (attemptCount > 0) {
      throw new Error("Cannot delete quiz with attempts. Archive it instead.");
    }

    await prisma.questionOption.deleteMany({
      where: { question: { quizId: id } },
    });
    await prisma.quizQuestion.deleteMany({ where: { quizId: id } });
    await prisma.quiz.delete({ where: { id } });
  },

  async list(filters: QuizFilter = {}): Promise<{
    quizzes: (Quiz & { _count: { attempts: number } })[];
    total: number;
    page: number;
    limit: number;
  }> {
    const page = filters.page ?? 1;
    const limit = Math.min(filters.limit ?? 50, 100);
    const skip = (page - 1) * limit;

    const where: Prisma.QuizWhereInput = {};
    if (filters.lessonId) where.lessonId = filters.lessonId;
    if (filters.courseId) where.lesson = { courseModule: { courseId: filters.courseId } };
    if (filters.search) {
      where.OR = [
        { title: { contains: filters.search, mode: "insensitive" } },
        { description: { contains: filters.search, mode: "insensitive" } },
      ];
    }

    const [quizzes, total] = await Promise.all([
      prisma.quiz.findMany({
        where,
        include: { _count: { select: { attempts: true } } },
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      prisma.quiz.count({ where }),
    ]);

    return { quizzes, total, page, limit };
  },

  // ── Question Management ────────────────────────────────────────────

  async addQuestion(
    quizId: string,
    input: CreateQuestionInput
  ): Promise<QuizQuestion> {
    const maxOrder = await prisma.quizQuestion.findFirst({
      where: { quizId },
      orderBy: { order: "desc" },
      select: { order: true },
    });

    const question = await prisma.quizQuestion.create({
      data: {
        id: generateId(),
        quizId,
        type: input.type,
        text: input.text,
        explanation: input.explanation,
        points: input.points ?? 1,
        order: input.order ?? (maxOrder?.order ?? 0) + 1,
        correctAnswer: input.correctAnswer,
        placeholder: input.placeholder,
        minLength: input.minLength,
        maxLength: input.maxLength,
        rubric: input.rubric,
        sampleAnswer: input.sampleAnswer,
      },
    });

    if (input.options?.length) {
      await prisma.questionOption.createMany({
        data: input.options.map((opt, i) => ({
          id: generateId(),
          questionId: question.id,
          text: opt.text,
          isCorrect: opt.isCorrect,
          order: opt.order ?? i,
        })),
      });
    }

    return question;
  },

  async updateQuestion(
    questionId: string,
    input: UpdateQuestionInput
  ): Promise<QuizQuestion> {
    const data: Prisma.QuizQuestionUpdateInput = { ...input };

    if (input.options) {
      await prisma.questionOption.deleteMany({
        where: { questionId },
      });
      await prisma.questionOption.createMany({
        data: input.options.map((opt, i) => ({
          id: opt.id ?? generateId(),
          questionId,
          text: opt.text,
          isCorrect: opt.isCorrect,
          order: opt.order ?? i,
        })),
      });
    }

    return prisma.quizQuestion.update({ where: { id: questionId }, data });
  },

  async deleteQuestion(questionId: string): Promise<void> {
    await prisma.questionOption.deleteMany({ where: { questionId } });
    await prisma.quizQuestion.delete({ where: { id: questionId } });
  },

  async reorderQuestions(quizId: string, questionIds: string[]): Promise<void> {
    await prisma.$transaction(
      questionIds.map((questionId, index) =>
        prisma.quizQuestion.update({
          where: { id: questionId, quizId },
          data: { order: index + 1 },
        })
      )
    );
  },

  // ── Quiz Attempts ──────────────────────────────────────────────────

  async startAttempt(input: StartAttemptInput): Promise<QuizAttempt> {
    const quiz = await prisma.quiz.findUnique({
      where: { id: input.quizId },
      include: {
        questions: { orderBy: { order: "asc" } },
      },
    });
    if (!quiz) throw new Error("Quiz not found");

    const attemptCount = await prisma.quizAttempt.count({
      where: { quizId: input.quizId, userId: input.userId },
    });

    if (quiz.maxAttempts && attemptCount >= quiz.maxAttempts) {
      throw new Error(`Maximum attempts (${quiz.maxAttempts}) reached`);
    }

    const inProgress = await prisma.quizAttempt.findFirst({
      where: {
        quizId: input.quizId,
        userId: input.userId,
        status: "IN_PROGRESS",
      },
    });

    if (inProgress) return inProgress;

    const questionOrder = quiz.shuffleQuestions
      ? [...quiz.questions].sort(() => Math.random() - 0.5)
      : quiz.questions;

    return prisma.quizAttempt.create({
      data: {
        id: generateId(),
        quizId: input.quizId,
        userId: input.userId,
        status: "IN_PROGRESS",
        startedAt: new Date(),
        answers: [],
      },
    });
  },

  async submitAttempt(input: SubmitAttemptInput): Promise<AttemptWithAnswers> {
    const attempt = await prisma.quizAttempt.findUnique({
      where: { id: input.attemptId },
      include: {
        quiz: {
          include: {
            questions: {
              include: { options: true },
              orderBy: { order: "asc" },
            },
          },
        },
      },
    });

    if (!attempt) throw new Error("Attempt not found");
    if (attempt.status !== "IN_PROGRESS") throw new Error("Attempt already submitted");

    const timeTaken = Math.round(
      (Date.now() - attempt.startedAt.getTime()) / 1000
    );

    if (attempt.quiz.timeLimit && timeTaken > attempt.quiz.timeLimit * 60 * 1.1) {
      throw new Error("Time limit exceeded");
    }

    let totalScore = 0;
    const gradedAnswers: {
      questionId: string;
      selectedOptionId: string | null;
      textAnswer: string | null;
      isCorrect: boolean | null;
      score: number | null;
    }[] = [];

    const questionMap = new Map(
      attempt.quiz.questions.map((q) => [q.id, q])
    );

    for (const answer of input.answers) {
      const question = questionMap.get(answer.questionId);
      if (!question) continue;

      let isCorrect: boolean | null = null;
      let score: number | null = null;

      switch (question.type) {
        case "MULTIPLE_CHOICE":
        case "TRUE_FALSE": {
          const correctOption = question.options.find((o) => o.isCorrect);
          isCorrect = correctOption?.id === answer.selectedOptionId;
          score = isCorrect ? question.points : 0;
          break;
        }
        case "FILL_BLANK": {
          const correct = (question.correctAnswer ?? "").toLowerCase().trim();
          const userAnswer = (answer.textAnswer ?? "").toLowerCase().trim();
          isCorrect = correct === userAnswer;
          score = isCorrect ? question.points : 0;
          break;
        }
        case "ESSAY":
        case "SHORT_ANSWER":
        case "FILE_UPLOAD":
        case "CODING": {
          score = null;
          isCorrect = null;
          break;
        }
      }

      totalScore += score ?? 0;

      gradedAnswers.push({
        questionId: answer.questionId,
        selectedOptionId: answer.selectedOptionId ?? null,
        textAnswer: answer.textAnswer ?? null,
        isCorrect,
        score,
      });
    }

    const scorePercentage =
      attempt.quiz.maxScore > 0
        ? (totalScore / attempt.quiz.maxScore) * 100
        : 0;
    const passed = scorePercentage >= attempt.quiz.passingScore;

    return prisma.$transaction(async (tx) => {
      const updatedAttempt = await tx.quizAttempt.update({
        where: { id: input.attemptId },
        data: {
          status: "COMPLETED",
          submittedAt: new Date(),
          score: totalScore,
          passed,
          timeTaken,
        },
      });

      for (const answer of gradedAnswers) {
        await tx.quizAnswer.create({
          data: {
            id: generateId(),
            attemptId: input.attemptId,
            questionId: answer.questionId,
            selectedOptionId: answer.selectedOptionId,
            textAnswer: answer.textAnswer,
            isCorrect: answer.isCorrect,
            score: answer.score,
          },
        });
      }

      return tx.quizAttempt.findUnique({
        where: { id: input.attemptId },
        include: {
          quiz: {
            select: { id: true, title: true, maxScore: true, timeLimit: true },
          },
          answers: true,
          user: { select: { id: true, name: true, email: true } },
        },
      });
    }) as Promise<AttemptWithAnswers>;
  },

  async getUserAttempts(
    quizId: string,
    userId: string
  ): Promise<AttemptWithAnswers[]> {
    return prisma.quizAttempt.findMany({
      where: { quizId, userId },
      include: {
        quiz: {
          select: { id: true, title: true, maxScore: true, timeLimit: true },
        },
        answers: true,
        user: { select: { id: true, name: true, email: true } },
      },
      orderBy: { startedAt: "desc" },
    });
  },

  async getAttempt(attemptId: string): Promise<AttemptWithAnswers | null> {
    return prisma.quizAttempt.findUnique({
      where: { id: attemptId },
      include: {
        quiz: {
          select: { id: true, title: true, maxScore: true, timeLimit: true },
        },
        answers: true,
        user: { select: { id: true, name: true, email: true } },
      },
    });
  },

  async getTimeRemaining(attemptId: string): Promise<number | null> {
    const attempt = await prisma.quizAttempt.findUnique({
      where: { id: attemptId },
      include: { quiz: { select: { timeLimit: true } } },
    });

    if (!attempt || !attempt.quiz.timeLimit) return null;
    if (attempt.status !== "IN_PROGRESS") return null;

    const elapsed = (Date.now() - attempt.startedAt.getTime()) / 1000 / 60;
    const remaining = attempt.quiz.timeLimit - elapsed;
    return Math.max(0, Math.round(remaining * 60));
  },

  // ── Auto-Grading ──────────────────────────────────────────────────

  async autoGradeEssay(
    attemptId: string,
    questionId: string,
    graderId: string,
    score: number,
    feedback: string
  ): Promise<void> {
    const question = await prisma.quizQuestion.findUnique({
      where: { id: questionId },
    });
    if (!question) throw new Error("Question not found");
    if (!["ESSAY", "SHORT_ANSWER"].includes(question.type)) {
      throw new Error("Auto-grading is only available for essay questions");
    }

    const answer = await prisma.quizAnswer.findFirst({
      where: { attemptId, questionId },
    });
    if (!answer) throw new Error("Answer not found");

    await prisma.quizAnswer.update({
      where: { id: answer.id },
      data: {
        score: Math.min(score, question.points),
        isCorrect: score >= question.points * 0.5,
      },
    });

    const attempt = await prisma.quizAttempt.findUnique({
      where: { id: attemptId },
      include: { answers: { select: { score: true } } },
    });

    if (attempt) {
      const totalScore = attempt.answers.reduce(
        (acc, a) => acc + (a.score ?? 0),
        0
      );
      await prisma.quizAttempt.update({
        where: { id: attemptId },
        data: { score: totalScore },
      });
    }
  },

  // ── Analytics ──────────────────────────────────────────────────────

  async getAnalytics(quizId: string): Promise<QuizAnalytics> {
    const quiz = await prisma.quiz.findUnique({
      where: { id: quizId },
      include: {
        questions: {
          include: { options: true },
          orderBy: { order: "asc" },
        },
      },
    });
    if (!quiz) throw new Error("Quiz not found");

    const attempts = await prisma.quizAttempt.findMany({
      where: { quizId },
      include: {
        answers: {
          include: { question: { include: { options: true } } },
        },
      },
    });

    const completedAttempts = attempts.filter((a) => a.status === "COMPLETED");
    const scores = completedAttempts
      .map((a) => a.score ?? 0)
      .filter((s) => s !== null);

    const averageScore = scores.length > 0
      ? scores.reduce((a, b) => a + b, 0) / scores.length
      : 0;

    const sortedScores = [...scores].sort((a, b) => a - b);
    const medianScore = sortedScores.length > 0
      ? sortedScores[Math.floor(sortedScores.length / 2)]
      : 0;

    const passedAttempts = completedAttempts.filter((a) => a.passed);
    const passRate = completedAttempts.length > 0
      ? (passedAttempts.length / completedAttempts.length) * 100
      : 0;

    const averageTime = completedAttempts.length > 0
      ? completedAttempts.reduce((acc, a) => acc + (a.timeTaken ?? 0), 0) /
        completedAttempts.length
      : 0;

    const bucketSize = Math.ceil(quiz.maxScore / 5);
    const ranges = Array.from({ length: 5 }, (_, i) => {
      const low = i * bucketSize;
      const high = Math.min((i + 1) * bucketSize, quiz.maxScore);
      return { range: `${low}-${high}`, count: 0 };
    });

    scores.forEach((score) => {
      const bucketIndex = Math.min(
        Math.floor(score / bucketSize),
        ranges.length - 1
      );
      ranges[bucketIndex].count++;
    });

    const questionAnalytics: QuestionAnalytics[] = quiz.questions.map((q) => {
      const questionAnswers = completedAttempts.flatMap((a) =>
        a.answers.filter((ans) => ans.questionId === q.id)
      );

      const correctAnswers = questionAnswers.filter((a) => a.isCorrect === true);
      const correctRate = questionAnswers.length > 0
        ? (correctAnswers.length / questionAnswers.length) * 100
        : 0;

      const avgScore = questionAnswers.length > 0
        ? questionAnswers.reduce((acc, a) => acc + (a.score ?? 0), 0) /
          questionAnswers.length
        : 0;

      const skipRate = questionAnswers.length > 0
        ? (questionAnswers.filter(
            (a) => !a.selectedOptionId && !a.textAnswer
          ).length /
            questionAnswers.length) *
          100
        : 0;

      let optionBreakdown: QuestionAnalytics["optionBreakdown"] = undefined;
      if (q.options.length > 0) {
        optionBreakdown = q.options.map((opt) => {
          const selectedCount = questionAnswers.filter(
            (a) => a.selectedOptionId === opt.id
          ).length;
          return {
            optionId: opt.id,
            text: opt.text,
            selectedCount,
            percentage:
              questionAnswers.length > 0
                ? (selectedCount / questionAnswers.length) * 100
                : 0,
          };
        });
      }

      return {
        questionId: q.id,
        text: q.text,
        type: q.type,
        correctRate,
        averageScore: avgScore,
        skipRate,
        optionBreakdown,
      };
    });

    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const recentAttempts = completedAttempts.filter(
      (a) => a.submittedAt && a.submittedAt >= sevenDaysAgo
    );
    const attemptByDay = new Map<string, number>();
    recentAttempts.forEach((a) => {
      const date = a.submittedAt!.toISOString().split("T")[0];
      attemptByDay.set(date, (attemptByDay.get(date) ?? 0) + 1);
    });

    return {
      totalAttempts: attempts.length,
      averageScore: Math.round(averageScore * 100) / 100,
      medianScore,
      passRate: Math.round(passRate * 10) / 10,
      averageTimeTaken: Math.round(averageTime),
      scoreDistribution: ranges,
      questionAnalytics,
      attemptTrend: Array.from(attemptByDay.entries())
        .map(([date, count]) => ({ date, count }))
        .sort((a, b) => a.date.localeCompare(b.date)),
    };
  },

  async getLeaderboard(quizId: string, limit = 10) {
    const attempts = await prisma.quizAttempt.findMany({
      where: { quizId, status: "COMPLETED" },
      include: {
        user: { select: { id: true, name: true, image: true } },
      },
      orderBy: [{ score: "desc" }, { timeTaken: "asc" }],
      take: limit,
    });

    return attempts.map((a, index) => ({
      rank: index + 1,
      userId: a.user.id,
      name: a.user.name,
      image: a.user.image,
      score: a.score,
      timeTaken: a.timeTaken,
      passed: a.passed,
    }));
  },

  // ── Question Bank ──────────────────────────────────────────────────

  async createQuestionBank(
    questions: CreateQuestionInput[]
  ): Promise<QuizQuestion[]> {
    return prisma.$transaction(
      questions.map((q) =>
        prisma.quizQuestion.create({
          data: {
            id: generateId(),
            quizId: "BANK",
            type: q.type,
            text: q.text,
            explanation: q.explanation,
            points: q.points ?? 1,
            order: q.order ?? 0,
            correctAnswer: q.correctAnswer,
            placeholder: q.placeholder,
            minLength: q.minLength,
            maxLength: q.maxLength,
            rubric: q.rubric,
            sampleAnswer: q.sampleAnswer,
          },
        })
      )
    );
  },

  async importQuestionsFromBank(
    quizId: string,
    questionIds: string[]
  ): Promise<QuizQuestion[]> {
    const bankQuestions = await prisma.quizQuestion.findMany({
      where: { id: { in: questionIds }, quizId: "BANK" },
      include: { options: true },
    });

    return prisma.$transaction(
      bankQuestions.map((bq) =>
        prisma.quizQuestion.create({
          data: {
            id: generateId(),
            quizId,
            type: bq.type,
            text: bq.text,
            explanation: bq.explanation,
            points: bq.points,
            order: bq.order,
            correctAnswer: bq.correctAnswer,
            placeholder: bq.placeholder,
            minLength: bq.minLength,
            maxLength: bq.maxLength,
            rubric: bq.rubric,
            sampleAnswer: bq.sampleAnswer,
          },
        })
      )
    );
  },

  // ── Randomized Quiz Generation ─────────────────────────────────────

  async generateRandomQuiz(
    sourceQuizId: string,
    questionCount: number
  ): Promise<QuizQuestion[]> {
    const sourceQuiz = await prisma.quiz.findUnique({
      where: { id: sourceQuizId },
      include: {
        questions: {
          include: { options: true },
          orderBy: { order: "asc" },
        },
      },
    });
    if (!sourceQuiz) throw new Error("Source quiz not found");

    const shuffled = [...sourceQuiz.questions].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, questionCount);
  },
};

export default QuizService;
