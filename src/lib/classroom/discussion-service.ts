import { z } from "zod";
import { getAIClient, type AIMessage } from "../ai/provider";

// ─── Types ───────────────────────────────────────────────────────────────────

export const DiscussionStatusSchema = z.enum([
  "draft",
  "open",
  "closed",
  "archived",
]);
export type DiscussionStatus = z.infer<typeof DiscussionStatusSchema>;

export const ModerationActionSchema = z.enum([
  "approve",
  "flag",
  "hide",
  "remove",
  "warn",
  "ban",
]);
export type ModerationAction = z.infer<typeof ModerationActionSchema>;

export interface Discussion {
  id: string;
  courseId: string;
  title: string;
  description: string;
  authorId: string;
  authorName: string;
  status: DiscussionStatus;
  tags: string[];
  isPinned: boolean;
  isLocked: boolean;
  allowAnonymous: boolean;
  requireApproval: boolean;
  replies: DiscussionReply[];
  views: number;
  lastActivityAt: Date;
  createdAt: Date;
  updatedAt: Date;
  aiSummary?: string;
  aiSummaryGeneratedAt?: Date;
}

export interface DiscussionReply {
  id: string;
  discussionId: string;
  parentReplyId?: string;
  authorId: string;
  authorName: string;
  content: string;
  isAnonymous: boolean;
  isEdited: boolean;
  isDeleted: boolean;
  isApproved: boolean;
  upvotes: string[];
  downvotes: string[];
  reportCount: number;
  moderationStatus: "pending" | "approved" | "flagged" | "removed";
  createdAt: Date;
  updatedAt: Date;
  editedAt?: Date;
  replies?: DiscussionReply[];
}

export interface DiscussionReport {
  id: string;
  replyId: string;
  reportedBy: string;
  reason: "spam" | "inappropriate" | "off_topic" | "harassment" | "plagiarism" | "other";
  description: string;
  status: "pending" | "reviewed" | "resolved";
  moderatorId?: string;
  action?: ModerationAction;
  createdAt: Date;
  resolvedAt?: Date;
}

export interface DiscussionFilter {
  courseId?: string;
  authorId?: string;
  tags?: string[];
  status?: DiscussionStatus;
  search?: string;
  sortBy?: "newest" | "oldest" | "most_replies" | "most_views" | "most_upvotes" | "recent_activity";
  limit?: number;
  offset?: number;
}

export interface DiscussionStats {
  totalDiscussions: number;
  totalReplies: number;
  totalViews: number;
  activeDiscussions: number;
  topContributors: { userId: string; name: string; replyCount: number }[];
  popularTags: { tag: string; count: number }[];
  averageRepliesPerDiscussion: number;
  averageViewsPerDiscussion: number;
}

export interface ModerationQueueItem {
  reply: DiscussionReply;
  discussionTitle: string;
  reports: DiscussionReport[];
  aiSentimentScore: number;
  aiRiskLevel: "low" | "medium" | "high";
  aiRecommendation: ModerationAction;
}

// ─── Discussion Service ──────────────────────────────────────────────────────

export class DiscussionService {
  private discussions: Map<string, Discussion> = new Map();
  private reports: Map<string, DiscussionReport[]> = new Map();
  private client = getAIClient();

