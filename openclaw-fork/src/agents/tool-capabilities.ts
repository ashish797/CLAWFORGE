/**
 * Tool Capabilities for CLAWFORGE
 * 
 * Enhanced tool definitions inspired by Claude Code's original TypeScript.
 * Adds per-input checks that our simple per-tool model was missing.
 */

// ============================================================================
// Types
// ============================================================================

export interface ToolCapabilities {
  /** Tool name */
  name: string;
  /** Aliases for backwards compatibility */
  aliases?: string[];
  /** Keyword hint for tool discovery */
  searchHint?: string;
  /** Description */
  description: string;
  /** Input schema (JSON Schema) */
  inputSchema: Record<string, unknown>;
  /** Whether this tool is enabled */
  enabled: boolean;
}

export interface ToolInputCheck {
  /** Is this specific input read-only? */
  isReadOnly: boolean;
  /** Is this input destructive (irreversible)? */
  isDestructive: boolean;
  /** Can multiple instances of this tool run concurrently? */
  isConcurrencySafe: boolean;
  /** Required permission mode */
  requiredPermission: string;
}

// ============================================================================
// Tool Registry
// ============================================================================

export class ToolRegistry {
  private tools: Map<string, ToolCapabilities> = new Map();

  /**
   * Register a tool.
   */
  register(tool: ToolCapabilities): void {
    this.tools.set(tool.name, tool);
    // Register aliases
    if (tool.aliases) {
      for (const alias of tool.aliases) {
        this.tools.set(alias, tool);
      }
    }
  }

  /**
   * Get a tool by name or alias.
   */
  get(name: string): ToolCapabilities | null {
    return this.tools.get(name) || null;
  }

  /**
   * Search tools by keyword.
   */
  search(keyword: string): ToolCapabilities[] {
    const lower = keyword.toLowerCase();
    return Array.from(new Set(this.tools.values())).filter(
      t => t.name.toLowerCase().includes(lower) ||
           t.searchHint?.toLowerCase().includes(lower) ||
           t.description.toLowerCase().includes(lower)
    );
  }

  /**
   * Get all registered tools.
   */
  getAll(): ToolCapabilities[] {
    return Array.from(new Set(this.tools.values()));
  }

  /**
   * Get enabled tools only.
   */
  getEnabled(): ToolCapabilities[] {
    return this.getAll().filter(t => t.enabled);
  }
}

// ============================================================================
// Input Checker (per-input capability checks)
// ============================================================================

/**
 * Check tool input capabilities.
 * Inspired by Claude Code's isReadOnly(input) and isDestructive(input).
 */
export function checkToolInput(toolName: string, input: Record<string, unknown>): ToolInputCheck {
  // Read-only tools
  const readOnlyTools = ["file_read", "glob", "grep", "web_search", "web_fetch", "list", "status", "text", "html", "links"];
  
  // Destructive tools
  const destructiveTools = ["file_write", "file_edit", "exec", "bash", "delete", "fs_delete", "fs_move"];
  
  // Non-concurrent tools (can't run multiple instances)
  const nonConcurrentTools = ["exec", "bash", "shell", "spawn"];

  const isReadOnly = readOnlyTools.some(t => toolName.startsWith(t));
  const isDestructive = destructiveTools.some(t => toolName.startsWith(t));
  const isConcurrencySafe = !nonConcurrentTools.some(t => toolName.startsWith(t));

  // Determine required permission
  let requiredPermission = "prompt";
  if (isReadOnly) requiredPermission = "read-only";
  else if (isDestructive) requiredPermission = "workspace-write";
  else if (toolName.startsWith("exec") || toolName.startsWith("bash")) requiredPermission = "prompt";

  return {
    isReadOnly,
    isDestructive,
    isConcurrencySafe,
    requiredPermission,
  };
}

// ============================================================================
// Default Tool Definitions
// ============================================================================

export const DEFAULT_TOOLS: ToolCapabilities[] = [
  { name: "file_read", searchHint: "read file contents", description: "Read a file", inputSchema: { path: "string" }, enabled: true },
  { name: "file_write", searchHint: "create or overwrite file", description: "Write a file", inputSchema: { path: "string", content: "string" }, enabled: true },
  { name: "file_edit", searchHint: "modify file in place", description: "Edit a file", inputSchema: { path: "string", old: "string", new: "string" }, enabled: true },
  { name: "glob", searchHint: "find files by pattern", description: "Glob pattern search", inputSchema: { pattern: "string" }, enabled: true },
  { name: "grep", searchHint: "search file contents", description: "Content search", inputSchema: { pattern: "string", path: "string" }, enabled: true },
  { name: "exec", searchHint: "run shell command", description: "Execute command", inputSchema: { command: "string" }, enabled: true },
  { name: "web_search", searchHint: "search the web", description: "Web search", inputSchema: { query: "string" }, enabled: true },
  { name: "web_fetch", searchHint: "fetch URL content", description: "Fetch web content", inputSchema: { url: "string" }, enabled: true },
  { name: "agent_spawn", searchHint: "create sub-agent", description: "Spawn a sub-agent", inputSchema: { task: "string" }, enabled: true },
  { name: "agent_send", searchHint: "message agent", description: "Send message to agent", inputSchema: { agent: "string", message: "string" }, enabled: true },
];

/**
 * Create and populate a default tool registry.
 */
export function createDefaultToolRegistry(): ToolRegistry {
  const registry = new ToolRegistry();
  for (const tool of DEFAULT_TOOLS) {
    registry.register(tool);
  }
  return registry;
}
