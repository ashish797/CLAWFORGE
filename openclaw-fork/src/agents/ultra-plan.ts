/**
 * UltraPlan for CLAWFORGE
 * 
 * Long planning sessions for complex tasks.
 * Inspired by Claude Code's hidden UltraPlan feature.
 * 
 * When a task is too complex for normal execution:
 * 1. Switch to high-capability model
 * 2. Enter planning mode (detailed breakdown)
 * 3. Execute plan in phases
 * 4. Report progress to user
 * 
 * For Telegram: sends updates periodically, not streaming.
 */

// ============================================================================
// Types
// ============================================================================

export interface UltraPlanConfig {
  /** Maximum planning time in seconds */
  maxPlanningTime: number;
  /** Model to use for planning (high-capability) */
  planningModel: string;
  /** Whether to show intermediate plans to user */
  showIntermediate: boolean;
  /** Update interval for progress (seconds) */
  updateInterval: number;
}

export const DEFAULT_ULTRAPLAN_CONFIG: UltraPlanConfig = {
  maxPlanningTime: 1800, // 30 minutes
  planningModel: "opus",
  showIntermediate: true,
  updateInterval: 60,
};

export interface PlanPhase {
  /** Phase number */
  number: number;
  /** Phase name */
  name: string;
  /** What this phase does */
  description: string;
  /** Dependencies (phase numbers this depends on) */
  dependencies: number[];
  /** Estimated duration */
  estimatedMinutes: number;
  /** Status */
  status: "pending" | "in_progress" | "completed" | "failed";
  /** Result if completed */
  result?: string;
}

export interface UltraPlan {
  /** Plan ID */
  id: string;
  /** Original task */
  task: string;
  /** Planning phases */
  phases: PlanPhase[];
  /** Overall status */
  status: "planning" | "executing" | "completed" | "failed";
  /** When planning started */
  startedAt: string;
  /** When planning completed */
  completedAt?: string;
  /** Planning model used */
  model: string;
}

// ============================================================================
// UltraPlan Manager
// ============================================================================

export class UltraPlanManager {
  private plans: Map<string, UltraPlan> = new Map();
  private config: UltraPlanConfig;

  constructor(config: Partial<UltraPlanConfig> = {}) {
    this.config = { ...DEFAULT_ULTRAPLAN_CONFIG, ...config };
  }

  /**
   * Start a new UltraPlan session.
   */
  startPlan(task: string): UltraPlan {
    const id = `plan-${Date.now()}`;
    const plan: UltraPlan = {
      id,
      task,
      phases: [],
      status: "planning",
      startedAt: new Date().toISOString(),
      model: this.config.planningModel,
    };

    this.plans.set(id, plan);
    return plan;
  }

  /**
   * Add phases to a plan.
   */
  addPhases(planId: string, phases: Omit<PlanPhase, "status">[]): UltraPlan | null {
    const plan = this.plans.get(planId);
    if (!plan) return null;

    for (const phase of phases) {
      plan.phases.push({ ...phase, status: "pending" });
    }

    return plan;
  }

  /**
   * Start executing a plan.
   */
  startExecution(planId: string): UltraPlan | null {
    const plan = this.plans.get(planId);
    if (!plan) return null;

    plan.status = "executing";
    return plan;
  }

  /**
   * Mark a phase as in progress.
   */
  startPhase(planId: string, phaseNumber: number): PlanPhase | null {
    const plan = this.plans.get(planId);
    if (!plan) return null;

    const phase = plan.phases.find(p => p.number === phaseNumber);
    if (!phase) return null;

    // Check dependencies
    for (const dep of phase.dependencies) {
      const depPhase = plan.phases.find(p => p.number === dep);
      if (!depPhase || depPhase.status !== "completed") {
        return null; // Dependencies not met
      }
    }

    phase.status = "in_progress";
    return phase;
  }

  /**
   * Complete a phase.
   */
  completePhase(planId: string, phaseNumber: number, result: string): PlanPhase | null {
    const plan = this.plans.get(planId);
    if (!plan) return null;

    const phase = plan.phases.find(p => p.number === phaseNumber);
    if (!phase) return null;

    phase.status = "completed";
    phase.result = result;

    // Check if all phases are done
    const allDone = plan.phases.every(p => p.status === "completed" || p.status === "failed");
    if (allDone) {
      plan.status = "completed";
      plan.completedAt = new Date().toISOString();
    }

    return phase;
  }

  /**
   * Fail a phase.
   */
  failPhase(planId: string, phaseNumber: number, reason: string): PlanPhase | null {
    const plan = this.plans.get(planId);
    if (!plan) return null;

    const phase = plan.phases.find(p => p.number === phaseNumber);
    if (!phase) return null;

    phase.status = "failed";
    phase.result = reason;
    plan.status = "failed";

    return phase;
  }

  /**
   * Get next executable phase (dependencies met).
   */
  getNextPhase(planId: string): PlanPhase | null {
    const plan = this.plans.get(planId);
    if (!plan) return null;

    for (const phase of plan.phases) {
      if (phase.status !== "pending") continue;

      const depsMet = phase.dependencies.every(dep => {
        const depPhase = plan.phases.find(p => p.number === dep);
        return depPhase?.status === "completed";
      });

      if (depsMet) return phase;
    }

    return null;
  }

  /**
   * Get all executable phases (for parallel execution).
   */
  getExecutablePhases(planId: string): PlanPhase[] {
    const plan = this.plans.get(planId);
    if (!plan) return [];

    return plan.phases.filter(phase => {
      if (phase.status !== "pending") return false;
      return phase.dependencies.every(dep => {
        const depPhase = plan.phases.find(p => p.number === dep);
        return depPhase?.status === "completed";
      });
    });
  }

  /**
   * Get plan status.
   */
  getPlan(planId: string): UltraPlan | null {
    return this.plans.get(planId) || null;
  }

  /**
   * Get formatted status for Telegram.
   */
  getStatusString(planId: string): string {
    const plan = this.plans.get(planId);
    if (!plan) return "Plan not found.";

    const lines = [
      `📋 **UltraPlan: ${plan.task.slice(0, 50)}**`,
      `Status: ${plan.status}`,
      `Model: ${plan.model}`,
      ``,
    ];

    for (const phase of plan.phases) {
      const emoji = {
        pending: "⬜",
        in_progress: "🔄",
        completed: "✅",
        failed: "❌",
      }[phase.status];
      lines.push(`${emoji} ${phase.number}. ${phase.name} — ${phase.description}`);
      if (phase.result && phase.status !== "pending") {
        lines.push(`   Result: ${phase.result.slice(0, 100)}`);
      }
    }

    const completed = plan.phases.filter(p => p.status === "completed").length;
    const total = plan.phases.length;
    lines.push(`\nProgress: ${completed}/${total} phases complete`);

    return lines.join("\n");
  }
}
