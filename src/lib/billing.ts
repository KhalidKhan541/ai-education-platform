import Stripe from "stripe";

const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY || "";
const STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET || "";
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

let stripeClient: Stripe | null = null;

function getStripe(): Stripe {
  if (!stripeClient) {
    if (!STRIPE_SECRET_KEY) {
      throw new Error("STRIPE_SECRET_KEY is not configured");
    }
    stripeClient = new Stripe(STRIPE_SECRET_KEY, {
      apiVersion: "2024-12-18.acacia",
      typescript: true,
      appInfo: {
        name: "AI Education Platform",
        version: "1.0.0",
        url: APP_URL,
      },
    });
  }
  return stripeClient;
}

// Customer operations
export interface CreateCustomerParams {
  email: string;
  name?: string;
  metadata?: Record<string, string>;
}

export async function createCustomer(params: CreateCustomerParams) {
  const stripe = getStripe();
  return stripe.customers.create({
    email: params.email,
    name: params.name,
    metadata: params.metadata,
  });
}

export async function getCustomer(customerId: string) {
  const stripe = getStripe();
  return stripe.customers.retrieve(customerId);
}

export async function updateCustomer(
  customerId: string,
  data: Stripe.CustomerUpdateParams
) {
  const stripe = getStripe();
  return stripe.customers.update(customerId, data);
}

export async function deleteCustomer(customerId: string) {
  const stripe = getStripe();
  return stripe.customers.del(customerId);
}

// Product & Price operations
export interface CreateProductParams {
  name: string;
  description?: string;
  metadata?: Record<string, string>;
}

export async function createProduct(params: CreateProductParams) {
  const stripe = getStripe();
  return stripe.products.create({
    name: params.name,
    description: params.description,
    metadata: params.metadata,
  });
}

export interface CreatePriceParams {
  productId: string;
  unitAmount: number;
  currency?: string;
  recurring?: {
    interval: "day" | "week" | "month" | "year";
    intervalCount?: number;
  };
  metadata?: Record<string, string>;
}

export async function createPrice(params: CreatePriceParams) {
  const stripe = getStripe();
  return stripe.prices.create({
    product: params.productId,
    unit_amount: params.unitAmount,
    currency: params.currency || "usd",
    recurring: params.recurring,
    metadata: params.metadata,
  });
}

export async function listPrices(productId: string) {
  const stripe = getStripe();
  return stripe.prices.list({
    product: productId,
    active: true,
  });
}

// Checkout sessions
export interface CreateCheckoutParams {
  customerId?: string;
  priceId: string;
  quantity?: number;
  courseId: string;
  userId: string;
  successUrl?: string;
  cancelUrl?: string;
  metadata?: Record<string, string>;
}

