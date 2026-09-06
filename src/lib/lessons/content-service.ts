import prisma from "@/lib/prisma";
import { generateId } from "@/lib/utils";
import type { ContentVersion, Prisma } from "@prisma/client";

// ── Types ──────────────────────────────────────────────────────────────

export type ContentBlock =
  | { type: "heading"; level: 1 | 2 | 3 | 4 | 5 | 6; text: string }
  | { type: "paragraph"; text: string }
  | { type: "code"; language: string; code: string; filename?: string }
  | { type: "image"; url: string; alt: string; caption?: string; width?: number; height?: number }
  | { type: "video"; url: string; title?: string; duration?: number; thumbnailUrl?: string }
  | { type: "embed"; url: string; type: "youtube" | "vimeo" | "codepen" | "codesandbox" | "other"; title?: string }
  | { type: "list"; ordered: boolean; items: string[] }
  | { type: "quote"; text: string; author?: string }
  | { type: "callout"; variant: "info" | "warning" | "tip" | "danger"; title?: string; text: string }
  | { type: "divider" }
  | { type: "table"; headers: string[]; rows: string[][] }
  | { type: "markdown"; content: string }
  | { type: "attachment"; fileName: string; fileUrl: string; fileSize: number; mimeType: string };

export interface LessonContent {
  blocks: ContentBlock[];
  metadata?: {
    estimatedReadTime?: number;
    difficulty?: string;
    tags?: string[];
  };
}

export interface DocumentAttachment {
  id: string;
  fileName: string;
  fileUrl: string;
  fileSize: number;
  mimeType: string;
  uploadedBy: string;
  uploadedAt: Date;
  description?: string;
}

export interface ContentVersionInput {
  lessonId: string;
  content: Prisma.InputJsonValue;
  authorId: string;
  changeDescription?: string;
}

export interface ContentPreviewRequest {
  content: LessonContent;
  format: "html" | "markdown" | "plain";
}

