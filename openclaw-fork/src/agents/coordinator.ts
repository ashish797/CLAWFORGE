/**
 * Coordinator for CLAWFORGE
 * 
 * Parallel task execution with isolation.
 * Inspired by Claude Code's Coordinator Mode.
 * 
 * Lead agent breaks task into sub-tasks.
 * Each sub-task runs in an isolated environment.
 * Results aggregated back.
 * 
 * Git worktrees provide isolation:
 * - Each worker gets its own branch
 * - Workers don't interfere with each other
 * - Results merged back to main
 */

import { UltraPlanManager, type PlanPhase } from "./ultra-plan.js";

// ============================================================================
// Types
// ============================================================================

export interface WorkerTask {
  /** Task ID */
  id: string;
  /** Task description */
  description: string;
  /** Assigned worker */
  workerId: string;
  /** Git worktree path */
  worktreePath?: string;
  /** Status */
  status: "pending" | "running" | "completed" | "failed";
  /** Result if completed */
  result?: string;
  /** Error if failed */
  error?: string;
  /** Started at */
  startedAt?: string;
  /** Completed at */
  completedAt?: string;
}

export interface CoordinatorConfig {
  /** Maximum parallel workers */
  maxWorkers: number;
  /** Git repository path for worktrees */
  repoPath: string;
  /** Worktree base directory */
  worktreeBase: string;
}

// ============================================================================
// Coordinator
// ============================================================================

export class Coordinator {
  private planManager: UltraPlanManager;
  private workers: Map<string, WorkerTask> = new Map();
  private config: CoordinatorConfig;
  private nextWorkerId: number = 1;

  constructor(config: Partial<CoordinatorConfig> = {}) {
    this.config = {
      maxWorkers: config.maxWorkers ?? 5,
      repoPath: config.repoPath ?? ".",
      worktreeBase: config.worktreeBase ?? "/tmp/clawforge-worktrees",
    };
    this.planManager = new UltraPlanManager();
  }

  /**
   * Start coordinating a complex task.
   */
  async coordinate(task: string): Promise<{
    planId: string;
    initialPhases: PlanPhase[];
  }> {
    // Start planning
    const plan = this.planManager.startPlan(task);

    // Return plan for the lead agent to fill in phases
    return {
      planId: plan.id,
      initialPhases: [],
    };
  }

  /**
   * Add phases and start parallel execution.
   */
  async executeParallel(
    planId: string,
    phases: Omit<PlanPhase, "status">[],
  ): Promise<WorkerTask[]> {
    // Add phases to plan
    this.planManager.addPhases(planId, phases);
    this.planManager.startExecution(planId);

    // Get executable phases (no unmet dependencies)
    const executable = this.planManager.getExecutablePhases(planId);

    // Create workers for parallel execution
    const tasks: WorkerTask[] = [];
    const workersToSpawn = Math.min(executable.length, this.config.maxWorkers);

    for (let i = 0; i < workersToSpawn; i++) {
      const phase = executable[i];
      const workerId = `worker-${this.nextWorkerId++}`;

      const task: WorkerTask = {
        id: `task-${phase.number}`,
        description: phase.description,
        workerId,
        status: "pending",
      };

      this.workers.set(task.id, task);
      tasks.push(task);
    }

    return tasks;
  }

  /**
   * Mark a worker task as running.
   */
  startTask(taskId: string): WorkerTask | null {
    const task = this.workers.get(taskId);
    if (!task) return null;

    task.status = "running";
    task.startedAt = new Date().toISOString();
    return task;
  }

  /**
   * Complete a worker task.
   */
  completeTask(taskId: string, result: string): WorkerTask | null {
    const task = this.workers.get(taskId);
    if (!task) return null;

    task.status = "completed";
    task.result = result;
    task.completedAt = new Date().toISOString();
    return task;
  }

  /**
   * Fail a worker task.
   */
  failTask(taskId: string, error: string): WorkerTask | null {
    const task = this.workers.get(taskId);
    if (!task) return null;

    task.status = "failed";
    task.error = error;
    task.completedAt = new Date().toISOString();
    return task;
  }

  /**
   * Get all tasks.
   */
  getTasks(): WorkerTask[] {
    return Array.from(this.workers.values());
  }

  /**
   * Get running tasks.
   */
  getRunningTasks(): WorkerTask[] {
    return this.getTasks().filter(t => t.status === "running");
  }

  /**
   * Get completed tasks.
   */
  getCompletedTasks(): WorkerTask[] {
    return this.getTasks().filter(t => t.status === "completed");
  }

  /**
   * Check if all tasks are done.
   */
  allDone(): boolean {
    const tasks = this.getTasks();
    return tasks.length > 0 && tasks.every(t => t.status === "completed" || t.status === "failed");
  }

  /**
   * Aggregate results from all completed tasks.
   */
  aggregateResults(): string {
    const completed = this.getCompletedTasks();
    if (completed.length === 0) return "No completed tasks.";

    const results = completed.map(t => `## ${t.description}\n\n${t.result}`);
    return results.join("\n\n---\n\n");
  }

  /**
   * Get status string for Telegram.
   */
  getStatusString(): string {
    const tasks = this.getTasks();
    if (tasks.length === 0) return "No workers active.";

    const lines = tasks.map(t => {
      const emoji = { pending: "⬜", running: "🔄", completed: "✅", failed: "❌" }[t.status];
      return `${emoji} ${t.workerId}: ${t.description.slice(0, 50)}`;
    });

    const completed = tasks.filter(t => t.status === "completed").length;
    lines.push(`\nProgress: ${completed}/${tasks.length} workers done`);

    return lines.join("\n");
  }

  /**
   * Clean up worktrees.
   */
  async cleanup(): Promise<void> {
    // Remove all worktrees
    for (const task of this.workers.values()) {
      if (task.worktreePath) {
        // In production: exec `git worktree remove ${task.worktreePath}`
        console.log(`[Coordinator] Cleanup: ${task.worktreePath}`);
      }
    }
  }
}
