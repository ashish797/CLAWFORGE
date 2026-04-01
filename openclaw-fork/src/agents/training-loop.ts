/**
 * Training Loop for CLAWFORGE
 * 
 * When a new agent is forged, it enters TRAINING MODE:
 * 1. Agent shows first draft based on requirements
 * 2. User tweaks
 * 3. Agent learns preferences
 * 4. Iterates until user satisfied
 * 5. Pipeline LOCKED
 * 
 * After training, agent executes directly without back-and-forth.
 */

import { readFile, writeFile, mkdir } from "fs/promises";
import { join } from "path";

// ============================================================================
// Types
// ============================================================================

export type TrainingStatus = "not_started" | "in_progress" | "completed" | "locked";

export interface TrainingSession {
  /** Agent name being trained */
  agentName: string;
  /** Department the agent belongs to */
  department: string;
  /** Current training status */
  status: TrainingStatus;
  /** Requirements from CLAW */
  requirements: string;
  /** Iterations of feedback */
  iterations: TrainingIteration[];
  /** Learned preferences */
  learnedPreferences: string[];
  /** When training started */
  startedAt: string;
  /** When training completed (if applicable) */
  completedAt?: string;
}

export interface TrainingIteration {
  /** Iteration number */
  number: number;
  /** What the agent produced */
  output: string;
  /** User feedback */
  feedback: string;
  /** What changed based on feedback */
  changes: string;
  /** Timestamp */
  timestamp: string;
}

// ============================================================================
// Training Manager
// ============================================================================

export class TrainingManager {
  private sessions: Map<string, TrainingSession> = new Map();
  private dataDir: string;

  constructor(dataDir: string) {
    this.dataDir = dataDir;
  }

  /**
   * Start a new training session.
   */
  startTraining(
    agentName: string,
    department: string,
    requirements: string,
  ): TrainingSession {
    const session: TrainingSession = {
      agentName,
      department,
      status: "in_progress",
      requirements,
      iterations: [],
      learnedPreferences: [],
      startedAt: new Date().toISOString(),
    };

    this.sessions.set(agentName, session);
    return session;
  }

  /**
   * Record a training iteration.
   */
  addIteration(
    agentName: string,
    output: string,
    feedback: string,
    changes: string,
  ): TrainingSession | null {
    const session = this.sessions.get(agentName);
    if (!session || session.status !== "in_progress") return null;

    const iteration: TrainingIteration = {
      number: session.iterations.length + 1,
      output,
      feedback,
      changes,
      timestamp: new Date().toISOString(),
    };

    session.iterations.push(iteration);

    // Extract preferences from feedback
    const preferences = this.extractPreferences(feedback);
    session.learnedPreferences.push(...preferences);

    return session;
  }

  /**
   * Complete training. Pipeline locked.
   */
  completeTraining(agentName: string): TrainingSession | null {
    const session = this.sessions.get(agentName);
    if (!session) return null;

    session.status = "completed";
    session.completedAt = new Date().toISOString();

    // Save learned preferences to agent's memory
    this.savePreferences(agentName, session.learnedPreferences);

    return session;
  }

  /**
   * Lock training (make permanent).
   */
  lockTraining(agentName: string): boolean {
    const session = this.sessions.get(agentName);
    if (!session) return false;

    session.status = "locked";
    return true;
  }

  /**
   * Check if an agent is trained.
   */
  isTrained(agentName: string): boolean {
    const session = this.sessions.get(agentName);
    return session?.status === "completed" || session?.status === "locked";
  }

  /**
   * Check if an agent is currently in training.
   */
  isInTraining(agentName: string): boolean {
    const session = this.sessions.get(agentName);
    return session?.status === "in_progress";
  }

  /**
   * Get training session for an agent.
   */
  getSession(agentName: string): TrainingSession | null {
    return this.sessions.get(agentName) || null;
  }

  /**
   * Get all trained agents.
   */
  getTrainedAgents(): string[] {
    return Array.from(this.sessions.entries())
      .filter(([_, s]) => s.status === "completed" || s.status === "locked")
      .map(([name, _]) => name);
  }

  // ========================================================================
  // Helpers
  // ========================================================================

  private extractPreferences(feedback: string): string[] {
    const preferences: string[] = [];

    // Simple heuristic: look for "prefer", "like", "want", "make it"
    const patterns = [
      /prefer\s+(.+?)(?:\.|$)/gi,
      /like\s+(.+?)(?:\.|$)/gi,
      /want\s+(.+?)(?:\.|$)/gi,
      /make it\s+(.+?)(?:\.|$)/gi,
      /more\s+(.+?)(?:\.|$)/gi,
      /less\s+(.+?)(?:\.|$)/gi,
    ];

    for (const pattern of patterns) {
      let match;
      while ((match = pattern.exec(feedback)) !== null) {
        preferences.push(match[1].trim());
      }
    }

    return preferences;
  }

  private savePreferences(agentName: string, preferences: string[]): void {
    // Preferences are saved to the agent's memory directory
    // This is a placeholder — actual saving is done by the memory system
  }

  // ========================================================================
  // Status
  // ========================================================================

  getStatusString(): string {
    const sessions = Array.from(this.sessions.values());
    if (sessions.length === 0) return "No training sessions.";

    const lines = sessions.map(s => {
      const statusEmoji = {
        not_started: "⬜",
        in_progress: "🔄",
        completed: "✅",
        locked: "🔒",
      }[s.status];
      return `${statusEmoji} ${s.agentName} (${s.department}): ${s.status} — ${s.iterations.length} iterations`;
    });

    return lines.join("\n");
  }

  // ========================================================================
  // Persistence
  // ========================================================================

  async save(): Promise<void> {
    await mkdir(this.dataDir, { recursive: true });
    const data = Array.from(this.sessions.entries());
    await writeFile(
      join(this.dataDir, "training-sessions.json"),
      JSON.stringify(data, null, 2),
    );
  }

  async load(): Promise<void> {
    try {
      const raw = await readFile(join(this.dataDir, "training-sessions.json"), "utf-8");
      const data = JSON.parse(raw);
      this.sessions = new Map(data);
    } catch {
      // First run
    }
  }
}

// ============================================================================
// Factory
// ============================================================================

export async function createTrainingManager(dataDir: string): Promise<TrainingManager> {
  const manager = new TrainingManager(dataDir);
  await manager.load();
  return manager;
}
