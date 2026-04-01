# CLAWFORGE

Self-evolving multi-agent system on Telegram.

Built on OpenClaw, enhanced with Claude Code's architecture patterns.

## Architecture

Three layers:
1. **CLAW** — Entry point. Understands requirements. Finds departments.
2. **DEPARTMENT** — Pod lead. Forges agents. Assigns tasks.
3. **AGENTS** — From pool. Dynamic (re-skinned) or Production (locked).

## Key Features

- Agent pool with identity swapping (5 runtimes, re-skinnable)
- Training loop (first time trains with user, then pipeline locks)
- Production agents (user-locked, never re-skinned)
- Claude Code enhancements (phases, memory, hooks, permissions)
- Telegram UX (one topic per department, clean output)
- Self-evolving (Chyros nightly auto-improvement)

## Documents

- `ARCHITECTURE.md` — System design
- `BUILD-PLAN.md` — Detailed build plan (4 days, 18 hours)
- `CHAT-HISTORY.md` — Session history and key decisions
- `SESSION-PROMPT.md` — Session start prompt

## Build Order

1. Claude Code foundation (permissions, hooks, CLAW.md, compaction, memory)
2. Multi-agent system (pool, identity, departments, training)
3. Intelligence (auto-detection, pattern routing, scaling)
4. Polish (Buddy, Chyros, Undercover)

## Reference

- OpenClaw: github.com/openclaw/openclaw
- claw-code: github.com/instructkr/claw-code (114K stars)

---
Started: 2026-04-01 16:00 GMT+5:30
