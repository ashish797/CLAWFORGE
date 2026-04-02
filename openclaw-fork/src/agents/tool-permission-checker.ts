/**
 * Per-Tool Permission Checker for CLAWFORGE
 * 
 * OpenClaw's tool policy is allowlist-based (filter tools globally).
 * Claude Code checks permissions PER tool call with a PermissionPolicy.
 * 
 * This module adds per-call permission checking to OpenClaw.
 * It hooks into the before-tool-call flow.
 */

import {
  PermissionPolicy,
  checkPermission,
  getToolRequiredMode,
  createPermissionLogEntry,
  type PermissionDecision,
  type PermissionMode,
  type PermissionLogEntry,
} from "../security/permission-modes.js";

// ============================================================================
// Types
// ============================================================================

export interface ToolCallContext {
  /** Tool name being called */
  toolName: string;
  /** Tool input as JSON string */
  toolInput: string;
  /** Session ID */
  sessionId?: string;
  /** Agent ID */
  agentId?: string;
  /** Tool call ID (for tracking) */
  toolCallId?: string;
}

export interface PermissionCheckResult {
  /** Whether the tool call is allowed */
  allowed: boolean;
  /** Decision details */
  decision: PermissionDecision;
  /** Log entry for audit */
  logEntry: PermissionLogEntry;
  /** Whether user needs to be prompted */
  needsPrompt: boolean;
  /** Prompt message if user needs to approve */
  promptMessage?: string;
}

// ============================================================================
// Permission Checker
// ============================================================================

export class ToolPermissionChecker {
  private policy: PermissionPolicy;
  private log: PermissionLogEntry[] = [];
  private maxLogSize: number;

  constructor(policy: PermissionPolicy, maxLogSize: number = 1000) {
    this.policy = policy;
    this.maxLogSize = maxLogSize;
  }

  /**
   * Check permission for a tool call.
   * This is called BEFORE tool execution.
   * 
   * Returns the decision and whether user prompt is needed.
   */
  check(context: ToolCallContext): PermissionCheckResult {
    const decision = this.policy.check(context.toolName);
    const requiredMode = getToolRequiredMode(context.toolName);

    const logEntry = createPermissionLogEntry(
      context.toolName,
      this.policy.mode,
      decision,
    );

    // Add to log
    this.log.push(logEntry);
    if (this.log.length > this.maxLogSize) {
      this.log.shift();
    }

    switch (decision.outcome) {
      case "allow":
        return {
          allowed: true,
          decision,
          logEntry,
          needsPrompt: false,
        };

      case "deny":
        return {
          allowed: false,
          decision,
          logEntry,
          needsPrompt: false,
        };

      case "prompt":
        return {
          allowed: false, // Not allowed yet — needs user approval
          decision,
          logEntry,
          needsPrompt: true,
          promptMessage: decision.message,
        };
    }
  }

  /**
   * Record user's approval decision.
   */
  approve(toolName: string, approved: boolean): void {
    const lastLog = this.log[this.log.length - 1];
    if (lastLog && lastLog.toolName === toolName) {
      lastLog.approved = approved;
    }
  }

  /**
   * Get permission log.
   */
  getLog(): PermissionLogEntry[] {
    return [...this.log];
  }

  /**
   * Get recent log entries.
   */
  getRecentLog(count: number = 10): PermissionLogEntry[] {
    return this.log.slice(-count);
  }

  /**
   * Update permission mode.
   */
  setMode(mode: PermissionMode): void {
    this.policy.setMode(mode);
  }

  /**
   * Get current mode.
   */
  getMode(): PermissionMode {
    return this.policy.mode;
  }

  /**
   * Get formatted status for Telegram.
   */
  getStatusString(): string {
    const recentDecisions = this.getRecentLog(5);
    const lines = [
      `🔐 Permission Mode: ${this.policy.mode}`,
      ``,
      `Recent decisions:`,
    ];

    if (recentDecisions.length === 0) {
      lines.push("  No decisions yet.");
    } else {
      for (const entry of recentDecisions) {
        const emoji = entry.decision === "allow" ? "✅" : entry.decision === "deny" ? "❌" : "❓";
        lines.push(`  ${emoji} ${entry.toolName}: ${entry.decision}`);
      }
    }

    return lines.join("\n");
  }
}

// ============================================================================
// Integration with OpenClaw's Tool Pipeline
// ============================================================================

/**
 * Wrap a tool call with permission checking.
 * Use this in OpenClaw's before-tool-call hook.
 * 
 * Example:
 * ```typescript
 * const result = await wrapWithPermissionCheck(
 *   checker,
 *   { toolName: "exec", toolInput: '{"command":"rm -rf node_modules"}' },
 *   async () => {
 *     // Actual tool execution
 *     return await executeTool(toolName, toolInput);
 *   }
 * );
 * ```
 */
export async function wrapWithPermissionCheck<T>(
  checker: ToolPermissionChecker,
  context: ToolCallContext,
  execute: () => Promise<T>,
): Promise<{ result?: T; error?: string; needsPrompt?: boolean; promptMessage?: string }> {
  const checkResult = checker.check(context);

  if (!checkResult.allowed && !checkResult.needsPrompt) {
    // Denied
    return {
      error: checkResult.decision.outcome === "deny"
        ? checkResult.decision.reason
        : "Permission denied",
    };
  }

  if (checkResult.needsPrompt) {
    // Needs user approval
    return {
      needsPrompt: true,
      promptMessage: checkResult.promptMessage,
    };
  }

  // Allowed — execute
  try {
    const result = await execute();
    checker.approve(context.toolName, true);
    return { result };
  } catch (error) {
    checker.approve(context.toolName, false);
    return { error: String(error) };
  }
}

// ============================================================================
// Factory
// ============================================================================

export function createToolPermissionChecker(mode: PermissionMode = "prompt"): ToolPermissionChecker {
  const policy = new PermissionPolicy({ mode });
  return new ToolPermissionChecker(policy);
}
