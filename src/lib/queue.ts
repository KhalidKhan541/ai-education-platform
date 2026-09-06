import { Queue, QueueEvents, Worker, Job, JobsOptions } from "bullmq";
import { getRedisClient, closeRedis } from "./cache";

const QUEUE_PREFIX = "aiedu:queue:";
const DEFAULT_CONCURRENCY = 5;
const DEFAULT_JOB_OPTIONS: JobsOptions = {
  attempts: 3,
  backoff: { type: "exponential", delay: 1000 },
  removeOnComplete: { age: 86400, count: 100 },
  removeOnFail: { age: 604800, count: 50 },
};

export interface QueueConfig {
  name: string;
  concurrency?: number;
  limiter?: {
    max: number;
    duration: number;
  };
}

export interface JobData {
  [key: string]: unknown;
}

export interface JobProgress {
  total: number;
  completed: number;
  percentage: number;
  message?: string;
}

// Queue registry
const queues = new Map<string, Queue>();
const workers = new Map<string, Worker>();
const queueEvents = new Map<string, QueueEvents>();

function getQueueConnection() {
  return getRedisClient().duplicate();
}

export function createQueue(name: string): Queue {
  if (queues.has(name)) return queues.get(name)!;

  const connection = getQueueConnection();
  const queue = new Queue(`${QUEUE_PREFIX}${name}`, {
    connection,
    defaultJobOptions: DEFAULT_JOB_OPTIONS,
  });

  queues.set(name, queue);
  return queue;
}

export async function closeQueues(): Promise<void> {
  for (const worker of workers.values()) {
    await worker.close();
  }
  for (const queueEvents of queueEvents.values()) {
    await queueEvents.close();
  }
  for (const queue of queues.values()) {
    await queue.close();
  }
  workers.clear();
  queues.clear();
  queueEvents.clear();
}

// Job operations
export async function addJob<T extends JobData>(
  queueName: string,
  jobName: string,
  data: T,
  options: JobsOptions = {}
): Promise<Job<T>> {
  const queue = createQueue(queueName);
  const mergedOptions = { ...DEFAULT_JOB_OPTIONS, ...options };
  return queue.add(jobName, data, mergedOptions);
}

export async function addBulkJobs<T extends JobData>(
  queueName: string,
  jobName: string,
  dataList: T[],
  options: JobsOptions = {}
): Promise<Job<T>[]> {
  const queue = createQueue(queueName);
  const mergedOptions = { ...DEFAULT_JOB_OPTIONS, ...options };
  const jobs = dataList.map((data) => ({
    name: jobName,
    data,
    opts: mergedOptions,
  }));
  return queue.addBulk(jobs);
}

export async function getJob<T extends JobData>(
  queueName: string,
  jobId: string
): Promise<Job<T> | null> {
  const queue = createQueue(queueName);
  return queue.getJob(jobId) as Promise<Job<T> | null>;
}

export async function getJobsByState<T extends JobData>(
  queueName: string,
  states: string[]
): Promise<Job<T>[]> {
  const queue = createQueue(queueName);
  return queue.getJobs(states as never[]) as Promise<Job<T>[]>;
}

export async function removeJob(
  queueName: string,
  jobId: string
): Promise<void> {
  const queue = createQueue(queueName);
  const job = await queue.getJob(jobId);
  if (job) await job.remove();
}

export async function retryJob(
  queueName: string,
  jobId: string
): Promise<void> {
  const queue = createQueue(queueName);
  const job = await queue.getJob(jobId);
  if (job) await job.retry();
}

// Worker creation
export function createWorker<T extends JobData>(
  config: QueueConfig,
  processor: (job: Job<T>) => Promise<unknown>,
  onError?: (error: Error, job: Job<T>) => void
): Worker {
  const existingWorker = workers.get(config.name);
  if (existingWorker) return existingWorker;

  const connection = getQueueConnection();
  const worker = new Worker<T>(
    `${QUEUE_PREFIX}${config.name}`,
    processor,
    {
      connection,
      concurrency: config.concurrency || DEFAULT_CONCURRENCY,
      limiter: config.limiter,
    }
  );

  if (onError) {
    worker.on("failed", (job, err) => {
      if (job) onError(err, job);
    });
  }

  worker.on("error", (err) => {
    console.error(`[Queue:${config.name}] Worker error:`, err.message);
  });

  workers.set(config.name, worker);
  return worker;
}

