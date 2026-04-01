/**
 * Permission Modes for CLAWFORGE
 * 
 * Inspired by Claude Code's permission system.
 * 5 levels from read-only to full access.
 * 
 * Each tool has a required permission level.
 * Agent's current mode determines what it can do.
 */

// ============================================================================
// Permission Modes
// ============================================================================

export type PermissionMode =
  | "read-only"
  | "workspace-write"
  | "prompt"
  | "danger-full-access"
  | "allow";

export const PERMISSION_MODES: readonly PermissionMode[] = [
  "read-only",
  "workspace-write",
  "prompt",
  "danger-full-access",
  "allow",
] as const;

/** Mode hierarchy — higher number = more access */
const MODE_LEVEL: Record<PermissionMode, number> = {
  "read-only": 0,
  "workspace-write": 1,
  "prompt": 2,
  "danger-full-access": 3,
  "allow": 4,
};

export function modeLevel(mode: PermissionMode): number {
  return MODE_LEVEL[mode];
}

export function modeAllows(currentMode: PermissionMode, requiredMode: PermissionMode): boolean {
  return MODE_LEVEL[currentMode] >= MODE_LEVEL[requiredMode];
}

export function modeFromString(s: string): PermissionMode {
  if ((PERMISSION_MODES as readonly string[]).includes(s)) {
    return s as PermissionMode;
  }
  return "prompt";
}

export function modeTitle(mode: PermissionMode): string {
  switch (mode) {
    case "read-only": return "Read Only";
    case "workspace-write": return "Workspace Write";
    case "prompt": return "Prompt";
    case "danger-full-access": return "Full Access";
    case "allow": return "Allow All";
  }
}

export function modeDescription(mode: PermissionMode): string {
  switch (mode) {
    case "read-only":
      return "Can only read files, search, and browse. Cannot write or execute commands.";
    case "workspace-write":
      return "Can read and write within the workspace. Cannot touch system files.";
    case "prompt":
      return "Can do anything, but asks first. Default mode.";
    case "danger-full-access":
      return "Full access to everything. Use with caution.";
    case "allow":
      return "Auto-approve everything. For automation only.";
  }
}

// ============================================================================
// Tool Permission Requirements
// ============================================================================

/** Default permission requirements for tool categories */
const TOOL_PERMISSION_REQUIREMENTS: Record<string, PermissionMode> = {
  // Read operations — read-only mode suffices
  read: "read-only",
  file_read: "read-only",
  glob: "read-only",
  grep: "read-only",
  web_search: "read-only",
  web_fetch: "read-only",
  list: "read-only",
  status: "read-only",
  
  // Write operations — workspace-write minimum
  write: "workspace-write",
  file_write: "workspace-write",
  file_edit: "workspace-write",
  create: "workspace-write",
  
  // Execution — prompt mode (ask first)
  exec: "prompt",
  shell: "prompt",
  bash: "prompt",
  spawn: "prompt",
  
  // Dangerous operations — full access required
  delete: "danger-full-access",
  fs_delete: "danger-full-access",
  fs_move: "danger-full-access",
  apply_patch: "danger-full-access",
  
  // Session/control operations — full access
  sessions_spawn: "danger-full-access",
  sessions_send: "danger-full-access",
  cron: "danger-full-access",
  gateway: "danger-full-access",
};

export function getToolRequiredMode(toolName: string): PermissionMode {
  // Check exact match
  if (TOOL_PERMISSION_REQUIREMENTS[toolName]) {
    return TOOL_PERMISSION_REQUIREMENTS[toolName];
  }
  
  // Check prefix matches
  for (const [prefix, mode] of Object.entries(TOOL_PERMISSION_REQUIREMENTS)) {
    if (toolName.startsWith(prefix)) {
      return mode;
    }
  }
  
  // Default: prompt mode (ask for anything unknown)
  return "prompt";
}

// ============================================================================
// Permission Decision
// ============================================================================

export type PermissionDecision =
  | { outcome: "allow" }
  | { outcome: "deny"; reason: string }
  | { outcome: "prompt"; message: string };

