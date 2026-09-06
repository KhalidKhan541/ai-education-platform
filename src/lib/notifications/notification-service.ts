import { PrismaClient, Notification, NotificationPreference, Prisma } from "@prisma/client";
import { nanoid } from "nanoid";

export interface SendNotificationParams {
  userId: string;
  title: string;
  message: string;
  type: NotificationType;
  category: NotificationCategory;
  priority?: "LOW" | "MEDIUM" | "HIGH" | "URGENT";
  data?: Record<string, unknown>;
  actionUrl?: string;
  imageUrl?: string;
  expiresAt?: Date;
}

export type NotificationType = "IN_APP" | "EMAIL" | "PUSH" | "SMS";
export type NotificationCategory =
  | "COURSE_UPDATE"
  | "ASSIGNMENT"
  | "GRADE"
  | "MESSAGE"
  | "SYSTEM"
  | "PAYMENT"
  | "ACHIEVEMENT"
  | "REMINDER"
  | "MARKETING";

export interface BatchNotificationParams {
  userIds: string[];
  title: string;
  message: string;
  type: NotificationType;
  category: NotificationCategory;
  priority?: "LOW" | "MEDIUM" | "HIGH" | "URGENT";
  data?: Record<string, unknown>;
  actionUrl?: string;
}

export interface NotificationFilters {
  userId: string;
  type?: NotificationType;
  category?: NotificationCategory;
  isRead?: boolean;
  priority?: string;
  startDate?: Date;
  endDate?: Date;
  page?: number;
  limit?: number;
}

export interface PaginatedNotifications {
  notifications: Notification[];
  total: number;
  unreadCount: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface NotificationPreferenceData {
  userId: string;
  emailEnabled: boolean;
  pushEnabled: boolean;
  smsEnabled: boolean;
  inAppEnabled: boolean;
  categories: {
    [key in NotificationCategory]?: {
      email?: boolean;
      push?: boolean;
      sms?: boolean;
      inApp?: boolean;
    };
  };
  quietHoursStart?: string;
  quietHoursEnd?: string;
  timezone?: string;
}

export interface NotificationStats {
  totalSent: number;
  totalRead: number;
  readRate: number;
  byCategory: Record<string, { sent: number; read: number }>;
  byType: Record<string, number>;
  recentNotifications: Notification[];
}

export interface EmailTemplate {
  id: string;
  name: string;
  subject: string;
  htmlContent: string;
  textContent: string;
  variables: string[];
}

const prisma = new PrismaClient();

export class NotificationService {
  private static instance: NotificationService;
  private emailQueue: SendNotificationParams[] = [];
  private processingQueue = false;

  private constructor() {}

  static getInstance(): NotificationService {
    if (!NotificationService.instance) {
      NotificationService.instance = new NotificationService();
    }
    return NotificationService.instance;
  }

  async sendNotification(params: SendNotificationParams): Promise<Notification> {
    const preferences = await this.getUserPreferences(params.userId);

    if (!this.shouldSendNotification(preferences, params.type, params.category)) {
      return this.createNotificationRecord(params, false);
    }

    const notification = await this.createNotificationRecord(params, true);

    switch (params.type) {
      case "EMAIL":
        await this.sendEmail(params);
        break;
      case "PUSH":
        await this.sendPushNotification(params);
        break;
      case "SMS":
        await this.sendSMS(params);
        break;
      case "IN_APP":
        break;
    }

    return notification;
  }

  private async createNotificationRecord(
    params: SendNotificationParams,
    sent: boolean
  ): Promise<Notification> {
    return prisma.notification.create({
      data: {
        userId: params.userId,
        title: params.title,
        message: params.message,
        type: params.type,
        category: params.category,
        priority: params.priority || "MEDIUM",
        data: params.data as Prisma.InputJsonValue,
        actionUrl: params.actionUrl,
        imageUrl: params.imageUrl,
        expiresAt: params.expiresAt,
        isRead: false,
        sent,
        sentAt: sent ? new Date() : null,
      },
    });
  }

