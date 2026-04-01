# CLAWFORGE — Session Start Prompt

## Read First
/data/.openclaw/workspace/CLAWFORGE/ARCHITECTURE.md
/data/.openclaw/workspace/CLAWFORGE/BUILD-PLAN.md

## Summary
Self-evolving multi-agent system on Telegram. Three layers:
1. CLAW — entry point, understands requirements, finds departments
2. DEPARTMENT — pod lead, forges agents, assigns tasks
3. AGENTS — from pool, dynamic (re-skinned) or production (locked)

Agent pool: 5 runtimes, identity = config swap, memory persists.
Training loop: first time trains with user, then pipeline locks.
Claude Code enhancements: phases, memory, permissions, hooks, compaction.

## Current Status

### Phase 1: COMPLETE (43 tests)
1. ✅ Permission Modes — src/security/permission-modes.ts
2. ✅ Tool Hooks — src/hooks/tool-hooks.ts
3. ✅ CLAW.md — src/agents/claw-md.ts
4. ✅ Compaction — src/agents/compaction-enhanced.ts
5. ✅ Undercover — src/agents/undercover.ts
6. ✅ Buddy — src/agents/buddy.ts
7. ✅ Chyros — src/agents/chyros.ts

### Phase 2: COMPLETE (18 tests)
1. ✅ Agent Pool — src/agents/agent-pool.ts
2. ✅ Department Manager — src/agents/department.ts
3. ✅ Training Loop — src/agents/training-loop.ts

### Phase 3: NEXT (Intelligence)
- Pattern recognition (route to trained agents)
- Pool scaling
- Telegram inline buttons for permissions

### Phase 4: PENDING (Polish)
- Wire Buddy to Telegram
- Wire Chyros to cron
- End-to-end testing

Total: 61 tests passing across 10 features.

## Rules
- Build in CLAWFORGE/openclaw-fork/
- Never touch production OpenClaw
- GitHub pushes when user says (or in auto mode)
- All communication on Telegram
- Use Gbrowser for internet research

## Context
- Started: April 1, 2026, 4 PM
- Phase 1+2 complete: April 2, 2026, ~5 AM
- 13-hour session