  createDiscussion(
    courseId: string,
    title: string,
    description: string,
    authorId: string,
    authorName: string,
    options?: {
      tags?: string[];
      isPinned?: boolean;
      allowAnonymous?: boolean;
      requireApproval?: boolean;
      status?: DiscussionStatus;
    },
  ): Discussion {
    const id = `disc_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

    const discussion: Discussion = {
      id,
      courseId,
      title,
      description,
      authorId,
      authorName,
      status: options?.status ?? "open",
      tags: options?.tags ?? [],
      isPinned: options?.isPinned ?? false,
      isLocked: false,
      allowAnonymous: options?.allowAnonymous ?? false,
      requireApproval: options?.requireApproval ?? false,
      replies: [],
      views: 0,
      lastActivityAt: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.discussions.set(id, discussion);
    return discussion;
  }

  getDiscussion(discussionId: string): Discussion {
    const discussion = this.discussions.get(discussionId);
    if (!discussion) {
      throw new DiscussionError(`Discussion "${discussionId}" not found.`);
    }
    return discussion;
  }

  listDiscussions(filter: DiscussionFilter): {
    discussions: Discussion[];
    total: number;
  } {
    let results = Array.from(this.discussions.values());

    if (filter.courseId) {
      results = results.filter((d) => d.courseId === filter.courseId);
    }
    if (filter.authorId) {
      results = results.filter((d) => d.authorId === filter.authorId);
    }
    if (filter.tags && filter.tags.length > 0) {
      results = results.filter((d) =>
        filter.tags!.some((tag) => d.tags.includes(tag)),
      );
    }
    if (filter.status) {
      results = results.filter((d) => d.status === filter.status);
    }
    if (filter.search) {
      const searchLower = filter.search.toLowerCase();
      results = results.filter(
        (d) =>
          d.title.toLowerCase().includes(searchLower) ||
          d.description.toLowerCase().includes(searchLower),
      );
    }

    const total = results.length;

    switch (filter.sortBy) {
      case "newest":
        results.sort(
          (a, b) =>
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
        );
        break;
      case "oldest":
        results.sort(
          (a, b) =>
            new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
        );
        break;
      case "most_replies":
        results.sort((a, b) => b.replies.length - a.replies.length);
        break;
      case "most_views":
        results.sort((a, b) => b.views - a.views);
        break;
      case "most_upvotes":
        results.sort((a, b) => {
          const aVotes = a.replies.reduce(
            (sum, r) => sum + r.upvotes.length - r.downvotes.length,
            0,
          );
          const bVotes = b.replies.reduce(
            (sum, r) => sum + r.upvotes.length - r.downvotes.length,
            0,
          );
          return bVotes - aVotes;
        });
        break;
      case "recent_activity":
      default:
        results.sort(
          (a, b) =>
            new Date(b.lastActivityAt).getTime() -
            new Date(a.lastActivityAt).getTime(),
        );
        break;
    }

    const offset = filter.offset ?? 0;
    const limit = filter.limit ?? 20;
    results = results.slice(offset, offset + limit);

    return { discussions: results, total };
  }

  addReply(
    discussionId: string,
    authorId: string,
    authorName: string,
    content: string,
    options?: {
      parentReplyId?: string;
      isAnonymous?: boolean;
    },
  ): DiscussionReply {
    const discussion = this.getDiscussion(discussionId);

    if (discussion.isLocked) {
      throw new DiscussionError("This discussion is locked.");
    }

    if (discussion.status !== "open") {
      throw new DiscussionError("Cannot reply to a discussion that is not open.");
    }

    if (options?.parentReplyId) {
      const parentReply = this.findReply(discussion, options.parentReplyId);
      if (!parentReply) {
        throw new DiscussionError("Parent reply not found.");
      }
      if (parentReply.parentReplyId) {
        throw new DiscussionError("Cannot nest replies more than one level deep.");
      }
    }

    if (discussion.allowAnonymous && options?.isAnonymous) {
      authorName = "Anonymous";
    }

    const reply: DiscussionReply = {
      id: `reply_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      discussionId,
      parentReplyId: options?.parentReplyId,
      authorId,
      authorName,
      content,
      isAnonymous: options?.isAnonymous ?? false,
      isEdited: false,
      isDeleted: false,
      isApproved: !discussion.requireApproval,
      upvotes: [],
      downvotes: [],
      reportCount: 0,
      moderationStatus: discussion.requireApproval ? "pending" : "approved",
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    if (options?.parentReplyId) {
      const parentReply = this.findReply(discussion, options.parentReplyId)!;
      if (!parentReply.replies) {
        parentReply.replies = [];
      }
      parentReply.replies.push(reply);
    } else {
      discussion.replies.push(reply);
    }

    discussion.lastActivityAt = new Date();
    discussion.updatedAt = new Date();

    return reply;
  }

  editReply(
    discussionId: string,
    replyId: string,
    userId: string,
    newContent: string,
  ): DiscussionReply {
    const discussion = this.getDiscussion(discussionId);
    const reply = this.findReply(discussion, replyId);

    if (!reply) {
      throw new DiscussionError("Reply not found.");
    }

    if (reply.authorId !== userId) {
      throw new DiscussionError("You can only edit your own replies.");
    }

    reply.content = newContent;
    reply.isEdited = true;
    reply.editedAt = new Date();
    reply.updatedAt = new Date();
    discussion.updatedAt = new Date();

    return reply;
  }

  deleteReply(discussionId: string, replyId: string, userId: string): void {
    const discussion = this.getDiscussion(discussionId);
    const reply = this.findReply(discussion, replyId);

    if (!reply) {
      throw new DiscussionError("Reply not found.");
    }

    if (reply.authorId !== userId) {
      throw new DiscussionError("You can only delete your own replies.");
    }

    reply.isDeleted = true;
    reply.content = "[This reply has been deleted]";
    reply.updatedAt = new Date();
    discussion.updatedAt = new Date();
  }