export async function createCheckoutSession(params: CreateCheckoutParams) {
  const stripe = getStripe();
  return stripe.checkout.sessions.create({
    customer: params.customerId,
    mode: "payment",
    line_items: [
      {
        price: params.priceId,
        quantity: params.quantity || 1,
      },
    ],
    success_url:
      params.successUrl ||
      `${APP_URL}/courses/${params.courseId}/enrolled?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url:
      params.cancelUrl || `${APP_URL}/courses/${params.courseId}`,
    metadata: {
      courseId: params.courseId,
      userId: params.userId,
      ...params.metadata,
    },
    payment_intent_data: {
      metadata: {
        courseId: params.courseId,
        userId: params.userId,
        ...params.metadata,
      },
    },
  });
}

// Subscription operations
export interface CreateSubscriptionParams {
  customerId: string;
  priceId: string;
  metadata?: Record<string, string>;
}

export async function createSubscription(params: CreateSubscriptionParams) {
  const stripe = getStripe();
  return stripe.subscriptions.create({
    customer: params.customerId,
    items: [{ price: params.priceId }],
    payment_behavior: "default_incomplete",
    expand: ["latest_invoice.payment_intent"],
    metadata: params.metadata,
  });
}

export async function cancelSubscription(subscriptionId: string) {
  const stripe = getStripe();
  return stripe.subscriptions.cancel(subscriptionId);
}

export async function updateSubscription(
  subscriptionId: string,
  data: Stripe.SubscriptionUpdateParams
) {
  const stripe = getStripe();
  return stripe.subscriptions.update(subscriptionId, data);
}

export async function getSubscription(subscriptionId: string) {
  const stripe = getStripe();
  return stripe.subscriptions.retrieve(subscriptionId);
}

// Payment operations
export async function createPaymentIntent(
  amount: number,
  currency = "usd",
  metadata?: Record<string, string>
) {
  const stripe = getStripe();
  return stripe.paymentIntents.create({
    amount,
    currency,
    metadata,
  });
}

export async function getPaymentIntent(paymentIntentId: string) {
  const stripe = getStripe();
  return stripe.paymentIntents.retrieve(paymentIntentId);
}

// Refund operations
export async function createRefund(
  paymentIntentId: string,
  amount?: number,
  reason?: Stripe.RefundCreateParams["reason"]
) {
  const stripe = getStripe();
  return stripe.refunds.create({
    payment_intent: paymentIntentId,
    amount,
    reason,
  });
}

// Invoice operations
export async function getInvoice(invoiceId: string) {
  const stripe = getStripe();
  return stripe.invoices.retrieve(invoiceId);
}

export async function listInvoices(customerId: string, limit = 10) {
  const stripe = getStripe();
  return stripe.invoices.list({
    customer: customerId,
    limit,
  });
}

// Webhook verification
export function verifyWebhookSignature(
  payload: string | Buffer,
  signature: string
): Stripe.Event | null {
  const stripe = getStripe();
  try {
    return stripe.webhooks.constructEvent(
      payload,
      signature,
      STRIPE_WEBHOOK_SECRET
    );
  } catch (error) {
    console.error("[Stripe] Webhook verification failed:", error);
    return null;
  }
}

// Webhook event handler
export interface WebhookHandlers {
  "checkout.session.completed"?: (session: Stripe.Checkout.Session) => Promise<void>;
  "checkout.session.expired"?: (session: Stripe.Checkout.Session) => Promise<void>;
  "invoice.paid"?: (invoice: Stripe.Invoice) => Promise<void>;
  "invoice.payment_failed"?: (invoice: Stripe.Invoice) => Promise<void>;
  "customer.subscription.created"?: (subscription: Stripe.Subscription) => Promise<void>;
  "customer.subscription.updated"?: (subscription: Stripe.Subscription) => Promise<void>;
  "customer.subscription.deleted"?: (subscription: Stripe.Subscription) => Promise<void>;
  "payment_intent.succeeded"?: (paymentIntent: Stripe.PaymentIntent) => Promise<void>;
  "payment_intent.payment_failed"?: (paymentIntent: Stripe.PaymentIntent) => Promise<void>;
  "charge.refunded"?: (charge: Stripe.Charge) => Promise<void>;
}

export async function handleWebhook(
  event: Stripe.Event,
  handlers: WebhookHandlers
): Promise<boolean> {
  const handler = handlers[event.type as keyof WebhookHandlers];
  if (!handler) return false;

  try {
    await handler(event.data.object as never);
    return true;
  } catch (error) {
    console.error(`[Stripe] Webhook handler error for ${event.type}:`, error);
    return false;
  }
}

// Portal session (customer self-service)
export async function createPortalSession(
  customerId: string,
  returnUrl?: string
) {
  const stripe = getStripe();
  return stripe.billingPortal.sessions.create({
    customer: customerId,
    return_url: returnUrl || `${APP_URL}/settings/billing`,
  });
}

// Usage recording (metered billing)
export async function reportUsage(
  subscriptionItemId: string,
  quantity: number,
  timestamp?: number
) {
  const stripe = getStripe();
  return stripe.subscriptionItems.createUsageRecord(subscriptionItemId, {
    quantity,
    timestamp: timestamp || Math.floor(Date.now() / 1000),
    action: "increment",
  });
}

// Course pricing helpers
export async function getCoursePrice(
  courseId: string
): Promise<{
  amount: number;
  currency: string;
  recurring: boolean;
  interval?: string;
} | null> {
  const stripe = getStripe();
  const prices = await stripe.prices.list({
    active: true,
    limit: 100,
  });

  const coursePrice = prices.data.find(
    (price) => price.metadata?.courseId === courseId
  );

  if (!coursePrice) return null;

  return {
    amount: coursePrice.unit_amount || 0,
    currency: coursePrice.currency,
    recurring: !!coursePrice.recurring,
    interval: coursePrice.recurring?.interval,
  };
}
