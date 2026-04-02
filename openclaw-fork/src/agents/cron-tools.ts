/**
 * Cron Tools for CLAWFORGE
 * 
 * Agent-managed scheduling. Agents can create, delete, and list cron jobs.
 * Interfaces with OpenClaw's existing cron system.
 */

// ============================================================================
// Types
// ============================================================================

export interface CronJob {
  /** Job ID */
  id: string;
  /** Job name */
  name: string;
  /** Cron schedule expression */
  schedule: string;
  /** Task to execute */
  task: string;
  /** Whether the job is enabled */
  enabled: boolean;
  /** Created at */
  createdAt: string;
  /** Last run */
  lastRun?: string;
  /** Next run */
  nextRun?: string;
}

// ============================================================================
// Cron Manager
// ============================================================================

export class CronManager {
  private jobs: Map<string, CronJob> = new Map();
  private nextId: number = 1;

  /**
   * Create a new cron job.
   */
  create(name: string, schedule: string, task: string): CronJob {
    const job: CronJob = {
      id: `cron-${this.nextId++}`,
      name,
      schedule,
      task,
      enabled: true,
      createdAt: new Date().toISOString(),
      nextRun: this.calculateNextRun(schedule),
    };

    this.jobs.set(job.id, job);
    return job;
  }

  /**
   * Delete a cron job.
   */
  delete(jobId: string): boolean {
    return this.jobs.delete(jobId);
  }

  /**
   * List all jobs.
   */
  list(): CronJob[] {
    return Array.from(this.jobs.values());
  }

  /**
   * Enable/disable a job.
   */
  toggle(jobId: string, enabled: boolean): CronJob | null {
    const job = this.jobs.get(jobId);
    if (!job) return null;
    job.enabled = enabled;
    return job;
  }

  /**
   * Get job by ID.
   */
  get(jobId: string): CronJob | null {
    return this.jobs.get(jobId) || null;
  }

  /**
   * Get formatted status for Telegram.
   */
  getStatusString(): string {
    const jobs = this.list();
    if (jobs.length === 0) return "No scheduled tasks.";

    const lines = jobs.map(j => {
      const status = j.enabled ? "✅" : "⏸️";
      return `${status} ${j.name} (${j.schedule})`;
    });

    return `**Scheduled Tasks:**\n${lines.join("\n")}`;
  }

  private calculateNextRun(schedule: string): string {
    // Simple next-run calculation (in production, use a cron parser)
    return new Date(Date.now() + 3600000).toISOString(); // +1 hour placeholder
  }
}
