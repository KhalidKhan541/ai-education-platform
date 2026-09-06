import { LessonService } from "@/lib/lessons/lesson-service";
import prisma from "@/lib/prisma";

jest.mock("@/lib/prisma", () => ({
  __esModule: true,
  default: {
    lesson: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
    },
    $transaction: jest.fn((fns: Promise<unknown>[]) => Promise.all(fns)),
  },
}));

const mockPrisma = prisma as unknown as {
  lesson: {
    findUnique: jest.Mock;
    findMany: jest.Mock;
    findFirst: jest.Mock;
    create: jest.Mock;
    update: jest.Mock;
    delete: jest.Mock;
    count: jest.Mock;
  };
  $transaction: jest.Mock;
};

describe("LessonService", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("getLessonsByCourse", () => {
    it("should return lessons for a course", async () => {
      const mockLessons = [
        { id: "l1", title: "Lesson 1", module: { id: "m1", title: "Module 1" }, _count: { contents: 2 } },
        { id: "l2", title: "Lesson 2", module: null, _count: { contents: 0 } },
      ];
      mockPrisma.lesson.findMany.mockResolvedValue(mockLessons);

      const result = await LessonService.getLessonsByCourse("c1");
      expect(result).toHaveLength(2);
      expect(mockPrisma.lesson.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { courseId: "c1" },
          orderBy: { sortOrder: "asc" },
        })
      );
    });
  });

  describe("getLessonsByModule", () => {
    it("should return lessons for a module", async () => {
      mockPrisma.lesson.findMany.mockResolvedValue([{ id: "l1" }]);

      const result = await LessonService.getLessonsByModule("m1");
      expect(result).toHaveLength(1);
    });
  });

  describe("getLessonById", () => {
    it("should return a lesson with contents", async () => {
      const mockLesson = { id: "l1", contents: [], course: {} };
      mockPrisma.lesson.findUnique.mockResolvedValue(mockLesson);

      const result = await LessonService.getLessonById("l1");
      expect(result).toEqual(mockLesson);
    });

    it("should return null for non-existent lesson", async () => {
      mockPrisma.lesson.findUnique.mockResolvedValue(null);
      const result = await LessonService.getLessonById("nonexistent");
      expect(result).toBeNull();
    });
  });

  describe("createLesson", () => {
    it("should create a lesson with defaults", async () => {
      const mockLesson = { id: "l1", title: "New Lesson" };
      mockPrisma.lesson.create.mockResolvedValue(mockLesson);

      const result = await LessonService.createLesson({
        courseId: "c1",
        title: "New Lesson",
      });

      expect(result).toEqual(mockLesson);
      expect(mockPrisma.lesson.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            courseId: "c1",
            title: "New Lesson",
            lessonType: "TEXT",
            sortOrder: 0,
            isPublished: false,
            isRequired: true,
          }),
        })
      );
    });

    it("should create a lesson with custom values", async () => {
      mockPrisma.lesson.create.mockResolvedValue({});

      await LessonService.createLesson({
        courseId: "c1",
        moduleId: "m1",
        title: "Video Lesson",
        lessonType: "VIDEO",
        sortOrder: 5,
        duration: 300,
        isPublished: true,
        isRequired: false,
      });

      expect(mockPrisma.lesson.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            lessonType: "VIDEO",
            sortOrder: 5,
            duration: 300,
            isPublished: true,
            isRequired: false,
          }),
        })
      );
    });
  });

  describe("updateLesson", () => {
    it("should update a lesson", async () => {
      mockPrisma.lesson.update.mockResolvedValue({});

      await LessonService.updateLesson("l1", { title: "Updated" });
      expect(mockPrisma.lesson.update).toHaveBeenCalledWith({
        where: { id: "l1" },
        data: { title: "Updated" },
      });
    });
  });

  describe("deleteLesson", () => {
    it("should delete a lesson", async () => {
      mockPrisma.lesson.delete.mockResolvedValue({});
      await LessonService.deleteLesson("l1");
      expect(mockPrisma.lesson.delete).toHaveBeenCalledWith({ where: { id: "l1" } });
    });
  });

  describe("reorderLessons", () => {
    it("should reorder lessons using transaction", async () => {
      mockPrisma.lesson.update.mockResolvedValue({});

      await LessonService.reorderLessons("c1", ["l3", "l1", "l2"]);
      expect(mockPrisma.$transaction).toHaveBeenCalled();
      expect(mockPrisma.lesson.update).toHaveBeenCalledTimes(3);
    });
  });

  describe("publishLesson", () => {
    it("should publish a lesson", async () => {
      mockPrisma.lesson.update.mockResolvedValue({});
      await LessonService.publishLesson("l1");
      expect(mockPrisma.lesson.update).toHaveBeenCalledWith({
        where: { id: "l1" },
        data: { isPublished: true },
      });
    });
  });

  describe("unpublishLesson", () => {
    it("should unpublish a lesson", async () => {
      mockPrisma.lesson.update.mockResolvedValue({});
      await LessonService.unpublishLesson("l1");
      expect(mockPrisma.lesson.update).toHaveBeenCalledWith({
        where: { id: "l1" },
        data: { isPublished: false },
      });
    });
  });

  describe("getNextLesson", () => {
    it("should return the next lesson", async () => {
      mockPrisma.lesson.findUnique.mockResolvedValue({ courseId: "c1", sortOrder: 1 });
      mockPrisma.lesson.findFirst.mockResolvedValue({ id: "l2", sortOrder: 2 });

      const result = await LessonService.getNextLesson("l1");
      expect(result).toBeDefined();
      expect(result?.id).toBe("l2");
    });

    it("should return null if no next lesson", async () => {
      mockPrisma.lesson.findUnique.mockResolvedValue({ courseId: "c1", sortOrder: 5 });
      mockPrisma.lesson.findFirst.mockResolvedValue(null);

      const result = await LessonService.getNextLesson("l1");
      expect(result).toBeNull();
    });

    it("should return null for non-existent lesson", async () => {
      mockPrisma.lesson.findUnique.mockResolvedValue(null);
      const result = await LessonService.getNextLesson("nonexistent");
      expect(result).toBeNull();
    });
  });

  describe("getPreviousLesson", () => {
    it("should return the previous lesson", async () => {
      mockPrisma.lesson.findUnique.mockResolvedValue({ courseId: "c1", sortOrder: 2 });
      mockPrisma.lesson.findFirst.mockResolvedValue({ id: "l1", sortOrder: 1 });

      const result = await LessonService.getPreviousLesson("l2");
      expect(result).toBeDefined();
    });
  });

  describe("getLessonCount", () => {
    it("should return lesson count", async () => {
      mockPrisma.lesson.count.mockResolvedValue(10);
      const result = await LessonService.getLessonCount("c1");
      expect(result).toBe(10);
    });
  });

  describe("getPublishedLessonCount", () => {
    it("should return published lesson count", async () => {
      mockPrisma.lesson.count.mockResolvedValue(7);
      const result = await LessonService.getPublishedLessonCount("c1");
      expect(result).toBe(7);
    });
  });
});
