# CLAWFORGE — Session Start Prompt

## Read First
/data/.openclaw/workspace/CLAWFORGE/ARCHITECTURE.md

## Summary
Self-evolving multi-agent system on Telegram. Three layers:
1. CLAW — entry point, understands requirements, finds departments
2. DEPARTMENT — pod lead, forges agents, assigns tasks
3. AGENTS — from pool, dynamic (re-skinned) or production (locked)

Agent pool: 5 runtimes, identity = config swap, memory persists.
Training loop: first time trains with user, then pipeline locks.
Claude Code enhancements: phases, memory, permissions, hooks, compaction.

## Build Order
1. Claude Code foundation (permissions, hooks, CLAW.md, compaction, memory)
2. Multi-agent system (pool, identity, departments, training)
3. Intelligence (auto-detection, pattern routing, scaling)
4. Polish (Buddy, Chyros, Undercover)

## Rules
- Build in CLAWFORGE/openclaw-fork/
- Never touch production OpenClaw
- GitHub pushes when user says
- All communication on Telegram
- Use Gbrowser for internet research

## Context
- It's 4:30 AM, April 2, 2026
- Started at 4 PM yesterday (12+ hour session)
- Research, Gbrow, SUPERCLAW all published
- CLAWFORGE is the main project now
