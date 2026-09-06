import { z } from "zod";
import { type AIMessage, type AIProvider, getAIClient } from "./provider";

// ─── Types ───────────────────────────────────────────────────────────────────

export const LearningStyleSchema = z.enum([
  "visual",
  "auditory",
  "reading",
  "kinesthetic",
]);
export type LearningStyle = z.infer<typeof LearningStyleSchema>;

export const DifficultyLevelSchema = z.enum([
  "beginner",
  "intermediate",
  "advanced",
  "expert",
]);
export type DifficultyLevel = z.infer<typeof DifficultyLevelSchema>;

export const SubjectAreaSchema = z.enum([
  "mathematics",
  "science",
  "computer_science",
  "literature",
  "history",
  "languages",
  "arts",
  "general",
]);
export type SubjectArea = z.infer<typeof SubjectAreaSchema>;

export interface StudentProfile {
  id: string;
  name: string;
  learningStyle: LearningStyle;
  difficultyLevel: DifficultyLevel;
  preferredSubjects: SubjectArea[];
  strengths: string[];
  weaknesses: string[];
  interactionHistory: InteractionRecord[];
  totalInteractions: number;
  averageSessionLength: number;
  lastActiveAt: Date;
}

export interface InteractionRecord {
  id: string;
  timestamp: Date;
  subject: SubjectArea;
  questionType: "conceptual" | "factual" | "procedural" | "analytical";
  difficulty: DifficultyLevel;
  wasHelpful: boolean;
  topicsCovered: string[];
  sessionDurationMs: number;
}

export interface TutorResponse {
  answer: string;
  subject: SubjectArea;
  conceptsCovered: string[];
  followUpQuestions: string[];
  relatedTopics: string[];
  suggestedDifficulty: DifficultyLevel;
  confidenceScore: number;
  resources: LearningResource[];
  studyTip?: string;
}

export interface LearningResource {
  title: string;
  type: "article" | "video" | "exercise" | "book" | "course" | "practice";
  url?: string;
  description: string;
  estimatedTimeMinutes: number;
  difficulty: DifficultyLevel;
}

export interface ConceptExplanation {
  concept: string;
  definition: string;
  simpleExplanation: string;
  examples: string[];
  analogies: string[];
  commonMisconceptions: string[];
  prerequisites: string[];
  nextConcepts: string[];
}

export interface AdaptiveRecommendation {
  type: "review" | "new_topic" | "practice" | "challenge" | "break";
  title: string;
  description: string;
  reason: string;
  estimatedTimeMinutes: number;
  priority: "high" | "medium" | "low";
  topics: string[];
}

// ─── Tutor Service ───────────────────────────────────────────────────────────

export class TutorService {
  private client = getAIClient();

  async askQuestion(
    question: string,
    student: StudentProfile,
    context?: {
      currentSubject?: SubjectArea;
      conversationHistory?: AIMessage[];
      includeResources?: boolean;
    },
  ): Promise<TutorResponse> {
    const subject = context?.currentSubject ?? this.classifySubject(question);
    const systemPrompt = this.buildSystemPrompt(student, subject);

    const messages: AIMessage[] = [
      { role: "system", content: systemPrompt },
      ...(context?.conversationHistory ?? []),
      { role: "user", content: question },
    ];

    const result = await this.client.complete(messages, {
      temperature: 0.7,
      maxTokens: 2048,
    });

    const parsed = this.parseTutorResponse(result.content, subject);

    await this.recordInteraction(student.id, {
      subject,
      questionType: this.classifyQuestionType(question),
      difficulty: student.difficultyLevel,
      wasHelpful: true,
      topicsCovered: parsed.conceptsCovered,
      sessionDurationMs: result.latencyMs,
    });

    return parsed;
  }

