import prisma from "@/lib/prisma";

export interface TutorMessage {
  role: "user" | "assistant";
  content: string;
}

export interface TutorResponse {
  answer: string;
  confidence: number;
  sources: string[];
  suggestions: string[];
}

export class TutorService {
  private static readonly SYSTEM_PROMPT = `You are an AI tutor for an education platform. 
  Help students understand course material, answer questions, and provide explanations.
  Be concise, accurate, and encouraging. If you're unsure, say so.`;

  static async createConversation(userId: string, title?: string, courseId?: string) {
    return prisma.aIConversation.create({
      data: {
        userId,
        title: title ?? "New Conversation",
        courseId,
        model: "gpt-4",
      },
    });
  }

  static async getConversations(userId: string) {
    return prisma.aIConversation.findMany({
      where: { userId },
      orderBy: { updatedAt: "desc" },
    });
  }

  static async getConversation(conversationId: string) {
    return prisma.aIConversation.findUnique({
      where: { id: conversationId },
      include: { messages: { orderBy: { createdAt: "asc" } } },
    });
  }

  static async sendMessage(
    conversationId: string,
    content: string,
    courseContext?: string
  ): Promise<TutorResponse> {
    const conversation = await prisma.aIConversation.findUnique({
      where: { id: conversationId },
      include: { messages: { orderBy: { createdAt: "asc" }, take: 20 } },
    });

    if (!conversation) throw new Error("Conversation not found");

    await prisma.aIMessage.create({
      data: { conversationId, role: "user", content },
    });

    const history: TutorMessage[] = conversation.messages.map((m) => ({
      role: m.role as "user" | "assistant",
      content: m.content,
    }));

    const response = await this.generateResponse(content, history, courseContext);

    await prisma.aIMessage.create({
      data: { conversationId, role: "assistant", content: response.answer },
    });

    return response;
  }

  private static async generateResponse(
    question: string,
    history: TutorMessage[],
    courseContext?: string
  ): Promise<TutorResponse> {
    const prompt = courseContext
      ? `${this.SYSTEM_PROMPT}\n\nCourse Context: ${courseContext}\n\nStudent: ${question}`
      : `${this.SYSTEM_PROMPT}\n\nStudent: ${question}`;

    try {
      const response = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        },
        body: JSON.stringify({
          model: "gpt-4",
          messages: [
            { role: "system", content: prompt },
            ...history.map((m) => ({ role: m.role, content: m.content })),
          ],
          temperature: 0.7,
          max_tokens: 1000,
        }),
      });

      if (!response.ok) throw new Error("AI API error");

      const data = await response.json();
      const answer = data.choices?.[0]?.message?.content ?? "I couldn't generate a response.";

      return {
        answer,
        confidence: 0.85,
        sources: [],
        suggestions: this.generateSuggestions(question),
      };
    } catch {
      return {
        answer: "I'm having trouble connecting to the AI service. Please try again later.",
        confidence: 0,
        sources: [],
        suggestions: [],
      };
    }
  }

  private static generateSuggestions(question: string): string[] {
    const lower = question.toLowerCase();
    const suggestions: string[] = [];

    if (lower.includes("what") || lower.includes("define")) {
      suggestions.push("Can you explain this in simpler terms?");
      suggestions.push("Give me an example");
    }
    if (lower.includes("how") || lower.includes("implement")) {
      suggestions.push("Show me the steps");
      suggestions.push("What are common mistakes?");
    }
    if (lower.includes("why")) {
      suggestions.push("What's the practical use?");
      suggestions.push("How does this relate to the course?");
    }

    return suggestions.slice(0, 3);
  }

  static async deleteConversation(conversationId: string) {
    return prisma.aIConversation.delete({ where: { id: conversationId } });
  }

  static async getConversationCount(userId: string): Promise<number> {
    return prisma.aIConversation.count({ where: { userId } });
  }

  static async getRecentConversations(userId: string, limit = 5) {
    return prisma.aIConversation.findMany({
      where: { userId },
      orderBy: { updatedAt: "desc" },
      take: limit,
      include: { messages: { take: 1, orderBy: { createdAt: "desc" } } },
    });
  }
}
