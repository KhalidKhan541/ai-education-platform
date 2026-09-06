import { AssignmentService } from "@/lib/assignments/assignment-service";
import prisma from "@/lib/prisma";

jest.mock("@/lib/prisma", () => ({
  __esModule: true,
  default: {
    assignment: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    submission: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      count: jest.fn(),
    },
  },
}));

const mockPrisma = prisma as unknown as {
  assignment: {
    findUnique: jest.Mock;
    findMany: jest.Mock;
    create: jest.Mock;
    update: jest.Mock;
    delete: jest.Mock;
  };
  submission: {
    findUnique: jest.Mock;
    findMany: jest.Mock;
    create: jest.Mock;
    update: jest.Mock;
    count: jest.Mock;
  };
};

describe("AssignmentService", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("getAssignmentsByCourse", () => {
    it("should return assignments for a course", async () => {
      mockPrisma.assignment.findMany.mockResolvedValue([
        { id: "a1", title: "HW1", _count: { submissions: 5 } },
      ]);

      const result = await AssignmentService.getAssignmentsByCourse("c1");
      expect(result).toHaveLength(1);
    });
  });

  describe("getAssignmentById", () => {
    it("should return assignment with submissions", async () => {
      const mockAssignment = { id: "a1", submissions: [], course: {} };
      mockPrisma.assignment.findUnique.mockResolvedValue(mockAssignment);

      const result = await AssignmentService.getAssignmentById("a1");
      expect(result).toEqual(mockAssignment);
    });

    it("should return null for non-existent", async () => {
      mockPrisma.assignment.findUnique.mockResolvedValue(null);
      const result = await AssignmentService.getAssignmentById("nonexistent");
      expect(result).toBeNull();
    });
  });

  describe("createAssignment", () => {
    it("should create an assignment with defaults", async () => {
      mockPrisma.assignment.create.mockResolvedValue({ id: "a1" });

      await AssignmentService.createAssignment({
        courseId: "c1",
        title: "Homework 1",
        maxPoints: 100,
      });

      expect(mockPrisma.assignment.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            courseId: "c1",
            title: "Homework 1",
            maxPoints: 100,
            allowLateSub: true,
            maxAttempts: 3,
            isPublished: false,
          }),
        })
      );
    });

    it("should parse due date string", async () => {
      mockPrisma.assignment.create.mockResolvedValue({});

      await AssignmentService.createAssignment({
        courseId: "c1",
        title: "HW",
        maxPoints: 100,
        dueDate: "2026-12-31T23:59:59.000Z",
      });

      expect(mockPrisma.assignment.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            dueDate: expect.any(Date),
          }),
        })
      );
    });
  });

  describe("updateAssignment", () => {
    it("should update assignment", async () => {
      mockPrisma.assignment.update.mockResolvedValue({});
      await AssignmentService.updateAssignment("a1", { title: "Updated" });
      expect(mockPrisma.assignment.update).toHaveBeenCalled();
    });
  });

  describe("deleteAssignment", () => {
    it("should delete assignment", async () => {
      mockPrisma.assignment.delete.mockResolvedValue({});
      await AssignmentService.deleteAssignment("a1");
      expect(mockPrisma.assignment.delete).toHaveBeenCalledWith({ where: { id: "a1" } });
    });
  });

  describe("submitAssignment", () => {
    it("should submit assignment successfully", async () => {
      mockPrisma.assignment.findUnique.mockResolvedValue({
        id: "a1",
        isPublished: true,
        maxAttempts: 3,
        dueDate: null,
        allowLateSub: true,
        submissions: [],
      });
      mockPrisma.submission.create.mockResolvedValue({ id: "s1" });

      const result = await AssignmentService.submitAssignment({
        assignmentId: "a1",
        userId: "u1",
        content: "My solution",
      });

      expect(result.id).toBe("s1");
    });

    it("should fail if assignment not found", async () => {
      mockPrisma.assignment.findUnique.mockResolvedValue(null);

      await expect(
        AssignmentService.submitAssignment({ assignmentId: "x", userId: "u1", content: "test" })
      ).rejects.toThrow("Assignment not found");
    });

    it("should fail if assignment not published", async () => {
      mockPrisma.assignment.findUnique.mockResolvedValue({
        isPublished: false,
        submissions: [],
      });

      await expect(
        AssignmentService.submitAssignment({ assignmentId: "a1", userId: "u1", content: "test" })
      ).rejects.toThrow("Assignment is not published");
    });

    it("should fail if max attempts reached", async () => {
      mockPrisma.assignment.findUnique.mockResolvedValue({
        isPublished: true,
        maxAttempts: 2,
        submissions: [{}, {}],
      });

      await expect(
        AssignmentService.submitAssignment({ assignmentId: "a1", userId: "u1", content: "test" })
      ).rejects.toThrow("Maximum attempts reached");
    });

    it("should calculate late penalty", async () => {
      const pastDate = new Date(Date.now() - 3 * 86400000).toISOString();
      mockPrisma.assignment.findUnique.mockResolvedValue({
        isPublished: true,
        maxAttempts: 5,
        dueDate: new Date(pastDate),
        allowLateSub: true,
        latePenalty: 10,
        submissions: [],
      });
      mockPrisma.submission.create.mockResolvedValue({});

      await AssignmentService.submitAssignment({
        assignmentId: "a1",
        userId: "u1",
        content: "late work",
      });

      expect(mockPrisma.submission.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            latePenalty: expect.any(Number),
          }),
        })
      );
    });
  });

  describe("gradeSubmission", () => {
    it("should grade a submission", async () => {
      mockPrisma.submission.findUnique.mockResolvedValue({
        id: "s1",
        assignment: {},
        latePenalty: 0,
      });
      mockPrisma.submission.update.mockResolvedValue({});

      await AssignmentService.gradeSubmission("s1", 85, "Good work!");
      expect(mockPrisma.submission.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            points: 85,
            feedback: "Good work!",
            status: "GRADED",
          }),
        })
      );
    });

    it("should apply late penalty to grade", async () => {
      mockPrisma.submission.findUnique.mockResolvedValue({
        id: "s1",
        assignment: {},
        latePenalty: 20,
      });
      mockPrisma.submission.update.mockResolvedValue({});

      await AssignmentService.gradeSubmission("s1", 100);
      expect(mockPrisma.submission.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            points: 80,
          }),
        })
      );
    });
  });

  describe("getUserSubmissions", () => {
    it("should return user submissions", async () => {
      mockPrisma.submission.findMany.mockResolvedValue([{ id: "s1" }]);
      const result = await AssignmentService.getUserSubmissions("u1", "a1");
      expect(result).toHaveLength(1);
    });
  });

  describe("getSubmissionById", () => {
    it("should return submission", async () => {
      mockPrisma.submission.findUnique.mockResolvedValue({ id: "s1" });
      const result = await AssignmentService.getSubmissionById("s1");
      expect(result).toBeDefined();
    });
  });

  describe("isOverdue", () => {
    it("should return true if past due date", async () => {
      mockPrisma.assignment.findUnique.mockResolvedValue({
        dueDate: new Date("2020-01-01"),
      });
      const result = await AssignmentService.isOverdue("a1");
      expect(result).toBe(true);
    });

    it("should return false if no due date", async () => {
      mockPrisma.assignment.findUnique.mockResolvedValue({ dueDate: null });
      const result = await AssignmentService.isOverdue("a1");
      expect(result).toBe(false);
    });
  });

  describe("getAssignmentStats", () => {
    it("should return assignment statistics", async () => {
      mockPrisma.submission.count
        .mockResolvedValueOnce(10)
        .mockResolvedValueOnce(8);
      mockPrisma.submission.findMany.mockResolvedValue([
        { points: 90 },
        { points: 80 },
      ]);

      const result = await AssignmentService.getAssignmentStats("a1");
      expect(result.total).toBe(10);
      expect(result.graded).toBe(8);
      expect(result.avgScore).toBe(85);
    });
  });
});