export function checkPermission(
  currentMode: PermissionMode,
  toolName: string,
): PermissionDecision {
  const requiredMode = getToolRequiredMode(toolName);
  
  // Allow mode — everything goes
  if (currentMode === "allow") {
    return { outcome: "allow" };
  }
  
  // Read-only mode — only allow read-only tools
  if (currentMode === "read-only") {
    if (requiredMode === "read-only") {
      return { outcome: "allow" };
    }
    return {
      outcome: "deny",
      reason: `Tool "${toolName}" requires ${modeTitle(requiredMode)} mode. Current mode: ${modeTitle(currentMode)}.`,
    };
  }
  
  // Prompt mode — allow reads, ask for everything else
  if (currentMode === "prompt") {
    if (requiredMode === "read-only" || requiredMode === "workspace-write") {
      return { outcome: "allow" };
    }
    return {
      outcome: "prompt",
      message: `Tool "${toolName}" requires ${modeTitle(requiredMode)} permission. Approve?`,
    };
  }
  
  // Workspace-write mode — allow reads and writes, prompt for execution
  if (currentMode === "workspace-write") {
    if (requiredMode === "read-only" || requiredMode === "workspace-write") {
      return { outcome: "allow" };
    }
    return {
      outcome: "prompt",
      message: `Tool "${toolName}" requires elevated permission. Approve?`,
    };
  }
  
  // Danger-full-access — allow everything
  if (currentMode === "danger-full-access") {
    return { outcome: "allow" };
  }
  
  // Fallback: prompt
  return {
    outcome: "prompt",
    message: `Tool "${toolName}" permission check. Approve?`,
  };
}

// ============================================================================
// Permission Policy
// ============================================================================

export interface PermissionPolicyConfig {
  /** Active permission mode */
  mode: PermissionMode;
  /** Per-tool overrides (tool name → required mode) */
  toolOverrides?: Record<string, PermissionMode>;
  /** Tools that are always denied */
  alwaysDeny?: string[];
  /** Tools that are always allowed */
  alwaysAllow?: string[];
}

export class PermissionPolicy {
  private config: PermissionPolicyConfig;
  
  constructor(config: PermissionPolicyConfig) {
    this.config = config;
  }
  
  get mode(): PermissionMode {
    return this.config.mode;
  }
  
  setMode(mode: PermissionMode): void {
    this.config.mode = mode;
  }
  
  check(toolName: string): PermissionDecision {
    // Check always-deny list
    if (this.config.alwaysDeny?.includes(toolName)) {
      return { outcome: "deny", reason: `Tool "${toolName}" is always denied.` };
    }
    
    // Check always-allow list
    if (this.config.alwaysAllow?.includes(toolName)) {
      return { outcome: "allow" };
    }
    
    // Check tool-specific override
    if (this.config.toolOverrides?.[toolName]) {
      const requiredMode = this.config.toolOverrides[toolName];
      if (modeAllows(this.config.mode, requiredMode)) {
        return { outcome: "allow" };
      }
      if (this.config.mode === "prompt") {
        return {
          outcome: "prompt",
          message: `Tool "${toolName}" requires ${modeTitle(requiredMode)}. Approve?`,
        };
      }
      return {
        outcome: "deny",
        reason: `Tool "${toolName}" requires ${modeTitle(requiredMode)}. Current: ${modeTitle(this.config.mode)}.`,
      };
    }
    
    // Use default check
    return checkPermission(this.config.mode, toolName);
  }
}

// ============================================================================
// Permission Log
// ============================================================================

export interface PermissionLogEntry {
  timestamp: string;
  toolName: string;
  mode: PermissionMode;
  requiredMode: PermissionMode;
  decision: "allow" | "deny" | "prompt";
  approved?: boolean;
}

export function createPermissionLogEntry(
  toolName: string,
  mode: PermissionMode,
  decision: PermissionDecision,
  approved?: boolean,
): PermissionLogEntry {
  return {
    timestamp: new Date().toISOString(),
    toolName,
    mode,
    requiredMode: getToolRequiredMode(toolName),
    decision: decision.outcome,
    approved,
  };
}
