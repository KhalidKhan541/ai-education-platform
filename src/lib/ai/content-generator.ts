export interface ContentGenerationRequest {
  type: "SUMMARY" | "QUIZ_QUESTIONS" | "EXPLANATION" | "FLASHCARDS" | "OUTLINE";
  content: string;
  parameters?: {
    difficulty?: "EASY" | "MEDIUM" | "HARD";
    count?: number;
    format?: "BULLET_POINTS" | "PARAGRAPHS" | "NUMBERED_LIST";
  };
}

export interface GeneratedContent {
  type: string;
  result: unknown;
  tokensUsed: number;
  model: string;
}

export class ContentGenerator {
  private static readonly MODEL = "gpt-4";

  static async generate(request: ContentGenerationRequest): Promise<GeneratedContent> {
    const prompt = this.buildPrompt(request);

    try {
      const response = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        },
        body: JSON.stringify({
          model: this.MODEL,
          messages: [
            { role: "system", content: "You are an educational content generator." },
            { role: "user", content: prompt },
          ],
          temperature: 0.7,
          max_tokens: 2000,
        }),
      });

      if (!response.ok) throw new Error("Content generation failed");

      const data = await response.json();
      const text = data.choices?.[0]?.message?.content ?? "";

      return {
        type: request.type,
        result: this.parseResponse(request.type, text),
        tokensUsed: data.usage?.total_tokens ?? 0,
        model: this.MODEL,
      };
    } catch {
      return {
        type: request.type,
        result: this.getFallbackContent(request.type),
        tokensUsed: 0,
        model: this.MODEL,
      };
    }
  }

  private static buildPrompt(request: ContentGenerationRequest): string {
    const { type, content, parameters } = request;
    const difficulty = parameters?.difficulty ?? "MEDIUM";
    const count = parameters?.count ?? 5;
    const format = parameters?.format ?? "PARAGRAPHS";

    switch (type) {
      case "SUMMARY":
        return `Summarize the following content in ${format} at a ${difficulty} level:\n\n${content}`;
      case "QUIZ_QUESTIONS":
        return `Generate ${count} ${difficulty} level quiz questions based on:\n\n${content}\n\nReturn as JSON with question, options, correctAnswer, and explanation fields.`;
      case "EXPLANATION":
        return `Explain the following at a ${difficulty} level:\n\n${content}`;
      case "FLASHCARDS":
        return `Create ${count} flashcards from:\n\n${content}\n\nReturn as JSON with front and back fields.`;
      case "OUTLINE":
        return `Create a structured outline from:\n\n${content}`;
      default:
        return `Process the following content:\n\n${content}`;
    }
  }

  private static parseResponse(type: string, text: string): unknown {
    try {
      if (type === "QUIZ_QUESTIONS" || type === "FLASHCARDS") {
        return JSON.parse(text);
      }
    } catch {
      // Fall through to return raw text
    }
    return text;
  }

  private static getFallbackContent(type: string): unknown {
    switch (type) {
      case "SUMMARY":
        return "Unable to generate summary at this time.";
      case "QUIZ_QUESTIONS":
        return [];
      case "EXPLANATION":
        return "Unable to generate explanation at this time.";
      case "FLASHCARDS":
        return [];
      case "OUTLINE":
        return "Unable to generate outline at this time.";
      default:
        return "Content generation unavailable.";
    }
  }

  static async generateSummary(content: string): Promise<string> {
    const result = await this.generate({
      type: "SUMMARY",
      content,
      parameters: { difficulty: "MEDIUM", format: "BULLET_POINTS" },
    });
    return typeof result.result === "string" ? result.result : JSON.stringify(result.result);
  }

  static async generateQuizQuestions(
    content: string,
    count = 5,
    difficulty: "EASY" | "MEDIUM" | "HARD" = "MEDIUM"
  ): Promise<unknown[]> {
    const result = await this.generate({
      type: "QUIZ_QUESTIONS",
      content,
      parameters: { difficulty, count },
    });
    return Array.isArray(result.result) ? result.result : [];
  }

  static async generateFlashcards(
    content: string,
    count = 10
  ): Promise<Array<{ front: string; back: string }>> {
    const result = await this.generate({
      type: "FLASHCARDS",
      content,
      parameters: { count },
    });
    return Array.isArray(result.result) ? result.result : [];
  }

  static async generateExplanation(content: string, difficulty: "EASY" | "MEDIUM" | "HARD" = "MEDIUM"): Promise<string> {
    const result = await this.generate({
      type: "EXPLANATION",
      content,
      parameters: { difficulty },
    });
    return typeof result.result === "string" ? result.result : JSON.stringify(result.result);
  }
}
