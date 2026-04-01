/**
 * Department Manager for CLAWFORGE
 * 
 * Departments are Pod Leads — they coordinate between CLAW and agents.
 * Each department has:
 * - A name and emoji
 * - An agent pool (or shared pool)
 * - Forged agents under it
 * 
 * CLAW creates departments. Departments forge agents.
 */

import { readFile, writeFile, mkdir } from "fs/promises";
import { join } from "path";
import type { AgentPool, AgentIdentity } from "./agent-pool.js";

// ============================================================================
// Types
// ============================================================================

export interface Department {
  /** Unique department ID */
  id: string;
  /** Display name */
  name: string;
  /** Emoji signature */
  emoji: string;
  /** Description of what this department does */
  description: string;
  /** Active agent names in this department */
  agents: string[];
  /** Telegram topic ID (if applicable) */
  topicId?: string;
  /** When this department was created */
  createdAt: string;
  /** When this department was last active */
  lastActive: string;
}

export interface DepartmentConfig {
  /** Maximum agents per department */
  maxAgentsPerDepartment: number;
  /** Whether to auto-create Telegram topics */
  autoCreateTopics: boolean;
}

export const DEFAULT_DEPARTMENT_CONFIG: DepartmentConfig = {
  maxAgentsPerDepartment: 5,
  autoCreateTopics: true,
};

// Suggested emoji for common department types
const DEPARTMENT_EMOJIS: Record<string, string> = {
  multimedia: "🎵",
  engineering: "💻",
  research: "🔍",
  operations: "⚙️",
  finance: "💰",
  marketing: "📢",
  design: "🎨",
  writing: "✍️",
  data: "📊",
  security: "🔒",
};

// ============================================================================
// Department Manager
// ============================================================================

export class DepartmentManager {
  private departments: Map<string, Department> = new Map();
  private config: DepartmentConfig;
  private dataDir: string;

  constructor(dataDir: string, config: Partial<DepartmentConfig> = {}) {
    this.dataDir = dataDir;
    this.config = { ...DEFAULT_DEPARTMENT_CONFIG, ...config };
  }

  // ========================================================================
  // Department CRUD
  // ========================================================================

  /**
   * Create a new department.
   */
  create(name: string, description: string, emoji?: string): Department {
    const id = name.toLowerCase().replace(/\s+/g, "-");
    const resolvedEmoji = emoji || this.suggestEmoji(name);

    const department: Department = {
      id,
      name,
      emoji: resolvedEmoji,
      description,
      agents: [],
      createdAt: new Date().toISOString(),
      lastActive: new Date().toISOString(),
    };

    this.departments.set(id, department);
    return department;
  }

  /**
   * Find a department by name (fuzzy match).
   */
  find(name: string): Department | null {
    const lower = name.toLowerCase();

    // Exact match
    for (const dept of this.departments.values()) {
      if (dept.name.toLowerCase() === lower || dept.id === lower) {
        return dept;
      }
    }

    // Fuzzy match
    for (const dept of this.departments.values()) {
      if (
        dept.name.toLowerCase().includes(lower) ||
        dept.description.toLowerCase().includes(lower)
      ) {
        return dept;
      }
    }

    return null;
  }

  /**
   * Get all departments.
   */
  getAll(): Department[] {
    return Array.from(this.departments.values());
  }

  /**
   * Get a department by ID.
   */
  getById(id: string): Department | null {
    return this.departments.get(id) || null;
  }

  /**
   * Delete a department (only if no active agents).
   */
  delete(id: string): boolean {
    const dept = this.departments.get(id);
    if (!dept) return false;
    if (dept.agents.length > 0) return false; // Can't delete with active agents

    this.departments.delete(id);
    return true;
  }

  // ========================================================================
  // Agent Management
  // ========================================================================

  /**
   * Add an agent to a department.
   */
  addAgent(deptId: string, agentName: string): boolean {
    const dept = this.departments.get(deptId);
    if (!dept) return false;
    if (dept.agents.length >= this.config.maxAgentsPerDepartment) return false;
    if (dept.agents.includes(agentName)) return false;

    dept.agents.push(agentName);
    dept.lastActive = new Date().toISOString();
    return true;
  }

