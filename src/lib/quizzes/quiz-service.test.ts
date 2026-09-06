import { QuizService } from "@/lib/quizzes/quiz-service";
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
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      count: jest.fn(),
    },
    quizQuestion: {
      findMany: jest.fn(),
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
    findFirst: jest.Mock;
    create: jest.Mock;
    update: jest.Mock;
    count: jest.Mock;
  };
  quizQuestion: { findMany: jest.Mock };
};

describe("QuizService", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("getQuizzesByCourse", () => {
    it("should return quizzes for a course", async () => {
      mockPrisma.quiz.findMany.mockResolvedValue([
        { id: "q1", title: "Quiz 1", _count: { questions: 5, attempts: 10 } },
      ]);

      const result = await QuizService.getQuizzesByCourse("c1");
      expect(result).toHaveLength(1);
    });
  });

  describe("getQuizById", () => {
    it("should return quiz with questions", async () => {
      const mockQuiz = { id: "q1", questions: [], course: {} };
      mockPrisma.quiz.findUnique.mockResolvedValue(mockQuiz);

      const result = await QuizService.getQuizById("q1");
      expect(result).toEqual(mockQuiz);
    });
  });

  describe("createQuiz", () => {
    it("should create quiz with defaults", async () => {
      mockPrisma.quiz.create.mockResolvedValue({ id: "q1" });

      await QuizService.createQuiz({
        courseId: "c1",
        title: "Midterm Quiz",
      });

      expect(mockPrisma.quiz.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            courseId: "c1",
            title: "Midterm Quiz",
            maxAttempts: 3,
            passingScore: 70,
            shuffleQuestions: false,
            showResults: true,
            isPublished: false,
          }),
        })
      );
    });
  });

  describe("updateQuiz", () => {
    it("should update quiz", async () => {
      mockPrisma.quiz.update.mockResolvedValue({});
      await QuizService.updateQuiz("q1", { title: "Updated" });
      expect(mockPrisma.quiz.update).toHaveBeenCalled();
    });
  });

  describe("deleteQuiz", () => {
    it("should delete quiz", async () => {
      mockPrisma.quiz.delete.mockResolvedValue({});
      await QuizService.deleteQuiz("q1");
      expect(mockPrisma.quiz.delete).toHaveBeenCalledWith({ where: { id: "q1" } });
    });
  });

  describe("startAttempt", () => {
    it("should start a new attempt", async () => {
      mockPrisma.quiz.findUnique.mockResolvedValue({
        id: "q1",
        isPublished: true,
        maxAttempts: 3,
        _count: { attempts: 0 },
      });
      mockPrisma.quizAttempt.create.mockResolvedValue({
        id: "a1",
        quiz: { questions: [] },
      });

      const result = await QuizService.startAttempt("q1", "u1");
      expect(result.id).toBe("a1");
    });

    it("should fail if quiz not found", async () => {
      mockPrisma.quiz.findUnique.mockResolvedValue(null);

      await expect(QuizService.startAttempt("x", "u1")).rejects.toThrow("Quiz not found");
    });

    it("should fail if quiz not published", async () => {
      mockPrisma.quiz.findUnique.mockResolvedValue({
        isPublished: false,
        _count: { attempts: 0 },
      });

      await expect(QuizService.startAttempt("q1", "u1")).rejects.toThrow("Quiz is not published");
    });

    it("should fail if max attempts reached", async () => {
      mockPrisma.quiz.findUnique.mockResolvedValue({
        isPublished: true,
        maxAttempts: 2,
        _count: { attempts: 2 },
      });

      await expect(QuizService.startAttempt("q1", "u1")).rejects.toThrow("Maximum attempts reached");
    });
  });

  describe("submitAttempt", () => {
    it("should submit attempt and calculate score", async () => {
      mockPrisma.quizAttempt.findUnique.mockResolvedValue({
        id: "a1",
        status: "IN_PROGRESS",
        quiz: {
          passingScore: 70,
          questions: [
            { id: "q1", questionType: "MULTIPLE_CHOICE", correctAnswer: "A", points: 10 },
            { id: "q2", questionType: "TRUE_FALSE", correctAnswer: "true", points: 5 },
          ],
        },
      });
      mockPrisma.quizAttempt.update.mockResolvedValue({ id: "a1" });

      const result = await QuizService.submitAttempt("a1", [
        { questionId: "q1", answer: "A" },
        { questionId: "q2", answer: "true" },
      ]);

      expect(result.score).toBe(100);
      expect(result.passed).toBe(true);
      expect(result.earnedPoints).toBe(15);
      expect(result.totalPoints).toBe(15);
    });

    it("should calculate partial score", async () => {
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
      mockPrisma.quizAttempt.update.mockResolvedValue({});

      const result = await QuizService.submitAttempt("a1", [
        { questionId: "q1", answer: "A" },
        { questionId: "q2", answer: "C" },
      ]);

      expect(result.score).toBe(50);
      expect(result.passed).toBe(false);
      expect(result.earnedPoints).toBe(10);
    });

    it("should fail if attempt not found", async () => {
      mockPrisma.quizAttempt.findUnique.mockResolvedValue(null);

      await expect(QuizService.submitAttempt("x", [])).rejects.toThrow("Attempt not found");
    });

    it("should fail if attempt already submitted", async () => {
      mockPrisma.quizAttempt.findUnique.mockResolvedValue({
        status: "COMPLETED",
        quiz: { questions: [] },
      });

      await expect(QuizService.submitAttempt("a1", [])).rejects.toThrow("Attempt already submitted");
    });

    it("should grade SHORT_ANSWER case-insensitively", async () => {
      mockPrisma.quizAttempt.findUnique.mockResolvedValue({
        id: "a1",
        status: "IN_PROGRESS",
        quiz: {
          passingScore: 70,
          questions: [
            { id: "q1", questionType: "SHORT_ANSWER", correctAnswer: "Photosynthesis", points: 10 },
          ],
        },
      });
      mockPrisma.quizAttempt.update.mockResolvedValue({});

      const result = await QuizService.submitAttempt("a1", [
        { questionId: "q1", answer: "photosynthesis" },
      ]);

      expect(result.earnedPoints).toBe(10);
    });
  });

  describe("getUserAttempts", () => {
    it("should return user attempts", async () => {
      mockPrisma.quizAttempt.findMany.mockResolvedValue([{ id: "a1" }]);
      const result = await QuizService.getUserAttempts("q1", "u1");
      expect(result).toHaveLength(1);
    });
  });

  describe("canAttempt", () => {
    it("should return true if attempts available", async () => {
      mockPrisma.quiz.findUnique.mockResolvedValue({
        isPublished: true,
        maxAttempts: 3,
        _count: { attempts: 1 },
      });

      const result = await QuizService.canAttempt("q1", "u1");
      expect(result).toBe(true);
    });

    it("should return false if max attempts reached", async () => {
      mockPrisma.quiz.findUnique.mockResolvedValue({
        isPublished: true,
        maxAttempts: 2,
        _count: { attempts: 2 },
      });

      const result = await QuizService.canAttempt("q1", "u1");
      expect(result).toBe(false);
    });
  });

  describe("getQuizStats", () => {
    it("should return quiz statistics", async () => {
      mockPrisma.quizAttempt.count
        .mockResolvedValueOnce(20)
        .mockResolvedValueOnce(15);
      mockPrisma.quizAttempt.findMany.mockResolvedValue([
        { score: 90 },
        { score: 80 },
        { score: 70 },
      ]);

      const result = await QuizService.getQuizStats("q1");
      expect(result.totalAttempts).toBe(20);
      expect(result.passedAttempts).toBe(15);
      expect(result.passRate).toBe(75);
      expect(result.avgScore).toBe(80);
      expect(result.highestScore).toBe(90);
      expect(result.lowestScore).toBe(70);
    });
  });

  describe("getBestScore", () => {
    it("should return best score", async () => {
      mockPrisma.quizAttempt.findFirst.mockResolvedValue({ score: 95 });
      const result = await QuizService.getBestScore("q1", "u1");
      expect(result).toBe(95);
    });

    it("should return 0 if no attempts", async () => {
      mockPrisma.quizAttempt.findFirst.mockResolvedValue(null);
      const result = await QuizService.getBestScore("q1", "u1");
      expect(result).toBe(0);
    });
  });
});
