import { ContentGenerator } from "@/lib/ai/content-generator";

const mockFetch = jest.fn();
global.fetch = mockFetch;

describe("ContentGenerator", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockFetch.mockReset();
  });

  describe("generate", () => {
    it("should generate summary content", async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({
            choices: [{ message: { content: "This is a summary of the content." } }],
            usage: { total_tokens: 150 },
          }),
      });

      const result = await ContentGenerator.generate({
        type: "SUMMARY",
        content: "Long educational content about programming...",
      });

      expect(result.type).toBe("SUMMARY");
      expect(result.result).toBe("This is a summary of the content.");
      expect(result.tokensUsed).toBe(150);
    });

    it("should generate quiz questions", async () => {
      const questions = [
        { question: "What is 2+2?", options: ["3", "4", "5"], correctAnswer: "4" },
      ];
      mockFetch.mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({
            choices: [{ message: { content: JSON.stringify(questions) } }],
            usage: { total_tokens: 200 },
          }),
      });

      const result = await ContentGenerator.generate({
        type: "QUIZ_QUESTIONS",
        content: "Basic math content",
        parameters: { difficulty: "EASY", count: 1 },
      });

      expect(result.type).toBe("QUIZ_QUESTIONS");
      expect(Array.isArray(result.result)).toBe(true);
    });

    it("should generate flashcards", async () => {
      const flashcards = [
        { front: "What is X?", back: "X is Y" },
      ];
      mockFetch.mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({
            choices: [{ message: { content: JSON.stringify(flashcards) } }],
            usage: { total_tokens: 100 },
          }),
      });

      const result = await ContentGenerator.generate({
        type: "FLASHCARDS",
        content: "Some content",
        parameters: { count: 1 },
      });

      expect(result.type).toBe("FLASHCARDS");
    });

    it("should handle API errors gracefully", async () => {
      mockFetch.mockResolvedValue({ ok: false });

      const result = await ContentGenerator.generate({
        type: "SUMMARY",
        content: "Content",
      });

      expect(result.type).toBe("SUMMARY");
      expect(result.tokensUsed).toBe(0);
    });

    it("should handle network errors", async () => {
      mockFetch.mockRejectedValue(new Error("Network error"));

      const result = await ContentGenerator.generate({
        type: "EXPLANATION",
        content: "Content",
      });

      expect(result.type).toBe("EXPLANATION");
      expect(result.result).toBeDefined();
    });

    it("should include course context in prompt", async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({
            choices: [{ message: { content: "Response" } }],
            usage: { total_tokens: 50 },
          }),
      });

      await ContentGenerator.generate({
        type: "SUMMARY",
        content: "Content",
      });

      const callBody = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(callBody.messages[1].content).toContain("Content");
    });
  });

  describe("generateSummary", () => {
    it("should return a string summary", async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({
            choices: [{ message: { content: "Summary text here" } }],
            usage: { total_tokens: 100 },
          }),
      });

      const result = await ContentGenerator.generateSummary("Some content to summarize");
      expect(typeof result).toBe("string");
      expect(result).toBe("Summary text here");
    });
  });

  describe("generateQuizQuestions", () => {
    it("should return an array of questions", async () => {
      const questions = [
        { question: "Q1", options: ["A", "B"], correctAnswer: "A" },
        { question: "Q2", options: ["C", "D"], correctAnswer: "D" },
      ];
      mockFetch.mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({
            choices: [{ message: { content: JSON.stringify(questions) } }],
            usage: { total_tokens: 200 },
          }),
      });

      const result = await ContentGenerator.generateQuizQuestions("Content", 2, "EASY");
      expect(Array.isArray(result)).toBe(true);
      expect(result).toHaveLength(2);
    });

    it("should return empty array on failure", async () => {
      mockFetch.mockResolvedValue({ ok: false });

      const result = await ContentGenerator.generateQuizQuestions("Content");
      expect(result).toEqual([]);
    });
  });

  describe("generateFlashcards", () => {
    it("should return flashcards array", async () => {
      const flashcards = [
        { front: "Q1", back: "A1" },
        { front: "Q2", back: "A2" },
      ];
      mockFetch.mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({
            choices: [{ message: { content: JSON.stringify(flashcards) } }],
            usage: { total_tokens: 100 },
          }),
      });

      const result = await ContentGenerator.generateFlashcards("Content", 2);
      expect(Array.isArray(result)).toBe(true);
    });
  });

  describe("generateExplanation", () => {
    it("should return explanation string", async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({
            choices: [{ message: { content: "Here is the explanation..." } }],
            usage: { total_tokens: 150 },
          }),
      });

      const result = await ContentGenerator.generateExplanation("Topic", "EASY");
      expect(typeof result).toBe("string");
    });
  });
});
