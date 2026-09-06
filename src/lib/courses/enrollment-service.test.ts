import { EnrollmentService } from "@/lib/courses/enrollment-service";
import prisma from "@/lib/prisma";

jest.mock("@/lib/prisma", () => ({
  __esModule: true,
  default: {
    enrollment: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
      aggregate: jest.fn(),
    },
    course: {
      findUnique: jest.fn(),
    },
  },
}));

const mockPrisma = prisma as unknown as {
  enrollment: {
    findUnique: jest.Mock;
    findMany: jest.Mock;
    create: jest.Mock;
    update: jest.Mock;
    delete: jest.Mock;
    count: jest.Mock;
    aggregate: jest.Mock;
  };
  course: { findUnique: jest.Mock };
};

describe("EnrollmentService", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("enrollUser", () => {
    it("should enroll a user in a course", async () => {
      mockPrisma.course.findUnique.mockResolvedValue({ id: "c1", isPublished: true });
      mockPrisma.enrollment.findUnique.mockResolvedValue(null);
      mockPrisma.enrollment.count.mockResolvedValue(0);
      mockPrisma.enrollment.create.mockResolvedValue({
        id: "e1",
        userId: "u1",
        courseId: "c1",
        status: "ACTIVE",
      });

      const result = await EnrollmentService.enrollUser("u1", "c1");

      expect(result.success).toBe(true);
      expect(result.enrollment).toBeDefined();
    });

    it("should fail if course not found", async () => {
      mockPrisma.course.findUnique.mockResolvedValue(null);

      const result = await EnrollmentService.enrollUser("u1", "nonexistent");
      expect(result.success).toBe(false);
      expect(result.error).toBe("Course not found");
    });

    it("should fail if course not published", async () => {
      mockPrisma.course.findUnique.mockResolvedValue({ id: "c1", isPublished: false });

      const result = await EnrollmentService.enrollUser("u1", "c1");
      expect(result.success).toBe(false);
      expect(result.error).toBe("Course is not published");
    });

    it("should fail if already enrolled", async () => {
      mockPrisma.course.findUnique.mockResolvedValue({ id: "c1", isPublished: true });
      mockPrisma.enrollment.findUnique.mockResolvedValue({ id: "e1" });

      const result = await EnrollmentService.enrollUser("u1", "c1");
      expect(result.success).toBe(false);
      expect(result.error).toBe("Already enrolled");
    });

    it("should fail if course is full", async () => {
      mockPrisma.course.findUnique.mockResolvedValue({
        id: "c1",
        isPublished: true,
        maxEnrollments: 2,
      });
      mockPrisma.enrollment.findUnique.mockResolvedValue(null);
      mockPrisma.enrollment.count.mockResolvedValue(2);

      const result = await EnrollmentService.enrollUser("u1", "c1");
      expect(result.success).toBe(false);
      expect(result.error).toBe("Course is full");
    });
  });

  describe("unenrollUser", () => {
    it("should unenroll a user", async () => {
      mockPrisma.enrollment.findUnique.mockResolvedValue({ id: "e1" });
      mockPrisma.enrollment.delete.mockResolvedValue({});

      const result = await EnrollmentService.unenrollUser("u1", "c1");
      expect(result.success).toBe(true);
    });

    it("should fail if not enrolled", async () => {
      mockPrisma.enrollment.findUnique.mockResolvedValue(null);

      const result = await EnrollmentService.unenrollUser("u1", "c1");
      expect(result.success).toBe(false);
      expect(result.error).toBe("Not enrolled");
    });
  });

  describe("getEnrollment", () => {
    it("should return enrollment with relations", async () => {
      const mockEnrollment = { id: "e1", user: {}, course: { modules: [] } };
      mockPrisma.enrollment.findUnique.mockResolvedValue(mockEnrollment);

      const result = await EnrollmentService.getEnrollment("u1", "c1");
      expect(result).toEqual(mockEnrollment);
    });

    it("should return null if not found", async () => {
      mockPrisma.enrollment.findUnique.mockResolvedValue(null);
      const result = await EnrollmentService.getEnrollment("u1", "c1");
      expect(result).toBeNull();
    });
  });

  describe("getUserEnrollments", () => {
    it("should return all user enrollments", async () => {
      mockPrisma.enrollment.findMany.mockResolvedValue([{ id: "e1" }]);

      const result = await EnrollmentService.getUserEnrollments("u1");
      expect(result).toHaveLength(1);
    });
  });

  describe("getCourseEnrollments", () => {
    it("should return all course enrollments", async () => {
      mockPrisma.enrollment.findMany.mockResolvedValue([{ id: "e1", user: {} }]);

      const result = await EnrollmentService.getCourseEnrollments("c1");
      expect(result).toHaveLength(1);
    });
  });

  describe("updateProgress", () => {
    it("should update enrollment progress", async () => {
      mockPrisma.enrollment.update.mockResolvedValue({ progress: 75 });

      const result = await EnrollmentService.updateProgress("u1", "c1", 75);
      expect(result.progress).toBe(75);
    });

    it("should clamp progress to 0-100", async () => {
      mockPrisma.enrollment.update.mockResolvedValue({ progress: 100 });

      await EnrollmentService.updateProgress("u1", "c1", 150);
      expect(mockPrisma.enrollment.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ progress: 100 }) })
      );

      await EnrollmentService.updateProgress("u1", "c1", -10);
      expect(mockPrisma.enrollment.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ progress: 0 }) })
      );
    });
  });

  describe("completeCourse", () => {
    it("should mark course as completed", async () => {
      mockPrisma.enrollment.update.mockResolvedValue({});

      await EnrollmentService.completeCourse("u1", "c1");
      expect(mockPrisma.enrollment.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: "COMPLETED",
            progress: 100,
          }),
        })
      );
    });
  });

  describe("getEnrollmentStats", () => {
    it("should return enrollment statistics", async () => {
      mockPrisma.enrollment.count
        .mockResolvedValueOnce(100)
        .mockResolvedValueOnce(60)
        .mockResolvedValueOnce(40);
      mockPrisma.enrollment.aggregate.mockResolvedValue({ _avg: { progress: 65 } });

      const result = await EnrollmentService.getEnrollmentStats("c1");

      expect(result.total).toBe(100);
      expect(result.active).toBe(60);
      expect(result.completed).toBe(40);
      expect(result.completionRate).toBe(40);
      expect(result.avgProgress).toBe(65);
    });

    it("should handle zero enrollments", async () => {
      mockPrisma.enrollment.count.mockResolvedValue(0);
      mockPrisma.enrollment.aggregate.mockResolvedValue({ _avg: { progress: null } });

      const result = await EnrollmentService.getEnrollmentStats("c1");
      expect(result.completionRate).toBe(0);
      expect(result.avgProgress).toBe(0);
    });
  });

  describe("isEnrolled", () => {
    it("should return true if enrolled", async () => {
      mockPrisma.enrollment.findUnique.mockResolvedValue({ id: "e1" });
      const result = await EnrollmentService.isEnrolled("u1", "c1");
      expect(result).toBe(true);
    });

    it("should return false if not enrolled", async () => {
      mockPrisma.enrollment.findUnique.mockResolvedValue(null);
      const result = await EnrollmentService.isEnrolled("u1", "c1");
      expect(result).toBe(false);
    });
  });
});
