/**
 * Pattern Recognition for CLAWFORGE
 * 
 * Routes requests to trained agents when similar tasks appear.
 * Tracks task types and their frequency.
 * Suggests persistent agent creation when threshold is hit.
 */

import { readFile, writeFile, mkdir } from "fs/promises";
import { join } from "path";

// ============================================================================
// Types
// ============================================================================

export interface TaskPattern {
  /** Task type/category */
  type: string;
  /** How many times this type appeared */
  count: number;
  /** Keywords associated with this task type */
  keywords: string[];
  /** Agent assigned to this type (if any) */
  assignedAgent: string | null;
  /** When this pattern was last seen */
  lastSeen: string;
  /** Whether a persistent agent has been created for this */
  persistent: boolean;
}

export interface RoutingResult {
  /** Whether a trained agent was found */
  found: boolean;
  /** The agent name to route to */
  agentName?: string;
  /** The department to route to */
  department?: string;
  /** Confidence in the routing (0-1) */
  confidence: number;
  /** Whether to suggest creating a persistent agent */
  suggestPersistent: boolean;
}

export interface PatternConfig {
  /** Minimum occurrences before suggesting persistent agent */
  persistentThreshold: number;
  /** Minimum confidence for auto-routing */
  minConfidence: number;
  /** Keywords to ignore when matching */
  stopWords: string[];
}

export const DEFAULT_PATTERN_CONFIG: PatternConfig = {
  persistentThreshold: 3,
  minConfidence: 0.6,
  stopWords: ["the", "a", "an", "is", "are", "was", "were", "be", "been", "do", "does", "did", "have", "has", "had", "will", "would", "could", "should", "can", "may", "might", "shall", "to", "of", "in", "for", "on", "with", "at", "by", "from", "as", "into", "through", "during", "before", "after", "above", "below", "between", "under", "again", "further", "then", "once", "here", "there", "when", "where", "why", "how", "all", "each", "every", "both", "few", "more", "most", "other", "some", "such", "no", "not", "only", "own", "same", "so", "than", "too", "very", "just", "now", "i", "me", "my", "we", "our", "you", "your", "he", "him", "his", "she", "her", "it", "its", "they", "them", "their", "this", "that", "these", "those", "what", "which", "who", "whom"],
};

// ============================================================================
// Pattern Matcher
// ============================================================================

export class PatternMatcher {
  private patterns: Map<string, TaskPattern> = new Map();
  private config: PatternConfig;
  private dataDir: string;

  constructor(dataDir: string, config: Partial<PatternConfig> = {}) {
    this.dataDir = dataDir;
    this.config = { ...DEFAULT_PATTERN_CONFIG, ...config };
  }

  /**
   * Record a task and find matching patterns.
   */
  recordTask(taskDescription: string): RoutingResult {
    const keywords = this.extractKeywords(taskDescription);
    const taskType = this.classifyTask(keywords);

    // Update pattern
    let pattern = this.patterns.get(taskType);
    if (!pattern) {
      pattern = {
        type: taskType,
        count: 0,
        keywords: keywords,
        assignedAgent: null,
        lastSeen: new Date().toISOString(),
        persistent: false,
      };
      this.patterns.set(taskType, pattern);
    }

    pattern.count++;
    pattern.lastSeen = new Date().toISOString();
    // Merge new keywords
    for (const kw of keywords) {
      if (!pattern.keywords.includes(kw)) {
        pattern.keywords.push(kw);
      }
    }

    // Check for routing
    if (pattern.assignedAgent) {
      return {
        found: true,
        agentName: pattern.assignedAgent,
        department: this.suggestDepartment(taskType),
        confidence: 0.9,
        suggestPersistent: false,
      };
    }

    // Check if we should suggest persistent agent
    const suggestPersistent =
      pattern.count >= this.config.persistentThreshold &&
      !pattern.persistent;

    return {
      found: false,
      confidence: 0,
      suggestPersistent,
    };
  }

  /**
   * Assign an agent to a task type.
   */
  assignAgent(taskType: string, agentName: string): boolean {
    const pattern = this.patterns.get(taskType);
    if (!pattern) return false;

    pattern.assignedAgent = agentName;
    pattern.persistent = true;
    return true;
  }

  /**
   * Unassign an agent from a task type.
   */
  unassignAgent(taskType: string): boolean {
    const pattern = this.patterns.get(taskType);
    if (!pattern) return false;

    pattern.assignedAgent = null;
    pattern.persistent = false;
    return true;
  }

  /**
   * Get all patterns.
   */
  getPatterns(): TaskPattern[] {
    return Array.from(this.patterns.values());
  }

  /**
   * Get patterns that need persistent agents.
   */
  getPatternsNeedingAgents(): TaskPattern[] {
    return Array.from(this.patterns.values()).filter(
      p => p.count >= this.config.persistentThreshold && !p.persistent
    );
  }

