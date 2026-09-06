import { CourseService } from "@/lib/courses/course-service";
import prisma from "@/lib/prisma";

jest.mock("@/lib/prisma", () => ({
  __esModule: true,
  default: {
    course: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
    },
    enrollment: { count: jest.fn() },
    module: { count: jest.fn() },
    lesson: { count: jest.fn() },
  },
}));

const mockPrisma = prisma as unknown as {
  course: {
    findUnique: jest.Mock;
    findMany: jest.Mock;
    create: jest.Mock;
    update: jest.Mock;
    delete: jest.Mock;
    count: jest.Mock;
  };
  enrollment: { count: jest.Mock };
  module: { count: jest.Mock };
  lesson: { count: jest.Mock };
};

describe("CourseService", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("getCourses", () => {
    it("should return paginated courses", async () => {
      const mockCourses = [
        { id: "1", title: "Test Course", instructor: { id: "u1", name: "John" }, _count: { enrollments: 5, modules: 3 } },
      ];
      mockPrisma.course.findMany.mockResolvedValue(mockCourses);
      mockPrisma.course.count.mockResolvedValue(1);

      const result = await CourseService.getCourses({
        page: 1,
        limit: 10,
        sortBy: "createdAt",
        sortOrder: "desc",
      });

      expect(result.data).toEqual(mockCourses);
      expect(result.total).toBe(1);
      expect(result.totalPages).toBe(1);
      expect(result.hasNext).toBe(false);
      expect(result.hasPrev).toBe(false);
    });

    it("should apply search filter", async () => {
      mockPrisma.course.findMany.mockResolvedValue([]);
      mockPrisma.course.count.mockResolvedValue(0);

      await CourseService.getCourses({
        page: 1,
        limit: 10,
        sortBy: "createdAt",
        sortOrder: "desc",
        search: "javascript",
      });

      expect(mockPrisma.course.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            OR: expect.arrayContaining([
              expect.objectContaining({ title: expect.objectContaining({ contains: "javascript" }) }),
            ]),
          }),
        })
      );
    });

    it("should apply category filter", async () => {
      mockPrisma.course.findMany.mockResolvedValue([]);
      mockPrisma.course.count.mockResolvedValue(0);

      await CourseService.getCourses({
        page: 1,
        limit: 10,
        sortBy: "createdAt",
        sortOrder: "desc",
        categoryId: "cat-1",
      });

      expect(mockPrisma.course.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ categoryId: "cat-1" }),
        })
      );
    });

    it("should calculate pagination correctly", async () => {
      mockPrisma.course.findMany.mockResolvedValue([]);
      mockPrisma.course.count.mockResolvedValue(25);

      const result = await CourseService.getCourses({
        page: 2,
        limit: 10,
        sortBy: "createdAt",
        sortOrder: "desc",
      });

      expect(result.total).toBe(25);
      expect(result.totalPages).toBe(3);
      expect(result.hasNext).toBe(true);
      expect(result.hasPrev).toBe(true);
    });
  });

  describe("getCourseById", () => {
    it("should return a course with relations", async () => {
      const mockCourse = { id: "1", title: "Test Course", modules: [], instructor: {} };
      mockPrisma.course.findUnique.mockResolvedValue(mockCourse);

      const result = await CourseService.getCourseById("1");
      expect(result).toEqual(mockCourse);
      expect(mockPrisma.course.findUnique).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: "1" } })
      );
    });

    it("should return null for non-existent course", async () => {
      mockPrisma.course.findUnique.mockResolvedValue(null);
      const result = await CourseService.getCourseById("nonexistent");
      expect(result).toBeNull();
    });
  });

  describe("getCourseBySlug", () => {
    it("should find course by slug", async () => {
      const mockCourse = { id: "1", slug: "test-course", title: "Test" };
      mockPrisma.course.findUnique.mockResolvedValue(mockCourse);

      const result = await CourseService.getCourseBySlug("test-course");
      expect(result).toEqual(mockCourse);
      expect(mockPrisma.course.findUnique).toHaveBeenCalledWith(
        expect.objectContaining({ where: { slug: "test-course" } })
      );
    });
  });

  describe("createCourse", () => {
    it("should create a new course", async () => {
      const mockCourse = { id: "1", title: "New Course", instructorId: "u1" };
      mockPrisma.course.create.mockResolvedValue(mockCourse);

      const result = await CourseService.createCourse(
        { title: "New Course", slug: "new-course" },
        "u1"
      );

      expect(result).toEqual(mockCourse);
      expect(mockPrisma.course.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            title: "New Course",
            slug: "new-course",
            instructorId: "u1",
          }),
        })
      );
    });

    it("should set default values", async () => {
      mockPrisma.course.create.mockResolvedValue({});

      await CourseService.createCourse({ title: "Test", slug: "test" }, "u1");

      expect(mockPrisma.course.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            price: 0,
            currency: "USD",
            difficulty: "BEGINNER",
            isPublished: false,
            status: "DRAFT",
          }),
        })
      );
    });

    it("should serialize tags and prerequisites", async () => {
      mockPrisma.course.create.mockResolvedValue({});

      await CourseService.createCourse(
        { title: "Test", slug: "test", tags: ["js", "react"], prerequisites: ["html"] },
        "u1"
      );

      expect(mockPrisma.course.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            tags: JSON.stringify(["js", "react"]),
            prerequisites: JSON.stringify(["html"]),
          }),
        })
      );
    });
  });

  describe("updateCourse", () => {
    it("should update course data", async () => {
      const mockCourse = { id: "1", title: "Updated" };
      mockPrisma.course.update.mockResolvedValue(mockCourse);

      const result = await CourseService.updateCourse("1", { title: "Updated" });
      expect(result).toEqual(mockCourse);
    });
  });

  describe("deleteCourse", () => {
    it("should delete a course", async () => {
      mockPrisma.course.delete.mockResolvedValue({});

      await CourseService.deleteCourse("1");
      expect(mockPrisma.course.delete).toHaveBeenCalledWith({ where: { id: "1" } });
    });
  });

  describe("publishCourse", () => {
    it("should publish a course", async () => {
      mockPrisma.course.update.mockResolvedValue({});

      await CourseService.publishCourse("1");
      expect(mockPrisma.course.update).toHaveBeenCalledWith({
        where: { id: "1" },
        data: { status: "PUBLISHED", isPublished: true },
      });
    });
  });

  describe("archiveCourse", () => {
    it("should archive a course", async () => {
      mockPrisma.course.update.mockResolvedValue({});

      await CourseService.archiveCourse("1");
      expect(mockPrisma.course.update).toHaveBeenCalledWith({
        where: { id: "1" },
        data: { status: "ARCHIVED", isPublished: false },
      });
    });
  });

  describe("getCourseStats", () => {
    it("should return course statistics", async () => {
      mockPrisma.enrollment.count.mockResolvedValue(50);
      mockPrisma.module.count.mockResolvedValue(8);
      mockPrisma.lesson.count.mockResolvedValue(32);
      mockPrisma.course.findUnique.mockResolvedValue({ rating: 4.5, reviewCount: 20 });

      const result = await CourseService.getCourseStats("1");

      expect(result.enrollmentCount).toBe(50);
      expect(result.moduleCount).toBe(8);
      expect(result.lessonCount).toBe(32);
      expect(result.avgRating).toBe(4.5);
      expect(result.reviewCount).toBe(20);
    });

    it("should handle missing rating", async () => {
      mockPrisma.enrollment.count.mockResolvedValue(0);
      mockPrisma.module.count.mockResolvedValue(0);
      mockPrisma.lesson.count.mockResolvedValue(0);
      mockPrisma.course.findUnique.mockResolvedValue(null);

      const result = await CourseService.getCourseStats("1");
      expect(result.avgRating).toBe(0);
      expect(result.reviewCount).toBe(0);
    });
  });
});
