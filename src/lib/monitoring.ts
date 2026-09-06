type MetricType = "counter" | "gauge" | "histogram";

interface Metric {
  name: string;
  type: MetricType;
  value: number;
  labels?: Record<string, string>;
  timestamp: number;
}

interface LogEntry {
  level: "info" | "warn" | "error" | "debug";
  message: string;
  context?: Record<string, unknown>;
  timestamp: number;
  requestId?: string;
  userId?: string;
}

interface PerformanceEntry {
  operation: string;
  duration: number;
  success: boolean;
  timestamp: number;
}

class MonitoringService {
  private metrics: Metric[] = [];
  private logs: LogEntry[] = [];
  private performance: PerformanceEntry[] = [];
  private maxEntries = 10000;

  incrementCounter(name: string, labels?: Record<string, string>): void {
    this.metrics.push({
      name,
      type: "counter",
      value: 1,
      labels,
      timestamp: Date.now(),
    });
    this.trimMetrics();
  }

  setGauge(name: string, value: number, labels?: Record<string, string>): void {
    this.metrics.push({
      name,
      type: "gauge",
      value,
      labels,
      timestamp: Date.now(),
    });
    this.trimMetrics();
  }

  observeHistogram(name: string, value: number, labels?: Record<string, string>): void {
    this.metrics.push({
      name,
      type: "histogram",
      value,
      labels,
      timestamp: Date.now(),
    });
    this.trimMetrics();
  }

  info(message: string, context?: Record<string, unknown>, requestId?: string, userId?: string): void {
    this.addLog("info", message, context, requestId, userId);
  }

  warn(message: string, context?: Record<string, unknown>, requestId?: string): void {
    this.addLog("warn", message, context, requestId);
  }

  error(message: string, context?: Record<string, unknown>, requestId?: string): void {
    this.addLog("error", message, context, requestId);
    console.error(`[ERROR] ${message}`, context);
  }

  debug(message: string, context?: Record<string, unknown>, requestId?: string): void {
    if (process.env.NODE_ENV === "development") {
      this.addLog("debug", message, context, requestId);
    }
  }

  trackPerformance(operation: string, duration: number, success: boolean): void {
    this.performance.push({
      operation,
      duration,
      success,
      timestamp: Date.now(),
    });
    this.trimPerformance();
  }

  async measureOperation<T>(
    operation: string,
    fn: () => Promise<T>,
    labels?: Record<string, string>
  ): Promise<T> {
    const start = Date.now();
    let success = true;
    try {
      const result = await fn();
      return result;
    } catch (error) {
      success = false;
      throw error;
    } finally {
      const duration = Date.now() - start;
      this.trackPerformance(operation, duration, success);
      this.observeHistogram(`${operation}_duration_ms`, duration, labels);
      this.incrementCounter(`${operation}_${success ? "success" : "failure"}`, labels);
    }
  }

  getMetrics(name?: string): Metric[] {
    if (name) return this.metrics.filter((m) => m.name === name);
    return [...this.metrics];
  }

  getLogs(level?: LogEntry["level"], limit = 100): LogEntry[] {
    let filtered = [...this.logs];
    if (level) filtered = filtered.filter((l) => l.level === level);
    return filtered.slice(-limit);
  }

  getPerformance(operation?: string): PerformanceEntry[] {
    if (operation) return this.performance.filter((p) => p.operation === operation);
    return [...this.performance];
  }

  getAverageResponseTime(operation?: string): number {
    const entries = operation
      ? this.performance.filter((p) => p.operation === operation)
      : this.performance;
    if (entries.length === 0) return 0;
    return entries.reduce((sum, e) => sum + e.duration, 0) / entries.length;
  }

  getErrorRate(): number {
    if (this.performance.length === 0) return 0;
    const errors = this.performance.filter((p) => !p.success).length;
    return (errors / this.performance.length) * 100;
  }

  getHealthStatus(): { status: string; checks: Record<string, string> } {
    const errorRate = this.getErrorRate();
    const avgResponseTime = this.getAverageResponseTime();

    const checks: Record<string, string> = {
      errorRate: `${errorRate.toFixed(2)}%`,
      avgResponseTime: `${avgResponseTime.toFixed(0)}ms`,
      metricsCount: `${this.metrics.length}`,
      logsCount: `${this.logs.length}`,
    };

    let status = "healthy";
    if (errorRate > 10) status = "degraded";
    if (errorRate > 50) status = "unhealthy";

    return { status, checks };
  }

  flush(): void {
    const data = {
      metrics: this.metrics,
      logs: this.logs.slice(-100),
      performance: this.performance.slice(-100),
      timestamp: new Date().toISOString(),
    };
    this.metrics = [];
    this.logs = [];
    this.performance = [];
    return data as unknown as void;
  }

  private addLog(
    level: LogEntry["level"],
    message: string,
    context?: Record<string, unknown>,
    requestId?: string,
    userId?: string
  ): void {
    this.logs.push({
      level,
      message,
      context,
      timestamp: Date.now(),
      requestId,
      userId,
    });
    this.trimLogs();
  }

  private trimLogs(): void {
    if (this.logs.length > this.maxEntries) {
      this.logs = this.logs.slice(-this.maxEntries);
    }
  }

  private trimMetrics(): void {
    if (this.metrics.length > this.maxEntries) {
      this.metrics = this.metrics.slice(-this.maxEntries);
    }
  }

  private trimPerformance(): void {
    if (this.performance.length > this.maxEntries) {
      this.performance = this.performance.slice(-this.maxEntries);
    }
  }
}

export const monitoring = new MonitoringService();
export default monitoring;
