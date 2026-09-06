import { PrismaClient, Payment, Subscription, Coupon, Invoice, Prisma } from "@prisma/client";
import { nanoid } from "nanoid";
import { addDays, format } from "date-fns";

export interface ProcessPaymentParams {
  userId: string;
  courseId?: string;
  amount: number;
  currency?: string;
  paymentMethod: "card" | "paypal" | "stripe" | "bank_transfer";
  couponCode?: string;
  metadata?: Record<string, unknown>;
}

export interface SubscriptionPlanParams {
  userId: string;
  planId: string;
  paymentMethodId: string;
  trialDays?: number;
}

export interface CreateCouponParams {
  code: string;
  description: string;
  discountType: "PERCENTAGE" | "FIXED_AMOUNT" | "FREE_ACCESS";
  discountValue: number;
  maxUses?: number;
  maxUsesPerUser?: number;
  validFrom: Date;
  expiresAt: Date;
  applicableCourseIds?: string[];
  applicablePlanIds?: string[];
  minimumPurchaseAmount?: number;
  isActive?: boolean;
}

export interface RefundParams {
  paymentId: string;
  amount?: number;
  reason: string;
  initiatedBy: string;
}

export interface InvoiceParams {
  paymentId: string;
  userId: string;
  billingInfo: BillingInfo;
  notes?: string;
}

export interface BillingInfo {
  name: string;
  email: string;
  address?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  country?: string;
  taxId?: string;
  company?: string;
}

export interface PaymentFilters {
  userId?: string;
  courseId?: string;
  status?: "PENDING" | "COMPLETED" | "FAILED" | "REFUNDED" | "PARTIALLY_REFUNDED";
  paymentMethod?: string;
  startDate?: Date;
  endDate?: Date;
  page?: number;
  limit?: number;
  sortBy?: "date" | "amount" | "status";
  sortOrder?: "asc" | "desc";
}

