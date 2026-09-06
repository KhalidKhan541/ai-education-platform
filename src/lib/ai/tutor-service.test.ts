import { TutorService } from "@/lib/ai/tutor-service";
import prisma from "@/lib/prisma";

jest.mock("@/lib/prisma", () => ({
  __esModule: true,
  default: {
    aIConversation: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
    },
    aIMessage: {
      create: jest.fn(),
    },
  },
}));

const mockPrisma = prisma as unknown as {
  aIConversation: {
    findUnique: jest.Mock;
    findMany: jest.Mock;
    create: jest.Mock;
    delete: jest.Mock;
    count: jest.Mock;
  };
  aIMessage: { create: jest.Mock };
};

const mockFetch = jest.fn();
global.fetch = mockFetch;

describe("TutorService", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockFetch.mockReset();
  });

  describe("createConversation", () => {
    it("should create a conversation", async () => {
      mockPrisma.aIConversation.create.mockResolvedValue({
        id: "conv1",
        userId: "u1",
        title: "Help with Math",
      });

      const result = await TutorService.createConversation("u1", "Help with Math");
      expect(result.id).toBe("conv1");
      expect(mockPrisma.aIConversation.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            userId: "u1",
            title: "Help with Math",
          }),
        })
      );
    });

    it("should use default title", async () => {
      mockPrisma.aIConversation.create.mockResolvedValue({});

      await TutorService.createConversation("u1");
      expect(mockPrisma.aIConversation.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ title: "New Conversation" }),
        })
      );
    });
  });

  describe("getConversations", () => {
    it("should return user conversations", async () => {
      mockPrisma.aIConversation.findMany.mockResolvedValue([{ id: "conv1" }]);
      const result = await TutorService.getConversations("u1");
      expect(result).toHaveLength(1);
    });
  });

  describe("getConversation", () => {
    it("should return conversation with messages", async () => {
      const mockConv = { id: "conv1", messages: [] };
      mockPrisma.aIConversation.findUnique.mockResolvedValue(mockConv);

      const result = await TutorService.getConversation("conv1");
      expect(result).toEqual(mockConv);
    });
  });

  describe("sendMessage", () => {
    it("should send message and get AI response", async () => {
      mockPrisma.aIConversation.findUnique.mockResolvedValue({
        id: "conv1",
        messages: [],
      });
      mockPrisma.aIMessage.create.mockResolvedValue({});

      mockFetch.mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({
            choices: [{ message: { content: "AI response here" } }],
          }),
      });

      const result = await TutorService.sendMessage("conv1", "What is recursion?");

      expect(result.answer).toBe("AI response here");
      expect(result.confidence).toBe(0.85);
      expect(mockPrisma.aIMessage.create).toHaveBeenCalledTimes(2);
    });

    it("should handle API errors gracefully", async () => {
      mockPrisma.aIConversation.findUnique.mockResolvedValue({
        id: "conv1",
        messages: [],
      });
      mockPrisma.aIMessage.create.mockResolvedValue({});

      mockFetch.mockResolvedValue({ ok: false });

      const result = await TutorService.sendMessage("conv1", "Hello");
      expect(result.answer).toContain("having trouble");
      expect(result.confidence).toBe(0);
    });

    it("should throw if conversation not found", async () => {
      mockPrisma.aIConversation.findUnique.mockResolvedValue(null);

      await expect(TutorService.sendMessage("x", "Hi")).rejects.toThrow("Conversation not found");
    });

    it("should include conversation history", async () => {
      mockPrisma.aIConversation.findUnique.mockResolvedValue({
        id: "conv1",
        messages: [
          { role: "user", content: "Hi" },
          { role: "assistant", content: "Hello!" },
        ],
      });
      mockPrisma.aIMessage.create.mockResolvedValue({});
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ choices: [{ message: { content: "Response" } }] }),
      });

      await TutorService.sendMessage("conv1", "Tell me more");

      const callBody = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(callBody.messages).toHaveLength(4); // system + 2 history + user
    });

    it("should generate suggestions based on question type", async () => {
      mockPrisma.aIConversation.findUnique.mockResolvedValue({
        id: "conv1",
        messages: [],
      });
      mockPrisma.aIMessage.create.mockResolvedValue({});
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ choices: [{ message: { content: "Response" } }] }),
      });

      const result = await TutorService.sendMessage("conv1", "What is a variable?");
      expect(result.suggestions.length).toBeGreaterThan(0);
    });
  });

  describe("deleteConversation", () => {
    it("should delete a conversation", async () => {
      mockPrisma.aIConversation.delete.mockResolvedValue({});
      await TutorService.deleteConversation("conv1");
      expect(mockPrisma.aIConversation.delete).toHaveBeenCalledWith({ where: { id: "conv1" } });
    });
  });

  describe("getConversationCount", () => {
    it("should return conversation count", async () => {
      mockPrisma.aIConversation.count.mockResolvedValue(5);
      const result = await TutorService.getConversationCount("u1");
      expect(result).toBe(5);
    });
  });

  describe("getRecentConversations", () => {
    it("should return recent conversations", async () => {
      mockPrisma.aIConversation.findMany.mockResolvedValue([{ id: "conv1" }]);
      const result = await TutorService.getRecentConversations("u1", 3);
      expect(result).toHaveLength(1);
      expect(mockPrisma.aIConversation.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ take: 3 })
      );
    });
  });
});
