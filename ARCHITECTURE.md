# CLAWFORGE — Final Architecture Plan

## Vision
A self-evolving multi-agent system on Telegram. Three layers. Smart agent pool. Training loop. Production agents.

## The Three Layers

### Layer 1: CLAW (Entry Point)
- Never does work itself
- Two tasks only:
  1. Understand user requirements (conversation until user says "forge")
  2. Find or create department
- Routes requests to appropriate department
- Manages department lifecycle

### Layer 2: DEPARTMENT (Pod Lead)
- Coordinator between CLAW and agents
- Two tasks:
  1. Forge agent (from pool, with requirements from CLAW)
  2. Assign task to agent
- Manages agent pool within its department
- Handles training phase for new agents
- Reports results back to CLAW

### Layer 3: AGENTS (Workers)
- Do the actual work
- Come from the agent pool
- Two types:
  - **Dynamic**: Re-skinned as needed, return to pool after task
  - **Production**: Locked, permanent, never re-skinned

## The Agent Pool

### Pool Structure
```
5 runtimes (default, configurable):
  [Runtime 1] — dynamic or production
  [Runtime 2] — dynamic or production
  [Runtime 3] — dynamic or production
  [Runtime 4] — dynamic or production
  [Runtime 5] — dynamic or production
```

### Identity = Configuration
Agent identity is a config object, not a separate process:
```
{
  "name": "Songwriter",
  "emoji": "🎶",
  "department": "Multimedia",
  "claw_md": "You write song lyrics...",
  "memory_dir": "memory/agents/songwriter/",
  "permission_level": "WorkspaceWrite",
  "type": "dynamic" | "production"
}
```

### Re-Skinning (Dynamic Agents)
```
Runtime 2 as 🎶 Songwriter → task done
  → Save memory to memory/agents/songwriter/
  → Clear identity
  → Runtime 2 is idle

User needs 🧪 Tester
  → Take Runtime 2 (idle)
  → Load tester identity config
  → Load tester CLAW.md
  → Load tester memory from memory/agents/tester/
  → Runtime 2 is now 🧪 Tester
```

### Production Agents (Locked)
```
User: "Lock this agent"
  → Agent becomes PRODUCTION
  → Gets dedicated runtime slot
  → Never re-skinned
  → Memory persists forever

User: "Unlock this agent"
  → Agent becomes dynamic again
  → Slot available for re-skinning
```

### Scaling
```
Default: 5 runtimes
Queue > 3 consistently: add 1 runtime (max 10)
Runtimes consistently idle: remove 1 runtime (min 3)
Dynamic scaling based on load.
```

## The Training Loop

### First Time (New Pipeline)
```
1. CLAW understands requirements
2. CLAW finds/creates department
3. Department forges agent from pool
4. Agent enters TRAINING MODE
5. Agent shows first draft to user
6. User tweaks, agent learns
7. Iterates until user satisfied
8. User says "done" or "ship it"
9. Pipeline LOCKED 🔒
10. Agent memory saved
```

### After Training (Pipeline Active)
```
1. User makes similar request
2. CLAW recognizes pattern
3. Routes directly to trained agent
4. Agent executes immediately (knows preferences)
5. No training needed
6. Result delivered
```

### Training in Telegram
```
Department creates topic for training
Agent and user interact directly
Agent learns: preferences, style, quality bar
User approves or tweaks
Training ends when user is satisfied
```

## Agent Inheritance

Agents can request more agents from the pool:
```
🎶 Songwriter: "I need research help for this task"
  → Requests agent from pool
  → Department assigns 📚 Researcher (from pool)
  → Researcher does research
  → Result returned to Songwriter
  → Researcher returns to pool (dynamic)
```

Agents don't spawn permanently. They request from the pool. The pool manages lifecycle.

## Telegram Mapping

```
#general        → CLAW (entry point)
#department-1   → Department 1 + its agents
#department-2   → Department 2 + its agents
#department-N   → Department N + its agents
```

One topic per department. All agents in a department talk in their department topic. Department Pod Lead reports to #general.

## User Interaction

