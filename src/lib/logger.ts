// ==================== LOG LEVELS ====================

export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
  FATAL = 4,
}

const LOG_LEVEL_NAMES: Record<LogLevel, string> = {
  [LogLevel.DEBUG]: "DEBUG",
  [LogLevel.INFO]: "INFO",
  [LogLevel.WARN]: "WARN",
  [LogLevel.ERROR]: "ERROR",
  [LogLevel.FATAL]: "FATAL",
};

const LOG_LEVEL_COLORS: Record<LogLevel, string> = {
  [LogLevel.DEBUG]: "\x1b[36m",
  [LogLevel.INFO]: "\x1b[32m",
  [LogLevel.WARN]: "\x1b[33m",
  [LogLevel.ERROR]: "\x1b[31m",
  [LogLevel.FATAL]: "\x1b[35m",
};

const RESET_COLOR = "\x1b[0m";

// ==================== TYPES ====================

export interface LogContext {
  [key: string]: unknown;
}

export interface LogEntry {
  timestamp: string;
  level: string;
  message: string;
  context?: LogContext;
  requestId?: string;
  userId?: string;
  service?: string;
  duration?: number;
  stack?: string;
}

export interface LoggerOptions {
  level?: LogLevel;
  serviceName?: string;
  enableConsole?: boolean;
  enableFile?: boolean;
  filePath?: string;
  maxFileSize?: number;
  maxFiles?: number;
  enableJson?: boolean;
  enableColors?: boolean;
  redactFields?: string[];
}

// ==================== REDACTION ====================

const DEFAULT_REDACT_FIELDS = [
  "password",
  "passwordHash",
  "token",
  "accessToken",
  "refreshToken",
  "secret",
  "apiKey",
  "authorization",
  "creditCard",
  "ssn",
];

function redactSensitiveData(
  data: Record<string, unknown>,
  redactFields: string[]
): Record<string, unknown> {
  const redacted: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(data)) {
    if (redactFields.includes(key.toLowerCase())) {
      redacted[key] = "[REDACTED]";
    } else if (
      typeof value === "object" &&
      value !== null &&
      !Array.isArray(value)
    ) {
      redacted[key] = redactSensitiveData(
        value as Record<string, unknown>,
        redactFields
      );
    } else {
      redacted[key] = value;
    }
  }

  return redacted;
}

// ==================== FORMATTERS ====================

function formatTimestamp(date: Date): string {
  return date.toISOString();
}

function formatMessage(entry: LogEntry): string {
  const parts: string[] = [];

  parts.push(`[${entry.timestamp}]`);
  parts.push(`[${entry.level}]`);

  if (entry.service) {
    parts.push(`[${entry.service}]`);
  }

  if (entry.requestId) {
    parts.push(`[req:${entry.requestId.slice(0, 8)}]`);
  }

  if (entry.userId) {
    parts.push(`[user:${entry.userId.slice(0, 8)}]`);
  }

  parts.push(entry.message);

  if (entry.duration !== undefined) {
    parts.push(`(${entry.duration}ms)`);
  }

  return parts.join(" ");
}

function formatContext(context: LogContext): string {
  if (Object.keys(context).length === 0) {
    return "";
  }
  return ` ${JSON.stringify(context, null, 0)}`;
}

function formatJson(entry: LogEntry): string {
  return JSON.stringify(entry);
}

// ==================== LOGGER CLASS ====================

export class Logger {
  private level: LogLevel;
  private serviceName: string;
  private enableConsole: boolean;
  private enableFile: boolean;
  private filePath: string;
  private enableJson: boolean;
  private enableColors: boolean;
  private redactFields: string[];
  private buffers: LogEntry[] = [];
  private flushInterval: ReturnType<typeof setInterval> | null = null;

  constructor(options: LoggerOptions = {}) {
    this.level = options.level ?? LogLevel.INFO;
    this.serviceName = options.serviceName ?? "app";
    this.enableConsole = options.enableConsole ?? true;
    this.enableFile = options.enableFile ?? false;
    this.filePath = options.filePath ?? "logs/app.log";
    this.enableJson = options.enableJson ?? false;
    this.enableColors = options.enableColors ?? true;
    this.redactFields = options.redactFields ?? DEFAULT_REDACT_FIELDS;

    if (this.enableFile) {
      this.flushInterval = setInterval(() => {
        this.flush();
      }, 5000);
    }
  }

  private shouldLog(level: LogLevel): boolean {
    return level >= this.level;
  }

  private createEntry(
    level: LogLevel,
    message: string,
    context?: LogContext,
    requestId?: string,
    userId?: string,
    duration?: number,
    error?: Error
  ): LogEntry {
    const entry: LogEntry = {
      timestamp: formatTimestamp(new Date()),
      level: LOG_LEVEL_NAMES[level],
      message,
      context: context
        ? redactSensitiveData(context, this.redactFields)
        : undefined,
      requestId,
      userId,
      service: this.serviceName,
      duration,
    };

    if (error) {
      entry.stack = error.stack;
    }

    return entry;
  }

