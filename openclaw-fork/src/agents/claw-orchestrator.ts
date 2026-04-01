/**
 * CLAW Orchestrator — Main entry point for CLAWFORGE
 * 
 * Ties together all components:
 * - Permission Modes
 * - Tool Hooks
 * - CLAW.md
 * - Compaction
 * - Agent Pool
 * - Departments
 * - Training Loop
 * - Pattern Recognition
 * - Buddy
 * - Chyros
 * - Undercover Mode
 * - Telegram Integration
 * 
 * The orchestrator is the "brain" that manages the 3-layer system:
 * CLAW → Department → Agent
 */

import type { PermissionPolicy, PermissionDecision } from "../security/permission-modes.js";
import type { ToolHookRunner, ToolHookDecision } from "../hooks/tool-hooks.js";
import type { ClawMdContent } from "./claw-md.js";
import type { CompactionResult } from "./compaction-enhanced.js";
import type { AgentPool, AgentIdentity, AgentSlot } from "./agent-pool.js";
import type { DepartmentManager, Department } from "./department.js";
import type { TrainingManager, TrainingSession } from "./training-loop.js";
import type { PatternMatcher, RoutingResult } from "./pattern-recognition.js";
import type { BuddyManager, BuddyReaction } from "./buddy.js";

// ============================================================================
// Types
// ============================================================================

export interface OrchestratorConfig {
  /** Project root directory */
  projectRoot: string;
  /** Data directory for persistence */
  dataDir: string;
  /** Default permission mode for new agents */
  defaultPermissionMode: string;
  /** Pool configuration */
  poolSize: number;
}

export interface ForgeRequest {
  /** User's original request */
  userRequest: string;
  /** Requirements gathered from conversation */
  requirements: string;
  /** Department name (auto-detected or specified) */
  department?: string;
  /** Agent name (auto-generated or specified) */
  agentName?: string;
  /** Agent emoji (auto-generated or specified) */
  agentEmoji?: string;
}

export interface ForgeResult {
  /** Whether the forge was successful */
  success: boolean;
  /** Department created/found */
  department: Department | null;
  /** Agent slot assigned */
  slot: AgentSlot | null;
  /** Training session started */
  trainingSession: TrainingSession | null;
  /** Messages to show user */
  messages: string[];
  /** Error if forge failed */
  error?: string;
}

export interface ExecutionRequest {
  /** Task to execute */
  task: string;
  /** Target agent (if known) */
  targetAgent?: string;
  /** Whether to run in background */
  background?: boolean;
}

export interface ExecutionResult {
  /** Whether execution was successful */
  success: boolean;
  /** Result output */
  output: string;
  /** Agent that executed */
  agentName: string;
  /** Buddy reaction */
  buddyReaction?: BuddyReaction;
  /** Error if execution failed */
  error?: string;
}

// ============================================================================
// Orchestrator
// ============================================================================

export class ClawOrchestrator {
  private config: OrchestratorConfig;
  private permissionPolicy!: PermissionPolicy;
  private hookRunner!: ToolHookRunner;
  private clawMd!: ClawMdContent;
  private pool!: AgentPool;
  private departments!: DepartmentManager;
  private training!: TrainingManager;
  private patterns!: PatternMatcher;
  private buddy!: BuddyManager;

  constructor(config: OrchestratorConfig) {
    this.config = config;
  }

  async initialize(deps: {
    permissionPolicy: PermissionPolicy;
    hookRunner: ToolHookRunner;
    clawMd: ClawMdContent;
    pool: AgentPool;
    departments: DepartmentManager;
    training: TrainingManager;
    patterns: PatternMatcher;
    buddy: BuddyManager;
  }): Promise<void> {
    this.permissionPolicy = deps.permissionPolicy;
    this.hookRunner = deps.hookRunner;
    this.clawMd = deps.clawMd;
    this.pool = deps.pool;
    this.departments = deps.departments;
    this.training = deps.training;
    this.patterns = deps.patterns;
    this.buddy = deps.buddy;
  }

