import { z } from "zod";

// ─── Configuration ───────────────────────────────────────────────────────────

export const AIProviderConfigSchema = z.object({
  openai: z
    .object({
      apiKey: z.string().optional(),
      baseUrl: z.string().url().default("https://api.openai.com/v1"),
      defaultModel: z.string().default("gpt-4o"),
      maxTokens: z.number().min(1).max(128000).default(4096),
      temperature: z.number().min(0).max(2).default(0.7),
    })
    .optional(),
  anthropic: z
    .object({
      apiKey: z.string().optional(),
      baseUrl: z.string().url().default("https://api.anthropic.com"),
      defaultModel: z.string().default("claude-sonnet-4-20250514"),
      maxTokens: z.number().min(1).max(200000).default(4096),
      temperature: z.number().min(0).max(1).default(0.7),
    })
    .optional(),
  gemini: z
    .object({
      apiKey: z.string().optional(),
      baseUrl: z
        .string()
        .url()
        .default("https://generativelanguage.googleapis.com/v1beta"),
      defaultModel: z.string().default("gemini-2.0-flash"),
      maxTokens: z.number().min(1).max(1048576).default(4096),
      temperature: z.number().min(0).max(2).default(0.7),
    })
    .optional(),
  defaultProvider: z
    .enum(["openai", "anthropic", "gemini"])
    .default("openai"),
  retryAttempts: z.number().min(0).max(10).default(3),
  retryDelayMs: z.number().min(0).max(30000).default(1000),
  timeoutMs: z.number().min(1000).max(300000).default(60000),
});

export type AIProviderConfig = z.infer<typeof AIProviderConfigSchema>;

// ─── Message Types ───────────────────────────────────────────────────────────

export interface AIMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface AICompletionOptions {
  model?: string;
  maxTokens?: number;
  temperature?: number;
  topP?: number;
  frequencyPenalty?: number;
  presencePenalty?: number;
  stopSequences?: string[];
  stream?: boolean;
}

export interface AICompletionResult {
  content: string;
  model: string;
  provider: AIProvider;
  usage: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  finishReason: "stop" | "length" | "content_filter" | "error";
  latencyMs: number;
}

export interface AIStreamChunk {
  delta: string;
  finishReason?: AICompletionResult["finishReason"];
}

// ─── Provider Interface ──────────────────────────────────────────────────────

export interface AIProviderAdapter {
  readonly provider: AIProvider;
  readonly models: string[];

  complete(
    messages: AIMessage[],
    options?: AICompletionOptions,
  ): Promise<AICompletionResult>;

  stream(
    messages: AIMessage[],
    options?: AICompletionOptions,
  ): AsyncGenerator<AIStreamChunk, void, unknown>;

  estimateTokens(text: string): number;
  maxContextLength(model?: string): number;
}

export type AIProvider = "openai" | "anthropic" | "gemini";

// ─── OpenAI Adapter ──────────────────────────────────────────────────────────

class OpenAIAdapter implements AIProviderAdapter {
  readonly provider = "openai" as const;
  readonly models = [
    "gpt-4o",
    "gpt-4o-mini",
    "gpt-4-turbo",
    "gpt-4",
    "gpt-3.5-turbo",
  ];

  constructor(private config: NonNullable<AIProviderConfig["openai"]>) {}