export interface PaginatedPayments {
  payments: Payment[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface RevenueReport {
  period: string;
  totalRevenue: number;
  netRevenue: number;
  refunds: number;
  taxes: number;
  subscriptionRevenue: number;
  oneTimeRevenue: number;
  revenueByCourse: Array<{
    courseId: string;
    courseName: string;
    revenue: number;
    sales: number;
  }>;
  revenueByMonth: Array<{
    month: string;
    revenue: number;
  }>;
  topPaymentMethods: Array<{
    method: string;
    count: number;
    percentage: number;
  }>;
}

export interface SubscriptionDetails {
  id: string;
  userId: string;
  planId: string;
  planName: string;
  status: "ACTIVE" | "PAUSED" | "CANCELLED" | "PAST_DUE" | "TRIALING";
  currentPeriodStart: Date;
  currentPeriodEnd: Date;
  cancelAtPeriodEnd: boolean;
  trialEnd?: Date;
  amount: number;
  currency: string;
  interval: "monthly" | "yearly";
}

export interface CouponValidationResult {
  valid: boolean;
  coupon?: Coupon;
  error?: string;
  discountAmount?: number;
  finalPrice?: number;
}

const prisma = new PrismaClient();

export class PaymentService {
  private static instance: PaymentService;
  private constructor() {}

  static getInstance(): PaymentService {
    if (!PaymentService.instance) {
      PaymentService.instance = new PaymentService();
    }
    return PaymentService.instance;
  }

  async processPayment(params: ProcessPaymentParams): Promise<Payment> {
    const user = await prisma.user.findUnique({ where: { id: params.userId } });
    if (!user) {
      throw new Error("User not found");
    }

    let finalAmount = params.amount;
    let couponId: string | undefined;

    if (params.couponCode) {
      const validation = await this.validateCoupon(params.couponCode, params.amount, params.courseId);
      if (!validation.valid) {
        throw new Error(validation.error || "Invalid coupon");
      }
      finalAmount = validation.discountAmount !== undefined
        ? params.amount - validation.discountAmount
        : params.amount;
      couponId = validation.coupon?.id;
    }

    const payment = await prisma.payment.create({
      data: {
        userId: params.userId,
        courseId: params.courseId,
        amount: finalAmount,
        currency: params.currency || "USD",
        paymentMethod: params.paymentMethod,
        status: "PENDING",
        couponId,
        metadata: params.metadata as Prisma.InputJsonValue,
      },
    });

    try {
      const paymentResult = await this.simulatePaymentGateway(
        finalAmount,
        params.paymentMethod
      );

      if (paymentResult.success) {
        const updatedPayment = await prisma.payment.update({
          where: { id: payment.id },
          data: {
            status: "COMPLETED",
            transactionId: paymentResult.transactionId,
            paidAt: new Date(),
          },
        });

        if (params.courseId) {
          await this.enrollUserInCourse(params.userId, params.courseId);
        }

        if (couponId) {
          await this.incrementCouponUsage(couponId);
        }

        await this.generateInvoice(updatedPayment.id, params.userId);

        return updatedPayment;
      } else {
        return prisma.payment.update({
          where: { id: payment.id },
          data: {
            status: "FAILED",
            failureReason: paymentResult.error,
          },
        });
      }
    } catch (error) {
      return prisma.payment.update({
        where: { id: payment.id },
        data: {
          status: "FAILED",
          failureReason: error instanceof Error ? error.message : "Payment processing failed",
        },
      });
    }
  }

  private async simulatePaymentGateway(
    amount: number,
    method: string
  ): Promise<{ success: boolean; transactionId?: string; error?: string }> {
    await new Promise((resolve) => setTimeout(resolve, 100));

    if (amount <= 0) {
      return { success: false, error: "Invalid amount" };
    }

    if (amount > 10000) {
      return { success: false, error: "Amount exceeds limit" };
    }

    return {
      success: true,
      transactionId: `TXN-${nanoid(16).toUpperCase()}`,
    };
  }

  private async enrollUserInCourse(userId: string, courseId: string): Promise<void> {
    const existingEnrollment = await prisma.enrollment.findFirst({
      where: { userId, courseId },
    });

    if (!existingEnrollment) {
      await prisma.enrollment.create({
        data: {
          userId,
          courseId,
          status: "NOT_STARTED",
          progress: 0,
          timeSpent: 0,
          enrolledAt: new Date(),
          lastAccessedAt: new Date(),
        },
      });
    }
  }

  private async incrementCouponUsage(couponId: string): Promise<void> {
    await prisma.coupon.update({
      where: { id: couponId },
      data: {
        usedCount: { increment: 1 },
      },
    });
  }

  async getPayment(paymentId: string): Promise<Payment | null> {
    return prisma.payment.findUnique({
      where: { id: paymentId },
      include: {
        user: {
          select: { id: true, name: true, email: true },
        },
        course: {
          select: { id: true, title: true },
        },
        coupon: true,
        invoice: true,
      },
    });
  }

  async getUserPayments(
    userId: string,
    filters?: Omit<PaymentFilters, "userId">
  ): Promise<PaginatedPayments> {
    const page = filters?.page || 1;
    const limit = filters?.limit || 10;
    const skip = (page - 1) * limit;

    const where: Prisma.PaymentWhereInput = {
      userId,
      ...(filters?.courseId && { courseId: filters.courseId }),
      ...(filters?.status && { status: filters.status }),
      ...(filters?.paymentMethod && { paymentMethod: filters.paymentMethod }),
      ...(filters?.startDate || filters?.endDate
        ? {
            createdAt: {
              ...(filters.startDate && { gte: filters.startDate }),
              ...(filters.endDate && { lte: filters.endDate }),
            },
          }
        : {}),
    };

    const orderBy: Prisma.PaymentOrderByWithRelationInput =
      filters?.sortBy === "amount"
        ? { amount: filters.sortOrder || "desc" }
        : filters?.sortBy === "status"
          ? { status: filters.sortOrder || "asc" }
        : { createdAt: filters.sortOrder || "desc" };

    const [payments, total] = await Promise.all([
      prisma.payment.findMany({
        where,
        include: {
          course: { select: { id: true, title: true, thumbnail: true } },
          coupon: { select: { code: true } },
        },
        orderBy,
        skip,
        take: limit,
      }),
      prisma.payment.count({ where }),
    ]);

    return {
      payments,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async getPaymentStats(userId?: string): Promise<{
    totalRevenue: number;
    totalTransactions: number;
    successfulPayments: number;
    failedPayments: number;
    refundedAmount: number;
    averageOrderValue: number;
    recentPayments: Payment[];
  }> {
    const where: Prisma.PaymentWhereInput = userId ? { userId } : {};

    const [stats, refundedStats, recentPayments] = await Promise.all([
      prisma.payment.aggregate({
        where: { ...where, status: "COMPLETED" },
        _sum: { amount: true },
        _count: { id: true },
        _avg: { amount: true },
      }),
      prisma.payment.aggregate({
        where: { ...where, status: "REFUNDED" },
        _sum: { amount: true },
      }),
      prisma.payment.findMany({
        where,
        include: {
          course: { select: { title: true } },
          user: { select: { name: true } },
        },
        orderBy: { createdAt: "desc" },
        take: 5,
      }),
    ]);

    const failedCount = await prisma.payment.count({
      where: { ...where, status: "FAILED" },
    });

    return {
      totalRevenue: stats._sum.amount || 0,
      totalTransactions: stats._count.id,
      successfulPayments: stats._count.id,
      failedPayments: failedCount,
      refundedAmount: refundedStats._sum.amount || 0,
      averageOrderValue: stats._avg.amount || 0,
      recentPayments,
    };
  }

  async createSubscriptionPlan(data: {
    name: string;
    description: string;
    price: number;
    currency?: string;
    interval: "monthly" | "yearly";
    features: string[];
    maxCourses?: number;
    isActive?: boolean;
  }): Promise<Subscription> {
    return prisma.subscription.create({
      data: {
        name: data.name,
        description: data.description,
        price: data.price,
        currency: data.currency || "USD",
        interval: data.interval,
        features: data.features,
        maxCourses: data.maxCourses,
        isActive: data.isActive !== false,
      },
    });
  }

  async subscribeToPlan(params: SubscriptionPlanParams): Promise<Subscription> {
    const plan = await prisma.subscription.findUnique({
      where: { id: params.planId },
    });

    if (!plan || !plan.isActive) {
      throw new Error("Subscription plan not found or inactive");
    }

    const existingSubscription = await prisma.userSubscription.findFirst({
      where: {
        userId: params.userId,
        status: { in: ["ACTIVE", "TRIALING"] },
      },
    });

    if (existingSubscription) {
      throw new Error("User already has an active subscription");
    }

    const trialEnd = params.trialDays
      ? addDays(new Date(), params.trialDays)
      : undefined;

    const currentPeriodStart = new Date();
    const currentPeriodEnd =
      plan.interval === "monthly"
        ? addDays(currentPeriodStart, 30)
        : addDays(currentPeriodStart, 365);

    const subscription = await prisma.userSubscription.create({
      data: {
        userId: params.userId,
        planId: params.planId,
        status: params.trialDays ? "TRIALING" : "ACTIVE",
        currentPeriodStart,
        currentPeriodEnd,
        trialEnd,
        paymentMethodId: params.paymentMethodId,
        cancelAtPeriodEnd: false,
      },
      include: {
        plan: true,
      },
    });

    if (!params.trialDays || params.trialDays === 0) {
      await this.processPayment({
        userId: params.userId,
        amount: plan.price,
        currency: plan.currency,
        paymentMethod: "card",
        metadata: { subscriptionId: subscription.id },
      });
    }

    return subscription;
  }

  async cancelSubscription(subscriptionId: string, userId: string): Promise<Subscription> {
    const subscription = await prisma.userSubscription.findFirst({
      where: {
        id: subscriptionId,
        userId,
      },
    });

    if (!subscription) {
      throw new Error("Subscription not found");
    }

    if (subscription.status === "CANCELLED") {
      throw new Error("Subscription is already cancelled");
    }

    return prisma.userSubscription.update({
      where: { id: subscriptionId },
      data: {
        cancelAtPeriodEnd: true,
      },
    });
  }

  async getUserSubscriptions(userId: string): Promise<SubscriptionDetails[]> {
    const subscriptions = await prisma.userSubscription.findMany({
      where: { userId },
      include: { plan: true },
      orderBy: { createdAt: "desc" },
    });

    return subscriptions.map((sub) => ({
      id: sub.id,
      userId: sub.userId,
      planId: sub.planId,
      planName: sub.plan.name,
      status: sub.status as SubscriptionDetails["status"],
      currentPeriodStart: sub.currentPeriodStart,
      currentPeriodEnd: sub.currentPeriodEnd,
      cancelAtPeriodEnd: sub.cancelAtPeriodEnd,
      trialEnd: sub.trialEnd,
      amount: sub.plan.price,
      currency: sub.plan.currency,
      interval: sub.plan.interval as SubscriptionDetails["interval"],
    }));
  }

  async createCoupon(params: CreateCouponParams): Promise<Coupon> {
    const existingCoupon = await prisma.coupon.findUnique({
      where: { code: params.code.toUpperCase() },
    });

    if (existingCoupon) {
      throw new Error("Coupon code already exists");
    }

    return prisma.coupon.create({
      data: {
        code: params.code.toUpperCase(),
        description: params.description,
        discountType: params.discountType,
        discountValue: params.discountValue,
        maxUses: params.maxUses,
        maxUsesPerUser: params.maxUsesPerUser,
        validFrom: params.validFrom,
        expiresAt: params.expiresAt,
        applicableCourseIds: params.applicableCourseIds || [],
        applicablePlanIds: params.applicablePlanIds || [],
        minimumPurchaseAmount: params.minimumPurchaseAmount,
        isActive: params.isActive !== false,
      },
    });
  }

  async validateCoupon(
    code: string,
    purchaseAmount: number,
    courseId?: string
  ): Promise<CouponValidationResult> {
    const coupon = await prisma.coupon.findUnique({
      where: { code: code.toUpperCase() },
    });

    if (!coupon) {
      return { valid: false, error: "Coupon not found" };
    }

    if (!coupon.isActive) {
      return { valid: false, error: "Coupon is inactive" };
    }

    const now = new Date();
    if (now < coupon.validFrom) {
      return { valid: false, error: "Coupon is not yet valid" };
    }

    if (now > coupon.expiresAt) {
      return { valid: false, error: "Coupon has expired" };
    }

    if (coupon.maxUses && coupon.usedCount >= coupon.maxUses) {
      return { valid: false, error: "Coupon has reached maximum uses" };
    }

    if (coupon.minimumPurchaseAmount && purchaseAmount < coupon.minimumPurchaseAmount) {
      return {
        valid: false,
        error: `Minimum purchase amount is $${coupon.minimumPurchaseAmount}`,
      };
    }

    if (courseId && coupon.applicableCourseIds) {
      const applicableIds = coupon.applicableCourseIds as string[];
      if (applicableIds.length > 0 && !applicableIds.includes(courseId)) {
        return { valid: false, error: "Coupon not applicable to this course" };
      }
    }

    let discountAmount = 0;
    switch (coupon.discountType) {
      case "PERCENTAGE":
        discountAmount = (purchaseAmount * coupon.discountValue) / 100;
        break;
      case "FIXED_AMOUNT":
        discountAmount = Math.min(coupon.discountValue, purchaseAmount);
        break;
      case "FREE_ACCESS":
        discountAmount = purchaseAmount;
        break;
    }

    const finalPrice = Math.max(0, purchaseAmount - discountAmount);

    return {
      valid: true,
      coupon,
      discountAmount,
      finalPrice,
    };
  }

  async updateCoupon(
    couponId: string,
    data: Partial<CreateCouponParams>
  ): Promise<Coupon> {
    return prisma.coupon.update({
      where: { id: couponId },
      data: {
        ...data,
        code: data.code?.toUpperCase(),
        applicableCourseIds: data.applicableCourseIds,
        applicablePlanIds: data.applicablePlanIds,
      },
    });
  }

  async deactivateCoupon(couponId: string): Promise<Coupon> {
    return prisma.coupon.update({
      where: { id: couponId },
      data: { isActive: false },
    });
  }

  async getActiveCoupons(): Promise<Coupon[]> {
    const now = new Date();
    return prisma.coupon.findMany({
      where: {
        isActive: true,
        validFrom: { lte: now },
        expiresAt: { gte: now },
      },
      orderBy: { createdAt: "desc" },
    });
  }

  async processRefund(params: RefundParams): Promise<Payment> {
    const payment = await prisma.payment.findUnique({
      where: { id: params.paymentId },
    });

    if (!payment) {
      throw new Error("Payment not found");
    }

    if (payment.status !== "COMPLETED") {
      throw new Error("Can only refund completed payments");
    }

    const refundAmount = params.amount || payment.amount;

    if (refundAmount > payment.amount) {
      throw new Error("Refund amount cannot exceed payment amount");
    }

    const refundTransactionId = `REF-${nanoid(16).toUpperCase()}`;

    const refundPayment = await prisma.payment.create({
      data: {
        userId: payment.userId,
        courseId: payment.courseId,
        amount: -refundAmount,
        currency: payment.currency,
        paymentMethod: payment.paymentMethod,
        status: "COMPLETED",
        transactionId: refundTransactionId,
        paidAt: new Date(),
        metadata: {
          originalPaymentId: payment.id,
          reason: params.reason,
          initiatedBy: params.initiatedBy,
        },
      },
    });

    const newStatus = refundAmount >= payment.amount ? "REFUNDED" : "PARTIALLY_REFUNDED";

    await prisma.payment.update({
      where: { id: payment.id },
      data: {
        status: newStatus,
        refundedAmount: (payment.refundedAmount || 0) + refundAmount,
      },
    });

    if (payment.courseId) {
      await prisma.enrollment.updateMany({
        where: {
          userId: payment.userId,
          courseId: payment.courseId,
        },
        data: {
          status: "CANCELLED",
        },
      });
    }

    return refundPayment;
  }

  async generateInvoice(paymentId: string, userId: string): Promise<Invoice> {
    const payment = await prisma.payment.findUnique({
      where: { id: paymentId },
      include: {
        user: true,
        course: true,
        coupon: true,
      },
    });

    if (!payment) {
      throw new Error("Payment not found");
    }

    const invoiceNumber = `INV-${format(new Date(), "yyyyMMdd")}-${nanoid(8).toUpperCase()}`;

    const taxRate = 0.1;
    const taxAmount = payment.amount * taxRate;
    const totalAmount = payment.amount + taxAmount;

    const invoice = await prisma.invoice.create({
      data: {
        invoiceNumber,
        paymentId,
        userId,
        amount: payment.amount,
        taxAmount,
        totalAmount,
        currency: payment.currency,
        status: payment.status === "COMPLETED" ? "PAID" : "PENDING",
        billingInfo: {
          name: payment.user.name || "Customer",
          email: payment.user.email,
        },
        lineItems: [
          {
            description: payment.course?.title || "Course Purchase",
            quantity: 1,
            unitPrice: payment.amount,
            total: payment.amount,
          },
        ],
        issuedAt: new Date(),
        dueAt: new Date(),
        paidAt: payment.status === "COMPLETED" ? payment.paidAt : null,
      },
      include: {
        payment: true,
        user: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    return invoice;
  }

  async getInvoices(
    userId: string,
    options?: { page?: number; limit?: number; status?: string }
  ): Promise<{ invoices: Invoice[]; total: number }> {
    const page = options?.page || 1;
    const limit = options?.limit || 10;
    const skip = (page - 1) * limit;

    const where: Prisma.InvoiceWhereInput = {
      userId,
      ...(options?.status && { status: options.status }),
    };

    const [invoices, total] = await Promise.all([
      prisma.invoice.findMany({
        where,
        include: {
          payment: { select: { id: true, transactionId: true } },
        },
        orderBy: { issuedAt: "desc" },
        skip,
        take: limit,
      }),
      prisma.invoice.count({ where }),
    ]);

    return { invoices, total };
  }

  async generateRevenueReport(
    options?: { startDate?: Date; endDate?: Date; courseId?: string }
  ): Promise<RevenueReport> {
    const start = options?.startDate || addDays(new Date(), -30);
    const end = options?.endDate || new Date();

    const where: Prisma.PaymentWhereInput = {
      status: "COMPLETED",
      createdAt: { gte: start, lte: end },
      ...(options?.courseId && { courseId: options.courseId }),
    };

    const [payments, refundPayments] = await Promise.all([
      prisma.payment.findMany({
        where,
        include: {
          course: { select: { id: true, title: true } },
        },
      }),
      prisma.payment.findMany({
        where: {
          status: "COMPLETED",
          amount: { lt: 0 },
          createdAt: { gte: start, lte: end },
        },
      }),
    ]);

    const totalRevenue = payments.reduce((sum, p) => sum + p.amount, 0);
    const refunds = refundPayments.reduce((sum, p) => sum + Math.abs(p.amount), 0);
    const netRevenue = totalRevenue - refunds;

    const revenueByCourseMap = new Map<string, { revenue: number; sales: number; name: string }>();
    payments.forEach((p) => {
      if (p.courseId) {
        const existing = revenueByCourseMap.get(p.courseId) || {
          revenue: 0,
          sales: 0,
          name: p.course?.title || "Unknown",
        };
        revenueByCourseMap.set(p.courseId, {
          revenue: existing.revenue + p.amount,
          sales: existing.sales + 1,
          name: existing.name,
        });
      }
    });

    const revenueByCourse = Array.from(revenueByCourseMap.entries()).map(
      ([courseId, data]) => ({
        courseId,
        courseName: data.name,
        revenue: data.revenue,
        sales: data.sales,
      })
    );

    const monthlyRevenueMap = new Map<string, number>();
    payments.forEach((p) => {
      const month = format(p.createdAt, "yyyy-MM");
      monthlyRevenueMap.set(month, (monthlyRevenueMap.get(month) || 0) + p.amount);
    });

    const revenueByMonth = Array.from(monthlyRevenueMap.entries()).map(
      ([month, revenue]) => ({ month, revenue })
    );

    const methodCounts = new Map<string, number>();
    payments.forEach((p) => {
      methodCounts.set(p.paymentMethod, (methodCounts.get(p.paymentMethod) || 0) + 1);
    });

    const topPaymentMethods = Array.from(methodCounts.entries())
      .map(([method, count]) => ({
        method,
        count,
        percentage: (count / payments.length) * 100,
      }))
      .sort((a, b) => b.count - a.count);

    return {
      period: `${format(start, "yyyy-MM-dd")} to ${format(end, "yyyy-MM-dd")}`,
      totalRevenue,
      netRevenue,
      refunds,
      taxes: totalRevenue * 0.1,
      subscriptionRevenue: 0,
      oneTimeRevenue: totalRevenue,
      revenueByCourse,
      revenueByMonth,
      topPaymentMethods,
    };
  }

  async getOverdueInvoices(): Promise<Invoice[]> {
    return prisma.invoice.findMany({
      where: {
        status: "PENDING",
        dueAt: { lt: new Date() },
      },
      include: {
        user: { select: { id: true, name: true, email: true } },
        payment: true,
      },
      orderBy: { dueAt: "asc" },
    });
  }

  async sendInvoiceReminder(invoiceId: string): Promise<boolean> {
    const invoice = await prisma.invoice.findUnique({
      where: { id: invoiceId },
      include: { user: true },
    });

    if (!invoice) {
      throw new Error("Invoice not found");
    }

    console.log(`Sending invoice reminder to ${invoice.user.email} for ${invoice.invoiceNumber}`);
    return true;
  }
}

export const paymentService = PaymentService.getInstance();
