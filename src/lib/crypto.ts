import bcryptjs from "bcryptjs";
import jwt from "jsonwebtoken";
import crypto from "crypto";

const BCRYPT_ROUNDS = 12;
const JWT_SECRET = process.env.JWT_SECRET || "fallback-secret-do-not-use-in-production";
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || "7d";
const JWT_REFRESH_EXPIRES_IN = process.env.JWT_REFRESH_EXPIRES_IN || "30d";
const API_KEY_PREFIX = "aiedu_";
const API_KEY_LENGTH = 48;

export interface TokenPayload {
  sub: string;
  email: string;
  role: string;
  iat?: number;
  exp?: number;
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export interface ApiKeyRecord {
  id: string;
  key: string;
  prefix: string;
  hash: string;
  userId: string;
  name: string;
  scopes: string[];
  createdAt: Date;
  expiresAt?: Date;
  lastUsedAt?: Date;
  isActive: boolean;
}

// Password hashing
export async function hashPassword(password: string): Promise<string> {
  const salt = await bcryptjs.genSalt(BCRYPT_ROUNDS);
  return bcryptjs.hash(password, salt);
}

export async function comparePassword(
  password: string,
  hash: string
): Promise<boolean> {
  return bcryptjs.compare(password, hash);
}

export function validatePasswordStrength(password: string): {
  valid: boolean;
  score: number;
  feedback: string[];
} {
  const feedback: string[] = [];
  let score = 0;

  if (password.length >= 8) score += 1;
  else feedback.push("Password must be at least 8 characters long");

  if (password.length >= 12) score += 1;

  if (/[a-z]/.test(password)) score += 1;
  else feedback.push("Password must contain a lowercase letter");

  if (/[A-Z]/.test(password)) score += 1;
  else feedback.push("Password must contain an uppercase letter");

  if (/\d/.test(password)) score += 1;
  else feedback.push("Password must contain a number");

  if (/[^a-zA-Z\d]/.test(password)) score += 1;
  else feedback.push("Password must contain a special character");

  if (!/(.)\1{2,}/.test(password)) score += 1;
  else feedback.push("Password should not contain repeated characters");

  return {
    valid: score >= 5,
    score,
    feedback,
  };
}

// JWT operations
export function generateTokenPair(payload: TokenPayload): TokenPair {
  const accessToken = jwt.sign(payload, JWT_SECRET, {
    expiresIn: JWT_EXPIRES_IN,
  });
  const refreshToken = jwt.sign(
    { ...payload, type: "refresh" },
    JWT_SECRET,
    { expiresIn: JWT_REFRESH_EXPIRES_IN }
  );

  const decoded = jwt.decode(accessToken) as { exp: number } | null;
  const expiresIn = decoded ? decoded.exp - Math.floor(Date.now() / 1000) : 0;

  return { accessToken, refreshToken, expiresIn };
}

export function generateAccessToken(payload: TokenPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
}

export function verifyToken(token: string): TokenPayload | null {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as TokenPayload & {
      type?: string;
    };
    if (decoded.type === "refresh") return null;
    return decoded;
  } catch {
    return null;
  }
}

export function verifyRefreshToken(token: string): TokenPayload | null {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as TokenPayload & {
      type?: string;
    };
    if (decoded.type !== "refresh") return null;
    return decoded;
  } catch {
    return null;
  }
}

export function decodeToken(token: string): TokenPayload | null {
  try {
    return jwt.decode(token) as TokenPayload | null;
  } catch {
    return null;
  }
}

// API Key operations
export function generateApiKey(): {
  key: string;
  prefix: string;
  hash: string;
} {
  const rawBytes = new Uint8Array(API_KEY_LENGTH);
  if (typeof crypto !== "undefined" && crypto.getRandomValues) {
    crypto.getRandomValues(rawBytes);
  } else {
    for (let i = 0; i < API_KEY_LENGTH; i++) {
      rawBytes[i] = Math.floor(Math.random() * 256);
    }
  }

  const keyData = Buffer.from(rawBytes).toString("base64url");
  const key = `${API_KEY_PREFIX}${keyData}`;
  const prefix = key.slice(0, API_KEY_PREFIX_LENGTH + 8);
  const hash = hashApiKey(key);

  return { key, prefix, hash };
}

const API_KEY_PREFIX_LENGTH = API_KEY_PREFIX.length;

export function hashApiKey(key: string): string {
  return crypto.createHash("sha256").update(key).digest("hex");
}

export function verifyApiKey(
  providedKey: string,
  storedHash: string
): boolean {
  const hash = hashApiKey(providedKey);
  return crypto.timingSafeEqual(Buffer.from(hash), Buffer.from(storedHash));
}

// Encryption helpers
export function encrypt(text: string, secret: string): string {
  const key = crypto.scryptSync(secret, "salt", 32);
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv("aes-256-cbc", key, iv);
  let encrypted = cipher.update(text, "utf8", "hex");
  encrypted += cipher.final("hex");
  return `${iv.toString("hex")}:${encrypted}`;
}

export function decrypt(encryptedText: string, secret: string): string {
  const [ivHex, encrypted] = encryptedText.split(":");
  const key = crypto.scryptSync(secret, "salt", 32);
  const iv = Buffer.from(ivHex, "hex");
  const decipher = crypto.createDecipheriv("aes-256-cbc", key, iv);
  let decrypted = decipher.update(encrypted, "hex", "utf8");
  decrypted += decipher.final("utf8");
  return decrypted;
}

// Random value generation
export function generateRandomString(length = 32): string {
  return crypto.randomBytes(length).toString("hex").slice(0, length);
}

export function generateNumericCode(length = 6): string {
  const min = Math.pow(10, length - 1);
  const max = Math.pow(10, length) - 1;
  return crypto.randomInt(min, max + 1).toString();
}

export function generateUuid(): string {
  return crypto.randomUUID();
}

// HMAC signatures
export function createSignature(
  data: string,
  secret: string
): string {
  return crypto.createHmac("sha256", secret).update(data).digest("hex");
}

export function verifySignature(
  data: string,
  signature: string,
  secret: string
): boolean {
  const expected = createSignature(data, secret);
  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expected)
  );
}