  private shouldSendNotification(
    preferences: NotificationPreferenceData | null,
    type: NotificationType,
    category: NotificationCategory
  ): boolean {
    if (!preferences) return true;

    const quietHours = this.isQuietHours(preferences);
    if (quietHours && preferences.quietHoursStart && preferences.quietHoursEnd) {
      if (category !== "SYSTEM" && category !== "URGENT") {
        return false;
      }
    }

    switch (type) {
      case "EMAIL":
        return preferences.emailEnabled;
      case "PUSH":
        return preferences.pushEnabled;
      case "SMS":
        return preferences.smsEnabled;
      case "IN_APP":
        return preferences.inAppEnabled;
      default:
        return true;
    }
  }

  private isQuietHours(preferences: NotificationPreferenceData): boolean {
    if (!preferences.quietHoursStart || !preferences.quietHoursEnd) return false;

    const now = new Date();
    const hours = now.getHours();
    const minutes = now.getMinutes();
    const currentTime = hours * 60 + minutes;

    const [startHour, startMin] = preferences.quietHoursStart.split(":").map(Number);
    const [endHour, endMin] = preferences.quietHoursEnd.split(":").map(Number);

    const startTime = (startHour || 0) * 60 + (startMin || 0);
    const endTime = (endHour || 0) * 60 + (endMin || 0);

    if (startTime <= endTime) {
      return currentTime >= startTime && currentTime <= endTime;
    } else {
      return currentTime >= startTime || currentTime <= endTime;
    }
  }

  private async sendEmail(params: SendNotificationParams): Promise<void> {
    const user = await prisma.user.findUnique({
      where: { id: params.userId },
      select: { email: true, name: true },
    });

    if (!user?.email) {
      console.error(`No email found for user ${params.userId}`);
      return;
    }

    const template = await this.getEmailTemplate(params.category);

    const htmlContent = template
      ? this.renderTemplate(template.htmlContent, {
          userName: user.name || "Student",
          title: params.title,
          message: params.message,
          actionUrl: params.actionUrl || "",
          ...params.data,
        })
      : this.generateDefaultEmailHtml(params, user.name || "Student");

    console.log(`Sending email to ${user.email}: ${params.title}`);

    this.emailQueue.push(params);
    this.processEmailQueue();
  }

  private async processEmailQueue(): Promise<void> {
    if (this.processingQueue || this.emailQueue.length === 0) return;

    this.processingQueue = true;

    while (this.emailQueue.length > 0) {
      const notification = this.emailQueue.shift();
      if (notification) {
        try {
          await this.processEmail(notification);
        } catch (error) {
          console.error("Failed to send email:", error);
        }
      }
    }

    this.processingQueue = false;
  }

  private async processEmail(params: SendNotificationParams): Promise<void> {
    await new Promise((resolve) => setTimeout(resolve, 50));
  }

  private async sendPushNotification(params: SendNotificationParams): Promise<void> {
    const user = await prisma.user.findUnique({
      where: { id: params.userId },
      select: { pushTokens: true },
    });

    if (!user?.pushTokens || (user.pushTokens as string[]).length === 0) {
      console.log(`No push tokens for user ${params.userId}`);
      return;
    }

    const pushTokens = user.pushTokens as string[];

    for (const token of pushTokens) {
      try {
        await this.sendPushToToken(token, {
          title: params.title,
          body: params.message,
          data: params.data,
          imageUrl: params.imageUrl,
        });
      } catch (error) {
        console.error(`Failed to send push to token ${token}:`, error);
      }
    }
  }

  private async sendPushToToken(
    token: string,
    payload: { title: string; body: string; data?: Record<string, unknown>; imageUrl?: string }
  ): Promise<void> {
    console.log(`Sending push notification to token: ${token.substring(0, 10)}...`);
  }

  private async sendSMS(params: SendNotificationParams): Promise<void> {
    const user = await prisma.user.findUnique({
      where: { id: params.userId },
      select: { phone: true },
    });

    if (!user?.phone) {
      console.log(`No phone number for user ${params.userId}`);
      return;
    }

    console.log(`Sending SMS to ${user.phone}: ${params.title}`);
  }