  upvoteReply(discussionId: string, replyId: string, userId: string): DiscussionReply {
    const discussion = this.getDiscussion(discussionId);
    const reply = this.findReply(discussion, replyId);

    if (!reply) {
      throw new DiscussionError("Reply not found.");
    }

    if (reply.authorId === userId) {
      throw new DiscussionError("Cannot vote on your own reply.");
    }

    reply.downvotes = reply.downvotes.filter((v) => v !== userId);

    if (reply.upvotes.includes(userId)) {
      reply.upvotes = reply.upvotes.filter((v) => v !== userId);
    } else {
      reply.upvotes.push(userId);
    }

    reply.updatedAt = new Date();
    discussion.updatedAt = new Date();

    return reply;
  }

  downvoteReply(discussionId: string, replyId: string, userId: string): DiscussionReply {
    const discussion = this.getDiscussion(discussionId);
    const reply = this.findReply(discussion, replyId);

    if (!reply) {
      throw new DiscussionError("Reply not found.");
    }

    if (reply.authorId === userId) {
      throw new DiscussionError("Cannot vote on your own reply.");
    }

    reply.upvotes = reply.upvotes.filter((v) => v !== userId);

    if (reply.downvotes.includes(userId)) {
      reply.downvotes = reply.downvotes.filter((v) => v !== userId);
    } else {
      reply.downvotes.push(userId);
    }

    reply.updatedAt = new Date();
    discussion.updatedAt = new Date();

    return reply;
  }

  getReplyScore(reply: DiscussionReply): number {
    return reply.upvotes.length - reply.downvotes.length;
  }

  getThreadedReplies(discussionId: string): DiscussionReply[] {
    const discussion = this.getDiscussion(discussionId);
    return discussion.replies
      .filter((r) => !r.isDeleted && r.moderationStatus === "approved")
      .sort((a, b) => {
        const scoreA = this.getReplyScore(a);
        const scoreB = this.getReplyScore(b);
        return scoreB - scoreA;
      });
  }

  // ─── Moderation ────────────────────────────────────────────────────────────

