import { NextRequest } from "next/server";
import { GET } from "@/app/api/courses/[id]/route";
import prisma from "@/lib/prisma";

jest.mock("@/lib/prisma", () => ({
  __esModule: true,
  default: {
    course: {
      findUnique: jest.fn(),
    },
    enrollment: {
      findUnique: jest.fn(),
    },
    lesson: {
      findMany: jest.fn(),
      count: jest.fn(),
    },
    module: {
      findMany: jest.fn(),
    },
  },
}));

const mockPrisma = prisma as unknown as {
  course: { findUnique: jest.Mock };
  enrollment: { findUnique: jest.Mock };
  lesson: { findMany: jest.Mock; count: jest.Mock };
  module: { findMany: jest.Mock };
};

function createRequest(url: string) {
  return new NextRequest(new Request(url));
}

describe("Lesson API (Course Detail)", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("GET /api/courses/[id]", () => {
    it("should return course with modules and lessons", async () => {
      mockPrisma.course.findUnique.mockResolvedValue({
        id: "c1",
        title: "React Course",
        modules: [
          {
            id: "m1",
            title: "Getting Started",
            lessons: [
              { id: "l1", title: "Introduction", sortOrder: 0 },
              { id: "l2", title: "Setup", sortOrder: 1 },
            ],
          },
        ],
        instructor: { id: "u1", name: "John" },
      });

      const request = createRequest("http://localhost:3000/api/courses/c1");
      const response = await GET(request, { params: { id: "c1" } });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.modules).toHaveLength(1);
      expect(data.data.modules[0].lessons).toHaveLength(2);
    });

    it("should return 404 for non-existent course", async () => {
      mockPrisma.course.findUnique.mockResolvedValue(null);

      const request = createRequest("http://localhost:3000/api/courses/nonexistent");
      const response = await GET(request, { params: { id: "nonexistent" } });
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.success).toBe(false);
    });

    it("should include instructor info", async () => {
      mockPrisma.course.findUnique.mockResolvedValue({
        id: "c1",
        title: "Course",
        instructor: { id: "u1", name: "Jane", email: "jane@example.com" },
        modules: [],
      });

      const request = createRequest("http://localhost:3000/api/courses/c1");
      const response = await GET(request, { params: { id: "c1" } });
      const data = await response.json();

      expect(data.data.instructor.name).toBe("Jane");
    });

    it("should handle database errors", async () => {
      mockPrisma.course.findUnique.mockRejectedValue(new Error("DB error"));

      const request = createRequest("http://localhost:3000/api/courses/c1");
      const response = await GET(request, { params: { id: "c1" } });
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
    });

    it("should sort lessons by sortOrder", async () => {
      mockPrisma.course.findUnique.mockResolvedValue({
        id: "c1",
        title: "Course",
        modules: [
          {
            id: "m1",
            lessons: [
              { id: "l2", title: "Lesson 2", sortOrder: 2 },
              { id: "l1", title: "Lesson 1", sortOrder: 1 },
              { id: "l3", title: "Lesson 3", sortOrder: 3 },
            ],
          },
        ],
      });

      const request = createRequest("http://localhost:3000/api/courses/c1");
      const response = await GET(request, { params: { id: "c1" } });
      const data = await response.json();

      const lessons = data.data.modules[0].lessons;
      expect(lessons[0].sortOrder).toBeLessThanOrEqual(lessons[1].sortOrder);
    });
  });
});
