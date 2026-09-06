import { CertificateService } from "@/lib/certificates/certificate-service";
import prisma from "@/lib/prisma";

jest.mock("@/lib/prisma", () => ({
  __esModule: true,
  default: {
    certificate: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      count: jest.fn(),
    },
    enrollment: {
      findUnique: jest.fn(),
    },
  },
}));

const mockPrisma = prisma as unknown as {
  certificate: {
    findUnique: jest.Mock;
    findFirst: jest.Mock;
    findMany: jest.Mock;
    create: jest.Mock;
    update: jest.Mock;
    count: jest.Mock;
  };
  enrollment: { findUnique: jest.Mock };
};

describe("CertificateService", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("generateCertificate", () => {
    it("should generate a certificate", async () => {
      mockPrisma.enrollment.findUnique.mockResolvedValue({
        status: "COMPLETED",
        course: { id: "c1", title: "Course" },
        user: { id: "u1", name: "Student" },
      });
      mockPrisma.certificate.findFirst.mockResolvedValue(null);
      mockPrisma.certificate.create.mockResolvedValue({
        id: "cert1",
        certificateNumber: "CERT-ABC123",
      });

      const result = await CertificateService.generateCertificate({
        userId: "u1",
        courseId: "c1",
      });

      expect(result.id).toBe("cert1");
      expect(mockPrisma.certificate.create).toHaveBeenCalled();
    });

    it("should fail if not enrolled", async () => {
      mockPrisma.enrollment.findUnique.mockResolvedValue(null);

      await expect(
        CertificateService.generateCertificate({ userId: "u1", courseId: "c1" })
      ).rejects.toThrow("Not enrolled");
    });

    it("should fail if course not completed", async () => {
      mockPrisma.enrollment.findUnique.mockResolvedValue({ status: "ACTIVE" });

      await expect(
        CertificateService.generateCertificate({ userId: "u1", courseId: "c1" })
      ).rejects.toThrow("Course not completed");
    });

    it("should return existing certificate if already issued", async () => {
      mockPrisma.enrollment.findUnique.mockResolvedValue({ status: "COMPLETED" });
      mockPrisma.certificate.findFirst.mockResolvedValue({ id: "existing" });

      const result = await CertificateService.generateCertificate({
        userId: "u1",
        courseId: "c1",
      });

      expect(result.id).toBe("existing");
      expect(mockPrisma.certificate.create).not.toHaveBeenCalled();
    });
  });

  describe("getCertificateById", () => {
    it("should return certificate with relations", async () => {
      const mockCert = { id: "cert1", user: {}, course: {} };
      mockPrisma.certificate.findUnique.mockResolvedValue(mockCert);

      const result = await CertificateService.getCertificateById("cert1");
      expect(result).toEqual(mockCert);
    });
  });

  describe("getCertificateByNumber", () => {
    it("should find by certificate number", async () => {
      mockPrisma.certificate.findUnique.mockResolvedValue({ id: "cert1" });
      const result = await CertificateService.getCertificateByNumber("CERT-123");
      expect(result).toBeDefined();
    });
  });

  describe("getUserCertificates", () => {
    it("should return user certificates", async () => {
      mockPrisma.certificate.findMany.mockResolvedValue([{ id: "cert1", course: {} }]);
      const result = await CertificateService.getUserCertificates("u1");
      expect(result).toHaveLength(1);
    });
  });

  describe("verifyCertificate", () => {
    it("should verify a valid certificate", async () => {
      mockPrisma.certificate.findUnique.mockResolvedValue({
        id: "cert1",
        status: "ACTIVE",
        expiresAt: new Date("2099-01-01"),
        user: {},
        course: {},
      });

      const result = await CertificateService.verifyCertificate("CERT-123");
      expect(result.valid).toBe(true);
    });

    it("should reject non-existent certificate", async () => {
      mockPrisma.certificate.findUnique.mockResolvedValue(null);
      const result = await CertificateService.verifyCertificate("CERT-NONE");
      expect(result.valid).toBe(false);
      expect(result.error).toContain("not found");
    });

    it("should reject revoked certificate", async () => {
      mockPrisma.certificate.findUnique.mockResolvedValue({
        status: "REVOKED",
        user: {},
        course: {},
      });

      const result = await CertificateService.verifyCertificate("CERT-123");
      expect(result.valid).toBe(false);
      expect(result.error).toContain("not active");
    });

    it("should reject expired certificate", async () => {
      mockPrisma.certificate.findUnique.mockResolvedValue({
        status: "ACTIVE",
        expiresAt: new Date("2020-01-01"),
        user: {},
        course: {},
      });

      const result = await CertificateService.verifyCertificate("CERT-123");
      expect(result.valid).toBe(false);
      expect(result.error).toContain("expired");
    });
  });

  describe("revokeCertificate", () => {
    it("should revoke a certificate", async () => {
      mockPrisma.certificate.update.mockResolvedValue({ status: "REVOKED" });
      await CertificateService.revokeCertificate("cert1");
      expect(mockPrisma.certificate.update).toHaveBeenCalledWith({
        where: { id: "cert1" },
        data: { status: "REVOKED" },
      });
    });
  });

  describe("getCourseCertificates", () => {
    it("should return course certificates", async () => {
      mockPrisma.certificate.findMany.mockResolvedValue([{ id: "cert1" }]);
      const result = await CertificateService.getCourseCertificates("c1");
      expect(result).toHaveLength(1);
    });
  });

  describe("getCertificateStats", () => {
    it("should return certificate statistics", async () => {
      mockPrisma.certificate.count
        .mockResolvedValueOnce(50)
        .mockResolvedValueOnce(45)
        .mockResolvedValueOnce(5);

      const result = await CertificateService.getCertificateStats("c1");
      expect(result.total).toBe(50);
      expect(result.active).toBe(45);
      expect(result.revoked).toBe(5);
    });
  });
});