  private write(entry: LogEntry): void {
    if (this.enableConsole) {
      const formatted = formatMessage(entry);
      const contextStr = entry.context ? formatContext(entry.context) : "";

      if (this.enableColors) {
        const color = LOG_LEVEL_COLORS[entry.level as unknown as LogLevel] ?? "";
        console.log(`${color}${formatted}${RESET_COLOR}${contextStr}`);
      } else {
        console.log(`${formatted}${contextStr}`);
      }

      if (entry.stack) {
        console.error(entry.stack);
      }
    }

    if (this.enableFile) {
      this.buffers.push(entry);
    }
  }

  private flush(): void {
    if (this.buffers.length === 0) {
      return;
    }

    const entries = this.buffers.splice(0);
    const content = entries
      .map((entry) => (this.enableJson ? formatJson(entry) : formatMessage(entry)))
      .join("\n");

    // In production, this would write to a file
    // For now, we'll just log to console
    if (process.env.NODE_ENV === "development") {
      console.log(`[Logger] Flushing ${entries.length} entries to ${this.filePath}`);
    }
  }

  debug(message: string, context?: LogContext, requestId?: string, userId?: string): void {
    if (!this.shouldLog(LogLevel.DEBUG)) {
      return;
    }

    const entry = this.createEntry(LogLevel.DEBUG, message, context, requestId, userId);
    this.write(entry);
  }

  info(message: string, context?: LogContext, requestId?: string, userId?: string): void {
    if (!this.shouldLog(LogLevel.INFO)) {
      return;
    }

    const entry = this.createEntry(LogLevel.INFO, message, context, requestId, userId);
    this.write(entry);
  }

  warn(message: string, context?: LogContext, requestId?: string, userId?: string): void {
    if (!this.shouldLog(LogLevel.WARN)) {
      return;
    }

    const entry = this.createEntry(LogLevel.WARN, message, context, requestId, userId);
    this.write(entry);
  }

  error(
    message: string,
    error?: Error | unknown,
    context?: LogContext,
    requestId?: string,
    userId?: string
  ): void {
    if (!this.shouldLog(LogLevel.ERROR)) {
      return;
    }

    const err = error instanceof Error ? error : new Error(String(error));
    const entry = this.createEntry(
      LogLevel.ERROR,
      message,
      context,
      requestId,
      userId,
      undefined,
      err
    );
    this.write(entry);
  }

  fatal(
    message: string,
    error?: Error | unknown,
    context?: LogContext,
    requestId?: string,
    userId?: string
  ): void {
    if (!this.shouldLog(LogLevel.FATAL)) {
      return;
    }

    const err = error instanceof Error ? error : new Error(String(error));
    const entry = this.createEntry(
      LogLevel.FATAL,
      message,
      context,
      requestId,
      userId,
      undefined,
      err
    );
    this.write(entry);

    this.flush();
  }

  child(options: { serviceName?: string; requestId?: string; userId?: string }): Logger {
    return new Logger({
      level: this.level,
      serviceName: options.serviceName ?? this.serviceName,
      enableConsole: this.enableConsole,
      enableFile: this.enableFile,
      filePath: this.filePath,
      enableJson: this.enableJson,
      enableColors: this.enableColors,
      redactFields: this.redactFields,
    });
  }

  withContext(context: LogContext): Logger {
    const child = this.child({});
    const originalWrite = child.write.bind(child);
    child.write = (entry: LogEntry) => {
      entry.context = { ...context, ...entry.context };
      originalWrite(entry);
    };
    return child;
  }

  time(label: string): () => void {
    const start = Date.now();
    return () => {
      const duration = Date.now() - start;
      this.info(`${label} completed`, { duration });
    };
  }

  profile(label: string): void {
    const start = Date.now();
    this.debug(`Profile start: ${label}`);
    return undefined as unknown as void;
  }

  profileEnd(label: string): number {
    const duration = Date.now();
    this.debug(`Profile end: ${label}`, { duration });
    return duration;
  }

  destroy(): void {
    if (this.flushInterval) {
      clearInterval(this.flushInterval);
    }
    this.flush();
  }
}

// ==================== REQUEST LOGGER ====================

export interface RequestLogContext {
  method: string;
  url: string;
  userAgent?: string;
  ip?: string;
  userId?: string;
  statusCode?: number;
  duration?: number;
}

export function logRequest(
  logger: Logger,
  context: RequestLogContext,
  requestId?: string
): void {
  const { method, url, userAgent, ip, userId, statusCode, duration } = context;

  const logContext: LogContext = {
    method,
    url,
    userAgent,
    ip,
    statusCode,
    duration,
  };

  if (statusCode && statusCode >= 500) {
    logger.error("Request failed", undefined, logContext, requestId, userId);
  } else if (statusCode && statusCode >= 400) {
    logger.warn("Request error", logContext, requestId, userId);
  } else {
    logger.info("Request completed", logContext, requestId, userId);
  }
}