  private async getEmailTemplate(
    category: NotificationCategory
  ): Promise<EmailTemplate | null> {
    const templates: Record<string, EmailTemplate> = {
      COURSE_UPDATE: {
        id: "course-update",
        name: "Course Update",
        subject: "Course Updated: {{courseName}}",
        htmlContent: `
          <h1>Course Update</h1>
          <p>Hello {{userName}},</p>
          <p>{{message}}</p>
          {{#if actionUrl}}
          <a href="{{actionUrl}}" style="background:#007bff;color:white;padding:10px 20px;text-decoration:none;border-radius:5px;">View Course</a>
          {{/if}}
        `,
        textContent: "Course Update: {{message}}",
        variables: ["userName", "courseName", "message", "actionUrl"],
      },
      ASSIGNMENT: {
        id: "assignment",
        name: "Assignment Notification",
        subject: "New Assignment: {{assignmentName}}",
        htmlContent: `
          <h1>New Assignment</h1>
          <p>Hello {{userName}},</p>
          <p>You have a new assignment: <strong>{{assignmentName}}</strong></p>
          <p>Due date: {{dueDate}}</p>
          {{#if actionUrl}}
          <a href="{{actionUrl}}" style="background:#28a745;color:white;padding:10px 20px;text-decoration:none;border-radius:5px;">View Assignment</a>
          {{/if}}
        `,
        textContent: "New Assignment: {{assignmentName}}",
        variables: ["userName", "assignmentName", "dueDate", "actionUrl"],
      },
      ACHIEVEMENT: {
        id: "achievement",
        name: "Achievement Unlocked",
        subject: "Congratulations! You earned {{badgeName}}",
        htmlContent: `
          <h1>Achievement Unlocked!</h1>
          <p>Hello {{userName}},</p>
          <p>Congratulations! You've earned the <strong>{{badgeName}}</strong> badge!</p>
          <p>{{message}}</p>
        `,
        textContent: "Achievement: {{badgeName}}",
        variables: ["userName", "badgeName", "message"],
      },
    };

    return templates[category] || null;
  }