// Queue events
export function attachQueueEvents(
  queueName: string,
  handlers: {
    onCompleted?: (job: Job) => void;
    onFailed?: (job: Job | undefined, error: Error) => void;
    onStalled?: (jobId: string) => void;
    onProgress?: (job: Job, progress: number | JobProgress) => void;
    onWaiting?: (jobId: string) => void;
    onActive?: (job: Job) => void;
    onDelayed?: (jobId: string) => void;
  }
): () => void {
  const connection = getQueueConnection();
  const events = new QueueEvents(`${QUEUE_PREFIX}${queueName}`, { connection });

  if (handlers.onCompleted)
    events.on("completed", ({ jobId }) => {
      getJob(queueName, jobId).then((job) => {
        if (job && handlers.onCompleted) handlers.onCompleted(job);
      });
    });
  if (handlers.onFailed)
    events.on("failed", ({ jobId, failedReason }) => {
      getJob(queueName, jobId).then((job) => {
        if (handlers.onFailed)
          handlers.onFailed(job, new Error(failedReason));
      });
    });
  if (handlers.onStalled) events.on("stalled", ({ jobId }) => handlers.onStalled!(jobId));
  if (handlers.onWaiting) events.on("waiting", ({ jobId }) => handlers.onWaiting!(jobId));

  queueEvents.set(queueName, events);
  return () => events.close();
}

// Queue stats
export async function getQueueStats(
  queueName: string
): Promise<{
  waiting: number;
  active: number;
  completed: number;
  failed: number;
  delayed: number;
  paused: number;
}> {
  const queue = createQueue(queueName);
  const [waiting, active, completed, failed, delayed, paused] = await Promise.all([
    queue.getWaitingCount(),
    queue.getActiveCount(),
    queue.getCompletedCount(),
    queue.getFailedCount(),
    queue.getDelayedCount(),
    queue.getPausedCount(),
  ]);
  return { waiting, active, completed, failed, delayed, paused };
}

export async function pauseQueue(queueName: string): Promise<void> {
  const queue = createQueue(queueName);
  await queue.pause();
}

export async function resumeQueue(queueName: string): Promise<void> {
  const queue = createQueue(queueName);
  await queue.resume();
}

export async function cleanQueue(
  queueName: string,
  graceMs = 5000
): Promise<void> {
  const queue = createQueue(queueName);
  await queue.clean(graceMs, 100, "completed");
  await queue.clean(graceMs, 100, "failed");
}

export async function obliterateQueue(queueName: string): Promise<void> {
  const queue = createQueue(queueName);
  await queue.obliterate({ force: true });
  queues.delete(queueName);
}

// Delayed jobs
export async function addDelayedJob<T extends JobData>(
  queueName: string,
  jobName: string,
  data: T,
  delayMs: number,
  options: JobsOptions = {}
): Promise<Job<T>> {
  return addJob(queueName, jobName, data, { ...options, delay: delayMs });
}

// Repeatable jobs (cron)
export async function addRepeatableJob<T extends JobData>(
  queueName: string,
  jobName: string,
  data: T,
  cronExpression: string,
  options: JobsOptions = {}
): Promise<Job<T> | null> {
  const queue = createQueue(queueName);
  return queue.add(jobName, data, {
    ...options,
    repeat: { cron: cronExpression },
  }) as Promise<Job<T> | null>;
}

export async function removeRepeatableJob(
  queueName: string,
  jobId: string
): Promise<void> {
  const queue = createQueue(queueName);
  const job = await queue.getJob(jobId);
  if (job && job.opts.repeat) {
    await queue.removeRepeatable(
      job.name!,
      job.opts.repeat as { cron: string }
    );
  }
}