  reportReply(
    discussionId: string,
    replyId: string,
    reportedBy: string,
    reason: DiscussionReport["reason"],
    description: string,
  ): DiscussionReport {
    const discussion = this.getDiscussion(discussionId);
    const reply = this.findReply(discussion, replyId);

    if (!reply) {
      throw new DiscussionError("Reply not found.");
    }

    if (reply.authorId === reportedBy) {
      throw new DiscussionError("Cannot report your own reply.");
    }

    const report: DiscussionReport = {
      id: `report_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      replyId,
      reportedBy,
      reason,
      description,
      status: "pending",
      createdAt: new Date(),
    };

    const existingReports = this.reports.get(discussionId) ?? [];
    existingReports.push(report);
    this.reports.set(discussionId, existingReports);

    reply.reportCount++;

    if (reply.reportCount >= 3) {
      reply.moderationStatus = "flagged";
    }

    return report;
  }

  moderateReply(
    discussionId: string,
    replyId: string,
    moderatorId: string,
    action: ModerationAction,
    reason?: string,
  ): DiscussionReply {
    const discussion = this.getDiscussion(discussionId);
    const reply = this.findReply(discussion, replyId);

    if (!reply) {
      throw new DiscussionError("Reply not found.");
    }

    switch (action) {
      case "approve":
        reply.moderationStatus = "approved";
        reply.isApproved = true;
        break;
      case "flag":
        reply.moderationStatus = "flagged";
        break;
      case "hide":
      case "remove":
        reply.moderationStatus = "removed";
        reply.isDeleted = true;
        reply.content = `[This reply has been ${action}d by a moderator${reason ? `: ${reason}` : ""}]`;
        break;
      case "warn":
      case "ban":
        break;
    }

    reply.updatedAt = new Date();
    discussion.updatedAt = new Date();

    const reports = this.reports.get(discussionId) ?? [];
    for (const report of reports.filter((r) => r.replyId === replyId && r.status === "pending")) {
      report.status = "resolved";
      report.moderatorId = moderatorId;
      report.action = action;
      report.resolvedAt = new Date();
    }

    return reply;
  }

  getModerationQueue(discussionId: string): ModerationQueueItem[] {
    const discussion = this.getDiscussion(discussionId);
    const reports = this.reports.get(discussionId) ?? [];

    const pendingReplies = new Map<string, DiscussionReply>();
    for (const report of reports.filter((r) => r.status === "pending")) {
      const reply = this.findReply(discussion, report.replyId);
      if (reply && reply.moderationStatus !== "removed") {
        pendingReplies.set(report.replyId, reply);
      }
    }

    const queue: ModerationQueueItem[] = [];
    pendingReplies.forEach((reply, replyId) => {
      const replyReports = reports.filter(
        (r) => r.replyId === replyId && r.status === "pending",
      );

      queue.push({
        reply,
        discussionTitle: discussion.title,
        reports: replyReports,
        aiSentimentScore: 0.5,
        aiRiskLevel: reply.reportCount >= 5 ? "high" : reply.reportCount >= 2 ? "medium" : "low",
        aiRecommendation: reply.reportCount >= 5 ? "remove" : reply.reportCount >= 2 ? "flag" : "approve",
      });
    });

    return queue;
  }

  lockDiscussion(discussionId: string): Discussion {
    const discussion = this.getDiscussion(discussionId);
    discussion.isLocked = true;
    discussion.updatedAt = new Date();
    return discussion;
  }

  unlockDiscussion(discussionId: string): Discussion {
    const discussion = this.getDiscussion(discussionId);
    discussion.isLocked = false;
    discussion.updatedAt = new Date();
    return discussion;
  }

  pinDiscussion(discussionId: string): Discussion {
    const discussion = this.getDiscussion(discussionId);
    discussion.isPinned = true;
    discussion.updatedAt = new Date();
    return discussion;
  }

  unpinDiscussion(discussionId: string): Discussion {
    const discussion = this.getDiscussion(discussionId);
    discussion.isPinned = false;
    discussion.updatedAt = new Date();
    return discussion;
  }

  closeDiscussion(discussionId: string): Discussion {
    const discussion = this.getDiscussion(discussionId);
    discussion.status = "closed";
    discussion.isLocked = true;
    discussion.updatedAt = new Date();
    return discussion;
  }

  // ─── AI-Powered Features ───────────────────────────────────────────────────

  async summarizeDiscussion(discussionId: string): Promise<string> {
    const discussion = this.getDiscussion(discussionId);

    const repliesContent = discussion.replies
      .filter((r) => !r.isDeleted && r.moderationStatus === "approved")
      .map((r) => `${r.authorName}: ${r.content}`)
      .join("\n\n");

    const systemPrompt = `Summarize this discussion thread concisely.

Title: ${discussion.title}
Description: ${discussion.description}
Total replies: ${discussion.replies.length}
Tags: ${discussion.tags.join(", ")}

Replies:
${repliesContent.substring(0, 5000)}

Provide:
1. A brief summary (2-3 sentences)
2. Key points raised
3. Consensus or disagreements
4. Action items if any
5. Overall sentiment (positive/neutral/negative)`;

    const result = await this.client.complete(
      [{ role: "user", content: "Summarize this discussion." }],
      { temperature: 0.5, maxTokens: 1024 },
    );

    const summary = result.content;
    discussion.aiSummary = summary;
    discussion.aiSummaryGeneratedAt = new Date();

    return summary;
  }

  async moderateWithAI(content: string): Promise<{
    sentiment: "positive" | "neutral" | "negative";
    riskLevel: "low" | "medium" | "high";
    suggestedAction: ModerationAction;
    flags: string[];
    summary: string;
  }> {
    const systemPrompt = `Analyze this discussion reply for moderation purposes.

Content: "${content}"

Return a JSON object:
{
  "sentiment": "positive|neutral|negative",
  "riskLevel": "low|medium|high",
  "suggestedAction": "approve|flag|hide|remove",
  "flags": ["flag1", "flag2"],
  "summary": "Brief analysis"
}

Consider: appropriateness, spam likelihood, off-topic content, harassment, and educational value.`;

    const result = await this.client.complete(
      [{ role: "user", content: "Analyze this content for moderation." }],
      { temperature: 0.3, maxTokens: 512 },
    );

    try {
      const jsonMatch = result.content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        return {
          sentiment: parsed.sentiment ?? "neutral",
          riskLevel: parsed.riskLevel ?? "low",
          suggestedAction: parsed.suggestedAction ?? "approve",
          flags: parsed.flags ?? [],
          summary: parsed.summary ?? "",
        };
      }
    } catch {
      // fallback
    }

    return {
      sentiment: "neutral",
      riskLevel: "low",
      suggestedAction: "approve",
      flags: [],
      summary: "Content appears appropriate.",
    };
  }

  async suggestRelatedDiscussions(
    discussionId: string,
    limit: number = 5,
  ): Promise<Discussion[]> {
    const discussion = this.getDiscussion(discussionId);

    const allDiscussions = Array.from(this.discussions.values()).filter(
      (d) =>
        d.id !== discussionId &&
        d.courseId === discussion.courseId &&
        d.status === "open",
    );

    const scored = allDiscussions.map((d) => {
      let score = 0;

      const commonTags = d.tags.filter((t) => discussion.tags.includes(t));
      score += commonTags.length * 10;

      if (d.title.toLowerCase().includes(discussion.title.toLowerCase().split(" ")[0])) {
        score += 5;
      }

      const words1 = discussion.description.toLowerCase().split(/\s+/);
      const words2 = d.description.toLowerCase().split(/\s+/);
      const commonWords = words1.filter((w) => words2.includes(w) && w.length > 3);
      score += commonWords.length;

      return { discussion: d, score };
    });

    scored.sort((a, b) => b.score - a.score);

    return scored.slice(0, limit).map((s) => s.discussion);
  }

  async generateDiscussionPrompts(
    courseId: string,
    topic: string,
    count: number = 5,
  ): Promise<{ title: string; description: string; tags: string[] }[]> {
    const systemPrompt = `Generate ${count} engaging discussion prompts for a course topic.

Topic: ${topic}
Course ID: ${courseId}

Return a JSON array:
[{
  "title": "Engaging discussion title",
  "description": "Prompt description with questions to consider",
  "tags": ["tag1", "tag2"]
}]

Make prompts thought-provoking, educational, and appropriate for collaborative learning.
Include a mix of conceptual, analytical, and application-based prompts.`;

    const result = await this.client.complete(
      [{ role: "user", content: `Generate discussion prompts for: ${topic}` }],
      { temperature: 0.8, maxTokens: 1500 },
    );

    try {
      const jsonMatch = result.content.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
    } catch {
      // fallback
    }

    return [
      {
        title: `Discussion: ${topic}`,
        description: `Share your thoughts and insights about ${topic}. What are the key concepts? How do they relate to what you've learned?`,
        tags: [topic.toLowerCase().replace(/\s+/g, "_")],
      },
    ];
  }

  getStats(courseId?: string): DiscussionStats {
    let discussions = Array.from(this.discussions.values());
    if (courseId) {
      discussions = discussions.filter((d) => d.courseId === courseId);
    }

    const totalReplies = discussions.reduce(
      (sum, d) => sum + d.replies.length,
      0,
    );
    const totalViews = discussions.reduce((sum, d) => sum + d.views, 0);
    const activeDiscussions = discussions.filter(
      (d) => d.status === "open",
    ).length;

    const contributorMap = new Map<string, { name: string; count: number }>();
    discussions.forEach((d) => {
      d.replies.forEach((r) => {
        if (!r.isDeleted) {
          const existing = contributorMap.get(r.authorId) ?? {
            name: r.authorName,
            count: 0,
          };
          existing.count++;
          contributorMap.set(r.authorId, existing);
        }
      });
    });

    const topContributors = Array.from(contributorMap.entries())
      .map(([userId, data]) => ({
        userId,
        name: data.name,
        replyCount: data.count,
      }))
      .sort((a, b) => b.replyCount - a.replyCount)
      .slice(0, 10);

    const tagMap = new Map<string, number>();
    discussions.forEach((d) => {
      d.tags.forEach((tag) => {
        tagMap.set(tag, (tagMap.get(tag) ?? 0) + 1);
      });
    });

    const popularTags = Array.from(tagMap.entries())
      .map(([tag, count]) => ({ tag, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    return {
      totalDiscussions: discussions.length,
      totalReplies,
      totalViews,
      activeDiscussions,
      topContributors,
      popularTags,
      averageRepliesPerDiscussion:
        discussions.length > 0 ? totalReplies / discussions.length : 0,
      averageViewsPerDiscussion:
        discussions.length > 0 ? totalViews / discussions.length : 0,
    };
  }

  // ─── Private Helpers ─────────────────────────────────────────────────────

  private findReply(
    discussion: Discussion,
    replyId: string,
  ): DiscussionReply | null {
    for (const reply of discussion.replies) {
      if (reply.id === replyId) return reply;
      if (reply.replies) {
        const nested = reply.replies.find((r) => r.id === replyId);
        if (nested) return nested;
      }
    }
    return null;
  }
}

// ─── Error Class ─────────────────────────────────────────────────────────────

export class DiscussionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "DiscussionError";
  }
}

// ─── Singleton ───────────────────────────────────────────────────────────────

let discussionService: DiscussionService | null = null;

export function getDiscussionService(): DiscussionService {
  if (!discussionService) {
    discussionService = new DiscussionService();
  }
  return discussionService;
}