  async complete(
    messages: AIMessage[],
    options?: AICompletionOptions,
  ): Promise<AICompletionResult> {
    const startTime = Date.now();
    const model = options?.model ?? this.config.defaultModel;

    const response = await fetch(`${this.config.baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.config.apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: messages.map((m) => ({
          role: m.role,
          content: m.content,
        })),
        max_tokens: options?.maxTokens ?? this.config.maxTokens,
        temperature: options?.temperature ?? this.config.temperature,
        top_p: options?.topP,
        frequency_penalty: options?.frequencyPenalty,
        presence_penalty: options?.presencePenalty,
        stop: options?.stopSequences,
      }),
      signal: AbortSignal.timeout(60000),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      throw new AIProviderError(
        `OpenAI API error: ${response.status} ${response.statusText}`,
        this.provider,
        response.status,
        errorBody,
      );
    }

    const data = await response.json();
    const choice = data.choices?.[0];

    return {
      content: choice?.message?.content ?? "",
      model: data.model,
      provider: this.provider,
      usage: {
        promptTokens: data.usage?.prompt_tokens ?? 0,
        completionTokens: data.usage?.completion_tokens ?? 0,
        totalTokens: data.usage?.total_tokens ?? 0,
      },
      finishReason: this.mapFinishReason(choice?.finish_reason),
      latencyMs: Date.now() - startTime,
    };
  }

  async *stream(
    messages: AIMessage[],
    options?: AICompletionOptions,
  ): AsyncGenerator<AIStreamChunk, void, unknown> {
    const model = options?.model ?? this.config.defaultModel;

    const response = await fetch(`${this.config.baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.config.apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: messages.map((m) => ({
          role: m.role,
          content: m.content,
        })),
        max_tokens: options?.maxTokens ?? this.config.maxTokens,
        temperature: options?.temperature ?? this.config.temperature,
        stream: true,
      }),
      signal: AbortSignal.timeout(120000),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      throw new AIProviderError(
        `OpenAI streaming error: ${response.status}`,
        this.provider,
        response.status,
        errorBody,
      );
    }

    const reader = response.body?.getReader();
    if (!reader) throw new AIProviderError("No response body", this.provider);

    const decoder = new TextDecoder();
    let buffer = "";

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed || !trimmed.startsWith("data: ")) continue;
          const payload = trimmed.slice(6);
          if (payload === "[DONE]") return;

          try {
            const parsed = JSON.parse(payload);
            const delta = parsed.choices?.[0]?.delta?.content;
            if (delta) {
              yield {
                delta,
                finishReason: parsed.choices?.[0]?.finish_reason
                  ? this.mapFinishReason(parsed.choices[0].finish_reason)
                  : undefined,
              };
            }
          } catch {
            // skip malformed chunks
          }
        }
      }
    } finally {
      reader.releaseLock();
    }
  }

  estimateTokens(text: string): number {
    return Math.ceil(text.length / 4);
  }

  maxContextLength(model?: string): number {
    const contextMap: Record<string, number> = {
      "gpt-4o": 128000,
      "gpt-4o-mini": 128000,
      "gpt-4-turbo": 128000,
      "gpt-4": 8192,
      "gpt-3.5-turbo": 16385,
    };
    return contextMap[model ?? this.config.defaultModel] ?? 128000;
  }

  private mapFinishReason(
    reason: string | undefined,
  ): AICompletionResult["finishReason"] {
    switch (reason) {
      case "stop":
        return "stop";
      case "length":
        return "length";
      case "content_filter":
        return "content_filter";
      default:
        return "stop";
    }
  }
}

// ─── Anthropic Adapter ───────────────────────────────────────────────────────

class AnthropicAdapter implements AIProviderAdapter {
  readonly provider = "anthropic" as const;
  readonly models = [
    "claude-sonnet-4-20250514",
    "claude-3-5-haiku-20241022",
    "claude-3-opus-20240229",
    "claude-3-haiku-20240307",
  ];

  constructor(private config: NonNullable<AIProviderConfig["anthropic"]>) {}

  async complete(
    messages: AIMessage[],
    options?: AICompletionOptions,
  ): Promise<AICompletionResult> {
    const startTime = Date.now();
    const model = options?.model ?? this.config.defaultModel;

    let systemPrompt = "";
    const userMessages: { role: "user" | "assistant"; content: string }[] = [];

    for (const msg of messages) {
      if (msg.role === "system") {
        systemPrompt = msg.content;
      } else {
        userMessages.push({
          role: msg.role as "user" | "assistant",
          content: msg.content,
        });
      }
    }

    const response = await fetch(
      `${this.config.baseUrl}/v1/messages`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": this.config.apiKey ?? "",
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({
          model,
          max_tokens: options?.maxTokens ?? this.config.maxTokens,
          temperature: options?.temperature ?? this.config.temperature,
          top_p: options?.topP,
          system: systemPrompt || undefined,
          messages: userMessages,
          stop_sequences: options?.stopSequences,
        }),
        signal: AbortSignal.timeout(60000),
      },
    );

    if (!response.ok) {
      const errorBody = await response.text();
      throw new AIProviderError(
        `Anthropic API error: ${response.status} ${response.statusText}`,
        this.provider,
        response.status,
        errorBody,
      );
    }

