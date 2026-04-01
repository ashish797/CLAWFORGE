/**
 * Tool Hooks for CLAWFORGE
 * 
 * PreToolUse: runs before tool execution (can deny)
 * PostToolUse: runs after tool execution (can modify output)
 * 
 * Inspired by Claude Code's hook system.
 * Exit codes: 0=allow, 2=deny, other=warn
 */

// ============================================================================
// Types
// ============================================================================

export type ToolHookEvent = "PreToolUse" | "PostToolUse";

export interface ToolHookContext {
  /** Hook event type */
  event: ToolHookEvent;
  /** Name of the tool being executed */
  toolName: string;
  /** Tool input as JSON string */
  toolInput: string;
  /** Tool output (PostToolUse only) */
  toolOutput?: string;
  /** Whether the tool execution resulted in an error */
  isError?: boolean;
}

export type ToolHookDecision =
  | { outcome: "allow"; messages: string[] }
  | { outcome: "deny"; reason: string; messages: string[] }
  | { outcome: "warn"; message: string };

export interface ToolHookConfig {
  /** Shell commands to run before tool execution */
  preToolUse: string[];
  /** Shell commands to run after tool execution */
  postToolUse: string[];
}

// ============================================================================
// Hook Runner
// ============================================================================

export class ToolHookRunner {
  private config: ToolHookConfig;
  
  constructor(config: ToolHookConfig) {
    this.config = config;
  }
  
  /**
   * Run PreToolUse hooks.
   * Returns allow if all hooks succeed (exit 0).
   * Returns deny if any hook exits with code 2.
   * Returns warn for other non-zero exit codes.
   */
  async runPreToolUse(toolName: string, toolInput: string): Promise<ToolHookDecision> {
    if (this.config.preToolUse.length === 0) {
      return { outcome: "allow", messages: [] };
    }
    
    const context: ToolHookContext = {
      event: "PreToolUse",
      toolName,
      toolInput,
    };
    
    return this.runCommands(this.config.preToolUse, context);
  }
  
  /**
   * Run PostToolUse hooks.
   * Can modify tool output by returning messages.
   * Can deny (mark as error) if hook exits with code 2.
   */
  async runPostToolUse(
    toolName: string,
    toolInput: string,
    toolOutput: string,
    isError: boolean,
  ): Promise<ToolHookDecision> {
    if (this.config.postToolUse.length === 0) {
      return { outcome: "allow", messages: [] };
    }
    
    const context: ToolHookContext = {
      event: "PostToolUse",
      toolName,
      toolInput,
      toolOutput,
      isError,
    };
    
    return this.runCommands(this.config.postToolUse, context);
  }
  
  private async runCommands(
    commands: string[],
    context: ToolHookContext,
  ): Promise<ToolHookDecision> {
    const messages: string[] = [];
    
    for (const command of commands) {
      const result = await this.runCommand(command, context);
      
      if (result.outcome === "deny") {
        return {
          outcome: "deny",
          reason: result.message || `${context.event} hook denied tool "${context.toolName}"`,
          messages: [...messages, result.message || ""].filter(Boolean),
        };
      }
      
      if (result.message) {
        messages.push(result.message);
      }
    }
    
    return { outcome: "allow", messages };
  }
  
  private async runCommand(
    command: string,
    context: ToolHookContext,
  ): Promise<ToolHookDecision> {
    // Build environment variables for the hook
    const env: Record<string, string> = {
      HOOK_EVENT: context.event,
      HOOK_TOOL_NAME: context.toolName,
      HOOK_TOOL_INPUT: context.toolInput,
      HOOK_TOOL_IS_ERROR: context.isError ? "1" : "0",
    };
    
    if (context.toolOutput !== undefined) {
      env.HOOK_TOOL_OUTPUT = context.toolOutput;
    }
    
    // Build JSON payload for stdin
    const payload = JSON.stringify({
      hook_event_name: context.event,
      tool_name: context.toolName,
      tool_input: tryParseJSON(context.toolInput),
      tool_output: context.toolOutput,
      tool_result_is_error: context.isError ?? false,
    });
    
    try {
      // Execute the hook command
      const proc = Bun.spawn(["sh", "-lc", command], {
        env: { ...process.env, ...env },
        stdin: Buffer.from(payload),
        stdout: "pipe",
        stderr: "pipe",
      });
      
      const stdout = (await proc.stdout.text()).trim();
      const stderr = (await proc.stderr.text()).trim();
      const exitCode = await proc.exited;
      
      if (exitCode === 0) {
        return {
          outcome: "allow",
          message: stdout || undefined,
        };
      }
      
      if (exitCode === 2) {
        return {
          outcome: "deny",
          message: stdout || `${context.event} hook denied tool "${context.toolName}"`,
        };
      }
      
      // Other non-zero: warn but allow
      return {
        outcome: "warn",
        message: `Hook "${command}" exited with code ${exitCode}. Allowing execution to continue.${stdout ? `: ${stdout}` : ""}${stderr ? ` (stderr: ${stderr})` : ""}`,
      };
    } catch (error) {
      return {
        outcome: "warn",
        message: `Hook "${command}" failed to start: ${error}`,
      };
    }
  }
}

// ============================================================================
// Utilities
// ============================================================================

function tryParseJSON(str: string): unknown {
  try {
    return JSON.parse(str);
  } catch {
    return { raw: str };
  }
}

// ============================================================================
// Factory
// ============================================================================

export function createToolHookRunner(config?: Partial<ToolHookConfig>): ToolHookRunner {
  return new ToolHookRunner({
    preToolUse: config?.preToolUse ?? [],
    postToolUse: config?.postToolUse ?? [],
  });
}