// ==================== PERFORMANCE LOGGER ====================

export class PerformanceLogger {
  private logger: Logger;
  private timers: Map<string, number> = new Map();

  constructor(logger: Logger) {
    this.logger = logger;
  }

  start(label: string): void {
    this.timers.set(label, Date.now());
    this.logger.debug(`Performance timer started: ${label}`);
  }

  end(label: string, context?: LogContext): number {
    const start = this.timers.get(label);
    if (start === undefined) {
      this.logger.warn(`Performance timer not found: ${label}`);
      return 0;
    }

    const duration = Date.now() - start;
    this.timers.delete(label);

    this.logger.info(`Performance: ${label}`, {
      ...context,
      duration,
    });

    return duration;
  }

  measure(label: string, fn: () => unknown): unknown {
    this.start(label);
    try {
      const result = fn();
      this.end(label);
      return result;
    } catch (error) {
      this.end(label, { error: (error as Error).message });
      throw error;
    }
  }

  async measureAsync(label: string, fn: () => Promise<unknown>): Promise<unknown> {
    this.start(label);
    try {
      const result = await fn();
      this.end(label);
      return result;
    } catch (error) {
      this.end(label, { error: (error as Error).message });
      throw error;
    }
  }
}

// ==================== AUDIT LOGGER ====================

export interface AuditEvent {
  action: string;
  resource: string;
  resourceId?: string;
  userId?: string;
  details?: Record<string, unknown>;
  ip?: string;
  userAgent?: string;
}

export class AuditLogger {
  private logger: Logger;

  constructor(logger: Logger) {
    this.logger = logger;
  }

  log(event: AuditEvent): void {
    this.logger.info(`Audit: ${event.action}`, {
      audit: true,
      action: event.action,
      resource: event.resource,
      resourceId: event.resourceId,
      userId: event.userId,
      details: event.details,
      ip: event.ip,
      userAgent: event.userAgent,
    });
  }

  logLogin(userId: string, ip?: string, userAgent?: string): void {
    this.log({
      action: "LOGIN",
      resource: "user",
      resourceId: userId,
      userId,
      ip,
      userAgent,
    });
  }

  logLogout(userId: string, ip?: string, userAgent?: string): void {
    this.log({
      action: "LOGOUT",
      resource: "user",
      resourceId: userId,
      userId,
      ip,
      userAgent,
    });
  }

  logCreate(
    resource: string,
    resourceId: string,
    userId: string,
    details?: Record<string, unknown>
  ): void {
    this.log({
      action: "CREATE",
      resource,
      resourceId,
      userId,
      details,
    });
  }

  logUpdate(
    resource: string,
    resourceId: string,
    userId: string,
    details?: Record<string, unknown>
  ): void {
    this.log({
      action: "UPDATE",
      resource,
      resourceId,
      userId,
      details,
    });
  }

  logDelete(
    resource: string,
    resourceId: string,
    userId: string,
    details?: Record<string, unknown>
  ): void {
    this.log({
      action: "DELETE",
      resource,
      resourceId,
      userId,
      details,
    });
  }

  logAccess(
    resource: string,
    resourceId: string,
    userId: string,
    details?: Record<string, unknown>
  ): void {
    this.log({
      action: "ACCESS",
      resource,
      resourceId,
      userId,
      details,
    });
  }

  logExport(
    resource: string,
    userId: string,
    format: string,
    details?: Record<string, unknown>
  ): void {
    this.log({
      action: "EXPORT",
      resource,
      userId,
      details: { ...details, format },
    });
  }
}

// ==================== SINGLETON INSTANCES ====================

let defaultLogger: Logger | null = null;
let auditLogger: AuditLogger | null = null;

export function getLogger(options?: LoggerOptions): Logger {
  if (!defaultLogger) {
    defaultLogger = new Logger({
      level:
        process.env.NODE_ENV === "production" ? LogLevel.INFO : LogLevel.DEBUG,
      serviceName: "ai-education-platform",
      enableConsole: true,
      enableFile: process.env.NODE_ENV === "production",
      enableJson: process.env.NODE_ENV === "production",
      enableColors: process.env.NODE_ENV !== "production",
      ...options,
    });
  }
  return defaultLogger;
}

export function getAuditLogger(): AuditLogger {
  if (!auditLogger) {
    auditLogger = new AuditLogger(getLogger());
  }
  return auditLogger;
}

export function createLogger(options: LoggerOptions): Logger {
  return new Logger(options);
}

export function createRequestLogger(requestId: string, userId?: string): Logger {
  const logger = getLogger();
  return logger.child({ requestId, userId });
}

export function createPerformanceLogger(label?: string): PerformanceLogger {
  return new PerformanceLogger(
    getLogger({ serviceName: label ?? "performance" })
  );
}

export default getLogger;
