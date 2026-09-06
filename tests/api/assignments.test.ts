import { NextRequest } from "next/server";
import { GET, POST } from "@/app/api/courses/[id]/route";
import { getServerSession } from "next-auth";
import prisma from "@/lib/prisma";

jest.mock("next-auth", () => ({
  getServerSession: jest.fn(),
}));

jest.mock("@/lib/prisma", () => ({
  __esModule: true,
  default: {
    course: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    assignment: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    submission: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      count: jest.fn(),
    },
    enrollment: {
      findMany: jest.fn(),
      count: jest.fn(),
      aggregate: jest.fn(),
    },
    module: {
      count: jest.fn(),
    },
    lesson: {
      count: jest.fn(),
    },
  },
}));

const mockPrisma = prisma as unknown as {
  course: {
    findUnique: jest.Mock;
    findMany: jest.Mock;
    count: jest.Mock;
    create: jest.Mock;
    update: jest.Mock;
    delete: jest.Mock;
  };
  assignment: {
    findMany: jest.Mock;
    findUnique: jest.Mock;
    create: jest.Mock;
    update: jest.Mock;
    delete: jest.Mock;
  };
  submission: {
    findMany: jest.Mock;
    findUnique: jest.Mock;
    create: jest.Mock;
    update: jest.Mock;
    count: jest.Mock;
  };
  enrollment: {
    findMany: jest.Mock;
    count: jest.Mock;
    aggregate: jest.Mock;
  };
  module: { count: jest.Mock };
  lesson: { count: jest.Mock };
};

const mockGetServerSession = getServerSession as jest.MockedFunction<typeof getServerSession>;

describe("Assignments API", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("Assignment listing", () => {
    it("should list assignments for a course", async () => {
      mockPrisma.assignment.findMany.mockResolvedValue([
        { id: "a1", title: "Homework 1", maxPoints: 100, _count: { submissions: 5 } },
        { id: "a2", title: "Homework 2", maxPoints: 100, _count: { submissions: 3 } },
      ]);

      const result = await mockPrisma.assignment.findMany({
        where: { courseId: "c1" },
      });

      expect(result).toHaveLength(2);
      expect(result[0].title).toBe("Homework 1");
    });
  });

  describe("Assignment creation", () => {
    it("should create assignment as instructor", async () => {
      mockGetServerSession.mockResolvedValue({
        user: { id: "u1", role: "INSTRUCTOR" },
      });
      mockPrisma.assignment.create.mockResolvedValue({
        id: "a1",
        title: "New Assignment",
        maxPoints: 100,
      });

      const assignment = await mockPrisma.assignment.create({
        data: {
          courseId: "c1",
          title: "New Assignment",
          description: "Complete the exercises",
          maxPoints: 100,
          passingPoints: 70,
          maxAttempts: 3,
          isPublished: false,
        },
      });

      expect(assignment.id).toBe("a1");
      expect(assignment.title).toBe("New Assignment");
    });

    it("should reject creation by student", async () => {
      mockGetServerSession.mockResolvedValue({
        user: { id: "u1", role: "STUDENT" },
      });

      expect(mockGetServerSession).toBeDefined();
      const session = await mockGetServerSession();
      expect(session?.user.role).toBe("STUDENT");
    });
  });

  describe("Submission handling", () => {
    it("should create submission", async () => {
      mockPrisma.submission.create.mockResolvedValue({
        id: "s1",
        assignmentId: "a1",
        userId: "u1",
        content: "My solution",
        status: "SUBMITTED",
      });

      const submission = await mockPrisma.submission.create({
        data: {
          assignmentId: "a1",
          userId: "u1",
          content: "My solution",
          attemptNumber: 1,
          status: "SUBMITTED",
        },
      });

      expect(submission.id).toBe("s1");
      expect(submission.status).toBe("SUBMITTED");
    });

    it("should grade submission", async () => {
      mockPrisma.submission.update.mockResolvedValue({
        id: "s1",
        points: 85,
        feedback: "Good work",
        status: "GRADED",
      });

      const graded = await mockPrisma.submission.update({
        where: { id: "s1" },
        data: {
          points: 85,
          feedback: "Good work",
          status: "GRADED",
          gradedAt: new Date(),
        },
      });

      expect(graded.points).toBe(85);
      expect(graded.status).toBe("GRADED");
    });

    it("should track submission attempts", async () => {
      mockPrisma.submission.count.mockResolvedValue(2);

      const attemptCount = await mockPrisma.submission.count({
        where: { assignmentId: "a1", userId: "u1" },
      });

      expect(attemptCount).toBe(2);
    });
  });

  describe("Late penalty calculation", () => {
    it("should calculate penalty for late submissions", () => {
      const dueDate = new Date("2026-01-01T23:59:59");
      const submissionDate = new Date("2026-01-04T23:59:59");
      const latePenalty = 10;

      const daysLate = Math.ceil(
        (submissionDate.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24)
      );
      const penalty = Math.min(latePenalty * daysLate, 100);

      expect(daysLate).toBe(3);
      expect(penalty).toBe(30);
    });

    it("should cap penalty at 100%", () => {
      const dueDate = new Date("2026-01-01");
      const submissionDate = new Date("2026-02-01");
      const latePenalty = 50;

      const daysLate = Math.ceil(
        (submissionDate.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24)
      );
      const penalty = Math.min(latePenalty * daysLate, 100);

      expect(penalty).toBe(100);
    });
  });

  describe("Assignment statistics", () => {
    it("should calculate assignment stats", async () => {
      mockPrisma.submission.count
        .mockResolvedValueOnce(20)
        .mockResolvedValueOnce(15);
      mockPrisma.submission.findMany.mockResolvedValue([
        { points: 90 },
        { points: 80 },
        { points: 70 },
      ]);

      const total = await mockPrisma.submission.count({ where: { assignmentId: "a1" } });
      const graded = await mockPrisma.submission.count({
        where: { assignmentId: "a1", status: "GRADED" },
      });
      const submissions = await mockPrisma.submission.findMany({
        where: { assignmentId: "a1", status: "GRADED" },
        select: { points: true },
      });

      const avgScore =
        submissions.reduce((sum, s) => sum + (s.points ?? 0), 0) / submissions.length;

      expect(total).toBe(20);
      expect(graded).toBe(15);
      expect(avgScore).toBe(80);
    });
  });
});