### Forge Flow
```
You: I want to write song lyrics about AI

Claw: Tell me more. Style? Mood? Length? Inspiration?

You: Radiohead but upbeat. 3 verses + chorus. Fun AI domination theme.

Claw: Got it. Ready?
      [Forge 🔨] [Plan 📝]

You: [Forge 🔨]

Claw: 🔍 No Multimedia department. Creating...
      🏗️ 🎵 Multimedia (Pod Lead) created
      🛠️ 🎶 Songwriter forged
      
      Starting training...

🎵 Multimedia: 🎶 Songwriter entering training...
🎶 Songwriter: Here's my first draft...
You: Make verse 2 more aggressive
🎶 Songwriter: Updated. Better?
You: Perfect. Ship it.
🎶 Songwriter: Training complete 🔒

Claw: ✅ Lyrics ready! [attached]
      🎶 Songwriter is trained and locked.
      
      Next time you ask for lyrics, I'll route directly.
```

### Production Lock
```
You: Lock this songwriter. I use it daily.

Claw: 🔒 🎶 Songwriter is now PRODUCTION.
      Permanent. Never re-skinned.
```

### Dynamic Re-Skin
```
You: I need a tester now.

Claw: 🔄 Re-skilling idle agent...
      🧪 Tester ready (was: idle runtime)
      Assigning task...
```

## The Complete System

```
USER
  ↓
CLAW (entry point)
  ├─ Understands requirements
  ├─ Finds/creates department
  └─ Routes to department
      ↓
DEPARTMENT (pod lead)
  ├─ Forges agent from pool
  ├─ Handles training phase
  ├─ Assigns task
  └─ Reports results
      ↓
AGENT (from pool)
  ├─ Dynamic: re-skinned as needed
  ├─ Production: locked, permanent
  ├─ Trains with user (first time)
  ├─ Executes (after training)
  └─ Can request more agents from pool
      ↓
RESULT → User
```

## Claude Code Enhancements (Still Apply)

These enhance the agent execution within the three-layer system:

1. **Conversation Phases** — Each agent follows plan→arch→generate→test
2. **System Prompt** — CLAW.md + git context + memory index
3. **Memory Architecture** — 3 layers per agent (index + autodream + session)
4. **Permission Modes** — 5 levels, per-agent permissions
5. **Tool Hooks** — PreToolUse/PostToolUse
6. **Compaction** — Continuation preamble, token management
7. **Buddy** — Inline reactions in Telegram
8. **Chyros** — Nightly auto-improvement across all agents
9. **Undercover** — Clean outputs from all agents

## Implementation Order

```
Phase 1: Foundation (Claude Code enhancements)
  - Permission Modes
  - Tool Hooks
  - CLAW.md
  - Compaction
  - Memory Architecture

Phase 2: Multi-Agent System
  - Agent Pool
  - Identity swapping
  - Department creation
  - Training loop

Phase 3: Intelligence
  - Auto-department detection
  - Pattern recognition (route to trained agents)
  - Pool scaling
  - Production locking

Phase 4: Polish
  - Buddy reactions
  - Chyros nightly reports
  - Undercover mode
  - Telegram UX refinement
```

## Files to Modify (OpenClaw)

```
Phase 1:
  src/agents/system-prompt.ts — CLAW.md + phases + memory index
  src/agents/context.ts — CLAW.md reading + lightweight memory
  src/agents/tool-policy.ts — permission mode checks
  src/agents/compaction.ts — continuation preamble
  src/agents/pi-embedded-runner.ts — phase tracking + hooks
  src/hooks/internal-hooks.ts — PreToolUse/PostToolUse
  src/security/permission-modes.ts — NEW

Phase 2:
  src/agents/agent-pool.ts — NEW: pool manager
  src/agents/agent-identity.ts — NEW: identity config + swapping
  src/agents/department.ts — NEW: department manager
  src/agents/training-loop.ts — NEW: training phase handler

Phase 3:
  src/agents/pattern-recognition.ts — NEW: route to trained agents
  src/agents/pool-scaler.ts — NEW: dynamic scaling

Phase 4:
  src/tui/buddy.ts — NEW: companion
  Cron job — Chyros nightly
  Telegram handler — inline buttons + undercover
```

---
Saved: 2026-04-02 04:27 GMT+5:30
