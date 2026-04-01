/**
 * Agent Pool for CLAWFORGE
 * 
 * Manages a pool of agent runtimes (default: 5).
 * Each runtime can be:
 * - Dynamic: re-skinned as needed, returns to pool after task
 * - Production: locked, permanent, never re-skinned
 * 
 * Pool scales dynamically based on load.
 */

import { readFile, writeFile, mkdir } from "fs/promises";
import { join } from "path";

// ============================================================================
// Types
// ============================================================================

export type AgentType = "dynamic" | "production";

export interface AgentSlot {
  /** Unique runtime ID */
  id: number;
  /** Whether this slot is currently busy */
  busy: boolean;
  /** Agent type: dynamic (re-skinnable) or production (locked) */
  type: AgentType;
  /** Current identity (null if idle) */
  identity: AgentIdentity | null;
  /** When this slot was last active */
  lastActive: string;
}

export interface AgentIdentity {
  /** Display name */
  name: string;
  /** Emoji signature */
  emoji: string;
  /** Department this agent belongs to */
  department: string;
  /** CLAW.md content for this agent */
  clawMd: string;
  /** Memory directory path */
  memoryDir: string;
  /** Permission level */
  permissionLevel: string;
}

export interface PoolConfig {
  /** Minimum number of runtimes */
  minSize: number;
  /** Maximum number of runtimes */
  maxSize: number;
  /** Default pool size */
  defaultSize: number;
  /** Queue threshold for scaling up */
  scaleUpThreshold: number;
  /** Idle threshold for scaling down (minutes) */
  scaleDownIdleMinutes: number;
}

export const DEFAULT_POOL_CONFIG: PoolConfig = {
  minSize: 3,
  maxSize: 10,
  defaultSize: 5,
  scaleUpThreshold: 3,
  scaleDownIdleMinutes: 30,
};

// ============================================================================
// Pool Manager
// ============================================================================

export class AgentPool {
  private slots: AgentSlot[] = [];
  private config: PoolConfig;
  private nextId: number = 1;
  private taskQueue: string[] = [];
  private dataDir: string;

  constructor(dataDir: string, config: Partial<PoolConfig> = {}) {
    this.dataDir = dataDir;
    this.config = { ...DEFAULT_POOL_CONFIG, ...config };
    this.initializePool();
  }

  private initializePool(): void {
    for (let i = 0; i < this.config.defaultSize; i++) {
      this.slots.push(this.createSlot());
    }
  }

  private createSlot(): AgentSlot {
    return {
      id: this.nextId++,
      busy: false,
      type: "dynamic",
      identity: null,
      lastActive: new Date().toISOString(),
    };
  }

  // ========================================================================
  // Pool Operations
  // ========================================================================

  /**
   * Get an idle dynamic slot. Returns null if none available.
   */
  getIdleSlot(): AgentSlot | null {
    return this.slots.find(s => !s.busy && s.type === "dynamic") || null;
  }

  /**
   * Get all idle slots.
   */
  getIdleSlots(): AgentSlot[] {
    return this.slots.filter(s => !s.busy);
  }

  /**
   * Get all busy slots.
   */
  getBusySlots(): AgentSlot[] {
    return this.slots.filter(s => s.busy);
  }

  /**
   * Get all production slots.
   */
  getProductionSlots(): AgentSlot[] {
    return this.slots.filter(s => s.type === "production");
  }

  /**
   * Check if pool has available capacity.
   */
  hasCapacity(): boolean {
    return this.getIdleSlot() !== null;
  }

  // ========================================================================
  // Agent Lifecycle
  // ========================================================================

  /**
   * Assign an identity to an idle slot.
   * Returns the slot, or null if no idle slots.
   */
  assignIdentity(identity: AgentIdentity): AgentSlot | null {
    const slot = this.getIdleSlot();
    if (!slot) return null;

    slot.identity = identity;
    slot.busy = true;
    slot.lastActive = new Date().toISOString();

    return slot;
  }

  /**
   * Find a production agent by name.
   */
  findProductionAgent(name: string): AgentSlot | null {
    return this.slots.find(
      s => s.type === "production" && s.identity?.name === name
    ) || null;
  }

  /**
   * Find any agent by name (production or busy dynamic).
   */
  findAgent(name: string): AgentSlot | null {
    return this.slots.find(
      s => s.identity?.name === name
    ) || null;
  }

  /**
   * Release a slot back to the pool.
   * Production slots stay busy (never released).
   */
  releaseSlot(slotId: number): boolean {
    const slot = this.slots.find(s => s.id === slotId);
    if (!slot) return false;
    if (slot.type === "production") return false; // Can't release production

    // Save memory before clearing identity
    if (slot.identity) {
      this.saveMemory(slot.identity);
    }

    slot.busy = false;
    slot.identity = null;
    slot.lastActive = new Date().toISOString();

    return true;
  }

