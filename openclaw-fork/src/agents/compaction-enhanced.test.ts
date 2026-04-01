/**
 * Unit tests for compaction-enhanced.ts
 */

import { describe, it, expect } from "vitest";
import {
  buildContinuationMessage,
  formatSummary,
  estimateTokens,
  shouldCompact,
  CONTINUATION_PREAMBLE,
  DIRECT_RESUME_INSTRUCTION,
  DEFAULT_COMPACTION_CONFIG,
} from "./compaction-enhanced.js";

describe("buildContinuationMessage", () => {
  it("includes continuation preamble", () => {
    const result = buildContinuationMessage("Test summary");
    expect(result).toContain("being continued from a previous conversation");
  });

  it("includes summary", () => {
    const result = buildContinuationMessage("User asked about auth.");
    expect(result).toContain("User asked about auth.");
  });

  it("includes direct resume instruction by default", () => {
    const result = buildContinuationMessage("Summary");
    expect(result).toContain("Continue the conversation from where it left off");
  });

  it("includes recent messages note by default", () => {
    const result = buildContinuationMessage("Summary");
    expect(result).toContain("preserved verbatim");
  });

  it("can suppress follow-up instruction", () => {
    const result = buildContinuationMessage("Summary", { suppressFollowUp: false });
    expect(result).not.toContain("Continue the conversation from where it left off");
  });
});

describe("formatSummary", () => {
  it("strips analysis blocks", () => {
    const input = "<analysis>thinking...</analysis>The user asked about auth.";
    const result = formatSummary(input);
    expect(result).not.toContain("analysis");
    expect(result).toContain("User asked about auth.");
  });

  it("extracts summary blocks", () => {
    const input = "<summary>Key decisions were made</summary>";
    const result = formatSummary(input);
    expect(result).toContain("Summary:");
    expect(result).toContain("Key decisions were made");
  });

  it("collapses blank lines", () => {
    const input = "Line 1\n\n\n\nLine 2";
    const result = formatSummary(input);
    expect(result).not.toContain("\n\n\n");
  });

  it("trims whitespace", () => {
    const result = formatSummary("  summary  ");
    expect(result).toBe("summary");
  });
});

describe("estimateTokens", () => {
  it("estimates roughly 4 chars per token", () => {
    expect(estimateTokens("")).toBe(0);
    expect(estimateTokens("test")).toBe(1); // 4 chars = 1 token
    expect(estimateTokens("a".repeat(40))).toBe(10); // 40 chars = 10 tokens
  });
});

describe("shouldCompact", () => {
  it("returns true when tokens exceed threshold", () => {
    expect(shouldCompact(15_000)).toBe(true);
  });

  it("returns false when tokens below threshold", () => {
    expect(shouldCompact(5_000)).toBe(false);
  });

  it("respects custom config", () => {
    expect(shouldCompact(500, { preserveRecentMessages: 4, maxEstimatedTokens: 100 })).toBe(true);
  });
});

describe("constants", () => {
  it("has continuation preamble", () => {
    expect(CONTINUATION_PREAMBLE).toContain("continued from a previous conversation");
  });

  it("has direct resume instruction", () => {
    expect(DIRECT_RESUME_INSTRUCTION).toContain("Continue the conversation");
    expect(DIRECT_RESUME_INSTRUCTION).toContain("do not acknowledge");
  });

  it("has sensible defaults", () => {
    expect(DEFAULT_COMPACTION_CONFIG.preserveRecentMessages).toBe(4);
    expect(DEFAULT_COMPACTION_CONFIG.maxEstimatedTokens).toBe(10_000);
  });
});
