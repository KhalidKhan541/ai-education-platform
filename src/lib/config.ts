import { z } from "zod";

// ==================== ENVIRONMENT SCHEMA ====================

const envSchema = z.object({
  // Node
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),

  // Database
  DATABASE_URL: z.string().url("DATABASE_URL must be a valid URL"),
  DIRECT_URL: z.string().url("DIRECT_URL must be a valid URL").optional(),

  // NextAuth
  NEXTAUTH_URL: z.string().url("NEXTAUTH_URL must be a valid URL"),
  NEXTAUTH_SECRET: z
    .string()
    .min(32, "NEXTAUTH_SECRET must be at least 32 characters"),

  // OAuth - GitHub
  GITHUB_CLIENT_ID: z.string().min(1, "GITHUB_CLIENT_ID is required"),
  GITHUB_CLIENT_SECRET: z.string().min(1, "GITHUB_CLIENT_SECRET is required"),

  // OAuth - Google
  GOOGLE_CLIENT_ID: z.string().min(1, "GOOGLE_CLIENT_ID is required"),
  GOOGLE_CLIENT_SECRET: z.string().min(1, "GOOGLE_CLIENT_SECRET is required"),

  // Redis (optional)
  REDIS_URL: z.string().url("REDIS_URL must be a valid URL").optional(),

  // Email (optional)
  EMAIL_SERVER: z.string().optional(),
  EMAIL_FROM: z.string().email("EMAIL_FROM must be a valid email").optional(),

  // AI Services (optional)
  OPENAI_API_KEY: z.string().optional(),
  OPENAI_MODEL: z.string().default("gpt-4"),
  ANTHROPIC_API_KEY: z.string().optional(),

  // File Storage (optional)
  S3_BUCKET: z.string().optional(),
  S3_REGION: z.string().optional(),
  S3_ACCESS_KEY: z.string().optional(),
  S3_SECRET_KEY: z.string().optional(),

  // Payment (optional)
  STRIPE_SECRET_KEY: z.string().optional(),
  STRIPE_WEBHOOK_SECRET: z.string().optional(),

  // Analytics (optional)
  POSTHOG_KEY: z.string().optional(),
  POSTHOG_HOST: z.string().url().optional(),

  // Error Tracking (optional)
  SENTRY_DSN: z.string().url().optional(),

  // Rate Limiting
  RATE_LIMIT_MAX: z.coerce.number().int().min(1).default(100),
  RATE_LIMIT_WINDOW: z.coerce.number().int().min(1000).default(60000),

  // File Upload
  MAX_FILE_SIZE: z.coerce.number().int().min(1).default(10 * 1024 * 1024), // 10MB
  ALLOWED_FILE_TYPES: z
    .string()
    .default("image/jpeg,image/png,image/gif,image/webp,application/pdf"),
});

// ==================== PARSE & VALIDATE ====================

function validateEnv() {
  try {
    return envSchema.parse(process.env);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const formattedErrors = error.errors.map((err) => {
        return `  ${err.path.join(".")}: ${err.message}`;
      });

      console.error("\n❌ Environment validation failed:\n");
      console.error(formattedErrors.join("\n"));
      console.error(
        "\nPlease check your .env file and ensure all required variables are set.\n"
      );
    } else {
      console.error("\n❌ Unexpected error during environment validation:\n", error);
    }

    process.exit(1);
  }
}

// ==================== CONFIG OBJECT ====================

const env = validateEnv();

