/**
 * CLAW.md Integration for CLAWFORGE
 * 
 * Reads CLAW.md from project root and provides structured
 * project-level instructions for the agent.
 * 
 * Format:
 * ## Instructions
 * - Use TypeScript strict mode
 * 
 * ## Rules
 * - Never modify production
 * 
 * ## Context
 * - This is a REST API
 */

import { readFile, access } from "fs/promises";
import { join } from "path";

// ============================================================================
// Types
// ============================================================================

export interface ClawMdContent {
  /** Full raw content */
  raw: string;
  /** Instructions section */
  instructions: string[];
  /** Rules section */
  rules: string[];
  /** Context section */
  context: string[];
  /** Any other sections */
  other: Record<string, string[]>;
  /** Whether CLAW.md was found */
  found: boolean;
}

// ============================================================================
// Reader
// ============================================================================

/**
 * Read and parse CLAW.md from a project directory.
 */
export async function readClawMd(projectDir: string): Promise<ClawMdContent> {
  const clawMdPath = join(projectDir, "CLAW.md");
  
  try {
    await access(clawMdPath);
  } catch {
    return {
      raw: "",
      instructions: [],
      rules: [],
      context: [],
      other: {},
      found: false,
    };
  }
  
  const raw = await readFile(clawMdPath, "utf-8");
  return parseClawMd(raw);
}

/**
 * Parse CLAW.md content into structured sections.
 */
export function parseClawMd(content: string): ClawMdContent {
  const sections = splitSections(content);
  
  const instructions = extractSection(sections, "instructions");
  const rules = extractSection(sections, "rules");
  const context = extractSection(sections, "context");
  
  // Collect other sections
  const other: Record<string, string[]> = {};
  for (const [name, lines] of sections) {
    const lower = name.toLowerCase();
    if (lower !== "instructions" && lower !== "rules" && lower !== "context") {
      other[name] = lines;
    }
  }
  
  return {
    raw: content,
    instructions,
    rules,
    context,
    other,
    found: true,
  };
}

/**
 * Render CLAW.md content as a system prompt section.
 */
export function renderClawMdPrompt(claw: ClawMdContent): string {
  if (!claw.found) {
    return "";
  }
  
  const parts: string[] = [];
  
  if (claw.instructions.length > 0) {
    parts.push("## Project Instructions\n" + claw.instructions.join("\n"));
  }
  
  if (claw.rules.length > 0) {
    parts.push("## Project Rules\n" + claw.rules.join("\n"));
  }
  
  if (claw.context.length > 0) {
    parts.push("## Project Context\n" + claw.context.join("\n"));
  }
  
  for (const [name, lines] of Object.entries(claw.other)) {
    if (lines.length > 0) {
      parts.push(`## ${name}\n` + lines.join("\n"));
    }
  }
  
  return parts.join("\n\n");
}

// ============================================================================
// Helpers
// ============================================================================

function splitSections(content: string): Map<string, string[]> {
  const sections = new Map<string, string[]>();
  let currentSection = "preamble";
  let currentLines: string[] = [];
  
  for (const line of content.split("\n")) {
    const headerMatch = line.match(/^##\s+(.+)$/);
    if (headerMatch) {
      // Save previous section
      if (currentLines.length > 0) {
        sections.set(currentSection, currentLines);
      }
      // Start new section
      currentSection = headerMatch[1].trim();
      currentLines = [];
    } else {
      currentLines.push(line);
    }
  }
  
  // Save last section
  if (currentLines.length > 0) {
    sections.set(currentSection, currentLines);
  }
  
  return sections;
}

function extractSection(sections: Map<string, string[]>, name: string): string[] {
  // Try exact match first
  for (const [sectionName, lines] of sections) {
    if (sectionName.toLowerCase() === name.toLowerCase()) {
      // Filter out empty lines and extract bullet points
      return lines
        .map(l => l.trim())
        .filter(l => l.length > 0)
        .filter(l => l.startsWith("- ") || l.startsWith("* "))
        .map(l => l.replace(/^[-*]\s+/, ""));
    }
  }
  return [];
}
