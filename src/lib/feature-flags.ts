import { cacheGet, cacheSet } from "./cache";

export interface FeatureFlag {
  key: string;
  name: string;
  description?: string;
  enabled: boolean;
  rolloutPercentage: number;
  allowedUsers?: string[];
  allowedRoles?: string[];
  allowedEnvironments?: string[];
  defaultValue: boolean;
  metadata?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface FeatureFlagEvaluation {
  enabled: boolean;
  variant?: string;
  reason: string;
}

export interface FeatureFlagContext {
  userId?: string;
  role?: string;
  environment?: string;
  userAgent?: string;
  attributes?: Record<string, string | number | boolean>;
}

type FlagOverride = boolean | { enabled: boolean; variant?: string };

const CACHE_PREFIX = "featureflags:";
const CACHE_TTL = 300; // 5 minutes

// Default flags for the education platform
const DEFAULT_FLAGS: FeatureFlag[] = [
  {
    key: "ai-tutor",
    name: "AI Tutor",
    description: "Enable AI-powered tutoring assistant",
    enabled: true,
    rolloutPercentage: 100,
    defaultValue: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    key: "live-collaboration",
    name: "Live Collaboration",
    description: "Real-time collaboration on assignments",
    enabled: false,
    rolloutPercentage: 0,
    defaultValue: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    key: "advanced-analytics",
    name: "Advanced Analytics",
    description: "Enhanced analytics dashboard for instructors",
    enabled: true,
    rolloutPercentage: 50,
    allowedRoles: ["instructor", "admin"],
    defaultValue: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    key: "certificate-verification",
    name: "Certificate Verification",
    description: "Blockchain-based certificate verification",
    enabled: false,
    rolloutPercentage: 0,
    defaultValue: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    key: "dark-mode",
    name: "Dark Mode",
    description: "Dark mode support",
    enabled: true,
    rolloutPercentage: 100,
    defaultValue: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    key: "beta-features",
    name: "Beta Features",
    description: "Enable beta features for testing",
    enabled: true,
    rolloutPercentage: 10,
    allowedRoles: ["admin", "beta-tester"],
    defaultValue: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    key: "multi-language",
    name: "Multi-Language Support",
    description: "Internationalization support",
    enabled: true,
    rolloutPercentage: 100,
    defaultValue: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    key: "video-downloads",
    name: "Video Downloads",
    description: "Allow offline video downloads",
    enabled: true,
    rolloutPercentage: 75,
    defaultValue: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

let flags: Map<string, FeatureFlag> = new Map();
let overrides: Map<string, FlagOverride> = new Map();
let initialized = false;

// Initialize flags from cache or defaults
export async function initializeFeatureFlags(): Promise<void> {
  if (initialized) return;

  // Load from cache
  const cachedFlags = await cacheGet<FeatureFlag[]>(
    `${CACHE_PREFIX}all`
  );

  if (cachedFlags) {
    for (const flag of cachedFlags) {
      flags.set(flag.key, flag);
    }
  } else {
    // Use defaults
    for (const flag of DEFAULT_FLAGS) {
      flags.set(flag.key, flag);
    }
    await cacheSet(`${CACHE_PREFIX}all`, DEFAULT_FLAGS, {
      ttl: CACHE_TTL,
    });
  }

  initialized = true;
}

// Evaluate a feature flag
export async function evaluateFeatureFlag(
  key: string,
  context: FeatureFlagContext = {}
): Promise<FeatureFlagEvaluation> {
  // Check overrides first
  const override = overrides.get(key);
  if (override !== undefined) {
    if (typeof override === "boolean") {
      return {
        enabled: override,
        reason: "override",
      };
    }
    return {
      enabled: override.enabled,
      variant: override.variant,
      reason: "override",
    };
  }

  await initializeFeatureFlags();

  const flag = flags.get(key);
  if (!flag) {
    return {
      enabled: false,
      reason: "flag_not_found",
    };
  }

  // Check if flag is globally disabled
  if (!flag.enabled) {
    return {
      enabled: false,
      reason: "flag_disabled",
    };
  }

  // Check environment
  if (
    flag.allowedEnvironments &&
    flag.allowedEnvironments.length > 0 &&
    context.environment
  ) {
    if (!flag.allowedEnvironments.includes(context.environment)) {
      return {
        enabled: flag.defaultValue,
        reason: "environment_not_allowed",
      };
    }
  }

  // Check allowed roles
  if (flag.allowedRoles && flag.allowedRoles.length > 0 && context.role) {
    if (flag.allowedRoles.includes(context.role)) {
      return {
        enabled: true,
        reason: "role_allowed",
      };
    }
  }

  // Check allowed users
  if (flag.allowedUsers && flag.allowedUsers.length > 0 && context.userId) {
    if (flag.allowedUsers.includes(context.userId)) {
      return {
        enabled: true,
        reason: "user_allowed",
      };
    }
  }

  // Rollout percentage
  if (flag.rolloutPercentage >= 100) {
    return {
      enabled: true,
      reason: "rollout_complete",
    };
  }

  if (flag.rolloutPercentage <= 0) {
    return {
      enabled: flag.defaultValue,
      reason: "rollout_not_started",
    };
  }

  // Deterministic rollout based on user ID
  if (context.userId) {
    const hash = simpleHash(context.userId + key);
    const bucket = hash % 100;
    const enabled = bucket < flag.rolloutPercentage;
    return {
      enabled,
      reason: "rollout_percentage",
    };
  }

  // Without a user ID, use default
  return {
    enabled: flag.defaultValue,
    reason: "default_value",
  };
}

function simpleHash(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0;
  }
  return Math.abs(hash);
}

// Convenience function
export async function isFeatureEnabled(
  key: string,
  context: FeatureFlagContext = {}
): Promise<boolean> {
  const evaluation = await evaluateFeatureFlag(key, context);
  return evaluation.enabled;
}

// Multiple flags evaluation
export async function evaluateFeatureFlags(
  keys: string[],
  context: FeatureFlagContext = {}
): Promise<Record<string, FeatureFlagEvaluation>> {
  const results: Record<string, FeatureFlagEvaluation> = {};
  await Promise.all(
    keys.map(async (key) => {
      results[key] = await evaluateFeatureFlag(key, context);
    })
  );
  return results;
}

// Override (for testing or admin)
export function setFeatureFlagOverride(
  key: string,
  value: FlagOverride
): void {
  overrides.set(key, value);
}

export function clearFeatureFlagOverride(key: string): void {
  overrides.delete(key);
}

export function clearAllOverrides(): void {
  overrides.clear();
}

// Flag management
export async function createFeatureFlag(
  flag: Omit<FeatureFlag, "createdAt" | "updatedAt">
): Promise<FeatureFlag> {
  const newFlag: FeatureFlag = {
    ...flag,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  flags.set(newFlag.key, newFlag);
  await persistFlags();
  return newFlag;
}

export async function updateFeatureFlag(
  key: string,
  updates: Partial<Omit<FeatureFlag, "key" | "createdAt">>
): Promise<FeatureFlag | null> {
  const existing = flags.get(key);
  if (!existing) return null;

  const updated: FeatureFlag = {
    ...existing,
    ...updates,
    updatedAt: new Date().toISOString(),
  };
  flags.set(key, updated);
  await persistFlags();
  return updated;
}

export async function deleteFeatureFlag(key: string): Promise<boolean> {
  const existed = flags.delete(key);
  if (existed) await persistFlags();
  return existed;
}

export async function getAllFeatureFlags(): Promise<FeatureFlag[]> {
  await initializeFeatureFlags();
  return Array.from(flags.values());
}

export async function getFeatureFlag(
  key: string
): Promise<FeatureFlag | null> {
  await initializeFeatureFlags();
  return flags.get(key) || null;
}

async function persistFlags(): Promise<void> {
  const allFlags = Array.from(flags.values());
  await cacheSet(`${CACHE_PREFIX}all`, allFlags, { ttl: CACHE_TTL });
}

// Server-side flag check for middleware
export function evaluateFeatureFlagSync(
  key: string,
  context: FeatureFlagContext = {}
): boolean {
  const override = overrides.get(key);
  if (override !== undefined) {
    return typeof override === "boolean" ? override : override.enabled;
  }

  const flag = flags.get(key);
  if (!flag || !flag.enabled) return flag?.defaultValue ?? false;

  if (context.userId && flag.rolloutPercentage < 100) {
    const hash = simpleHash(context.userId + key);
    return (hash % 100) < flag.rolloutPercentage;
  }

  return flag.enabled;
}