  async explainConcept(
    concept: string,
    student: StudentProfile,
    options?: {
      depth?: "brief" | "detailed" | "comprehensive";
      includeExamples?: boolean;
      includeAnalogies?: boolean;
      useVisualLanguage?: boolean;
    },
  ): Promise<ConceptExplanation> {
    const depth = options?.depth ?? "detailed";
    const learningStyle = student.learningStyle;

    const systemPrompt = `You are an expert educator. Explain the concept "${concept}" at a ${student.difficultyLevel} level.

Adapt your explanation for a ${learningStyle} learner.
Depth: ${depth}

Return a JSON object with this exact structure:
{
  "concept": "${concept}",
  "definition": "Precise academic definition",
  "simpleExplanation": "Easy to understand explanation",
  "examples": ["Example 1", "Example 2", "Example 3"],
  "analogies": ["Analogy 1", "Analogy 2"],
  "commonMisconceptions": ["Misconception 1", "Misconception 2"],
  "prerequisites": ["Prerequisite concept 1", "Prerequisite concept 2"],
  "nextConcepts": ["Related advanced concept 1", "Related advanced concept 2"]
}

${options?.includeExamples !== false ? "Include concrete, real-world examples." : ""}
${options?.includeAnalogies !== false ? "Include relatable analogies." : ""}
${learningStyle === "visual" ? "Use visual and spatial language in explanations." : ""}
${learningStyle === "kinesthetic" ? "Include hands-on activities and physical analogies." : ""}
${learningStyle === "auditory" ? "Reference sounds, rhythms, and verbal explanations." : ""}`;

    const result = await this.client.complete(
      [{ role: "user", content: `Explain: ${concept}` }],
      { temperature: 0.6, maxTokens: 1500 },
    );

    try {
      const jsonMatch = result.content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]) as ConceptExplanation;
      }
    } catch {
      // fallback if JSON parsing fails
    }

    return {
      concept,
      definition: result.content.split("\n")[0] || "",
      simpleExplanation: result.content,
      examples: [],
      analogies: [],
      commonMisconceptions: [],
      prerequisites: [],
      nextConcepts: [],
    };
  }

  async provideExamples(
    topic: string,
    count: number,
    student: StudentProfile,
  ): Promise<string[]> {
    const systemPrompt = `You are a creative educator. Generate ${count} diverse, ${student.difficultyLevel}-level examples for the topic "${topic}".
Adapt examples for a ${student.learningStyle} learner.
Each example should be unique and build upon the previous one in complexity.
Return each example on a separate line, numbered.`;

    const result = await this.client.complete(
      [{ role: "user", content: `Generate ${count} examples for: ${topic}` }],
      { temperature: 0.8, maxTokens: 1024 },
    );

    return result.content
      .split("\n")
      .filter((line) => line.trim().length > 0)
      .slice(0, count);
  }

  async suggestResources(
    topic: string,
    student: StudentProfile,
    count: number = 5,
  ): Promise<LearningResource[]> {
    const systemPrompt = `You are a learning resource curator. Suggest ${count} diverse learning resources for a ${student.difficultyLevel} student studying "${topic}".
Student learning style: ${student.learningStyle}

Return a JSON array with objects having:
{
  "title": "Resource title",
  "type": "article|video|exercise|book|course|practice",
  "description": "Brief description",
  "estimatedTimeMinutes": 30,
  "difficulty": "beginner|intermediate|advanced|expert"
}

Include a mix of resource types. Be specific and realistic.`;

    const result = await this.client.complete(
      [{ role: "user", content: `Suggest resources for: ${topic}` }],
      { temperature: 0.7, maxTokens: 1024 },
    );

    try {
      const jsonMatch = result.content.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]) as LearningResource[];
      }
    } catch {
      // fallback
    }

    return [];
  }

  async adaptDifficulty(
    student: StudentProfile,
    recentPerformance: { correct: boolean; topic: string; responseTimeMs: number }[],
  ): Promise<AdaptiveRecommendation[]> {
    const correctRate =
      recentPerformance.filter((p) => p.correct).length /
      Math.max(recentPerformance.length, 1);

    const avgResponseTime =
      recentPerformance.reduce((sum, p) => sum + p.responseTimeMs, 0) /
      Math.max(recentPerformance.length, 1);

    const systemPrompt = `Analyze this student's recent performance and generate adaptive recommendations.

Student: ${student.name}
Current level: ${student.difficultyLevel}
Learning style: ${student.learningStyle}
Weaknesses: ${student.weaknesses.join(", ")}
Strengths: ${student.strengths.join(", ")}

Recent performance:
- Correct rate: ${(correctRate * 100).toFixed(1)}%
- Average response time: ${(avgResponseTime / 1000).toFixed(1)}s
- Last ${recentPerformance.length} interactions analyzed

Generate 3-5 recommendations as a JSON array:
[{
  "type": "review|new_topic|practice|challenge|break",
  "title": "Recommendation title",
  "description": "Detailed description",
  "reason": "Why this recommendation",
  "estimatedTimeMinutes": 20,
  "priority": "high|medium|low",
  "topics": ["topic1", "topic2"]
}]

If correctRate > 80% and avgResponseTime < 10s, suggest harder challenges.
If correctRate < 50%, suggest review and foundational practice.
If avgResponseTime > 30s, suggest simplification.
Always include a break recommendation if they've been studying > 1 hour.`;

    const result = await this.client.complete(
      [{ role: "user", content: "Generate adaptive recommendations based on performance data." }],
      { temperature: 0.7, maxTokens: 1024 },
    );

    try {
      const jsonMatch = result.content.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]) as AdaptiveRecommendation[];
      }
    } catch {
      // fallback
    }

    return this.getDefaultRecommendations(student, correctRate);
  }

  async generateStudyTip(
    student: StudentProfile,
    subject: SubjectArea,
  ): Promise<string> {
    const systemPrompt = `Generate a personalized study tip for a ${student.difficultyLevel} ${student.learningStyle} learner studying ${subject}.
The tip should be:
- Specific and actionable
- Based on their learning style
- Relevant to the subject
- Under 100 words
- Encouraging and practical`;

    const result = await this.client.complete(
      [{ role: "user", content: "Generate a personalized study tip." }],
      { temperature: 0.8, maxTokens: 200 },
    );

    return result.content.trim();
  }

  async analyzeQuestion(
    question: string,
    student: StudentProfile,
  ): Promise<{
    subject: SubjectArea;
    questionType: string;
    difficulty: DifficultyLevel;
    keyTopics: string[];
    suggestedApproach: string;
  }> {
    const subject = this.classifySubject(question);
    const questionType = this.classifyQuestionType(question);

    const systemPrompt = `Analyze this student question and provide metadata.
Question: "${question}"
Student level: ${student.difficultyLevel}

Return JSON:
{
  "difficulty": "beginner|intermediate|advanced|expert",
  "keyTopics": ["topic1", "topic2"],
  "suggestedApproach": "How to best answer this question"
}`;

    const result = await this.client.complete(
      [{ role: "user", content: `Analyze: ${question}` }],
      { temperature: 0.3, maxTokens: 512 },
    );

    try {
      const jsonMatch = result.content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        return {
          subject,
          questionType,
          difficulty: parsed.difficulty ?? student.difficultyLevel,
          keyTopics: parsed.keyTopics ?? [],
          suggestedApproach: parsed.suggestedApproach ?? "",
        };
      }
    } catch {
      // fallback
    }

    return {
      subject,
      questionType,
      difficulty: student.difficultyLevel,
      keyTopics: [],
      suggestedApproach: "Provide a comprehensive explanation with examples.",
    };
  }

  // ─── Private Helpers ─────────────────────────────────────────────────────

  private buildSystemPrompt(student: StudentProfile, subject: SubjectArea): string {
    return `You are an expert AI tutor for an education platform.

Student Profile:
- Name: ${student.name}
- Learning Style: ${student.learningStyle}
- Difficulty Level: ${student.difficultyLevel}
- Preferred Subjects: ${student.preferredSubjects.join(", ")}
- Strengths: ${student.strengths.join(", ")}
- Weaknesses: ${student.weaknesses.join(", ")}

Teaching Guidelines:
1. Adapt your language and complexity to ${student.difficultyLevel} level.
2. Use ${student.learningStyle}-friendly explanations.
3. Build on the student's strengths: ${student.strengths.join(", ")}.
4. Gently address weaknesses: ${student.weaknesses.join(", ")}.
5. Be encouraging and supportive.
6. Use the Socratic method when appropriate - guide rather than just answer.
7. Provide real-world examples relevant to the student.
8. Suggest follow-up topics for deeper learning.

Current Subject Area: ${subject}

Always format your response with:
- A clear, direct answer
- An explanation of the reasoning
- 1-2 follow-up questions to check understanding
- Related topics for further study`;
  }

  private classifySubject(text: string): SubjectArea {
    const lower = text.toLowerCase();

    if (
      /\b(equation|formula|algebra|calculus|geometry|trigonometry|math|addition|subtraction|multiplication|division|theorem|proof)\b/.test(
        lower,
      )
    )
      return "mathematics";

    if (
      /\b(science|physics|chemistry|biology|experiment|hypothesis|molecule|atom|cell|energy|force)\b/.test(
        lower,
      )
    )
      return "science";

    if (
      /\b(programming|algorithm|code|software|function|variable|database|api|computer|javascript|python|html|css)\b/.test(
        lower,
      )
    )
      return "computer_science";

    if (
      /\b(literature|novel|poem|author|character|plot|theme|essay|writing|reading|book|fiction)\b/.test(
        lower,
      )
    )
      return "literature";

    if (
      /\b(history|war|civilization|century|ancient|revolution|empire|king|queen|president)\b/.test(
        lower,
      )
    )
      return "history";

    if (
      /\b(language|grammar|vocabulary|translation|verb|noun|adjective|pronunciation|fluency|spanish|french|english)\b/.test(
        lower,
      )
    )
      return "languages";

    if (
      /\b(art|music|painting|drawing|design|creative|sculpture|photography|film)\b/.test(
        lower,
      )
    )
      return "arts";

    return "general";
  }

  private classifyQuestionType(
    question: string,
  ): "conceptual" | "factual" | "procedural" | "analytical" {
    const lower = question.toLowerCase();

    if (/\b(what is|define|explain|meaning|concept|why)\b/.test(lower))
      return "conceptual";
    if (/\b(when|where|who|which|how many|date|name)\b/.test(lower))
      return "factual";
    if (/\b(how to|steps|process|method|procedure|way to)\b/.test(lower))
      return "procedural";
    if (/\b(compare|contrast|analyze|evaluate|difference|better|worse)\b/.test(lower))
      return "analytical";

    return "conceptual";
  }

  private parseTutorResponse(
    content: string,
    subject: SubjectArea,
  ): TutorResponse {
    const lines = content.split("\n").filter((l) => l.trim());
    const answer = lines.slice(0, Math.ceil(lines.length * 0.6)).join("\n");

    const concepts: string[] = [];
    const conceptMatch = content.match(/concept[s]?:?\s*\n([\s\S]*?)(?=\n\n|$)/i);
    if (conceptMatch) {
      conceptMatch[1]
        .split("\n")
        .forEach((line) => {
          const cleaned = line.replace(/^[-*•]\s*/, "").trim();
          if (cleaned) concepts.push(cleaned);
        });
    }

    const followUps: string[] = [];
    const followUpMatch = content.match(
      /follow[\s-]?up[s]?:?\s*\n([\s\S]*?)(?=\n\n|$)/i,
    );
    if (followUpMatch) {
      followUpMatch[1]
        .split("\n")
        .forEach((line) => {
          const cleaned = line.replace(/^\d+[.)]\s*/, "").trim();
          if (cleaned) followUps.push(cleaned);
        });
    }

    return {
      answer,
      subject,
      conceptsCovered: concepts.length > 0 ? concepts : [subject],
      followUpQuestions:
        followUps.length > 0
          ? followUps
          : ["Can you explain this in your own words?"],
      relatedTopics: [],
      suggestedDifficulty: this.estimateDifficultyFromResponse(content),
      confidenceScore: 0.85,
      resources: [],
    };
  }

  private estimateDifficultyFromResponse(
    response: string,
  ): DifficultyLevel {
    const wordCount = response.split(/\s+/).length;
    const hasTechnicalTerms =
      /\b(theorem|algorithm|derivative|synthesis|metaphor)\b/.test(
        response.toLowerCase(),
      );

    if (wordCount < 50 && !hasTechnicalTerms) return "beginner";
    if (wordCount < 150) return "intermediate";
    if (wordCount < 300 || hasTechnicalTerms) return "advanced";
    return "expert";
  }

  private async recordInteraction(
    studentId: string,
    data: Omit<InteractionRecord, "id" | "timestamp">,
  ): Promise<void> {
    // In production, this would write to the database
    void studentId;
    void data;
  }

  private getDefaultRecommendations(
    student: StudentProfile,
    correctRate: number,
  ): AdaptiveRecommendation[] {
    const recommendations: AdaptiveRecommendation[] = [];

    if (correctRate < 0.5) {
      recommendations.push({
        type: "review",
        title: "Review Fundamentals",
        description:
          "Your recent performance suggests reviewing foundational concepts.",
        reason: `Correct rate is ${(correctRate * 100).toFixed(0)}%, below the 50% threshold.`,
        estimatedTimeMinutes: 30,
        priority: "high",
        topics: student.weaknesses.slice(0, 3),
      });
    }

    if (correctRate > 0.8) {
      recommendations.push({
        type: "challenge",
        title: "Take on Advanced Challenges",
        description:
          "You're excelling! Time to tackle more challenging material.",
        reason: `Correct rate is ${(correctRate * 100).toFixed(0)}%, above the 80% threshold.`,
        estimatedTimeMinutes: 25,
        priority: "medium",
        topics: student.strengths.slice(0, 2),
      });
    }

    recommendations.push({
      type: "practice",
      title: "Practice Problem Set",
      description: "Reinforce learning with targeted practice problems.",
      reason: "Regular practice strengthens retention.",
      estimatedTimeMinutes: 20,
      priority: "medium",
      topics: student.preferredSubjects.slice(0, 2),
    });

    recommendations.push({
      type: "break",
      title: "Take a Break",
      description:
        "Step away, stretch, and return refreshed for better retention.",
      reason: "Regular breaks improve focus and learning outcomes.",
      estimatedTimeMinutes: 15,
      priority: "low",
      topics: [],
    });

    return recommendations;
  }
}

// ─── Singleton ───────────────────────────────────────────────────────────────

let tutorService: TutorService | null = null;

export function getTutorService(): TutorService {
  if (!tutorService) {
    tutorService = new TutorService();
  }
  return tutorService;
}
