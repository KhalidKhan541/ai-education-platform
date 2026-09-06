import { ProgressService } from "@/lib/lessons/progress-service";
import prisma from "@/lib/prisma";

jest.mock("@/lib/prisma", () => ({
  __esModule: true,
  default: {
    progress: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      count: jest.fn(),
    },
    lesson: {
      findMany: jest.fn(),
      count: jest.fn(),
    },
  },
}));

const mockPrisma = prisma as unknown as {
  progress: {
    findUnique: jest.Mock;
    findMany: jest.Mock;
    create: jest.Mock;
    update: jest.Mock;
    count: jest.Mock;
  };
  lesson: {
    findMany: jest.Mock;
    count: jest.Mock;
  };
};

describe("ProgressService", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("updateProgress", () => {
    it("should create new progress record", async () => {
      mockPrisma.progress.findUnique.mockResolvedValue(null);
      mockPrisma.progress.create.mockResolvedValue({
        id: "p1",
        userId: "u1",
        lessonId: "l1",
        completed: true,
      });

      const result = await ProgressService.updateProgress({
        userId: "u1",
        lessonId: "l1",
        completed: true,
        timeSpentSeconds: 120,
      });

      expect(result.completed).toBe(true);
      expect(mockPrisma.progress.create).toHaveBeenCalled();
    });

    it("should update existing progress record", async () => {
      mockPrisma.progress.findUnique.mockResolvedValue({
        id: "p1",
        timeSpentSeconds: 60,
        completed: false,
        score: null,
      });
      mockPrisma.progress.update.mockResolvedValue({});

      await ProgressService.updateProgress({
        userId: "u1",
        lessonId: "l1",
        completed: true,
        timeSpentSeconds: 120,
        score: 95,
      });

      expect(mockPrisma.progress.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            completed: true,
            timeSpentSeconds: 180,
            score: 95,
          }),
        })
      );
    });

    it("should set completedAt when completing", async () => {
      mockPrisma.progress.findUnique.mockResolvedValue({
        id: "p1",
        completed: false,
        timeSpentSeconds: 0,
        score: null,
      });
      mockPrisma.progress.update.mockResolvedValue({});

      await ProgressService.updateProgress({
        userId: "u1",
        lessonId: "l1",
        completed: true,
      });

      expect(mockPrisma.progress.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            completedAt: expect.any(Date),
          }),
        })
      );
    });
  });

  describe("getProgress", () => {
    it("should return progress record", async () => {
      const mockProgress = { id: "p1", completed: true, lesson: { id: "l1" } };
      mockPrisma.progress.findUnique.mockResolvedValue(mockProgress);

      const result = await ProgressService.getProgress("u1", "l1");
      expect(result).toEqual(mockProgress);
    });

    it("should return null if no progress", async () => {
      mockPrisma.progress.findUnique.mockResolvedValue(null);
      const result = await ProgressService.getProgress("u1", "l1");
      expect(result).toBeNull();
    });
  });

  describe("getUserCourseProgress", () => {
    it("should calculate course progress", async () => {
      mockPrisma.lesson.findMany.mockResolvedValue([{ id: "l1" }, { id: "l2" }, { id: "l3" }]);
      mockPrisma.progress.findMany.mockResolvedValue([
        { lessonId: "l1", completed: true, timeSpentSeconds: 100, score: 90 },
        { lessonId: "l2", completed: true, timeSpentSeconds: 150, score: 85 },
        { lessonId: "l3", completed: false, timeSpentSeconds: 50, score: null },
      ]);

      const result = await ProgressService.getUserCourseProgress("u1", "c1");

      expect(result.totalLessons).toBe(3);
      expect(result.completedLessons).toBe(2);
      expect(result.progressPercent).toBeCloseTo(66.67, 1);
      expect(result.totalTimeSpent).toBe(300);
      expect(result.avgScore).toBeCloseTo(87.5, 1);
    });

    it("should handle zero lessons", async () => {
      mockPrisma.lesson.findMany.mockResolvedValue([]);
      mockPrisma.progress.findMany.mockResolvedValue([]);

      const result = await ProgressService.getUserCourseProgress("u1", "c1");
      expect(result.totalLessons).toBe(0);
      expect(result.progressPercent).toBe(0);
    });
  });

  describe("getUserProgress", () => {
    it("should return user progress history", async () => {
      mockPrisma.progress.findMany.mockResolvedValue([{ id: "p1", lesson: { course: {} } }]);
      const result = await ProgressService.getUserProgress("u1");
      expect(result).toHaveLength(1);
    });
  });

  describe("markComplete", () => {
    it("should mark lesson as complete", async () => {
      mockPrisma.progress.findUnique.mockResolvedValue(null);
      mockPrisma.progress.create.mockResolvedValue({});

      await ProgressService.markComplete("u1", "l1");
      expect(mockPrisma.progress.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ completed: true }),
        })
      );
    });
  });

  describe("isLessonComplete", () => {
    it("should return true if lesson is complete", async () => {
      mockPrisma.progress.findUnique.mockResolvedValue({ completed: true });
      const result = await ProgressService.isLessonComplete("u1", "l1");
      expect(result).toBe(true);
    });

    it("should return false if lesson is not complete", async () => {
      mockPrisma.progress.findUnique.mockResolvedValue({ completed: false });
      const result = await ProgressService.isLessonComplete("u1", "l1");
      expect(result).toBe(false);
    });

    it("should return false if no progress record", async () => {
      mockPrisma.progress.findUnique.mockResolvedValue(null);
      const result = await ProgressService.isLessonComplete("u1", "l1");
      expect(result).toBe(false);
    });
  });

  describe("getCompletionRate", () => {
    it("should calculate completion rate", async () => {
      mockPrisma.lesson.count.mockResolvedValue(10);
      mockPrisma.progress.count.mockResolvedValue(6);

      const result = await ProgressService.getCompletionRate("c1", "u1");
      expect(result).toBe(60);
    });

    it("should return 0 for no lessons", async () => {
      mockPrisma.lesson.count.mockResolvedValue(0);
      const result = await ProgressService.getCompletionRate("c1", "u1");
      expect(result).toBe(0);
    });
  });
});
