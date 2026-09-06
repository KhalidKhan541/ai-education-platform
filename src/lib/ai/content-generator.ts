import { z } from "zod";
import { getAIClient, type AIMessage } from "./provider";

// ─── Types ───────────────────────────────────────────────────────────────────

export const ContentTypeSchema = z.enum([
  "quiz",
  "summary",
  "flashcards",
  "study_guide",
  "practice_problems",
  "essay_prompt",
  "discussion_question",
]);
export type ContentType = z.infer<typeof ContentTypeSchema>;

export const QuizQuestionTypeSchema = z.enum([
  "multiple_choice",
  "true_false",
  "short_answer",
  "fill_in_blank",
  "essay",
  "matching",
]);
export type QuizQuestionType = z.infer<typeof QuizQuestionTypeSchema>;

export interface QuizQuestion {
  id: string;
  type: QuizQuestionType;
  question: string;
  options?: string[];
  correctAnswer: string | string[];
  explanation: string;
  points: number;
  difficulty: "easy" | "medium" | "hard";
  topic: string;
  hints?: string[];
}

export interface Quiz {
  id: string;
  title: string;
  description: string;
  questions: QuizQuestion[];
  totalPoints: number;
  timeLimitMinutes: number;
  difficulty: "beginner" | "intermediate" | "advanced";
  topics: string[];
  createdAt: Date;
}

export interface Flashcard {
  id: string;
  front: string;
  back: string;
  category: string;
  difficulty: "easy" | "medium" | "hard";
  tags: string[];
  mnemonic?: string;
}

export interface FlashcardDeck {
  id: string;
  title: string;
  description: string;
  cards: Flashcard[];
  totalCards: number;
  estimatedStudyTimeMinutes: number;
}

export interface ContentSummary {
  id: string;
  title: string;
  executiveSummary: string;
  keyPoints: string[];
  detailedSummary: string;
  glossary: { term: string; definition: string }[];
  mainThemes: string[];
  wordCount: number;
  readingTimeMinutes: number;
}

export interface StudyGuide {
  id: string;
  title: string;
  overview: string;
  learningObjectives: string[];
  sections: StudyGuideSection[];
  keyTerms: { term: string; definition: string }[];
  practiceQuestions: QuizQuestion[];
  estimatedStudyHours: number;
}

export interface StudyGuideSection {
  title: string;
  content: string;
  keyPoints: string[];
  studyTips: string[];
  commonMistakes: string[];
  resources: { title: string; type: string; description: string }[];
}

export interface PracticeProblem {
  id: string;
  problem: string;
  context?: string;
  type: "calculation" | "analysis" | "design" | "proof" | "application";
  difficulty: "easy" | "medium" | "hard";
  hints: string[];
  solution: string;
  solutionSteps?: string[];
  topic: string;
  estimatedTimeMinutes: number;
}

export interface GenerationOptions {
  count?: number;
  difficulty?: "beginner" | "intermediate" | "advanced";
  topics?: string[];
  format?: "json" | "markdown";
  language?: string;
  includeExplanations?: boolean;
  includeHints?: boolean;
}

// ─── Content Generator Service ───────────────────────────────────────────────

export class ContentGenerator {
  private client = getAIClient();