export const config = {
  env: {
    NODE_ENV: env.NODE_ENV,
    isDevelopment: env.NODE_ENV === "development",
    isProduction: env.NODE_ENV === "production",
    isTest: env.NODE_ENV === "test",
  },

  database: {
    url: env.DATABASE_URL,
    directUrl: env.DIRECT_URL,
  },

  auth: {
    url: env.NEXTAUTH_URL,
    secret: env.NEXTAUTH_SECRET,
  },

  oauth: {
    github: {
      clientId: env.GITHUB_CLIENT_ID,
      clientSecret: env.GITHUB_CLIENT_SECRET,
    },
    google: {
      clientId: env.GOOGLE_CLIENT_ID,
      clientSecret: env.GOOGLE_CLIENT_SECRET,
    },
  },

  redis: {
    url: env.REDIS_URL,
  },

  email: {
    server: env.EMAIL_SERVER,
    from: env.EMAIL_FROM,
  },

  ai: {
    openaiApiKey: env.OPENAI_API_KEY,
    openaiModel: env.OPENAI_MODEL,
    anthropicApiKey: env.ANTHROPIC_API_KEY,
  },

  storage: {
    s3Bucket: env.S3_BUCKET,
    s3Region: env.S3_REGION,
    s3AccessKey: env.S3_ACCESS_KEY,
    s3SecretKey: env.S3_SECRET_KEY,
  },

  payment: {
    stripeSecretKey: env.STRIPE_SECRET_KEY,
    stripeWebhookSecret: env.STRIPE_WEBHOOK_SECRET,
  },

  analytics: {
    posthogKey: env.POSTHOG_KEY,
    posthogHost: env.POSTHOG_HOST,
  },

  errorTracking: {
    sentryDsn: env.SENTRY_DSN,
  },

  rateLimit: {
    max: env.RATE_LIMIT_MAX,
    window: env.RATE_LIMIT_WINDOW,
  },

  upload: {
    maxFileSize: env.MAX_FILE_SIZE,
    allowedFileTypes: env.ALLOWED_FILE_TYPES.split(","),
  },

  // App-specific constants
  app: {
    name: "AI Education Platform",
    description: "AI-Powered Education Platform",
    url: env.NEXTAUTH_URL,
    supportEmail: "support@ai-education.com",
    defaultLanguage: "en",
    defaultTimeZone: "UTC",
  },

  // Feature flags
  features: {
    enableAI: Boolean(env.OPENAI_API_KEY || env.ANTHROPIC_API_KEY),
    enablePayments: Boolean(env.STRIPE_SECRET_KEY),
    enableAnalytics: Boolean(env.POSTHOG_KEY),
    enableErrorTracking: Boolean(env.SENTRY_DSN),
    enableEmail: Boolean(env.EMAIL_SERVER),
    enableRedis: Boolean(env.REDIS_URL),
    enableFileUpload: Boolean(env.S3_BUCKET),
  },
} as const;

// ==================== TYPE EXPORTS ====================

export type Config = typeof config;
export type EnvConfig = typeof config.env;
export type DatabaseConfig = typeof config.database;
export type AuthConfig = typeof config.auth;
export type OAuthConfig = typeof config.oauth;
export type AIConfig = typeof config.ai;
export type StorageConfig = typeof config.storage;
export type PaymentConfig = typeof config.payment;
export type AnalyticsConfig = typeof config.analytics;
export type FeatureFlags = typeof config.features;

// ==================== VALIDATION HELPERS ====================

