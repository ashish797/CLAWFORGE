/**
 * CLAW.md → System Prompt Integration for CLAWFORGE
 * 
 * Reads CLAW.md from project root and injects it into the agent's system prompt.
 * This is how Claude Code gives project-specific instructions to agents.
 */

import { readClawMd, renderClawMdPrompt, type ClawMdContent } from "./claw-md.js";

// ============================================================================
// System Prompt Integration
// ============================================================================

/**
 * Build the CLAW.md section for system prompt injection.
 * Call this during system prompt construction.
 * 
 * @param projectRoot - Project root directory
 * @returns CLAW.md content formatted for prompt, or empty string if not found
 */
export async function buildClawMdPromptSection(projectRoot: string): Promise<string> {
  const clawMd = await readClawMd(projectRoot);
  
  if (!clawMd.found) {
    return "";
  }

  return renderClawMdPrompt(clawMd);
}

/**
 * Inject CLAW.md into an existing system prompt.
 * Places it after workspace context, before skills.
 * 
 * @param existingPrompt - The current system prompt
 * @param projectRoot - Project root directory
 * @returns Updated system prompt with CLAW.md injected
 */
export async function injectClawMd(
  existingPrompt: string,
  projectRoot: string,
): Promise<string> {
  const clawSection = await buildClawMdPromptSection(projectRoot);
  
  if (!clawSection) {
    return existingPrompt;
  }

  // Find injection point — after "## Workspace" or "## Project" section
  // If not found, append at end
  const injectionMarker = "## Skills";
  const injectionIndex = existingPrompt.indexOf(injectionMarker);

  if (injectionIndex !== -1) {
    // Inject before Skills section
    return (
      existingPrompt.slice(0, injectionIndex) +
      clawSection +
      "\n\n" +
      existingPrompt.slice(injectionIndex)
    );
  }

  // Fallback: append at end
  return existingPrompt + "\n\n" + clawSection;
}

/**
 * Build a memory index section for system prompt injection.
 * Provides lightweight pointers to agent memory files.
 * 
 * @param memoryDir - Agent's memory directory
 * @returns Memory index formatted for prompt
 */
export function buildMemoryIndexPrompt(memoryIndex: Record<string, string>): string {
  const entries = Object.entries(memoryIndex);
  
  if (entries.length === 0) {
    return "";
  }

  const lines = entries.map(([key, pointer]) => `- ${key}: ${pointer}`);
  
  return [
    "## Agent Memory Index",
    "",
    "Lightweight pointers to memory files. Load on demand.",
    "",
    ...lines,
  ].join("\n");
}

/**
 * Build the full system prompt with all CLAWFORGE enhancements.
 * 
 * @param params - System prompt parameters
 * @returns Complete system prompt
 */
export function buildEnhancedSystemPrompt(params: {
  basePrompt: string;
  clawMdSection?: string;
  memoryIndex?: string;
  permissionMode?: string;
  conversationPhases?: boolean;
}): string {
  const sections: string[] = [params.basePrompt];

  // Add CLAW.md section
  if (params.clawMdSection) {
    sections.push(params.clawMdSection);
  }

  // Add memory index
  if (params.memoryIndex) {
    sections.push(params.memoryIndex);
  }

  // Add permission mode
  if (params.permissionMode) {
    sections.push([
      "## Permission Mode",
      "",
      `Current mode: ${params.permissionMode}`,
      "Check permissions before executing tools. Ask user if uncertain.",
    ].join("\n"));
  }

  // Add conversation phases instruction
  if (params.conversationPhases !== false) {
    sections.push([
      "## Working Method",
      "",
      "For complex tasks, follow these phases:",
      "1. PLAN: Break the task into clear requirements and sub-tasks",
      "2. ARCHITECTURE: Define structure, approach, and dependencies",
      "3. EXECUTE: Implement in chunks, testing each chunk",
      "4. VERIFY: Test the complete solution",
      "",
      "Do NOT do everything at once. Work in phases.",
      "Communicate progress to the user between phases.",
    ].join("\n"));
  }

  return sections.filter(s => s.trim()).join("\n\n");
}