  /**
   * Lock a slot as production (permanent).
   */
  lockAsProduction(slotId: number): boolean {
    const slot = this.slots.find(s => s.id === slotId);
    if (!slot) return false;

    slot.type = "production";
    return true;
  }

  /**
   * Unlock a production slot back to dynamic.
   */
  unlock(slotId: number): boolean {
    const slot = this.slots.find(s => s.id === slotId);
    if (!slot) return false;

    slot.type = "dynamic";
    return true;
  }

  // ========================================================================
  // Scaling
  // ========================================================================

  /**
   * Add a new slot to the pool.
   */
  addSlot(): AgentSlot | null {
    if (this.slots.length >= this.config.maxSize) return null;

    const slot = this.createSlot();
    this.slots.push(slot);
    return slot;
  }

  /**
   * Remove an idle dynamic slot.
   */
  removeSlot(): boolean {
    const idleIndex = this.slots.findIndex(
      s => !s.busy && s.type === "dynamic"
    );
    if (idleIndex === -1) return false;

    this.slots.splice(idleIndex, 1);
    return true;
  }

  /**
   * Auto-scale based on load.
   */
  autoScale(): { action: string; newSize: number } {
    const idleCount = this.getIdleSlots().length;
    const queueSize = this.taskQueue.length;

    // Scale up if queue is building
    if (queueSize >= this.config.scaleUpThreshold && idleCount === 0) {
      const added = this.addSlot();
      if (added) {
        return { action: "scale_up", newSize: this.slots.length };
      }
    }

    // Scale down if too many idle
    if (idleCount > 2 && this.slots.length > this.config.minSize) {
      const removed = this.removeSlot();
      if (removed) {
        return { action: "scale_down", newSize: this.slots.length };
      }
    }

    return { action: "no_change", newSize: this.slots.length };
  }

  // ========================================================================
  // Queue
  // ========================================================================

  /**
   * Add a task to the queue.
   */
  enqueue(task: string): void {
    this.taskQueue.push(task);
  }

  /**
   * Dequeue a task.
   */
  dequeue(): string | undefined {
    return this.taskQueue.shift();
  }

  getQueueSize(): number {
    return this.taskQueue.length;
  }

  // ========================================================================
  // Status
  // ========================================================================

  getStatus(): {
    total: number;
    busy: number;
    idle: number;
    production: number;
    dynamic: number;
    queue: number;
  } {
    return {
      total: this.slots.length,
      busy: this.getBusySlots().length,
      idle: this.getIdleSlots().length,
      production: this.getProductionSlots().length,
      dynamic: this.slots.filter(s => s.type === "dynamic").length,
      queue: this.taskQueue.length,
    };
  }

  /**
   * Get formatted status string for Telegram.
   */
  getStatusString(): string {
    const s = this.getStatus();
    const lines = [
      `Pool: ${s.total} runtimes`,
      `  Busy: ${s.busy} | Idle: ${s.idle}`,
      `  Production: ${s.production} | Dynamic: ${s.dynamic}`,
      s.queue > 0 ? `  Queue: ${s.queue} tasks waiting` : "",
    ].filter(Boolean);
    return lines.join("\n");
  }

  getSlots(): AgentSlot[] {
    return [...this.slots];
  }

  // ========================================================================
  // Persistence
  // ========================================================================

  private saveMemory(identity: AgentIdentity): void {
    // Memory files persist on disk — nothing to do here
    // The actual memory saving is handled by the memory system
  }

  async save(): Promise<void> {
    await mkdir(this.dataDir, { recursive: true });
    const data = {
      slots: this.slots,
      nextId: this.nextId,
      taskQueue: this.taskQueue,
      config: this.config,
    };
    await writeFile(
      join(this.dataDir, "agent-pool.json"),
      JSON.stringify(data, null, 2),
    );
  }

  async load(): Promise<void> {
    try {
      const raw = await readFile(join(this.dataDir, "agent-pool.json"), "utf-8");
      const data = JSON.parse(raw);
      this.slots = data.slots || [];
      this.nextId = data.nextId || 1;
      this.taskQueue = data.taskQueue || [];
      if (data.config) {
        this.config = { ...DEFAULT_POOL_CONFIG, ...data.config };
      }
    } catch {
      // First run — use defaults
    }
  }
}

// ============================================================================
// Factory
// ============================================================================

export async function createAgentPool(
  dataDir: string,
  config?: Partial<PoolConfig>,
): Promise<AgentPool> {
  const pool = new AgentPool(dataDir, config);
  await pool.load();
  return pool;
}