export function validateDatabaseUrl(url: string): boolean {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

export function validateEmail(email: string): boolean {
  return z.string().email().safeParse(email).success;
}

export function validateUrl(url: string): boolean {
  return z.string().url().safeParse(url).success;
}

export function validateUuid(id: string): boolean {
  return z.string().uuid().safeParse(id).success;
}

export function validateJson(str: string): boolean {
  try {
    JSON.parse(str);
    return true;
  } catch {
    return false;
  }
}

// ==================== ENVIRONMENT HELPERS ====================

export function getEnvironmentVariable(
  key: string,
  defaultValue?: string
): string | undefined {
  const value = process.env[key];
  if (value !== undefined) {
    return value;
  }
  return defaultValue;
}

export function requireEnvironmentVariable(key: string): string {
  const value = process.env[key];
  if (value === undefined) {
    throw new Error(`Required environment variable ${key} is not set`);
  }
  return value;
}

export function getBooleanEnvironmentVariable(
  key: string,
  defaultValue = false
): boolean {
  const value = process.env[key];
  if (value === undefined) {
    return defaultValue;
  }
  return value === "true" || value === "1";
}

export function getNumberEnvironmentVariable(
  key: string,
  defaultValue: number
): number {
  const value = process.env[key];
  if (value === undefined) {
    return defaultValue;
  }
  const parsed = parseInt(value, 10);
  if (isNaN(parsed)) {
    return defaultValue;
  }
  return parsed;
}

// ==================== CONFIGURATION ACCESSORS ====================

export function getDatabaseUrl(): string {
  return config.database.url;
}

export function getAuthSecret(): string {
  return config.auth.secret;
}

export function getAuthUrl(): string {
  return config.auth.url;
}

export function getOpenAIApiKey(): string | undefined {
  return config.ai.openaiApiKey;
}

export function getOpenAIModel(): string {
  return config.ai.openaiModel;
}

export function getStripeSecretKey(): string | undefined {
  return config.payment.stripeSecretKey;
}

export function getS3Bucket(): string | undefined {
  return config.storage.s3Bucket;
}

export function getS3Region(): string | undefined {
  return config.storage.s3Region;
}

export function isFeatureEnabled(feature: keyof FeatureFlags): boolean {
  return config.features[feature];
}

export function isDevelopment(): boolean {
  return config.env.isDevelopment;
}

export function isProduction(): boolean {
  return config.env.isProduction;
}

export function isTest(): boolean {
  return config.env.isTest;
}

// ==================== CONFIGURATION VALIDATION ====================

export function validateConfig(): {
  valid: boolean;
  errors: string[];
  warnings: string[];
} {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Check required services
  if (!config.features.enableAI) {
    warnings.push("AI features are disabled (no API key configured)");
  }

  if (!config.features.enablePayments) {
    warnings.push("Payment features are disabled (no Stripe key configured)");
  }

  if (!config.features.enableEmail) {
    warnings.push("Email features are disabled (no email server configured)");
  }

  if (!config.features.enableRedis) {
    warnings.push("Redis is not configured (using in-memory cache)");
  }

  if (!config.features.enableFileUpload) {
    warnings.push("File upload is disabled (no S3 bucket configured)");
  }

  // Validate database URL format
  if (!validateDatabaseUrl(config.database.url)) {
    errors.push("Invalid DATABASE_URL format");
  }

  // Validate auth URL format
  if (!validateUrl(config.auth.url)) {
    errors.push("Invalid NEXTAUTH_URL format");
  }

  // Check auth secret length
  if (config.auth.secret.length < 32) {
    warnings.push("NEXTAUTH_SECRET should be at least 32 characters");
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

// ==================== ENVIRONMENT-SPECIFIC CONFIG ====================

export function getEnvironmentConfig() {
  const baseConfig = {
    cors: {
      origin: config.auth.url,
      credentials: true,
    },
    rateLimit: {
      windowMs: config.rateLimit.window,
      max: config.rateLimit.max,
    },
    upload: {
      maxFileSize: config.upload.maxFileSize,
      allowedTypes: config.upload.allowedFileTypes,
    },
  };

  if (config.env.isDevelopment) {
    return {
      ...baseConfig,
      logging: {
        level: "debug",
        format: "pretty",
      },
      cache: {
        ttl: 60, // 1 minute
      },
    };
  }

  if (config.env.isProduction) {
    return {
      ...baseConfig,
      logging: {
        level: "info",
        format: "json",
      },
      cache: {
        ttl: 300, // 5 minutes
      },
    };
  }

  // Test environment
  return {
    ...baseConfig,
    logging: {
      level: "error",
      format: "json",
    },
    cache: {
      ttl: 0, // No caching in tests
    },
  };
}

// ==================== DEFAULT EXPORT ====================

export default config;