  // ========================================================================
  // Main Entry Points
  // ========================================================================

  /**
   * Process a user request.
   * This is the main entry point for CLAW.
   */
  async processRequest(userRequest: string): Promise<{
    action: "forge" | "route" | "direct";
    details: string;
  }> {
    // Check if this matches a known pattern
    const routing = this.patterns.suggestRoute(userRequest);

    if (routing.found && routing.agentName) {
      return {
        action: "route",
        details: `Routing to trained agent: ${routing.agentName}`,
      };
    }

    if (routing.suggestPersistent) {
      return {
        action: "forge",
        details: "Similar task seen 3+ times. Suggest forging persistent agent.",
      };
    }

    // New task — needs understanding and potential forging
    return {
      action: "forge",
      details: "New task type. Needs requirements gathering.",
    };
  }

  /**
   * Forge a new agent.
   */
  async forge(request: ForgeRequest): Promise<ForgeResult> {
    const messages: string[] = [];

    // 1. Find or create department
    let department: Department | null = null;
    let isNewDepartment = false;

    if (request.department) {
      department = this.departments.find(request.department);
    }

    if (!department) {
      // Auto-detect department from requirements
      const suggestion = this.departments.suggestDepartment(request.requirements);
      department = this.departments.find(suggestion.name);

      if (!department) {
        department = this.departments.create(suggestion.name, `Handles ${suggestion.name.toLowerCase()} tasks`, suggestion.emoji);
        isNewDepartment = true;
        messages.push(`🏗️ Created department: ${suggestion.emoji} ${suggestion.name}`);
      }
    }

    // 2. Get an idle slot from pool
    const slot = this.pool.getIdleSlot();
    if (!slot) {
      // Try to queue
      this.pool.enqueue(request.userRequest);
      return {
        success: false,
        department,
        slot: null,
        trainingSession: null,
        messages: ["Pool is full. Task queued. Waiting for available agent..."],
        error: "no_idle_slots",
      };
    }

    // 3. Create agent identity
    const agentName = request.agentName || this.generateAgentName(request.requirements);
    const agentEmoji = request.agentEmoji || this.generateAgentEmoji(request.requirements);

    const identity: AgentIdentity = {
      name: agentName,
      emoji: agentEmoji,
      department: department.id,
      clawMd: this.generateAgentClawMd(agentName, request.requirements),
      memoryDir: `memory/agents/${agentName.toLowerCase().replace(/\s+/g, "-")}/`,
      permissionLevel: this.config.defaultPermissionMode,
    };

    // 4. Assign identity to slot
    const assignedSlot = this.pool.assignIdentity(identity);
    if (!assignedSlot) {
      return {
        success: false,
        department,
        slot: null,
        trainingSession: null,
        messages: ["Failed to assign agent identity."],
        error: "assignment_failed",
      };
    }

    // 5. Add agent to department
    this.departments.addAgent(department.id, agentName);

    // 6. Start training
    const trainingSession = this.training.startTraining(
      agentName,
      department.id,
      request.requirements,
    );

    // 7. Record pattern
    this.patterns.recordTask(request.userRequest);
    this.patterns.assignAgent(
      this.patterns.getPatterns().find(p => !p.assignedAgent)?.type || "general",
      agentName,
    );

    messages.push(`🛠️ Forging agent: ${agentEmoji} ${agentName}`);
    messages.push(`📋 Assigning to ${department.emoji} ${department.name}`);
    messages.push(`Entering training mode...`);

    return {
      success: true,
      department,
      slot: assignedSlot,
      trainingSession,
      messages,
    };
  }

  /**
   * Route a task to a trained agent.
   */
  async route(request: ExecutionRequest): Promise<ExecutionResult> {
    // Check if target agent is known
    if (request.targetAgent) {
      const agent = this.pool.findAgent(request.targetAgent);
      if (agent) {
        return this.executeOnAgent(agent, request.task);
      }
    }

    // Try pattern-based routing
    const routing = this.patterns.suggestRoute(request.task);
    if (routing.found && routing.agentName) {
      const agent = this.pool.findAgent(routing.agentName);
      if (agent) {
        return this.executeOnAgent(agent, request.task);
      }
    }

    return {
      success: false,
      output: "No trained agent found for this task type.",
      agentName: "none",
      error: "no_agent",
    };
  }

