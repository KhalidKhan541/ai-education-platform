import { PrismaClient, Certificate, CertificateTemplate, Prisma } from "@prisma/client";
import { nanoid } from "nanoid";
import { addDays, format } from "date-fns";

export interface GenerateCertificateParams {
  userId: string;
  courseId: string;
  templateId?: string;
  completionDate?: Date;
  metadata?: Record<string, unknown>;
}

export interface CertificateVerificationResult {
  valid: boolean;
  certificate?: Certificate;
  error?: string;
}

export interface CertificateShareData {
  certificateId: string;
  platform: "linkedin" | "twitter" | "facebook" | "email" | "direct";
  customMessage?: string;
}

export interface LinkedInShareData {
  title: string;
  description: string;
  url: string;
  imageUrl?: string;
  issuer: string;
  issueDate: string;
  expirationDate?: string;
  credentialId: string;
}

export interface CertificateFilters {
  userId?: string;
  courseId?: string;
  status?: "ACTIVE" | "REVOKED" | "EXPIRED";
  issuedAfter?: Date;
  issuedBefore?: Date;
  page?: number;
  limit?: number;
}

export interface PaginatedCertificates {
  certificates: Certificate[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

const prisma = new PrismaClient();

export class CertificateService {
  private static instance: CertificateService;
  private constructor() {}

  static getInstance(): CertificateService {
    if (!CertificateService.instance) {
      CertificateService.instance = new CertificateService();
    }
    return CertificateService.instance;
  }

  async generateCertificate(params: GenerateCertificateParams): Promise<Certificate> {
    const { userId, courseId, templateId, completionDate, metadata } = params;

    const existingCertificate = await prisma.certificate.findFirst({
      where: {
        userId,
        courseId,
        status: "ACTIVE",
      },
    });

    if (existingCertificate) {
      throw new Error("Certificate already exists for this user and course");
    }

    const enrollment = await prisma.enrollment.findFirst({
      where: {
        userId,
        courseId,
        status: "COMPLETED",
      },
      include: {
        course: true,
        user: true,
      },
    });

    if (!enrollment) {
      throw new Error("User has not completed this course");
    }

    if (!enrollment.completedAt) {
      throw new Error("Course completion date is missing");
    }

    const template = templateId
      ? await prisma.certificateTemplate.findUnique({ where: { id: templateId } })
      : await prisma.certificateTemplate.findFirst({
          where: { courseId, isDefault: true },
        });

    const certificateId = `CERT-${nanoid(12).toUpperCase()}`;
    const verificationCode = nanoid(32);
    const issuedAt = completionDate || new Date();
    const expiresAt = template?.expirationDays
      ? addDays(issuedAt, template.expirationDays)
      : null;

    const certificate = await prisma.certificate.create({
      data: {
        certificateId,
        userId,
        courseId,
        templateId: template?.id,
        issuedAt,
        expiresAt,
        verificationCode,
        status: "ACTIVE",
        metadata: metadata as Prisma.InputJsonValue,
        studentName: enrollment.user.name || "Student",
        courseName: enrollment.course.title,
        instructorName: enrollment.course.instructorName || "Instructor",
        completionDate: enrollment.completedAt,
        grade: enrollment.finalGrade,
      },
      include: {
        template: true,
        course: true,
        user: true,
      },
    });

    await this.awardCertificatePoints(userId, courseId);

    return certificate;
  }

  private async awardCertificatePoints(userId: string, courseId: string): Promise<void> {
    try {
      const points = 500;
      await prisma.userPoints.create({
        data: {
          userId,
          points,
          type: "CERTIFICATE_EARNED",
          description: `Certificate earned for completing course`,
          metadata: { courseId },
        },
      });

      await prisma.user.update({
        where: { id: userId },
        data: {
          totalPoints: { increment: points },
        },
      });
    } catch (error) {
      console.error("Failed to award certificate points:", error);
    }
  }

  async getCertificate(certificateId: string): Promise<Certificate | null> {
    return prisma.certificate.findFirst({
      where: {
        OR: [
          { id: certificateId },
          { certificateId },
          { verificationCode: certificateId },
        ],
      },
      include: {
        template: true,
        course: {
          include: {
            category: true,
          },
        },
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
          },
        },
      },
    });
  }