  async generateQuiz(
    sourceContent: string,
    options?: GenerationOptions & { questionTypes?: QuizQuestionType[] },
  ): Promise<Quiz> {
    const count = options?.count ?? 10;
    const difficulty = options?.difficulty ?? "intermediate";
    const questionTypes =
      options?.questionTypes ?? [
        "multiple_choice",
        "true_false",
        "short_answer",
      ];

    const systemPrompt = `You are an expert educational content creator. Generate a quiz based on the provided content.

Requirements:
- Generate exactly ${count} questions
- Difficulty level: ${difficulty}
- Question types: ${questionTypes.join(", ")}
- Each question must test understanding, not just recall
- Include clear, unambiguous correct answers
- Provide thorough explanations for each answer
- Include hints for challenging questions
- Vary difficulty within the quiz (30% easy, 50% medium, 20% hard)
- Cover different sections of the content

Return a JSON object with this exact structure:
{
  "title": "Quiz title based on content",
  "description": "Brief description of what the quiz covers",
  "questions": [
    {
      "type": "multiple_choice|true_false|short_answer|fill_in_blank|essay|matching",
      "question": "The question text",
      "options": ["Option A", "Option B", "Option C", "Option D"],
      "correctAnswer": "The correct answer or option letter",
      "explanation": "Detailed explanation of why this is correct",
      "points": 10,
      "difficulty": "easy|medium|hard",
      "topic": "Specific topic this question covers",
      "hints": ["Hint 1", "Hint 2"]
    }
  ]
}

For true_false questions, options should be ["True", "False"].
For multiple_choice, provide 4 options.
For matching, provide pairs in the correctAnswer field.
For essay, provide a rubric in the explanation.`;

    const result = await this.client.complete(
      [{ role: "user", content: `Create a quiz from this content:\n\n${this.truncateContent(sourceContent, 8000)}` }],
      { temperature: 0.7, maxTokens: 4096 },
    );

    try {
      const jsonMatch = result.content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        const questions: QuizQuestion[] = (parsed.questions ?? []).map(
          (q: Record<string, unknown>, i: number) => ({
            id: `q_${Date.now()}_${i}`,
            type: q.type ?? "multiple_choice",
            question: q.question ?? "",
            options: q.options as string[] | undefined,
            correctAnswer: (q.correctAnswer as string) ?? "",
            explanation: (q.explanation as string) ?? "",
            points: (q.points as number) ?? 10,
            difficulty: (q.difficulty as string) ?? "medium",
            topic: (q.topic as string) ?? "general",
            hints: (q.hints as string[]) ?? [],
          }),
        );

        return {
          id: `quiz_${Date.now()}`,
          title: parsed.title ?? "Generated Quiz",
          description: parsed.description ?? "",
          questions,
          totalPoints: questions.reduce((sum, q) => sum + q.points, 0),
          timeLimitMinutes: questions.length * 2,
          difficulty: difficulty as Quiz["difficulty"],
          topics: [...new Set(questions.map((q) => q.topic))],
          createdAt: new Date(),
        };
      }
    } catch {
      // fallback
    }