  private renderTemplate(template: string, data: Record<string, unknown>): string {
    let rendered = template;

    for (const [key, value] of Object.entries(data)) {
      const regex = new RegExp(`{{${key}}}`, "g");
      rendered = rendered.replace(regex, String(value || ""));
    }

    rendered = rendered.replace(/\{\{#if (\w+)\}\}([\s\S]*?)\{\{\/if\}\}/g, (_, condition, content) => {
      return data[condition] ? content : "";
    });

    return rendered;
  }

  private generateDefaultEmailHtml(
    params: SendNotificationParams,
    userName: string
  ): string {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${params.title}</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
          .button { display: inline-block; background: #667eea; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; margin-top: 20px; }
          .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>${params.title}</h1>
        </div>
        <div class="content">
          <p>Hello ${userName},</p>
          <p>${params.message}</p>
          ${params.actionUrl ? `<a href="${params.actionUrl}" class="button">Take Action</a>` : ""}
        </div>
        <div class="footer">
          <p>This is an automated notification from LearnHub AI Education Platform.</p>
          <p><a href="{{unsubscribeUrl}}">Unsubscribe</a> from these notifications.</p>
        </div>
      </body>
      </html>
    `;
  }

  async getUserNotifications(
    filters: NotificationFilters
  ): Promise<PaginatedNotifications> {
    const page = filters.page || 1;
    const limit = filters.limit || 20;
    const skip = (page - 1) * limit;

    const where: Prisma.NotificationWhereInput = {
      userId: filters.userId,
      ...(filters.type && { type: filters.type }),
      ...(filters.category && { category: filters.category }),
      ...(filters.isRead !== undefined && { isRead: filters.isRead }),
      ...(filters.priority && { priority: filters.priority }),
      ...(filters.startDate || filters.endDate
        ? {
            createdAt: {
              ...(filters.startDate && { gte: filters.startDate }),
              ...(filters.endDate && { lte: filters.endDate }),
            },
          }
        : {}),
    };

    const [notifications, total, unreadCount] = await Promise.all([
      prisma.notification.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      prisma.notification.count({ where }),
      prisma.notification.count({
        where: {
          userId: filters.userId,
          isRead: false,
        },
      }),
    ]);

    return {
      notifications,
      total,
      unreadCount,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async markAsRead(notificationId: string, userId: string): Promise<Notification> {
    const notification = await prisma.notification.findFirst({
      where: {
        id: notificationId,
        userId,
      },
    });

    if (!notification) {
      throw new Error("Notification not found");
    }

    return prisma.notification.update({
      where: { id: notificationId },
      data: {
        isRead: true,
        readAt: new Date(),
      },
    });
  }

  async markAllAsRead(userId: string): Promise<number> {
    const result = await prisma.notification.updateMany({
      where: {
        userId,
        isRead: false,
      },
      data: {
        isRead: true,
        readAt: new Date(),
      },
    });

    return result.count;
  }

  async deleteNotification(notificationId: string, userId: string): Promise<void> {
    const notification = await prisma.notification.findFirst({
      where: {
        id: notificationId,
        userId,
      },
    });

    if (!notification) {
      throw new Error("Notification not found");
    }

    await prisma.notification.delete({
      where: { id: notificationId },
    });
  }

  async deleteOldNotifications(userId: string, olderThanDays: number = 30): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);

    const result = await prisma.notification.deleteMany({
      where: {
        userId,
        createdAt: { lt: cutoffDate },
        isRead: true,
      },
    });

    return result.count;
  }

  async getUserPreferences(userId: string): Promise<NotificationPreferenceData | null> {
    const preference = await prisma.notificationPreference.findUnique({
      where: { userId },
    });

    if (!preference) {
      return {
        userId,
        emailEnabled: true,
        pushEnabled: true,
        smsEnabled: false,
        inAppEnabled: true,
        categories: {},
      };
    }

    return {
      userId: preference.userId,
      emailEnabled: preference.emailEnabled,
      pushEnabled: preference.pushEnabled,
      smsEnabled: preference.smsEnabled,
      inAppEnabled: preference.inAppEnabled,
      categories: (preference.categories as Record<string, Record<string, boolean>>) || {},
      quietHoursStart: preference.quietHoursStart,
      quietHoursEnd: preference.quietHoursEnd,
      timezone: preference.timezone,
    };
  }

  async updatePreferences(
    userId: string,
    data: Partial<NotificationPreferenceData>
  ): Promise<NotificationPreferenceData> {
    const existing = await prisma.notificationPreference.findUnique({
      where: { userId },
    });

    const updateData: Prisma.NotificationPreferenceUpdateInput = {
      emailEnabled: data.emailEnabled,
      pushEnabled: data.pushEnabled,
      smsEnabled: data.smsEnabled,
      inAppEnabled: data.inAppEnabled,
      categories: data.categories as Prisma.InputJsonValue,
      quietHoursStart: data.quietHoursStart,
      quietHoursEnd: data.quietHoursEnd,
      timezone: data.timezone,
    };

    if (existing) {
      await prisma.notificationPreference.update({
        where: { userId },
        data: updateData,
      });
    } else {
      await prisma.notificationPreference.create({
        data: {
          userId,
          emailEnabled: data.emailEnabled ?? true,
          pushEnabled: data.pushEnabled ?? true,
          smsEnabled: data.smsEnabled ?? false,
          inAppEnabled: data.inAppEnabled ?? true,
          categories: data.categories as Prisma.InputJsonValue || {},
          quietHoursStart: data.quietHoursStart,
          quietHoursEnd: data.quietHoursEnd,
          timezone: data.timezone,
        },
      });
    }

    return this.getUserPreferences(userId) as Promise<NotificationPreferenceData>;
  }

  async sendBatchNotifications(params: BatchNotificationParams): Promise<{
    successful: Notification[];
    failed: Array<{ userId: string; error: string }>;
  }> {
    const successful: Notification[] = [];
    const failed: Array<{ userId: string; error: string }> = [];

    for (const userId of params.userIds) {
      try {
        const notification = await this.sendNotification({
          userId,
          title: params.title,
          message: params.message,
          type: params.type,
          category: params.category,
          priority: params.priority,
          data: params.data,
          actionUrl: params.actionUrl,
        });
        successful.push(notification);
      } catch (error) {
        failed.push({
          userId,
          error: error instanceof Error ? error.message : "Unknown error",
        });
      }
    }

    return { successful, failed };
  }

  async sendCourseUpdateNotification(
    courseId: string,
    title: string,
    message: string
  ): Promise<{ sent: number; failed: number }> {
    const enrollments = await prisma.enrollment.findMany({
      where: { courseId },
      select: { userId: true },
    });

    const userIds = enrollments.map((e) => e.userId);
    const course = await prisma.course.findUnique({
      where: { id: courseId },
      select: { title: true },
    });

    const result = await this.sendBatchNotifications({
      userIds,
      title,
      message,
      type: "IN_APP",
      category: "COURSE_UPDATE",
      data: {
        courseId,
        courseName: course?.title,
      },
      actionUrl: `/courses/${courseId}`,
    });

    return {
      sent: result.successful.length,
      failed: result.failed.length,
    };
  }

  async sendAssignmentReminder(
    assignmentId: string,
    dueDate: Date
  ): Promise<{ sent: number; failed: number }> {
    const assignment = await prisma.assignment.findUnique({
      where: { id: assignmentId },
      include: {
        course: {
          include: {
            enrollments: { select: { userId: true } },
          },
        },
      },
    });

    if (!assignment) {
      throw new Error("Assignment not found");
    }

    const userIds = assignment.course.enrollments.map((e) => e.userId);

    const result = await this.sendBatchNotifications({
      userIds,
      title: `Assignment Due Soon: ${assignment.title}`,
      message: `Your assignment "${assignment.title}" is due on ${format(dueDate, "MMMM d, yyyy")}.`,
      type: "IN_APP",
      category: "REMINDER",
      priority: "HIGH",
      data: {
        assignmentId,
        assignmentName: assignment.title,
        dueDate: dueDate.toISOString(),
        courseId: assignment.courseId,
      },
      actionUrl: `/courses/${assignment.courseId}/assignments/${assignmentId}`,
    });

    return {
      sent: result.successful.length,
      failed: result.failed.length,
    };
  }

  async getNotificationStats(userId?: string): Promise<NotificationStats> {
    const where: Prisma.NotificationWhereInput = userId ? { userId } : {};

    const [totalSent, totalRead, byCategory, byType, recentNotifications] =
      await Promise.all([
        prisma.notification.count({ where: { ...where, sent: true } }),
        prisma.notification.count({ where: { ...where, isRead: true } }),
        prisma.notification.groupBy({
          by: ["category"],
          where,
          _count: { id: true },
        }),
        prisma.notification.groupBy({
          by: ["type"],
          where,
          _count: { id: true },
        }),
        prisma.notification.findMany({
          where,
          orderBy: { createdAt: "desc" },
          take: 10,
        }),
      ]);

    const byCategoryMap: Record<string, { sent: number; read: number }> = {};
    for (const item of byCategory) {
      const readCount = await prisma.notification.count({
        where: {
          ...where,
          category: item.category,
          isRead: true,
        },
      });
      byCategoryMap[item.category] = {
        sent: item._count.id,
        read: readCount,
      };
    }

    const byTypeMap: Record<string, number> = {};
    for (const item of byType) {
      byTypeMap[item.type] = item._count.id;
    }

    return {
      totalSent,
      totalRead,
      readRate: totalSent > 0 ? (totalRead / totalSent) * 100 : 0,
      byCategory: byCategoryMap,
      byType: byTypeMap,
      recentNotifications,
    };
  }

  async cleanupExpiredNotifications(): Promise<number> {
    const result = await prisma.notification.deleteMany({
      where: {
        expiresAt: { lt: new Date() },
      },
    });

    return result.count;
  }

  async getUnreadCount(userId: string): Promise<number> {
    return prisma.notification.count({
      where: {
        userId,
        isRead: false,
      },
    });
  }

  async subscribeToPushNotifications(userId: string, token: string): Promise<void> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { pushTokens: true },
    });

    if (!user) {
      throw new Error("User not found");
    }

    const currentTokens = (user.pushTokens as string[]) || [];
    if (!currentTokens.includes(token)) {
      await prisma.user.update({
        where: { id: userId },
        data: {
          pushTokens: [...currentTokens, token],
        },
      });
    }
  }

  async unsubscribeFromPushNotifications(userId: string, token: string): Promise<void> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { pushTokens: true },
    });

    if (!user) {
      throw new Error("User not found");
    }

    const currentTokens = (user.pushTokens as string[]) || [];
    const filteredTokens = currentTokens.filter((t) => t !== token);

    await prisma.user.update({
      where: { id: userId },
      data: {
        pushTokens: filteredTokens,
      },
    });
  }
}

function format(date: Date, formatStr: string): string {
  const months = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December",
  ];

  const year = date.getFullYear();
  const month = date.getMonth();
  const day = date.getDate();

  return formatStr
    .replace("yyyy", String(year))
    .replace("MMMM", months[month] || "")
    .replace("MM", String(month + 1).padStart(2, "0"))
    .replace("dd", String(day).padStart(2, "0"));
}

export const notificationService = NotificationService.getInstance();
