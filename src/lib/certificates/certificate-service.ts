import prisma from "@/lib/prisma";
import { nanoid } from "@/lib/utils";

export interface CertificateData {
  userId: string;
  courseId: string;
  templateId?: string;
}

export class CertificateService {
  static async generateCertificate(data: CertificateData) {
    const enrollment = await prisma.enrollment.findUnique({
      where: { userId_courseId: { userId: data.userId, courseId: data.courseId } },
      include: { course: true, user: { select: { id: true, name: true, email: true } } },
    });

    if (!enrollment) throw new Error("Not enrolled in this course");
    if (enrollment.status !== "COMPLETED") throw new Error("Course not completed");

    const existing = await prisma.certificate.findFirst({
      where: { userId: data.userId, courseId: data.courseId },
    });
    if (existing) return existing;

    const certificateNumber = `CERT-${nanoid(12).toUpperCase()}`;
    const issuedAt = new Date();
    const expiresAt = new Date(issuedAt);
    expiresAt.setFullYear(expiresAt.getFullYear() + 1);

    return prisma.certificate.create({
      data: {
        userId: data.userId,
        courseId: data.courseId,
        templateId: data.templateId,
        certificateNumber,
        issuedAt,
        expiresAt,
        status: "ACTIVE",
      },
      include: {
        user: { select: { id: true, name: true, email: true } },
        course: { select: { id: true, title: true } },
      },
    });
  }

  static async getCertificateById(id: string) {
    return prisma.certificate.findUnique({
      where: { id },
      include: {
        user: { select: { id: true, name: true, email: true, image: true } },
        course: {
          select: {
            id: true,
            title: true,
            description: true,
            instructor: { select: { id: true, name: true } },
          },
        },
      },
    });
  }

  static async getCertificateByNumber(certificateNumber: string) {
    return prisma.certificate.findUnique({
      where: { certificateNumber },
      include: {
        user: { select: { id: true, name: true, email: true } },
        course: { select: { id: true, title: true } },
      },
    });
  }

  static async getUserCertificates(userId: string) {
    return prisma.certificate.findMany({
      where: { userId },
      include: {
        course: { select: { id: true, title: true, thumbnail: true } },
      },
      orderBy: { issuedAt: "desc" },
    });
  }

  static async verifyCertificate(certificateNumber: string) {
    const cert = await prisma.certificate.findUnique({
      where: { certificateNumber },
      include: {
        user: { select: { id: true, name: true } },
        course: { select: { id: true, title: true } },
      },
    });

    if (!cert) return { valid: false, error: "Certificate not found" };
    if (cert.status !== "ACTIVE") return { valid: false, error: "Certificate is not active" };
    if (cert.expiresAt && new Date() > cert.expiresAt) {
      return { valid: false, error: "Certificate has expired" };
    }

    return { valid: true, certificate: cert };
  }

  static async revokeCertificate(id: string) {
    return prisma.certificate.update({
      where: { id },
      data: { status: "REVOKED" },
    });
  }

  static async getCourseCertificates(courseId: string) {
    return prisma.certificate.findMany({
      where: { courseId },
      include: {
        user: { select: { id: true, name: true, email: true } },
      },
      orderBy: { issuedAt: "desc" },
    });
  }

  static async getCertificateStats(courseId: string) {
    const [total, active, revoked] = await Promise.all([
      prisma.certificate.count({ where: { courseId } }),
      prisma.certificate.count({ where: { courseId, status: "ACTIVE" } }),
      prisma.certificate.count({ where: { courseId, status: "REVOKED" } }),
    ]);

    return { total, active, revoked };
  }
}