    return this.createFallbackQuiz(count, difficulty);
  }

  async generateSummary(
    content: string,
    options?: {
      maxLength?: number;
      style?: "executive" | "academic" | "casual" | "bullet_points";
      includeGlossary?: boolean;
    },
  ): Promise<ContentSummary> {
    const style = options?.style ?? "academic";

    const systemPrompt = `You are an expert content summarizer. Create a comprehensive summary.

Style: ${style}
${options?.maxLength ? `Max length: ${options.maxLength} words` : ""}
${options?.includeGlossary !== false ? "Include a glossary of key terms." : ""}

Return a JSON object:
{
  "title": "Summary title",
  "executiveSummary": "2-3 sentence overview",
  "keyPoints": ["Point 1", "Point 2", "Point 3", "Point 4", "Point 5"],
  "detailedSummary": "Full detailed summary in ${style} style",
  "glossary": [{"term": "Term", "definition": "Definition"}],
  "mainThemes": ["Theme 1", "Theme 2", "Theme 3"]
}

Guidelines:
- Executive summary should capture the essence in 2-3 sentences
- Key points should be the 5-7 most important takeaways
- Detailed summary should be 30-40% of original length
- Glossary should cover domain-specific terms
- Main themes should identify overarching ideas`;

    const result = await this.client.complete(
      [{ role: "user", content: `Summarize this content:\n\n${this.truncateContent(content, 10000)}` }],
      { temperature: 0.5, maxTokens: 2048 },
    );

    try {
      const jsonMatch = result.content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        const wordCount = (parsed.detailedSummary ?? "").split(/\s+/).length;

        return {
          id: `summary_${Date.now()}`,
          title: parsed.title ?? "Content Summary",
          executiveSummary: parsed.executiveSummary ?? "",
          keyPoints: parsed.keyPoints ?? [],
          detailedSummary: parsed.detailedSummary ?? "",
          glossary: parsed.glossary ?? [],
          mainThemes: parsed.mainThemes ?? [],
          wordCount,
          readingTimeMinutes: Math.ceil(wordCount / 200),
        };
      }
    } catch {
      // fallback
    }

    return this.createFallbackSummary(content);
  }

  async generateFlashcards(
    content: string,
    options?: GenerationOptions,
  ): Promise<FlashcardDeck> {
    const count = options?.count ?? 20;
    const difficulty = options?.difficulty ?? "intermediate";

    const systemPrompt = `You are an expert educator creating flashcards for effective study.

Generate exactly ${count} flashcards from the provided content.
Difficulty: ${difficulty}

Return a JSON object:
{
  "title": "Flashcard deck title",
  "description": "What this deck covers",
  "cards": [
    {
      "front": "Question or term",
      "back": "Answer or definition",
      "category": "Category/topic",
      "difficulty": "easy|medium|hard",
      "tags": ["tag1", "tag2"],
      "mnemonic": "Optional memory aid"
    }
  ]
}

Guidelines:
- Front should be concise but clear
- Back should be comprehensive yet digestible
- Mix question types: definitions, comparisons, applications, examples
- Include mnemonics for difficult concepts
- Create meaningful categories
- Each card should test one concept
- Vary difficulty: 30% easy, 50% medium, 20% hard`;

    const result = await this.client.complete(
      [{ role: "user", content: `Create flashcards from:\n\n${this.truncateContent(content, 8000)}` }],
      { temperature: 0.7, maxTokens: 4096 },
    );

    try {
      const jsonMatch = result.content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        const cards: Flashcard[] = (parsed.cards ?? []).map(
          (c: Record<string, unknown>, i: number) => ({
            id: `card_${Date.now()}_${i}`,
            front: (c.front as string) ?? "",
            back: (c.back as string) ?? "",
            category: (c.category as string) ?? "general",
            difficulty: (c.difficulty as Flashcard["difficulty"]) ?? "medium",
            tags: (c.tags as string[]) ?? [],
            mnemonic: c.mnemonic as string | undefined,
          }),
        );

        return {
          id: `deck_${Date.now()}`,
          title: parsed.title ?? "Flashcard Deck",
          description: parsed.description ?? "",
          cards,
          totalCards: cards.length,
          estimatedStudyTimeMinutes: cards.length * 1.5,
        };
      }
    } catch {
      // fallback
    }

    return this.createFallbackFlashcards(count);
  }

  async generateStudyGuide(
    topic: string,
    level: "beginner" | "intermediate" | "advanced" = "intermediate",
    options?: {
      sectionCount?: number;
      includePractice?: boolean;
      focusAreas?: string[];
    },
  ): Promise<StudyGuide> {
    const sectionCount = options?.sectionCount ?? 5;

    const systemPrompt = `You are an expert curriculum designer. Create a comprehensive study guide for: "${topic}"
Level: ${level}
Include ${sectionCount} sections.
${options?.includePractice !== false ? "Include practice questions at the end." : ""}
${options?.focusAreas ? `Focus areas: ${options.focusAreas.join(", ")}` : ""}

Return a JSON object:
{
  "title": "Study guide title",
  "overview": "Overview of what will be learned",
  "learningObjectives": ["Objective 1", "Objective 2", "Objective 3"],
  "sections": [
    {
      "title": "Section title",
      "content": "Main content for this section",
      "keyPoints": ["Key point 1", "Key point 2"],
      "studyTips": ["Tip 1", "Tip 2"],
      "commonMistakes": ["Mistake 1", "Mistake 2"],
      "resources": [{"title": "Resource", "type": "type", "description": "desc"}]
    }
  ],
  "keyTerms": [{"term": "Term", "definition": "Definition"}],
  "estimatedStudyHours": 10
}

Make the content educational, well-structured, and appropriate for the level.`;

    const result = await this.client.complete(
      [{ role: "user", content: `Create a study guide for: ${topic}` }],
      { temperature: 0.6, maxTokens: 4096 },
    );

    try {
      const jsonMatch = result.content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);

        const sections: StudyGuideSection[] = (parsed.sections ?? []).map(
          (s: Record<string, unknown>) => ({
            title: (s.title as string) ?? "",
            content: (s.content as string) ?? "",
            keyPoints: (s.keyPoints as string[]) ?? [],
            studyTips: (s.studyTips as string[]) ?? [],
            commonMistakes: (s.commonMistakes as string[]) ?? [],
            resources: (s.resources as StudyGuideSection["resources"]) ?? [],
          }),
        );

        let practiceQuestions: QuizQuestion[] = [];
        if (options?.includePractice !== false) {
          const practiceQuiz = await this.generateQuiz(
            `Study guide for ${topic}: ${sections.map((s) => s.content).join("\n")}`,
            { count: 5, difficulty: level },
          );
          practiceQuestions = practiceQuiz.questions;
        }

        return {
          id: `guide_${Date.now()}`,
          title: parsed.title ?? `Study Guide: ${topic}`,
          overview: parsed.overview ?? "",
          learningObjectives: parsed.learningObjectives ?? [],
          sections,
          keyTerms: parsed.keyTerms ?? [],
          practiceQuestions,
          estimatedStudyHours: parsed.estimatedStudyHours ?? 10,
        };
      }
    } catch {
      // fallback
    }

    return this.createFallbackStudyGuide(topic, level);
  }

  async generatePracticeProblems(
    topic: string,
    count: number = 5,
    difficulty: "easy" | "medium" | "hard" = "medium",
  ): Promise<PracticeProblem[]> {
    const systemPrompt = `You are an expert educator generating practice problems for: "${topic}"

Generate exactly ${count} practice problems.
Difficulty: ${difficulty}

Return a JSON array:
[{
  "problem": "The problem statement",
  "context": "Additional context if needed",
  "type": "calculation|analysis|design|proof|application",
  "difficulty": "easy|medium|hard",
  "hints": ["Hint 1", "Hint 2", "Hint 3"],
  "solution": "Complete solution",
  "solutionSteps": ["Step 1", "Step 2", "Step 3"],
  "topic": "Specific sub-topic",
  "estimatedTimeMinutes": 15
}]

Guidelines:
- Problems should be realistic and practical
- Include a progression of difficulty within the set
- Provide step-by-step solutions
- Hints should guide without giving away the answer
- Each problem should test different aspects of the topic`;

    const result = await this.client.complete(
      [{ role: "user", content: `Generate practice problems for: ${topic}` }],
      { temperature: 0.7, maxTokens: 3072 },
    );

    try {
      const jsonMatch = result.content.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        return parsed.map(
          (p: Record<string, unknown>, i: number) =>
            ({
              id: `problem_${Date.now()}_${i}`,
              problem: (p.problem as string) ?? "",
              context: p.context as string | undefined,
              type: (p.type as PracticeProblem["type"]) ?? "application",
              difficulty: (p.difficulty as PracticeProblem["difficulty"]) ?? difficulty,
              hints: (p.hints as string[]) ?? [],
              solution: (p.solution as string) ?? "",
              solutionSteps: (p.solutionSteps as string[]) ?? [],
              topic: (p.topic as string) ?? topic,
              estimatedTimeMinutes: (p.estimatedTimeMinutes as number) ?? 15,
            }) as PracticeProblem,
        );
      }
    } catch {
      // fallback
    }

    return this.createFallbackProblems(topic, count, difficulty);
  }

  async generateFromTemplate(
    templateType: ContentType,
    sourceContent: string,
    options?: GenerationOptions,
  ): Promise<unknown> {
    switch (templateType) {
      case "quiz":
        return this.generateQuiz(sourceContent, options);
      case "summary":
        return this.generateSummary(sourceContent, options);
      case "flashcards":
        return this.generateFlashcards(sourceContent, options);
      case "study_guide":
        return this.generateStudyGuide(
          sourceContent,
          options?.difficulty ?? "intermediate",
          { sectionCount: options?.count },
        );
      case "practice_problems":
        return this.generatePracticeProblems(
          sourceContent,
          options?.count ?? 5,
          (options?.difficulty as "easy" | "medium" | "hard") ?? "medium",
        );
      default:
        throw new Error(`Unsupported template type: ${templateType}`);
    }
  }

  async batchGenerate(
    requests: {
      type: ContentType;
      content: string;
      options?: GenerationOptions;
    }[],
  ): Promise<Record<ContentType, unknown>> {
    const results = await Promise.allSettled(
      requests.map((req) =>
        this.generateFromTemplate(req.type, req.content, req.options),
      ),
    );

    const output: Record<string, unknown> = {};
    results.forEach((result, index) => {
      const type = requests[index].type;
      if (result.status === "fulfilled") {
        output[type] = result.value;
      } else {
        output[type] = { error: result.reason?.message ?? "Generation failed" };
      }
    });

    return output as Record<ContentType, unknown>;
  }

  // ─── Private Helpers ─────────────────────────────────────────────────────

  private truncateContent(content: string, maxChars: number): string {
    if (content.length <= maxChars) return content;
    return content.substring(0, maxChars) + "\n\n[Content truncated...]";
  }

  private createFallbackQuiz(
    count: number,
    difficulty: string,
  ): Quiz {
    const questions: QuizQuestion[] = Array.from(
      { length: count },
      (_, i) => ({
        id: `q_fallback_${i}`,
        type: "multiple_choice" as QuizQuestionType,
        question: `Question ${i + 1}: What is the key concept in this section?`,
        options: [
          "Option A - Primary concept",
          "Option B - Secondary concept",
          "Option C - Related concept",
          "Option D - Unrelated concept",
        ],
        correctAnswer: "A",
        explanation: "This is a placeholder question. Please regenerate with actual content.",
        points: 10,
        difficulty: (["easy", "medium", "hard"][i % 3]) as "easy" | "medium" | "hard",
        topic: "general",
        hints: ["Think about the main ideas in the content."],
      }),
    );

    return {
      id: `quiz_fallback_${Date.now()}`,
      title: "Generated Quiz",
      description: "Quiz generated from provided content",
      questions,
      totalPoints: count * 10,
      timeLimitMinutes: count * 2,
      difficulty: difficulty as Quiz["difficulty"],
      topics: ["general"],
      createdAt: new Date(),
    };
  }

  private createFallbackSummary(content: string): ContentSummary {
    const wordCount = content.split(/\s+/).length;
    return {
      id: `summary_fallback_${Date.now()}`,
      title: "Content Summary",
      executiveSummary:
        "This is a summary of the provided content. Please regenerate for a more detailed analysis.",
      keyPoints: [
        "Key point 1 from the content",
        "Key point 2 from the content",
        "Key point 3 from the content",
      ],
      detailedSummary: content.substring(0, 500) + "...",
      glossary: [],
      mainThemes: ["Main theme identified from content"],
      wordCount,
      readingTimeMinutes: Math.ceil(wordCount / 200),
    };
  }

  private createFallbackFlashcards(count: number): FlashcardDeck {
    const cards: Flashcard[] = Array.from({ length: count }, (_, i) => ({
      id: `card_fallback_${i}`,
      front: `Term ${i + 1}`,
      back: `Definition for term ${i + 1}`,
      category: "general",
      difficulty: "medium" as const,
      tags: ["fallback"],
    }));

    return {
      id: `deck_fallback_${Date.now()}`,
      title: "Flashcard Deck",
      description: "Flashcards generated from provided content",
      cards,
      totalCards: count,
      estimatedStudyTimeMinutes: count * 1.5,
    };
  }

  private createFallbackStudyGuide(
    topic: string,
    level: string,
  ): StudyGuide {
    return {
      id: `guide_fallback_${Date.now()}`,
      title: `Study Guide: ${topic}`,
      overview: `A comprehensive study guide for ${topic} at the ${level} level.`,
      learningObjectives: [
        `Understand the fundamentals of ${topic}`,
        `Apply key concepts in practical scenarios`,
        `Analyze and evaluate ${topic}-related problems`,
      ],
      sections: [
        {
          title: "Introduction",
          content: `Overview of ${topic} and its importance.`,
          keyPoints: [`Core concepts of ${topic}`],
          studyTips: ["Start with the basics", "Practice regularly"],
          commonMistakes: ["Skipping foundational concepts"],
          resources: [],
        },
      ],
      keyTerms: [],
      practiceQuestions: [],
      estimatedStudyHours: 10,
    };
  }

  private createFallbackProblems(
    topic: string,
    count: number,
    difficulty: string,
  ): PracticeProblem[] {
    return Array.from({ length: count }, (_, i) => ({
      id: `problem_fallback_${i}`,
      problem: `Practice problem ${i + 1} for ${topic}`,
      type: "application" as const,
      difficulty: difficulty as "easy" | "medium" | "hard",
      hints: ["Review the relevant material", "Think step by step"],
      solution: "Solution placeholder - regenerate with actual content.",
      topic,
      estimatedTimeMinutes: 15,
    }));
  }
}

// ─── Singleton ───────────────────────────────────────────────────────────────

let generator: ContentGenerator | null = null;

export function getContentGenerator(): ContentGenerator {
  if (!generator) {
    generator = new ContentGenerator();
  }
  return generator;
}
