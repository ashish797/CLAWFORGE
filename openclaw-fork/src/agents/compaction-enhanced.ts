/**
 * Compaction Enhancement for CLAWFORGE
 * 
 * Adds Claude Code's continuation pattern to OpenClaw's compaction:
 * - Continuation preamble when resuming compacted session
 * - "Resume directly" instruction (don't acknowledge summary)
 * - Preserve last N messages verbatim
 * - Summary formatting
 */

// ============================================================================
// Constants
// ============================================================================

/** Preamble added after compaction */
export const CONTINUATION_PREAMBLE =
  "This session is being continued from a previous conversation that ran out of context. The summary below covers the earlier portion of the conversation.\n\n";

/** Note about preserved messages */
export const RECENT_MESSAGES_NOTE = "Recent messages are preserved verbatim.";

/** Instruction to resume directly without acknowledgment */
export const DIRECT_RESUME_INSTRUCTION =
  "Continue the conversation from where it left off without asking the user any further questions. Resume directly — do not acknowledge the summary, do not recap what was happening, and do not preface with continuation text.";

// ============================================================================
// Types
// ============================================================================

export interface CompactionConfig {
  /** Number of recent messages to preserve verbatim */
  preserveRecentMessages: number;
  /** Maximum estimated tokens before compaction triggers */
  maxEstimatedTokens: number;
}

export const DEFAULT_COMPACTION_CONFIG: CompactionConfig = {
  preserveRecentMessages: 4,
  maxEstimatedTokens: 10_000,
};

export interface CompactionResult {
  /** The summary of compacted messages */
  summary: string;
  /** Formatted summary ready for prompt injection */
  formattedSummary: string;
  /** Number of messages removed */
  removedMessageCount: number;
  /** Whether compaction was performed */
  compacted: boolean;
}

// ============================================================================
// Compaction Functions
// ============================================================================

/**
 * Build the continuation message that gets injected after compaction.
 */
export function buildContinuationMessage(
  summary: string,
  options: {
    suppressFollowUp?: boolean;
    recentMessagesPreserved?: boolean;
  } = {},
): string {
  const { suppressFollowUp = true, recentMessagesPreserved = true } = options;

  let message = CONTINUATION_PREAMBLE + formatSummary(summary);

  if (recentMessagesPreserved) {
    message += "\n\n" + RECENT_MESSAGES_NOTE;
  }

  if (suppressFollowUp) {
    message += "\n" + DIRECT_RESUME_INSTRUCTION;
  }

  return message;
}

/**
 * Format a raw summary into clean text.
 * Strips analysis blocks, extracts summary blocks.
 */
export function formatSummary(summary: string): string {
  // Strip <analysis> blocks
  let formatted = stripTagBlock(summary, "analysis");

  // Extract <summary> blocks and replace with plain text
  const summaryContent = extractTagBlock(formatted, "summary");
  if (summaryContent) {
    formatted = formatted.replace(
      `<summary>${summaryContent}</summary>`,
      `Summary:\n${summaryContent.trim()}`,
    );
  }

  // Collapse blank lines
  return collapseBlankLines(formatted).trim();
}

/**
 * Estimate token count for a message.
 * Rough estimate: ~4 characters per token for English.
 */
export function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

/**
 * Check if compaction should be triggered.
 */
export function shouldCompact(
  totalTokens: number,
  config: CompactionConfig = DEFAULT_COMPACTION_CONFIG,
): boolean {
  return totalTokens >= config.maxEstimatedTokens;
}

// ============================================================================
// Helper Functions
// ============================================================================

function stripTagBlock(text: string, tag: string): string {
  const regex = new RegExp(`<${tag}>[\\s\\S]*?</${tag}>`, "gi");
  return text.replace(regex, "");
}

function extractTagBlock(text: string, tag: string): string | null {
  const regex = new RegExp(`<${tag}>([\\s\\S]*?)</${tag}>`, "i");
  const match = text.match(regex);
  return match ? match[1] : null;
}

function collapseBlankLines(text: string): string {
  return text.replace(/\n{3,}/g, "\n\n");
}