  async verifyCertificate(verificationCode: string): Promise<CertificateVerificationResult> {
    try {
      const certificate = await prisma.certificate.findFirst({
        where: {
          OR: [
            { verificationCode },
            { certificateId: verificationCode },
          ],
        },
        include: {
          course: true,
          user: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      });

      if (!certificate) {
        return { valid: false, error: "Certificate not found" };
      }

      if (certificate.status === "REVOKED") {
        return { valid: false, error: "Certificate has been revoked" };
      }

      if (certificate.expiresAt && certificate.expiresAt < new Date()) {
        await prisma.certificate.update({
          where: { id: certificate.id },
          data: { status: "EXPIRED" },
        });
        return { valid: false, error: "Certificate has expired" };
      }

      return { valid: true, certificate };
    } catch (error) {
      return {
        valid: false,
        error: error instanceof Error ? error.message : "Verification failed",
      };
    }
  }

  async getUserCertificates(
    userId: string,
    filters?: Omit<CertificateFilters, "userId">
  ): Promise<PaginatedCertificates> {
    const page = filters?.page || 1;
    const limit = filters?.limit || 10;
    const skip = (page - 1) * limit;

    const where: Prisma.CertificateWhereInput = {
      userId,
      ...(filters?.courseId && { courseId: filters.courseId }),
      ...(filters?.status && { status: filters.status }),
      ...(filters?.issuedAfter && {
        issuedAt: { gte: filters.issuedAfter },
      }),
      ...(filters?.issuedBefore && {
        issuedAt: { lte: filters.issuedBefore },
      }),
    };

    const [certificates, total] = await Promise.all([
      prisma.certificate.findMany({
        where,
        include: {
          course: {
            select: {
              id: true,
              title: true,
              thumbnail: true,
              category: true,
            },
          },
          template: true,
        },
        orderBy: { issuedAt: "desc" },
        skip,
        take: limit,
      }),
      prisma.certificate.count({ where }),
    ]);

    return {
      certificates,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async getCourseCertificates(
    courseId: string,
    filters?: Omit<CertificateFilters, "courseId">
  ): Promise<PaginatedCertificates> {
    const page = filters?.page || 1;
    const limit = filters?.limit || 10;
    const skip = (page - 1) * limit;

    const where: Prisma.CertificateWhereInput = {
      courseId,
      ...(filters?.userId && { userId: filters.userId }),
      ...(filters?.status && { status: filters.status }),
    };

    const [certificates, total] = await Promise.all([
      prisma.certificate.findMany({
        where,
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              image: true,
            },
          },
          template: true,
        },
        orderBy: { issuedAt: "desc" },
        skip,
        take: limit,
      }),
      prisma.certificate.count({ where }),
    ]);

    return {
      certificates,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async revokeCertificate(certificateId: string, reason: string): Promise<Certificate> {
    const certificate = await prisma.certificate.findUnique({
      where: { id: certificateId },
    });

    if (!certificate) {
      throw new Error("Certificate not found");
    }

    if (certificate.status === "REVOKED") {
      throw new Error("Certificate is already revoked");
    }

    return prisma.certificate.update({
      where: { id: certificateId },
      data: {
        status: "REVOKED",
        revokedAt: new Date(),
        revokedReason: reason,
      },
    });
  }

  async generateShareData(params: CertificateShareData): Promise<LinkedInShareData | Record<string, string>> {
    const certificate = await prisma.certificate.findUnique({
      where: { id: params.certificateId },
      include: {
        course: true,
        user: true,
        template: true,
      },
    });

    if (!certificate) {
      throw new Error("Certificate not found");
    }

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://learnhub.ai";
    const verificationUrl = `${baseUrl}/verify/${certificate.verificationCode}`;

    const shareData: LinkedInShareData = {
      title: `Certificate of Completion: ${certificate.courseName}`,
      description: params.customMessage || `I've completed ${certificate.courseName} on LearnHub!`,
      url: verificationUrl,
      issuer: "LearnHub AI Education Platform",
      issueDate: format(certificate.issuedAt, "yyyy-MM-dd"),
      credentialId: certificate.certificateId,
    };

    if (certificate.expiresAt) {
      shareData.expirationDate = format(certificate.expiresAt, "yyyy-MM-dd");
    }

    if (certificate.template?.certificateUrl) {
      shareData.imageUrl = certificate.template.certificateUrl;
    }

    return shareData;
  }

  async getLinkedInShareUrl(params: CertificateShareData): Promise<string> {
    const shareData = await this.generateShareData(params) as LinkedInShareData;

    const linkedinUrl = new URL("https://www.linkedin.com/sharing/share-offsite/");
    linkedinUrl.searchParams.set("url", shareData.url);

    return linkedinUrl.toString();
  }

  async getCertificateStats(userId?: string): Promise<{
    totalIssued: number;
    active: number;
    revoked: number;
    expired: number;
    recentIssuances: Certificate[];
  }> {
    const where: Prisma.CertificateWhereInput = userId ? { userId } : {};

    const [totalIssued, active, revoked, expired, recentIssuances] = await Promise.all([
      prisma.certificate.count({ where }),
      prisma.certificate.count({ where: { ...where, status: "ACTIVE" } }),
      prisma.certificate.count({ where: { ...where, status: "REVOKED" } }),
      prisma.certificate.count({ where: { ...where, status: "EXPIRED" } }),
      prisma.certificate.findMany({
        where,
        include: {
          course: { select: { title: true } },
          user: { select: { name: true } },
        },
        orderBy: { issuedAt: "desc" },
        take: 5,
      }),
    ]);

    return {
      totalIssued,
      active,
      revoked,
      expired,
      recentIssuances,
    };
  }

  async bulkGenerateCertificates(
    enrollments: Array<{ userId: string; courseId: string }>
  ): Promise<{ successful: Certificate[]; failed: Array<{ userId: string; courseId: string; error: string }> }> {
    const successful: Certificate[] = [];
    const failed: Array<{ userId: string; courseId: string; error: string }> = [];

    for (const enrollment of enrollments) {
      try {
        const certificate = await this.generateCertificate({
          userId: enrollment.userId,
          courseId: enrollment.courseId,
        });
        successful.push(certificate);
      } catch (error) {
        failed.push({
          userId: enrollment.userId,
          courseId: enrollment.courseId,
          error: error instanceof Error ? error.message : "Unknown error",
        });
      }
    }

    return { successful, failed };
  }

  async getCertificateTemplates(courseId?: string): Promise<CertificateTemplate[]> {
    return prisma.certificateTemplate.findMany({
      where: courseId ? { courseId } : {},
      orderBy: { createdAt: "desc" },
    });
  }

  async createCertificateTemplate(data: {
    name: string;
    courseId?: string;
    templateUrl: string;
    certificateUrl?: string;
    expirationDays?: number;
    isDefault?: boolean;
    layout?: Record<string, unknown>;
    styles?: Record<string, unknown>;
  }): Promise<CertificateTemplate> {
    if (data.isDefault && data.courseId) {
      await prisma.certificateTemplate.updateMany({
        where: {
          courseId: data.courseId,
          isDefault: true,
        },
        data: { isDefault: false },
      });
    }

    return prisma.certificateTemplate.create({
      data: {
        name: data.name,
        courseId: data.courseId,
        templateUrl: data.templateUrl,
        certificateUrl: data.certificateUrl,
        expirationDays: data.expirationDays,
        isDefault: data.isDefault || false,
        layout: data.layout as Prisma.InputJsonValue,
        styles: data.styles as Prisma.InputJsonValue,
      },
    });
  }

  async updateCertificateTemplate(
    templateId: string,
    data: Partial<{
      name: string;
      templateUrl: string;
      certificateUrl: string;
      expirationDays: number;
      isDefault: boolean;
      layout: Record<string, unknown>;
      styles: Record<string, unknown>;
    }>
  ): Promise<CertificateTemplate> {
    return prisma.certificateTemplate.update({
      where: { id: templateId },
      data: {
        ...data,
        layout: data.layout as Prisma.InputJsonValue | undefined,
        styles: data.styles as Prisma.InputJsonValue | undefined,
      },
    });
  }

  async deleteCertificateTemplate(templateId: string): Promise<void> {
    const template = await prisma.certificateTemplate.findUnique({
      where: { id: templateId },
      include: { certificates: { take: 1 } },
    });

    if (!template) {
      throw new Error("Template not found");
    }

    if (template.certificates.length > 0) {
      throw new Error("Cannot delete template that has been used for certificates");
    }

    await prisma.certificateTemplate.delete({ where: { id: templateId } });
  }

  async exportCertificates(
    filters: CertificateFilters,
    format: "csv" | "json" = "csv"
  ): Promise<string> {
    const { certificates } = await this.getUserCertificates(filters.userId || "", {
      ...filters,
      limit: 10000,
    });

    if (format === "json") {
      return JSON.stringify(certificates, null, 2);
    }

    const headers = [
      "Certificate ID",
      "Student Name",
      "Course Name",
      "Issued At",
      "Expires At",
      "Status",
      "Verification Code",
    ];

    const rows = certificates.map((cert) => [
      cert.certificateId,
      cert.studentName,
      cert.courseName,
      format(cert.issuedAt, "yyyy-MM-dd HH:mm:ss"),
      cert.expiresAt ? format(cert.expiresAt, "yyyy-MM-dd HH:mm:ss") : "N/A",
      cert.status,
      cert.verificationCode,
    ]);

    const csvContent = [headers.join(","), ...rows.map((row) => row.join(","))].join("\n");

    return csvContent;
  }

  async getExpiringCertificates(daysUntilExpiry: number = 30): Promise<Certificate[]> {
    const expirationThreshold = addDays(new Date(), daysUntilExpiry);

    return prisma.certificate.findMany({
      where: {
        status: "ACTIVE",
        expiresAt: {
          not: null,
          lte: expirationThreshold,
          gte: new Date(),
        },
      },
      include: {
        user: { select: { id: true, name: true, email: true } },
        course: { select: { id: true, title: true } },
      },
      orderBy: { expiresAt: "asc" },
    });
  }

  async renewCertificate(certificateId: string): Promise<Certificate> {
    const certificate = await prisma.certificate.findUnique({
      where: { id: certificateId },
      include: { template: true },
    });

    if (!certificate) {
      throw new Error("Certificate not found");
    }

    if (certificate.status !== "EXPIRED") {
      throw new Error("Only expired certificates can be renewed");
    }

    const newExpirationDate = certificate.template?.expirationDays
      ? addDays(new Date(), certificate.template.expirationDays)
      : addDays(new Date(), 365);

    return prisma.certificate.update({
      where: { id: certificateId },
      data: {
        status: "ACTIVE",
        expiresAt: newExpirationDate,
        renewedAt: new Date(),
        renewalCount: { increment: 1 },
      },
    });
  }

  async getCertificateByVerificationCode(code: string): Promise<Certificate | null> {
    return prisma.certificate.findFirst({
      where: {
        verificationCode: code,
        status: "ACTIVE",
      },
      include: {
        course: {
          select: {
            id: true,
            title: true,
            description: true,
            thumbnail: true,
          },
        },
        user: {
          select: {
            id: true,
            name: true,
            image: true,
          },
        },
        template: true,
      },
    });
  }

  async getCertificateHolderStats(): Promise<{
    totalHolders: number;
    topCourses: Array<{ courseId: string; courseName: string; count: number }>;
    monthlyIssuances: Array<{ month: string; count: number }>;
  }> {
    const totalHolders = await prisma.certificate.groupBy({
      by: ["userId"],
      where: { status: "ACTIVE" },
    });

    const topCoursesRaw = await prisma.certificate.groupBy({
      by: ["courseId"],
      where: { status: "ACTIVE" },
      _count: { id: true },
      orderBy: { _count: { id: "desc" } },
      take: 10,
    });

    const courseIds = topCoursesRaw.map((c) => c.courseId);
    const courses = await prisma.course.findMany({
      where: { id: { in: courseIds } },
      select: { id: true, title: true },
    });

    const topCourses = topCoursesRaw.map((item) => ({
      courseId: item.courseId,
      courseName: courses.find((c) => c.id === item.courseId)?.title || "Unknown Course",
      count: item._count.id,
    }));

    const sixMonthsAgo = addDays(new Date(), -180);
    const monthlyCertifications = await prisma.certificate.findMany({
      where: {
        status: "ACTIVE",
        issuedAt: { gte: sixMonthsAgo },
      },
      select: { issuedAt: true },
    });

    const monthlyMap = new Map<string, number>();
    for (let i = 5; i >= 0; i--) {
      const date = addDays(new Date(), -i * 30);
      const key = format(date, "yyyy-MM");
      monthlyMap.set(key, 0);
    }

    monthlyCertifications.forEach((cert) => {
      const key = format(cert.issuedAt, "yyyy-MM");
      const current = monthlyMap.get(key) || 0;
      monthlyMap.set(key, current + 1);
    });

    const monthlyIssuances = Array.from(monthlyMap.entries()).map(([month, count]) => ({
      month,
      count,
    }));

    return {
      totalHolders: totalHolders.length,
      topCourses,
      monthlyIssuances,
    };
  }
}

export const certificateService = CertificateService.getInstance();
