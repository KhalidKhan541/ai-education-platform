export type EventHandler<T = unknown> = (data: T) => void;
export type EventFilter = (eventName: string) => boolean;

interface EventEntry {
  handler: EventHandler;
  once: boolean;
}

export class TypedEventEmitter<Events extends Record<string, unknown>> {
  private listeners = new Map<keyof Events, EventEntry[]>();
  private maxListeners = 20;

  on<K extends keyof Events>(
    event: K,
    handler: EventHandler<Events[K]>
  ): () => void {
    return this.addListener(event, handler, false);
  }

  once<K extends keyof Events>(
    event: K,
    handler: EventHandler<Events[K]>
  ): () => void {
    return this.addListener(event, handler, true);
  }

  private addListener<K extends keyof Events>(
    event: K,
    handler: EventHandler<Events[K]>,
    once: boolean
  ): () => void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }

    const entries = this.listeners.get(event)!;
    if (entries.length >= this.maxListeners) {
      console.warn(
        `[EventEmitter] Max listeners (${this.maxListeners}) exceeded for "${String(event)}"`
      );
    }

    entries.push({ handler: handler as EventHandler, once });

    return () => this.removeListener(event, handler as EventHandler);
  }

  off<K extends keyof Events>(event: K, handler: EventHandler<Events[K]>): void {
    this.removeListener(event, handler as EventHandler);
  }

  private removeListener(event: keyof Events, handler: EventHandler): void {
    const entries = this.listeners.get(event);
    if (!entries) return;

    const index = entries.findIndex((entry) => entry.handler === handler);
    if (index !== -1) {
      entries.splice(index, 1);
    }
    if (entries.length === 0) {
      this.listeners.delete(event);
    }
  }

  emit<K extends keyof Events>(event: K, data: Events[K]): void {
    const entries = this.listeners.get(event);
    if (!entries || entries.length === 0) return;

    const toRemove: EventEntry[] = [];

    for (const entry of entries) {
      try {
        entry.handler(data);
        if (entry.once) {
          toRemove.push(entry);
        }
      } catch (error) {
        console.error(`[EventEmitter] Error in handler for "${String(event)}":`, error);
      }
    }

    if (toRemove.length > 0) {
      for (const entry of toRemove) {
        const idx = entries.indexOf(entry);
        if (idx !== -1) entries.splice(idx, 1);
      }
      if (entries.length === 0) {
        this.listeners.delete(event);
      }
    }
  }

  removeAllListeners(event?: keyof Events): void {
    if (event) {
      this.listeners.delete(event);
    } else {
      this.listeners.clear();
    }
  }

  listenerCount(event: keyof Events): number {
    return this.listeners.get(event)?.length || 0;
  }

  eventNames(): (keyof Events)[] {
    return Array.from(this.listeners.keys());
  }

  setMaxListeners(n: number): void {
    this.maxListeners = n;
  }

  // Wait for an event (Promise-based)
  waitFor<K extends keyof Events>(
    event: K,
    timeoutMs?: number
  ): Promise<Events[K]> {
    return new Promise((resolve, reject) => {
      let timeout: ReturnType<typeof setTimeout> | undefined;
      const cleanup = this.once(event, (data) => {
        if (timeout) clearTimeout(timeout);
        resolve(data);
      });

      if (timeoutMs && timeoutMs > 0) {
        timeout = setTimeout(() => {
          cleanup();
          reject(new Error(`Timed out waiting for "${String(event)}"`));
        }, timeoutMs);
      }
    });
  }

  // Pipe events from another emitter
  pipe<OtherEvents extends Record<string, unknown>>(
    source: TypedEventEmitter<OtherEvents>,
    eventMap: Partial<Record<keyof OtherEvents, keyof Events>>
  ): () => void {
    const cleanups: Array<() => void> = [];

    for (const [sourceEvent, targetEvent] of Object.entries(eventMap) as Array<
      [keyof OtherEvents, keyof Events]
    >) {
      const cleanup = source.on(sourceEvent, (data) => {
        this.emit(targetEvent, data as Events[typeof targetEvent]);
      });
      cleanups.push(cleanup);
    }

    return () => cleanups.forEach((fn) => fn());
  }
}

// Pre-defined app events
export interface AppEvents {
  // Auth events
  "auth:login": { userId: string; email: string };
  "auth:logout": { reason?: string };
  "auth:token-refreshed": { expiresIn: number };

  // Course events
  "course:enrolled": { courseId: string; userId: string };
  "course:completed": { courseId: string; userId: string; grade?: number };
  "course:progress-updated": {
    courseId: string;
    userId: string;
    progress: number;
  };

  // Lesson events
  "lesson:started": { lessonId: string; courseId: string };
  "lesson:completed": { lessonId: string; courseId: string; duration: number };

  // Assignment events
  "assignment:submitted": {
    assignmentId: string;
    courseId: string;
    userId: string;
  };
  "assignment:graded": {
    assignmentId: string;
    courseId: string;
    userId: string;
    score: number;
  };

  // Quiz events
  "quiz:started": { quizId: string; courseId: string };
  "quiz:completed": { quizId: string; courseId: string; score: number };

  // Certificate events
  "certificate:issued": {
    certificateId: string;
    courseId: string;
    userId: string;
  };

  // Notification events
  "notification:new": { id: string; type: string; message: string };

  // UI events
  "ui:sidebar-toggle": { isOpen: boolean };
  "ui:theme-change": { theme: string };
  "ui:modal-open": { modalId: string };
  "ui:modal-close": { modalId: string };

  // Analytics events
  "analytics:event": {
    event: string;
    properties?: Record<string, unknown>;
  };
}

// Global event bus
export const appEvents = new TypedEventEmitter<AppEvents>();

// Browser event bridge (for cross-tab communication)
export class BrowserEventBridge {
  private channel: BroadcastChannel | null = null;
  private cleanup: (() => void)[] = [];

  constructor(channelName = "ai-education-events") {
    if (typeof BroadcastChannel !== "undefined") {
      this.channel = new BroadcastChannel(channelName);
      this.channel.onmessage = (event) => {
        try {
          const { eventName, data } = JSON.parse(event.data);
          appEvents.emit(eventName, data);
        } catch {
          // Ignore malformed messages
        }
      };
    }
  }

  broadcast<K extends keyof AppEvents>(
    eventName: K,
    data: AppEvents[K]
  ): void {
    if (!this.channel) return;
    try {
      this.channel.postMessage(
        JSON.stringify({ eventName, data })
      );
    } catch {
      // Ignore serialization errors
    }
  }

  close(): void {
    this.channel?.close();
    this.channel = null;
    this.cleanup.forEach((fn) => fn());
    this.cleanup = [];
  }
}

// Utility: debounce event emissions
export function createDebouncedEmitter<Events extends Record<string, unknown>>(
  emitter: TypedEventEmitter<Events>,
  delay = 300
): TypedEventEmitter<Events> {
  const debounced = new TypedEventEmitter<Events>();
  const pending = new Map<keyof Events, ReturnType<typeof setTimeout>>();

  for (const event of emitter.eventNames()) {
    emitter.on(event, (data) => {
      const existing = pending.get(event);
      if (existing) clearTimeout(existing);
      pending.set(
        event,
        setTimeout(() => {
          debounced.emit(event, data);
          pending.delete(event);
        }, delay)
      );
    });
  }

  return debounced;
}