    const data = await response.json();
    const contentBlock = data.content?.find(
      (b: { type: string }) => b.type === "text",
    );

    return {
      content: contentBlock?.text ?? "",
      model: data.model,
      provider: this.provider,
      usage: {
        promptTokens: data.usage?.input_tokens ?? 0,
        completionTokens: data.usage?.output_tokens ?? 0,
        totalTokens:
          (data.usage?.input_tokens ?? 0) + (data.usage?.output_tokens ?? 0),
      },
      finishReason: data.stop_reason === "end_turn" ? "stop" : "length",
      latencyMs: Date.now() - startTime,
    };
  }

  async *stream(
    messages: AIMessage[],
    options?: AICompletionOptions,
  ): AsyncGenerator<AIStreamChunk, void, unknown> {
    const model = options?.model ?? this.config.defaultModel;

    let systemPrompt = "";
    const userMessages: { role: "user" | "assistant"; content: string }[] = [];

    for (const msg of messages) {
      if (msg.role === "system") {
        systemPrompt = msg.content;
      } else {
        userMessages.push({
          role: msg.role as "user" | "assistant",
          content: msg.content,
        });
      }
    }

    const response = await fetch(
      `${this.config.baseUrl}/v1/messages`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": this.config.apiKey ?? "",
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({
          model,
          max_tokens: options?.maxTokens ?? this.config.maxTokens,
          temperature: options?.temperature ?? this.config.temperature,
          system: systemPrompt || undefined,
          messages: userMessages,
          stream: true,
        }),
        signal: AbortSignal.timeout(120000),
      },
    );

    if (!response.ok) {
      const errorBody = await response.text();
      throw new AIProviderError(
        `Anthropic streaming error: ${response.status}`,
        this.provider,
        response.status,
        errorBody,
      );
    }

    const reader = response.body?.getReader();
    if (!reader) throw new AIProviderError("No response body", this.provider);

    const decoder = new TextDecoder();
    let buffer = "";

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed || !trimmed.startsWith("data: ")) continue;

          try {
            const parsed = JSON.parse(trimmed.slice(6));
            if (parsed.type === "content_block_delta") {
              yield { delta: parsed.delta?.text ?? "" };
            } else if (parsed.type === "message_stop") {
              return;
            }
          } catch {
            // skip malformed chunks
          }
        }
      }
    } finally {
      reader.releaseLock();
    }
  }

  estimateTokens(text: string): number {
    return Math.ceil(text.length / 3.5);
  }

  maxContextLength(model?: string): number {
    const contextMap: Record<string, number> = {
      "claude-sonnet-4-20250514": 200000,
      "claude-3-5-haiku-20241022": 200000,
      "claude-3-opus-20240229": 200000,
      "claude-3-haiku-20240307": 200000,
    };
    return contextMap[model ?? this.config.defaultModel] ?? 200000;
  }
}

// ─── Gemini Adapter ──────────────────────────────────────────────────────────

class GeminiAdapter implements AIProviderAdapter {
  readonly provider = "gemini" as const;
  readonly models = [
    "gemini-2.0-flash",
    "gemini-2.0-pro",
    "gemini-1.5-pro",
    "gemini-1.5-flash",
  ];

  constructor(private config: NonNullable<AIProviderConfig["gemini"]>) {}

