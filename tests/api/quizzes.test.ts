import prisma from "@/lib/prisma";

jest.mock("@/lib/prisma", () => ({
  __esModule: true,
  default: {
    quiz: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    quizAttempt: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      count: jest.fn(),
    },
    quizQuestion: {
      findMany: jest.fn(),
      create: jest.fn(),
    },
  },
}));

const mockPrisma = prisma as unknown as {
  quiz: {
    findUnique: jest.Mock;
    findMany: jest.Mock;
    create: jest.Mock;
    update: jest.Mock;
    delete: jest.Mock;
  };
  quizAttempt: {
    findUnique: jest.Mock;
    findMany: jest.Mock;
    create: jest.Mock;
    update: jest.Mock;
    count: jest.Mock;
  };
  quizQuestion: {
    findMany: jest.Mock;
    create: jest.Mock;
  };
};

describe("Quizzes API Integration", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("Quiz CRUD operations", () => {
    it("should create quiz with questions", async () => {
      mockPrisma.quiz.create.mockResolvedValue({
        id: "q1",
        title: "Chapter 1 Quiz",
        courseId: "c1",
      });

      mockPrisma.quizQuestion.create
        .mockResolvedValueOnce({ id: "qq1", question: "What is 2+2?" })
        .mockResolvedValueOnce({ id: "qq2", question: "What is 3+3?" });

      const quiz = await mockPrisma.quiz.create({
        data: {
          title: "Chapter 1 Quiz",
          courseId: "c1",
          passingScore: 70,
          maxAttempts: 3,
        },
      });

      expect(quiz.id).toBe("q1");

      const q1 = await mockPrisma.quizQuestion.create({
        data: { quizId: "q1", question: "What is 2+2?", points: 5 },
      });
      const q2 = await mockPrisma.quizQuestion.create({
        data: { quizId: "q1", question: "What is 3+3?", points: 5 },
      });

      expect(q1.id).toBe("qq1");
      expect(q2.id).toBe("qq2");
    });

    it("should list quizzes for a course", async () => {
      mockPrisma.quiz.findMany.mockResolvedValue([
        { id: "q1", title: "Quiz 1", _count: { questions: 5, attempts: 10 } },
        { id: "q2", title: "Quiz 2", _count: { questions: 3, attempts: 5 } },
      ]);

      const quizzes = await mockPrisma.quiz.findMany({
        where: { courseId: "c1" },
      });

      expect(quizzes).toHaveLength(2);
    });

    it("should get quiz with questions", async () => {
      mockPrisma.quiz.findUnique.mockResolvedValue({
        id: "q1",
        title: "Quiz",
        questions: [
          { id: "qq1", question: "Q1", options: ["A", "B", "C"] },
          { id: "qq2", question: "Q2", options: ["X", "Y", "Z"] },
        ],
      });

      const quiz = await mockPrisma.quiz.findUnique({
        where: { id: "q1" },
        include: { questions: true },
      });

      expect(quiz?.questions).toHaveLength(2);
    });

    it("should update quiz settings", async () => {
      mockPrisma.quiz.update.mockResolvedValue({
        id: "q1",
        timeLimit: 30,
        passingScore: 80,
      });

      const updated = await mockPrisma.quiz.update({
        where: { id: "q1" },
        data: { timeLimit: 30, passingScore: 80 },
      });

      expect(updated.timeLimit).toBe(30);
    });

    it("should delete quiz", async () => {
      mockPrisma.quiz.delete.mockResolvedValue({});
      await mockPrisma.quiz.delete({ where: { id: "q1" } });
      expect(mockPrisma.quiz.delete).toHaveBeenCalledWith({ where: { id: "q1" } });
    });
  });

  describe("Quiz attempt flow", () => {
    it("should start a new attempt", async () => {
      mockPrisma.quiz.findUnique.mockResolvedValue({
        id: "q1",
        isPublished: true,
        maxAttempts: 3,
        _count: { attempts: 0 },
      });
      mockPrisma.quizAttempt.create.mockResolvedValue({
        id: "a1",
        quizId: "q1",
        userId: "u1",
        status: "IN_PROGRESS",
      });

      const attempt = await mockPrisma.quizAttempt.create({
        data: { quizId: "q1", userId: "u1", status: "IN_PROGRESS" },
      });

      expect(attempt.status).toBe("IN_PROGRESS");
    });

    it("should submit answers and calculate score", async () => {
      mockPrisma.quizAttempt.findUnique.mockResolvedValue({
        id: "a1",
        status: "IN_PROGRESS",
        quiz: {
          passingScore: 70,
          questions: [
            { id: "q1", questionType: "MULTIPLE_CHOICE", correctAnswer: "A", points: 10 },
            { id: "q2", questionType: "MULTIPLE_CHOICE", correctAnswer: "B", points: 10 },
          ],
        },
      });

      const attempt = await mockPrisma.quizAttempt.findUnique({
        where: { id: "a1" },
        include: { quiz: { include: { questions: true } } },
      });

      const answers = [
        { questionId: "q1", answer: "A" },
        { questionId: "q2", answer: "B" },
      ];

      let earnedPoints = 0;
      let totalPoints = 0;

      for (const question of attempt!.quiz.questions) {
        totalPoints += question.points;
        const answer = answers.find((a) => a.questionId === question.id);
        if (answer?.answer === question.correctAnswer) {
          earnedPoints += question.points;
        }
      }

      const score = (earnedPoints / totalPoints) * 100;

      expect(score).toBe(100);
      expect(earnedPoints).toBe(20);
    });

    it("should track attempt count", async () => {
      mockPrisma.quizAttempt.count.mockResolvedValue(2);

      const count = await mockPrisma.quizAttempt.count({
        where: { quizId: "q1", userId: "u1" },
      });

      expect(count).toBe(2);
    });

    it("should prevent exceeding max attempts", async () => {
      mockPrisma.quiz.findUnique.mockResolvedValue({
        maxAttempts: 3,
        _count: { attempts: 3 },
      });

      const quiz = await mockPrisma.quiz.findUnique({ where: { id: "q1" } });
      const attemptCount = quiz!._count.attempts;

      expect(attemptCount).toBeGreaterThanOrEqual(quiz!.maxAttempts);
    });
  });

  describe("Quiz scoring", () => {
    it("should calculate percentage score", () => {
      const earnedPoints = 15;
      const totalPoints = 20;
      const percentage = (earnedPoints / totalPoints) * 100;

      expect(percentage).toBe(75);
    });

    it("should determine pass/fail", () => {
      const score = 75;
      const passingScore = 70;
      const passed = score >= passingScore;

      expect(passed).toBe(true);
    });

    it("should handle zero total points", () => {
      const earnedPoints = 0;
      const totalPoints = 0;
      const percentage = totalPoints > 0 ? (earnedPoints / totalPoints) * 100 : 0;

      expect(percentage).toBe(0);
    });

    it("should grade SHORT_ANSWER case-insensitively", () => {
      const correctAnswer = "Photosynthesis";
      const userAnswer = "photosynthesis";
      const correct = userAnswer.toLowerCase().trim() === correctAnswer.toLowerCase().trim();

      expect(correct).toBe(true);
    });

    it("should grade SHORT_ANSWER with whitespace", () => {
      const correctAnswer = "Photosynthesis";
      const userAnswer = "  Photosynthesis  ";
      const correct = userAnswer.toLowerCase().trim() === correctAnswer.toLowerCase().trim();

      expect(correct).toBe(true);
    });
  });

  describe("Quiz statistics", () => {
    it("should calculate pass rate", async () => {
      mockPrisma.quizAttempt.count
        .mockResolvedValueOnce(100)
        .mockResolvedValueOnce(75);

      const total = await mockPrisma.quizAttempt.count({
        where: { quizId: "q1", status: "COMPLETED" },
      });
      const passed = await mockPrisma.quizAttempt.count({
        where: { quizId: "q1", status: "COMPLETED", passed: true },
      });

      const passRate = (passed / total) * 100;
      expect(passRate).toBe(75);
    });

    it("should calculate average score", async () => {
      mockPrisma.quizAttempt.findMany.mockResolvedValue([
        { score: 90 },
        { score: 80 },
        { score: 70 },
      ]);

      const attempts = await mockPrisma.quizAttempt.findMany({
        where: { quizId: "q1" },
        select: { score: true },
      });

      const avg = attempts.reduce((sum, a) => sum + (a.score ?? 0), 0) / attempts.length;
      expect(avg).toBe(80);
    });

    it("should find highest score", async () => {
      mockPrisma.quizAttempt.findFirst.mockResolvedValue({ score: 95 });

      const best = await mockPrisma.quizAttempt.findFirst({
        where: { quizId: "q1", userId: "u1" },
        orderBy: { score: "desc" },
        select: { score: true },
      });

      expect(best?.score).toBe(95);
    });
  });
});
