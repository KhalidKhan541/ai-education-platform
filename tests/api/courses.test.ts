import { NextRequest } from "next/server";
import { GET, POST } from "@/app/api/courses/route";
import { getServerSession } from "next-auth";
import prisma from "@/lib/prisma";

jest.mock("next-auth", () => ({
  getServerSession: jest.fn(),
}));

jest.mock("@/lib/prisma", () => ({
  __esModule: true,
  default: {
    course: {
      findMany: jest.fn(),
      count: jest.fn(),
      create: jest.fn(),
      findUnique: jest.fn(),
    },
  },
}));

const mockPrisma = prisma as unknown as {
  course: {
    findMany: jest.Mock;
    count: jest.Mock;
    create: jest.Mock;
    findUnique: jest.Mock;
  };
};

const mockGetServerSession = getServerSession as jest.MockedFunction<typeof getServerSession>;

function createRequest(url: string, options?: RequestInit) {
  return new NextRequest(new Request(url, options));
}

describe("Courses API", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("GET /api/courses", () => {
    it("should return paginated courses", async () => {
      mockPrisma.course.findMany.mockResolvedValue([
        { id: "c1", title: "React Basics", instructor: {}, _count: { enrollments: 10, modules: 5 } },
      ]);
      mockPrisma.course.count.mockResolvedValue(1);

      const request = createRequest("http://localhost:3000/api/courses?page=1&limit=10");
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data).toHaveLength(1);
      expect(data.pagination).toBeDefined();
      expect(data.pagination.total).toBe(1);
    });

    it("should apply search filter", async () => {
      mockPrisma.course.findMany.mockResolvedValue([]);
      mockPrisma.course.count.mockResolvedValue(0);

      const request = createRequest("http://localhost:3000/api/courses?search=react");
      await GET(request);

      expect(mockPrisma.course.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            OR: expect.arrayContaining([
              expect.objectContaining({ title: expect.objectContaining({ contains: "react" }) }),
            ]),
          }),
        })
      );
    });

    it("should apply category filter", async () => {
      mockPrisma.course.findMany.mockResolvedValue([]);
      mockPrisma.course.count.mockResolvedValue(0);

      const request = createRequest("http://localhost:3000/api/courses?category=programming");
      await GET(request);

      expect(mockPrisma.course.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ category: "programming" }),
        })
      );
    });

    it("should apply level filter", async () => {
      mockPrisma.course.findMany.mockResolvedValue([]);
      mockPrisma.course.count.mockResolvedValue(0);

      const request = createRequest("http://localhost:3000/api/courses?level=BEGINNER");
      await GET(request);

      expect(mockPrisma.course.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ level: "BEGINNER" }),
        })
      );
    });

    it("should handle server errors", async () => {
      mockPrisma.course.findMany.mockRejectedValue(new Error("DB error"));

      const request = createRequest("http://localhost:3000/api/courses");
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
    });

    it("should respect limit parameter", async () => {
      mockPrisma.course.findMany.mockResolvedValue([]);
      mockPrisma.course.count.mockResolvedValue(0);

      const request = createRequest("http://localhost:3000/api/courses?limit=5");
      await GET(request);

      expect(mockPrisma.course.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ take: 5 })
      );
    });
  });

  describe("POST /api/courses", () => {
    it("should create a course when authenticated as instructor", async () => {
      mockGetServerSession.mockResolvedValue({
        user: { id: "u1", role: "INSTRUCTOR" },
      });
      mockPrisma.course.create.mockResolvedValue({ id: "c1", title: "New Course" });

      const request = createRequest("http://localhost:3000/api/courses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: "New Course",
          description: "A comprehensive course about testing",
          category: "Programming",
          level: "BEGINNER",
          price: 0,
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.success).toBe(true);
    });

    it("should return 401 when not authenticated", async () => {
      mockGetServerSession.mockResolvedValue(null);

      const request = createRequest("http://localhost:3000/api/courses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: "Course" }),
      });

      const response = await POST(request);
      expect(response.status).toBe(401);
    });

    it("should return 403 when student tries to create", async () => {
      mockGetServerSession.mockResolvedValue({
        user: { id: "u1", role: "STUDENT" },
      });

      const request = createRequest("http://localhost:3000/api/courses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: "Course" }),
      });

      const response = await POST(request);
      expect(response.status).toBe(403);
    });

    it("should validate course data", async () => {
      mockGetServerSession.mockResolvedValue({
        user: { id: "u1", role: "INSTRUCTOR" },
      });

      const request = createRequest("http://localhost:3000/api/courses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: "" }),
      });

      const response = await POST(request);
      expect(response.status).toBe(400);
    });

    it("should handle creation errors", async () => {
      mockGetServerSession.mockResolvedValue({
        user: { id: "u1", role: "INSTRUCTOR" },
      });
      mockPrisma.course.create.mockRejectedValue(new Error("DB error"));

      const request = createRequest("http://localhost:3000/api/courses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: "Course",
          description: "Description here",
          category: "Programming",
          level: "BEGINNER",
          price: 0,
        }),
      });

      const response = await POST(request);
      expect(response.status).toBe(500);
    });
  });
});