  async complete(
    messages: AIMessage[],
    options?: AICompletionOptions,
  ): Promise<AICompletionResult> {
    const startTime = Date.now();
    const model = options?.model ?? this.config.defaultModel;

    let systemInstruction = "";
    const contents: { role: string; parts: { text: string }[] }[] = [];

    for (const msg of messages) {
      if (msg.role === "system") {
        systemInstruction = msg.content;
      } else {
        contents.push({
          role: msg.role === "assistant" ? "model" : "user",
          parts: [{ text: msg.content }],
        });
      }
    }

    const response = await fetch(
      `${this.config.baseUrl}/models/${model}:generateContent?key=${this.config.apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents,
          systemInstruction: systemInstruction
            ? { parts: [{ text: systemInstruction }] }
            : undefined,
          generationConfig: {
            maxOutputTokens: options?.maxTokens ?? this.config.maxTokens,
            temperature: options?.temperature ?? this.config.temperature,
            topP: options?.topP,
            stopSequences: options?.stopSequences,
          },
        }),
        signal: AbortSignal.timeout(60000),
      },
    );

    if (!response.ok) {
      const errorBody = await response.text();
      throw new AIProviderError(
        `Gemini API error: ${response.status} ${response.statusText}`,
        this.provider,
        response.status,
        errorBody,
      );
    }

    const data = await response.json();
    const text =
      data.candidates?.[0]?.content?.parts
        ?.map((p: { text: string }) => p.text)
        .join("") ?? "";

    return {
      content: text,
      model,
      provider: this.provider,
      usage: {
        promptTokens: data.usageMetadata?.promptTokenCount ?? 0,
        completionTokens: data.usageMetadata?.candidatesTokenCount ?? 0,
        totalTokens: data.usageMetadata?.totalTokenCount ?? 0,
      },
      finishReason:
        data.candidates?.[0]?.finishReason === "STOP" ? "stop" : "length",
      latencyMs: Date.now() - startTime,
    };
  }

  async *stream(
    messages: AIMessage[],
    options?: AICompletionOptions,
  ): AsyncGenerator<AIStreamChunk, void, unknown> {
    const model = options?.model ?? this.config.defaultModel;

    let systemInstruction = "";
    const contents: { role: string; parts: { text: string }[] }[] = [];

    for (const msg of messages) {
      if (msg.role === "system") {
        systemInstruction = msg.content;
      } else {
        contents.push({
          role: msg.role === "assistant" ? "model" : "user",
          parts: [{ text: msg.content }],
        });
      }
    }

    const response = await fetch(
      `${this.config.baseUrl}/models/${model}:streamGenerateContent?alt=sse&key=${this.config.apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents,
          systemInstruction: systemInstruction
            ? { parts: [{ text: systemInstruction }] }
            : undefined,
          generationConfig: {
            maxOutputTokens: options?.maxTokens ?? this.config.maxTokens,
            temperature: options?.temperature ?? this.config.temperature,
          },
        }),
        signal: AbortSignal.timeout(120000),
      },
    );

    if (!response.ok) {
      const errorBody = await response.text();
      throw new AIProviderError(
        `Gemini streaming error: ${response.status}`,
        this.provider,
        response.status,
        errorBody,
      );
    }

    const reader = response.body?.getReader();
    if (!reader) throw new AIProviderError("No response body", this.provider);

    const decoder = new TextDecoder();
    let buffer = "";

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed || !trimmed.startsWith("data: ")) continue;

          try {
            const parsed = JSON.parse(trimmed.slice(6));
            const text =
              parsed.candidates?.[0]?.content?.parts
                ?.map((p: { text: string }) => p.text)
                .join("") ?? "";
            if (text) {
              yield {
                delta: text,
                finishReason:
                  parsed.candidates?.[0]?.finishReason === "STOP"
                    ? "stop"
                    : undefined,
              };
            }
          } catch {
            // skip malformed chunks
          }
        }
      }
    } finally {
      reader.releaseLock();
    }
  }

  estimateTokens(text: string): number {
    return Math.ceil(text.length / 4);
  }

  maxContextLength(model?: string): number {
    const contextMap: Record<string, number> = {
      "gemini-2.0-flash": 1048576,
      "gemini-2.0-pro": 2097152,
      "gemini-1.5-pro": 2097152,
      "gemini-1.5-flash": 1048576,
    };
    return contextMap[model ?? this.config.defaultModel] ?? 1048576;
  }
}

// ─── Error Class ─────────────────────────────────────────────────────────────

export class AIProviderError extends Error {
  constructor(
    message: string,
    public provider: AIProvider,
    public statusCode?: number,
    public responseBody?: string,
  ) {
    super(message);
    this.name = "AIProviderError";
  }

  get isRateLimited(): boolean {
    return this.statusCode === 429;
  }

  get isUnauthorized(): boolean {
    return this.statusCode === 401 || this.statusCode === 403;
  }

  get isServerError(): boolean {
    return (this.statusCode ?? 0) >= 500;
  }
}

// ─── Client ──────────────────────────────────────────────────────────────────

export class AIClient {
  private adapters: Map<AIProvider, AIProviderAdapter> = new Map();
  private config: AIProviderConfig;
  private requestCount = 0;
  private totalTokensUsed = 0;