  /**
   * Get routing suggestion for a task.
   */
  suggestRoute(taskDescription: string): RoutingResult {
    const keywords = this.extractKeywords(taskDescription);
    const taskType = this.classifyTask(keywords);

    const pattern = this.patterns.get(taskType);
    if (pattern?.assignedAgent) {
      return {
        found: true,
        agentName: pattern.assignedAgent,
        department: this.suggestDepartment(taskType),
        confidence: 0.9,
        suggestPersistent: false,
      };
    }

    // Check for keyword matches with existing patterns
    let bestMatch: { type: string; score: number } | null = null;
    for (const [type, p] of this.patterns) {
      const score = this.keywordOverlap(keywords, p.keywords);
      if (score > (bestMatch?.score || 0)) {
        bestMatch = { type, score };
      }
    }

    if (bestMatch && bestMatch.score >= this.config.minConfidence) {
      const p = this.patterns.get(bestMatch.type)!;
      if (p.assignedAgent) {
        return {
          found: true,
          agentName: p.assignedAgent,
          department: this.suggestDepartment(bestMatch.type),
          confidence: bestMatch.score,
          suggestPersistent: false,
        };
      }
    }

    return {
      found: false,
      confidence: bestMatch?.score || 0,
      suggestPersistent: false,
    };
  }

  // ========================================================================
  // Helpers
  // ========================================================================

  private extractKeywords(text: string): string[] {
    return text
      .toLowerCase()
      .split(/\s+/)
      .filter(w => w.length > 2)
      .filter(w => !this.config.stopWords.includes(w))
      .filter(w => !/^\d+$/.test(w))
      .slice(0, 20); // Top 20 keywords
  }

  private classifyTask(keywords: string[]): string {
    const categories: Record<string, string[]> = {
      research: ["research", "study", "analyze", "investigate", "compare", "find", "search", "papers", "read"],
      coding: ["code", "build", "create", "develop", "program", "function", "api", "database", "deploy", "test"],
      writing: ["write", "article", "blog", "essay", "content", "copy", "lyrics", "story", "draft"],
      multimedia: ["song", "music", "audio", "video", "image", "design", "animation", "edit"],
      data: ["data", "analytics", "statistics", "dashboard", "report", "chart", "visualize"],
      operations: ["schedule", "plan", "manage", "organize", "coordinate", "monitor"],
      finance: ["finance", "budget", "invoice", "payment", "accounting", "money"],
    };

    let bestCategory = "general";
    let bestScore = 0;

    for (const [category, words] of Object.entries(categories)) {
      const score = keywords.filter(kw => words.includes(kw)).length;
      if (score > bestScore) {
        bestScore = score;
        bestCategory = category;
      }
    }

    return bestCategory;
  }

  private suggestDepartment(taskType: string): string {
    const mapping: Record<string, string> = {
      research: "Research",
      coding: "Engineering",
      writing: "Writing",
      multimedia: "Multimedia",
      data: "Data",
      operations: "Operations",
      finance: "Finance",
    };
    return mapping[taskType] || "General";
  }

  private keywordOverlap(a: string[], b: string[]): number {
    const setA = new Set(a);
    const setB = new Set(b);
    let overlap = 0;
    for (const kw of setA) {
      if (setB.has(kw)) overlap++;
    }
    const union = new Set([...a, ...b]).size;
    return union > 0 ? overlap / union : 0;
  }

  // ========================================================================
  // Status
  // ========================================================================

  getStatusString(): string {
    const patterns = this.getPatterns();
    if (patterns.length === 0) return "No patterns recorded yet.";

    const lines = patterns.map(p => {
      const agent = p.assignedAgent ? `→ ${p.assignedAgent}` : "(no agent)";
      const persistent = p.persistent ? "🔒" : "🔄";
      return `${persistent} ${p.type}: ${p.count} occurrences ${agent}`;
    });

    return lines.join("\n");
  }

  // ========================================================================
  // Persistence
  // ========================================================================

  async save(): Promise<void> {
    await mkdir(this.dataDir, { recursive: true });
    const data = Array.from(this.patterns.entries());
    await writeFile(
      join(this.dataDir, "patterns.json"),
      JSON.stringify(data, null, 2),
    );
  }

  async load(): Promise<void> {
    try {
      const raw = await readFile(join(this.dataDir, "patterns.json"), "utf-8");
      const data = JSON.parse(raw);
      this.patterns = new Map(data);
    } catch {
      // First run
    }
  }
}

// ============================================================================
// Factory
// ============================================================================

export async function createPatternMatcher(
  dataDir: string,
  config?: Partial<PatternConfig>,
): Promise<PatternMatcher> {
  const matcher = new PatternMatcher(dataDir, config);
  await matcher.load();
  return matcher;
}