  /**
   * Execute a task on a specific agent.
   */
  private async executeOnAgent(slot: AgentSlot, task: string): Promise<ExecutionResult> {
    if (!slot.identity) {
      return {
        success: false,
        output: "Agent has no identity assigned.",
        agentName: "unknown",
        error: "no_identity",
      };
    }

    // Check permission
    const permResult = this.permissionPolicy.check("exec");

    if (permResult.outcome === "deny") {
      return {
        success: false,
        output: `Permission denied: ${permResult.reason}`,
        agentName: slot.identity.name,
        error: "permission_denied",
      };
    }

    // Run pre-hook
    const preHook = await this.hookRunner.runPreToolUse("agent_exec", JSON.stringify({ task }));
    if (preHook.outcome === "deny") {
      return {
        success: false,
        output: `Hook denied: ${preHook.reason}`,
        agentName: slot.identity.name,
        error: "hook_denied",
      };
    }

    // Execute (placeholder — actual execution happens via OpenClaw's session system)
    const output = `[${slot.identity.emoji} ${slot.identity.name}] Task received: "${task}"\nExecuting...`;

    // Run post-hook
    const postHook = await this.hookRunner.runPostToolUse("agent_exec", JSON.stringify({ task }), output, false);

    // Buddy reaction
    const reaction = this.buddy.react("success");

    return {
      success: true,
      output: postHook.outcome === "allow" ? output : `${output}\n\n${postHook.messages.join("\n")}`,
      agentName: slot.identity.name,
      buddyReaction: reaction,
    };
  }

  // ========================================================================
  // Status
  // ========================================================================

  getStatus(): string {
    const poolStatus = this.pool.getStatusString();
    const deptStatus = this.departments.getStatusString();
    const patternStatus = this.patterns.getStatusString();
    const buddyStatus = this.buddy.getStatus();

    return [
      `📊 **CLAWFORGE Status**`,
      ``,
      `**Agent Pool**`,
      poolStatus,
      ``,
      `**Departments**`,
      deptStatus,
      ``,
      `**Patterns**`,
      patternStatus,
      ``,
      `**Buddy**`,
      buddyStatus,
    ].join("\n");
  }

  // ========================================================================
  // Helpers
  // ========================================================================

  private generateAgentName(requirements: string): string {
    const lower = requirements.toLowerCase();
    if (lower.includes("song") || lower.includes("lyric")) return "Songwriter";
    if (lower.includes("code") || lower.includes("api")) return "Developer";
    if (lower.includes("research") || lower.includes("study")) return "Researcher";
    if (lower.includes("write") || lower.includes("article")) return "Writer";
    if (lower.includes("test")) return "Tester";
    if (lower.includes("data")) return "Analyst";
    return "Agent";
  }

  private generateAgentEmoji(requirements: string): string {
    const lower = requirements.toLowerCase();
    if (lower.includes("song") || lower.includes("lyric")) return "🎶";
    if (lower.includes("code") || lower.includes("api")) return "💻";
    if (lower.includes("research")) return "🔍";
    if (lower.includes("write")) return "✍️";
    if (lower.includes("test")) return "🧪";
    if (lower.includes("data")) return "📊";
    return "🤖";
  }

  private generateAgentClawMd(name: string, requirements: string): string {
    return `## Instructions\n- You are ${name}\n- ${requirements}\n\n## Rules\n- Follow user preferences\n- Ask if uncertain\n- Report progress`;
  }
}

// ============================================================================
// Factory
// ============================================================================

export function createOrchestrator(config: OrchestratorConfig): ClawOrchestrator {
  return new ClawOrchestrator(config);
}