  constructor(config?: Partial<AIProviderConfig>) {
    this.config = AIProviderConfigSchema.parse(config ?? {});

    if (this.config.openai) {
      this.adapters.set("openai", new OpenAIAdapter(this.config.openai));
    }
    if (this.config.anthropic) {
      this.adapters.set(
        "anthropic",
        new AnthropicAdapter(this.config.anthropic),
      );
    }
    if (this.config.gemini) {
      this.adapters.set("gemini", new GeminiAdapter(this.config.gemini));
    }
  }

  getProvider(provider?: AIProvider): AIProviderAdapter {
    const target = provider ?? this.config.defaultProvider;
    const adapter = this.adapters.get(target);
    if (!adapter) {
      throw new AIProviderError(
        `Provider "${target}" is not configured. Available: ${Array.from(this.adapters.keys()).join(", ")}`,
        target,
      );
    }
    return adapter;
  }

  async complete(
    messages: AIMessage[],
    options?: AICompletionOptions & { provider?: AIProvider },
  ): Promise<AICompletionResult> {
    const provider = this.getProvider(options?.provider);
    let lastError: Error | undefined;

    for (let attempt = 0; attempt <= this.config.retryAttempts; attempt++) {
      try {
        const result = await provider.complete(messages, options);
        this.requestCount++;
        this.totalTokensUsed += result.usage.totalTokens;
        return result;
      } catch (error) {
        lastError = error as Error;

        if (error instanceof AIProviderError) {
          if (!error.isRateLimited && !error.isServerError) {
            throw error;
          }
        }

        if (attempt < this.config.retryAttempts) {
          const delay =
            this.config.retryDelayMs * Math.pow(2, attempt) +
            Math.random() * 500;
          await new Promise((resolve) => setTimeout(resolve, delay));
        }
      }
    }

    throw lastError;
  }

  async *stream(
    messages: AIMessage[],
    options?: AICompletionOptions & { provider?: AIProvider },
  ): AsyncGenerator<AIStreamChunk, void, unknown> {
    const provider = this.getProvider(options?.provider);
    yield* provider.stream(messages, options);
  }

  async chat(
    userMessage: string,
    context?: {
      systemPrompt?: string;
      history?: AIMessage[];
      provider?: AIProvider;
      model?: string;
    },
  ): Promise<string> {
    const messages: AIMessage[] = [];

    if (context?.systemPrompt) {
      messages.push({ role: "system", content: context.systemPrompt });
    }

    if (context?.history) {
      messages.push(...context.history);
    }

    messages.push({ role: "user", content: userMessage });

    const result = await this.complete(messages, {
      provider: context?.provider,
      model: context?.model,
    });

    return result.content;
  }

  getStats() {
    return {
      requestCount: this.requestCount,
      totalTokensUsed: this.totalTokensUsed,
      configuredProviders: Array.from(this.adapters.keys()),
      defaultProvider: this.config.defaultProvider,
    };
  }

  configureProvider(
    provider: AIProvider,
    config: AIProviderConfig[AIProvider],
  ): void {
    switch (provider) {
      case "openai":
        if (config) {
          this.adapters.set(
            "openai",
            new OpenAIAdapter(
              config as NonNullable<AIProviderConfig["openai"]>,
            ),
          );
        }
        break;
      case "anthropic":
        if (config) {
          this.adapters.set(
            "anthropic",
            new AnthropicAdapter(
              config as NonNullable<AIProviderConfig["anthropic"]>,
            ),
          );
        }
        break;
      case "gemini":
        if (config) {
          this.adapters.set(
            "gemini",
            new GeminiAdapter(
              config as NonNullable<AIProviderConfig["gemini"]>,
            ),
          );
        }
        break;
    }
  }
}

// ─── Singleton ───────────────────────────────────────────────────────────────

let globalClient: AIClient | null = null;

export function getAIClient(config?: Partial<AIProviderConfig>): AIClient {
  if (!globalClient) {
    globalClient = new AIClient({
      openai: { apiKey: process.env.OPENAI_API_KEY },
      anthropic: { apiKey: process.env.ANTHROPIC_API_KEY },
      gemini: { apiKey: process.env.GEMINI_API_KEY },
      defaultProvider:
        (process.env.DEFAULT_AI_PROVIDER as AIProvider) ?? "openai",
      ...config,
    });
  }
  return globalClient;
}

export function resetAIClient(): void {
  globalClient = null;
}
