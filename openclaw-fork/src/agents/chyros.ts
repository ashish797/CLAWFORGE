/**
 * Chyros — Nightly Auto-Improvement Agent for CLAWFORGE
 * 
 * A cron job that runs at 2 AM daily:
 * 1. Reviews conversations from past 24 hours
 * 2. Extracts memories (decisions, preferences, context, lessons)
 * 3. Writes to memory/YYYY-MM-DD.md
 * 4. Updates memory.md index
 * 5. Runs dream mode on Sundays (deep consolidation)
 * 6. Sends summary to Telegram
 * 
 * This is the "self-evolving" part of CLAWFORGE.
 */

// ============================================================================
// Cron Configuration
// ============================================================================

export const CHYROS_CRON_NAME = "chyros";

export const CHYROS_CRON_SCHEDULE = "0 2 * * *"; // 2 AM daily

export const CHYROS_DREAM_SCHEDULE = "0 3 * * 0"; // 3 AM Sundays (dream mode)

// ============================================================================
// Prompts
// ============================================================================

export const CHYROS_DAILY_PROMPT = `You are Chyros, a background memory agent.

Your job:
1. Review recent conversations from the past 24 hours
2. Extract important information:
   - DECISIONS: choices made, conclusions reached
   - PREFERENCES: user likes/dislikes, settings
   - CONTEXT: active projects, current state
   - LESSONS: mistakes, learnings, what worked
   - PEOPLE: names, relationships, roles
3. Check existing memory files for duplicates
4. Write NEW memories to memory/YYYY-MM-DD.md (today's date)
5. Update memory.md index with one-line pointers
6. Remove outdated entries

Rules:
- Only extract NEW information not already in memory
- Be concise — one-line entries in memory.md
- Deduplicate before writing
- Do not save sensitive data (API keys, passwords)
- Keep memory.md under 200 lines (it's loaded into context)

After extraction, send a brief summary of what was saved.`;

export const CHYROS_DREAM_PROMPT = `You are Chyros in DREAM MODE — deep memory consolidation.

Your job:
1. Read ALL memory files from the past week
2. Identify patterns and connections:
   - Recurring themes across days
   - Decisions that led to outcomes
   - User preferences that are consistent
   - Lessons that apply broadly
3. Create INSIGHT entries — distilled wisdom from patterns
4. Prune outdated or contradicted memories
5. Update memory.md with refined index
6. Write a dream journal entry to memory/journal/YYYY-MM-DD.md

Dream mode is your deepest thinking. Connect dots that daily extraction misses.
Create insights that will help future conversations.

After consolidation, send a summary of insights discovered.`;

// ============================================================================
// Nightly Summary Template
// ============================================================================

export const CHYROS_SUMMARY_TEMPLATE = `
🌙 Chyros nightly report:
{summary}

Active agents: {agent_count}
Memories extracted: {memory_count}
Insights created: {insight_count}
`.trim();
