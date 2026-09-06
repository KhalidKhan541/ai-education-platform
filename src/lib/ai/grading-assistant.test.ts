import { GradingAssistant } from "@/lib/ai/grading-assistant";
import prisma from "@/lib/prisma";

jest.mock("@/lib/prisma", () => ({
  __esModule: true,
  default: {
    submission: {
      findUnique: jest.fn(),
    },
  },
}));

const mockPrisma = prisma as unknown as {
  submission: { findUnique: jest.Mock };
};

const mockFetch = jest.fn();
global.fetch = mockFetch;

describe("GradingAssistant", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockFetch.mockReset();
  });

  describe("gradeSubmission", () => {
    it("should grade with rubric successfully", async () => {
      mockPrisma.submission.findUnique.mockResolvedValue({
        id: "s1",
        content: "My answer is correct because...",
        assignment: { course: { id: "c1" } },
        user: { id: "u1", name: "Student" },
      });

      mockFetch.mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({
            choices: [
              {
                message: {
                  content: JSON.stringify({
                    totalScore: 85,
                    feedback: "Good work overall.",
                    criteriaScores: [
                      { criterion: "Accuracy", score: 90, maxScore: 100, feedback: "Excellent" },
                    ],
                  }),
                },
              },
            ],
          }),
      });

      const result = await GradingAssistant.gradeSubmission("s1", [
        { criterion: "Accuracy", points: 100, description: "Correctness" },
      ]);

      expect(result.submissionId).toBe("s1");
      expect(result.totalScore).toBe(85);
      expect(result.percentage).toBe(85);
    });

    it("should grade without rubric", async () => {
      mockPrisma.submission.findUnique.mockResolvedValue({
        id: "s1",
        content: "Answer",
        assignment: { course: {} },
        user: {},
      });

      mockFetch.mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({
            choices: [{ message: { content: JSON.stringify({ score: 75, feedback: "Decent" }) } }],
          }),
      });

      const result = await GradingAssistant.gradeSubmission("s1");
      expect(result.totalScore).toBe(75);
      expect(result.maxScore).toBe(100);
    });

    it("should throw if submission not found", async () => {
      mockPrisma.submission.findUnique.mockResolvedValue(null);

      await expect(GradingAssistant.gradeSubmission("x")).rejects.toThrow("Submission not found");
    });

    it("should handle API failure with default grading", async () => {
      mockPrisma.submission.findUnique.mockResolvedValue({
        id: "s1",
        content: "Content",
        assignment: { course: {} },
        user: {},
      });

      mockFetch.mockResolvedValue({ ok: false });

      const result = await GradingAssistant.gradeSubmission("s1", [
        { criterion: "Quality", points: 50 },
      ]);

      expect(result.totalScore).toBe(0);
      expect(result.maxScore).toBe(50);
      expect(result.criteriaScores).toHaveLength(1);
    });

    it("should handle invalid JSON response", async () => {
      mockPrisma.submission.findUnique.mockResolvedValue({
        id: "s1",
        content: "Content",
        assignment: { course: {} },
        user: {},
      });

      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ choices: [{ message: { content: "not json" } }] }),
      });

      const result = await GradingAssistant.gradeSubmission("s1", [
        { criterion: "Test", points: 10 },
      ]);

      expect(result.totalScore).toBe(0);
    });
  });

  describe("getGradingFeedback", () => {
    it("should return existing feedback", async () => {
      mockPrisma.submission.findUnique.mockResolvedValue({
        id: "s1",
        feedback: "Great work!",
      });

      const result = await GradingAssistant.getGradingFeedback("s1");
      expect(result).toBe("Great work!");
    });

    it("should return pending message if no feedback", async () => {
      mockPrisma.submission.findUnique.mockResolvedValue({
        id: "s1",
        feedback: null,
      });

      const result = await GradingAssistant.getGradingFeedback("s1");
      expect(result).toContain("not been graded");
    });

    it("should throw if submission not found", async () => {
      mockPrisma.submission.findUnique.mockResolvedValue(null);
      await expect(GradingAssistant.getGradingFeedback("x")).rejects.toThrow();
    });
  });

  describe("bulkGrade", () => {
    it("should grade multiple submissions", async () => {
      mockPrisma.submission.findUnique
        .mockResolvedValueOnce({
          id: "s1",
          content: "A",
          assignment: { course: {} },
          user: {},
        })
        .mockResolvedValueOnce({
          id: "s2",
          content: "B",
          assignment: { course: {} },
          user: {},
        });

      mockFetch.mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({
            choices: [{ message: { content: JSON.stringify({ score: 80, feedback: "OK" }) } }],
          }),
      });

      const results = await GradingAssistant.bulkGrade(["s1", "s2"]);
      expect(results).toHaveLength(2);
    });

    it("should handle partial failures", async () => {
      mockPrisma.submission.findUnique
        .mockResolvedValueOnce({
          id: "s1",
          content: "A",
          assignment: { course: {} },
          user: {},
        })
        .mockRejectedValueOnce(new Error("DB error"));

      mockFetch.mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({
            choices: [{ message: { content: JSON.stringify({ score: 90, feedback: "Good" }) } }],
          }),
      });

      const results = await GradingAssistant.bulkGrade(["s1", "s2"]);
      expect(results).toHaveLength(2);
      expect(results[0].totalScore).toBe(90);
      expect(results[1].totalScore).toBe(0);
    });
  });
});