export interface ContentValidation {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

// ── Service ────────────────────────────────────────────────────────────

export const ContentService = {
  // ── Content CRUD ───────────────────────────────────────────────────

  async getLessonContent(lessonId: string): Promise<LessonContent | null> {
    const lesson = await prisma.lesson.findUnique({
      where: { id: lessonId },
      select: { content: true },
    });

    if (!lesson?.content) return null;

    return lesson.content as unknown as LessonContent;
  },

  async updateLessonContent(
    lessonId: string,
    content: LessonContent,
    authorId: string,
    changeDescription?: string
  ): Promise<void> {
    const currentLesson = await prisma.lesson.findUnique({
      where: { id: lessonId },
      select: { content: true },
    });

    if (currentLesson?.content) {
      await this.createVersion({
        lessonId,
        content: currentLesson.content as Prisma.InputJsonValue,
        authorId,
        changeDescription: changeDescription ?? "Auto-saved before update",
      });
    }

    const readTime = this.calculateReadTime(content);

    await prisma.lesson.update({
      where: { id: lessonId },
      data: {
        content: content as Prisma.InputJsonValue,
        duration: readTime,
      },
    });
  },

  // ── Attachments ────────────────────────────────────────────────────

  async addAttachment(
    lessonId: string,
    attachment: Omit<DocumentAttachment, "id" | "uploadedAt">
  ): Promise<DocumentAttachment> {
    const id = generateId();
    const record: DocumentAttachment = {
      id,
      ...attachment,
      uploadedAt: new Date(),
    };

    const lesson = await prisma.lesson.findUnique({
      where: { id: lessonId },
      select: { content: true },
    });

    if (!lesson) throw new Error("Lesson not found");

    const content = (lesson.content as unknown as LessonContent) ?? { blocks: [] };
    content.blocks.push({
      type: "attachment",
      fileName: attachment.fileName,
      fileUrl: attachment.fileUrl,
      fileSize: attachment.fileSize,
      mimeType: attachment.mimeType,
    });

    await prisma.lesson.update({
      where: { id: lessonId },
      data: { content: content as unknown as Prisma.InputJsonValue },
    });

    return record;
  },

  async removeAttachment(lessonId: string, attachmentUrl: string): Promise<void> {
    const lesson = await prisma.lesson.findUnique({
      where: { id: lessonId },
      select: { content: true },
    });

    if (!lesson?.content) throw new Error("Lesson not found");

    const content = lesson.content as unknown as LessonContent;
    content.blocks = content.blocks.filter(
      (block) => !(block.type === "attachment" && block.fileUrl === attachmentUrl)
    );

    await prisma.lesson.update({
      where: { id: lessonId },
      data: { content: content as unknown as Prisma.InputJsonValue },
    });
  },

  async getAttachments(lessonId: string): Promise<DocumentAttachment[]> {
    const lesson = await prisma.lesson.findUnique({
      where: { id: lessonId },
      select: { content: true },
    });

    if (!lesson?.content) return [];

    const content = lesson.content as unknown as LessonContent;
    return content.blocks
      .filter((block): block is ContentBlock & { type: "attachment" } => block.type === "attachment")
      .map((block) => ({
        id: generateId(),
        fileName: block.fileName,
        fileUrl: block.fileUrl,
        fileSize: block.fileSize,
        mimeType: block.mimeType,
        uploadedBy: "",
        uploadedAt: new Date(),
      }));
  },

  // ── Versioning ─────────────────────────────────────────────────────

  async createVersion(input: ContentVersionInput): Promise<ContentVersion> {
    const latestVersion = await prisma.contentVersion.findFirst({
      where: { lessonId: input.lessonId },
      orderBy: { versionNumber: "desc" },
      select: { versionNumber: true },
    });

    return prisma.contentVersion.create({
      data: {
        id: generateId(),
        lessonId: input.lessonId,
        content: input.content,
        authorId: input.authorId,
        versionNumber: (latestVersion?.versionNumber ?? 0) + 1,
        changeDescription: input.changeDescription,
      },
    });
  },

  async getVersionHistory(
    lessonId: string,
    page = 1,
    limit = 20
  ): Promise<{
    versions: (ContentVersion & {
      author: { id: string; name: string | null; image: string | null };
    })[];
    total: number;
    page: number;
    limit: number;
  }> {
    const skip = (page - 1) * limit;

    const [versions, total] = await Promise.all([
      prisma.contentVersion.findMany({
        where: { lessonId },
        include: {
          author: { select: { id: true, name: true, image: true } },
        },
        orderBy: { versionNumber: "desc" },
        skip,
        take: limit,
      }),
      prisma.contentVersion.count({ where: { lessonId } }),
    ]);

    return { versions, total, page, limit };
  },

  async getVersion(versionId: string): Promise<ContentVersion | null> {
    return prisma.contentVersion.findUnique({ where: { id: versionId } });
  },

  async revertToVersion(
    lessonId: string,
    versionId: string,
    authorId: string
  ): Promise<void> {
    const version = await prisma.contentVersion.findUnique({
      where: { id: versionId },
    });
    if (!version) throw new Error("Version not found");

    const currentLesson = await prisma.lesson.findUnique({
      where: { id: lessonId },
      select: { content: true },
    });

    if (currentLesson?.content) {
      await this.createVersion({
        lessonId,
        content: currentLesson.content as Prisma.InputJsonValue,
        authorId,
        changeDescription: `Auto-saved before revert to version ${version.versionNumber}`,
      });
    }

    await prisma.lesson.update({
      where: { id: lessonId },
      data: { content: version.content },
    });

    await this.createVersion({
      lessonId,
      content: version.content,
      authorId,
      changeDescription: `Reverted to version ${version.versionNumber}`,
    });
  },

  async diffVersions(
    versionId1: string,
    versionId2: string
  ): Promise<{
    added: number;
    removed: number;
    modified: number;
    changes: { type: "added" | "removed" | "modified"; path: string; detail: string }[];
  }> {
    const [v1, v2] = await Promise.all([
      prisma.contentVersion.findUnique({ where: { id: versionId1 } }),
      prisma.contentVersion.findUnique({ where: { id: versionId2 } }),
    ]);

    if (!v1 || !v2) throw new Error("One or both versions not found");

    const content1 = v1.content as unknown as LessonContent;
    const content2 = v2.content as unknown as LessonContent;

    return this.compareContent(content1, content2);
  },

  // ── Preview ────────────────────────────────────────────────────────

  async generatePreview(content: LessonContent): Promise<string> {
    const lines: string[] = [];

    for (const block of content.blocks) {
      switch (block.type) {
        case "heading":
          lines.push(`${"#".repeat(block.level)} ${block.text}`);
          break;
        case "paragraph":
          lines.push(block.text);
          break;
        case "code":
          lines.push("```" + block.language);
          lines.push(block.code);
          lines.push("```");
          if (block.filename) lines.push(`*${block.filename}*`);
          break;
        case "image":
          lines.push(`![${block.alt}](${block.url})`);
          if (block.caption) lines.push(`*${block.caption}*`);
          break;
        case "video":
          lines.push(`[Video: ${block.title ?? "Untitled"}](${block.url})`);
          break;
        case "embed":
          lines.push(`[Embedded: ${block.title ?? block.url}](${block.url})`);
          break;
        case "list":
          block.items.forEach((item, i) => {
            lines.push(block.ordered ? `${i + 1}. ${item}` : `- ${item}`);
          });
          break;
        case "quote":
          lines.push(`> ${block.text}`);
          if (block.author) lines.push(`> — ${block.author}`);
          break;
        case "callout":
          lines.push(`**${block.variant.toUpperCase()}**: ${block.title ? `${block.title}: ` : ""}${block.text}`);
          break;
        case "divider":
          lines.push("---");
          break;
        case "table":
          lines.push(`| ${block.headers.join(" | ")} |`);
          lines.push(`| ${block.headers.map(() => "---").join(" | ")} |`);
          block.rows.forEach((row) => {
            lines.push(`| ${row.join(" | ")} |`);
          });
          break;
        case "markdown":
          lines.push(block.content);
          break;
        case "attachment":
          lines.push(`[Attachment: ${block.fileName}](${block.fileUrl})`);
          break;
      }
      lines.push("");
    }

    return lines.join("\n").trim();
  },

  // ── Validation ─────────────────────────────────────────────────────

  validateContent(content: LessonContent): ContentValidation {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (!content.blocks?.length) {
      errors.push("Content must have at least one block");
      return { valid: false, errors, warnings };
    }

    content.blocks.forEach((block, index) => {
      const prefix = `Block ${index + 1}`;

      switch (block.type) {
        case "heading":
          if (!block.text?.trim()) errors.push(`${prefix}: Heading text is required`);
          if (block.level < 1 || block.level > 6) errors.push(`${prefix}: Invalid heading level`);
          break;
        case "paragraph":
          if (!block.text?.trim()) errors.push(`${prefix}: Paragraph text is required`);
          break;
        case "code":
          if (!block.code?.trim()) errors.push(`${prefix}: Code is required`);
          if (!block.language) warnings.push(`${prefix}: No language specified`);
          break;
        case "image":
          if (!block.url?.trim()) errors.push(`${prefix}: Image URL is required`);
          if (!block.alt?.trim()) warnings.push(`${prefix}: Alt text recommended for accessibility`);
          break;
        case "video":
          if (!block.url?.trim()) errors.push(`${prefix}: Video URL is required`);
          break;
        case "list":
          if (!block.items?.length) errors.push(`${prefix}: List must have at least one item`);
          break;
        case "quote":
          if (!block.text?.trim()) errors.push(`${prefix}: Quote text is required`);
          break;
        case "callout":
          if (!block.text?.trim()) errors.push(`${prefix}: Callout text is required`);
          break;
        case "table":
          if (!block.headers?.length) errors.push(`${prefix}: Table headers required`);
          if (block.rows?.some((row) => row.length !== block.headers.length)) {
            errors.push(`${prefix}: All rows must match header column count`);
          }
          break;
        case "attachment":
          if (!block.fileName?.trim()) errors.push(`${prefix}: File name is required`);
          if (!block.fileUrl?.trim()) errors.push(`${prefix}: File URL is required`);
          if (block.fileSize <= 0) errors.push(`${prefix}: File size must be positive`);
          break;
        case "embed":
          if (!block.url?.trim()) errors.push(`${prefix}: Embed URL is required`);
          break;
        case "markdown":
          if (!block.content?.trim()) errors.push(`${prefix}: Markdown content is required`);
          break;
      }
    });

    return { valid: errors.length === 0, errors, warnings };
  },

  // ── Helpers ────────────────────────────────────────────────────────

  calculateReadTime(content: LessonContent): number {
    let wordCount = 0;

    for (const block of content.blocks) {
      switch (block.type) {
        case "heading":
        case "paragraph":
        case "quote":
        case "callout":
          wordCount += (block.text?.split(/\s+/).length ?? 0);
          break;
        case "code":
        case "markdown":
          wordCount += (block.code?.split(/\s+/).length ?? 0) ?? (block.content?.split(/\s+/).length ?? 0);
          break;
        case "list":
          wordCount += block.items?.reduce((acc, item) => acc + item.split(/\s+/).length, 0) ?? 0;
          break;
        case "table":
          wordCount += block.headers?.reduce((acc, h) => acc + h.split(/\s+/).length, 0) ?? 0;
          block.rows?.forEach((row) => {
            wordCount += row.reduce((acc, cell) => acc + cell.split(/\s+/).length, 0);
          });
          break;
      }
    }

    const wordsPerMinute = 200;
    return Math.ceil(wordCount / wordsPerMinute);
  },

  compareContent(
    content1: LessonContent,
    content2: LessonContent
  ): {
    added: number;
    removed: number;
    modified: number;
    changes: { type: "added" | "removed" | "modified"; path: string; detail: string }[];
  } {
    const changes: { type: "added" | "removed" | "modified"; path: string; detail: string }[] = [];
    const blocks1 = content1.blocks ?? [];
    const blocks2 = content2.blocks ?? [];

    const maxLen = Math.max(blocks1.length, blocks2.length);

    for (let i = 0; i < maxLen; i++) {
      const b1 = blocks1[i];
      const b2 = blocks2[i];

      if (b1 && !b2) {
        changes.push({
          type: "removed",
          path: `blocks[${i}]`,
          detail: `Removed ${b1.type} block`,
        });
      } else if (!b1 && b2) {
        changes.push({
          type: "added",
          path: `blocks[${i}]`,
          detail: `Added ${b2.type} block`,
        });
      } else if (b1 && b2 && JSON.stringify(b1) !== JSON.stringify(b2)) {
        changes.push({
          type: "modified",
          path: `blocks[${i}]`,
          detail: `Modified ${b1.type} block`,
        });
      }
    }

    return {
      added: changes.filter((c) => c.type === "added").length,
      removed: changes.filter((c) => c.type === "removed").length,
      modified: changes.filter((c) => c.type === "modified").length,
      changes,
    };
  },
};

export default ContentService;
