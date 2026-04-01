/**
 * Telegram Integration for CLAWFORGE
 * 
 * Handles:
 * - Inline buttons for permission approvals
 * - Buddy reactions after agent responses
 * - Department topic management
 * - Status commands (/status, /buddy, /agents)
 */

// ============================================================================
// Types
// ============================================================================

export interface TelegramInlineButton {
  text: string;
  callbackData: string;
}

export interface TelegramInlineKeyboard {
  inlineKeyboard: TelegramInlineButton[][];
}

export interface PermissionPrompt {
  /** Tool name being checked */
  toolName: string;
  /** Tool input (simplified) */
  toolInput: string;
  /** Required permission mode */
  requiredMode: string;
  /** Current permission mode */
  currentMode: string;
  /** Message to show user */
  message: string;
}

// ============================================================================
// Permission Buttons
// ============================================================================

/**
 * Build inline keyboard for permission approval.
 */
export function buildPermissionKeyboard(prompt: PermissionPrompt): TelegramInlineKeyboard {
  return {
    inlineKeyboard: [
      [
        { text: "✅ Approve", callbackData: `perm:allow:${prompt.toolName}` },
        { text: "❌ Deny", callbackData: `perm:deny:${prompt.toolName}` },
      ],
      [
        { text: "✅ Always allow this tool", callbackData: `perm:always_allow:${prompt.toolName}` },
      ],
    ],
  };
}

/**
 * Build permission prompt message for Telegram.
 */
export function buildPermissionMessage(prompt: PermissionPrompt): string {
  const lines = [
    `⚠️ **Permission Required**`,
    ``,
    `Tool: \`${prompt.toolName}\``,
    `Required: ${prompt.requiredMode}`,
    `Current: ${prompt.currentMode}`,
    ``,
    prompt.message,
  ];
  return lines.join("\n");
}

// ============================================================================
// Buddy Reaction
// ============================================================================

/**
 * Build buddy reaction message for Telegram.
 */
export function buildBuddyReaction(emoji: string, message: string): string {
  return `${emoji} ${message}`;
}

// ============================================================================
// Status Commands
// ============================================================================

/**
 * Build /status response.
 */
export function buildStatusResponse(params: {
  poolStatus: string;
  departments: string;
  patterns: string;
  buddy: string;
}): string {
  const lines = [
    `📊 **CLAW Status**`,
    ``,
    `**Agent Pool**`,
    params.poolStatus,
    ``,
    `**Departments**`,
    params.departments,
    ``,
    `**Patterns**`,
    params.patterns,
    ``,
    `**Buddy**`,
    params.buddy,
  ];
  return lines.join("\n");
}

/**
 * Build /agents response.
 */
export function buildAgentsResponse(agents: Array<{
  name: string;
  emoji: string;
  department: string;
  type: string;
  status: string;
}>): string {
  if (agents.length === 0) return "No active agents.";

  const lines = agents.map(a =>
    `${a.emoji} ${a.name} (${a.department}) — ${a.type} — ${a.status}`
  );

  return `**Active Agents:**\n${lines.join("\n")}`;
}

/**
 * Build forge confirmation message.
 */
export function buildForgeConfirmation(params: {
  department: string;
  departmentEmoji: string;
  agentName: string;
  agentEmoji: string;
  isNewDepartment: boolean;
}): string {
  const lines: string[] = [];

  if (params.isNewDepartment) {
    lines.push(`🏗️ Creating department: ${params.departmentEmoji} ${params.department}`);
  }

  lines.push(`🛠️ Forging agent: ${params.agentEmoji} ${params.agentName}`);
  lines.push(`📋 Assigning to ${params.departmentEmoji} ${params.department}`);
  lines.push(``);
  lines.push(`Entering training mode...`);

  return lines.join("\n");
}

/**
 * Build training status message.
 */
export function buildTrainingStatus(params: {
  agentName: string;
  agentEmoji: string;
  iteration: number;
  totalIterations: number;
  status: string;
}): string {
  const emoji = {
    in_progress: "🔄",
    completed: "✅",
    locked: "🔒",
  }[params.status] || "⬜";

  return `${emoji} ${params.agentEmoji} ${params.agentName}: Training ${params.status} (iteration ${params.iteration}/${params.totalIterations})`;
}

// ============================================================================
// Callback Data Parsing
// ============================================================================

/**
 * Parse permission callback data.
 */
export function parsePermissionCallback(data: string): {
  action: "allow" | "deny" | "always_allow";
  toolName: string;
} | null {
  const parts = data.split(":");
  if (parts.length !== 3 || parts[0] !== "perm") return null;

  return {
    action: parts[1] as "allow" | "deny" | "always_allow",
    toolName: parts[2],
  };
}