  /**
   * Remove an agent from a department.
   */
  removeAgent(deptId: string, agentName: string): boolean {
    const dept = this.departments.get(deptId);
    if (!dept) return false;

    const index = dept.agents.indexOf(agentName);
    if (index === -1) return false;

    dept.agents.splice(index, 1);
    return true;
  }

  /**
   * Transfer an agent from one department to another.
   */
  transferAgent(agentName: string, fromDeptId: string, toDeptId: string): boolean {
    if (!this.removeAgent(fromDeptId, agentName)) return false;
    return this.addAgent(toDeptId, agentName);
  }

  /**
   * Check if a department has capacity for more agents.
   */
  hasCapacity(deptId: string): boolean {
    const dept = this.departments.get(deptId);
    if (!dept) return false;
    return dept.agents.length < this.config.maxAgentsPerDepartment;
  }

  /**
   * Get agents in a department.
   */
  getAgents(deptId: string): string[] {
    const dept = this.departments.get(deptId);
    return dept ? [...dept.agents] : [];
  }

  // ========================================================================
  // Auto-Detection
  // ========================================================================

  /**
   * Suggest a department name based on task description.
   */
  suggestDepartment(taskDescription: string): { name: string; emoji: string } {
    const lower = taskDescription.toLowerCase();

    const keywords: Record<string, string[]> = {
      multimedia: ["song", "music", "lyrics", "audio", "video", "animation", "media"],
      engineering: ["code", "api", "backend", "frontend", "database", "deploy", "build"],
      research: ["research", "paper", "study", "analyze", "compare", "investigate"],
      writing: ["write", "article", "blog", "essay", "content", "copy"],
      design: ["design", "ui", "ux", "mockup", "wireframe", "layout"],
      data: ["data", "analytics", "statistics", "dashboard", "report"],
      operations: ["schedule", "plan", "manage", "organize", "coordinate"],
      security: ["security", "audit", "vulnerability", "encrypt", "auth"],
      finance: ["finance", "budget", "invoice", "payment", "accounting"],
      marketing: ["marketing", "campaign", "social", "seo", "growth"],
    };

    for (const [dept, words] of Object.entries(keywords)) {
      if (words.some(w => lower.includes(w))) {
        return {
          name: dept.charAt(0).toUpperCase() + dept.slice(1),
          emoji: DEPARTMENT_EMOJIS[dept] || "📁",
        };
      }
    }

    return { name: "General", emoji: "📁" };
  }

  private suggestEmoji(name: string): string {
    const lower = name.toLowerCase();
    return DEPARTMENT_EMOJIS[lower] || "📁";
  }

  // ========================================================================
  // Status
  // ========================================================================

  getStatusString(): string {
    const depts = this.getAll();
    if (depts.length === 0) return "No departments created yet.";

    const lines = depts.map(d =>
      `${d.emoji} ${d.name}: ${d.agents.length} agent(s)`
    );
    return lines.join("\n");
  }

  // ========================================================================
  // Persistence
  // ========================================================================

  async save(): Promise<void> {
    await mkdir(this.dataDir, { recursive: true });
    const data = Array.from(this.departments.entries());
    await writeFile(
      join(this.dataDir, "departments.json"),
      JSON.stringify(data, null, 2),
    );
  }

  async load(): Promise<void> {
    try {
      const raw = await readFile(join(this.dataDir, "departments.json"), "utf-8");
      const data = JSON.parse(raw);
      this.departments = new Map(data);
    } catch {
      // First run — no departments yet
    }
  }
}

// ============================================================================
// Factory
// ============================================================================

export async function createDepartmentManager(
  dataDir: string,
  config?: Partial<DepartmentConfig>,
): Promise<DepartmentManager> {
  const manager = new DepartmentManager(dataDir, config);
  await manager.load();
  return manager;
}
