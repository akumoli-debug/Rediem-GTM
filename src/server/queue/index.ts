export type QueueJob<TPayload = Record<string, unknown>> = {
  id: string;
  name: string;
  payload: TPayload;
};

export type QueueJobStatus =
  | "queued"
  | "running"
  | "completed"
  | "failed"
  | "canceled";

export type QueueHandler<TPayload = Record<string, unknown>> = (
  job: QueueJob<TPayload>
) => Promise<void>;

export interface EnrichmentQueue<TPayload = Record<string, unknown>> {
  enqueue(job: QueueJob<TPayload>): Promise<QueueJob<TPayload>>;
  process(handler: QueueHandler<TPayload>): Promise<void>;
  getStatus(jobId: string): Promise<QueueJobStatus | undefined>;
}

export class InMemoryEnrichmentQueue<TPayload = Record<string, unknown>>
  implements EnrichmentQueue<TPayload>
{
  private jobs = new Map<string, QueueJob<TPayload>>();
  private statuses = new Map<string, QueueJobStatus>();

  async enqueue(job: QueueJob<TPayload>): Promise<QueueJob<TPayload>> {
    this.jobs.set(job.id, job);
    this.statuses.set(job.id, "queued");
    return job;
  }

  async process(handler: QueueHandler<TPayload>): Promise<void> {
    for (const job of this.jobs.values()) {
      if (this.statuses.get(job.id) !== "queued") {
        continue;
      }

      this.statuses.set(job.id, "running");

      try {
        await handler(job);
        this.statuses.set(job.id, "completed");
      } catch {
        this.statuses.set(job.id, "failed");
      }
    }
  }

  async getStatus(jobId: string): Promise<QueueJobStatus | undefined> {
    return this.statuses.get(jobId);
  }
}
