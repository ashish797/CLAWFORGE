# CLAWFORGE — Chat History & Key Decisions

## Session: April 1-2, 2026 (4 PM - 4:30 AM, 12.5 hours)

### Phase 1: Research (4 PM - 7 PM)
- Started with research draft: "Agent-First Web and ANS"
- Did deep research on AI agent infrastructure landscape
- Found 5 protocol layers: MCP, A2A, ACP, AG-UI, x402
- Created agent-first-web repo (private) with research
- Fact-checked all claims with 20+ internet searches
- Discovered AWS already built an agent registry
- Shifted strategy from "build registry" to "OpenRouter for registries"

### Phase 2: Vision (7 PM - 8 PM)
- hasH explained the AI economy vision
- Key insight: "I help you, you help me" — reciprocal value exchange
- Two layers: human money + AI money
- Focus on AI economy first, human economy later
- Web3/blockchain essential for agent payments

### Phase 3: Gbrowser (8 PM - 9 PM)
- Installed gstack's browse engine (Bun + Playwright)
- Key discovery: gstack uses accessibility tree (ariaSnapshot), NOT vision models
- Published to GitHub: github.com/ashish797/Gbrow
- Published to ClawHub: clawhub install gbrow
- Much faster, cheaper, more reliable than screenshot+vision

### Phase 4: SUPERCLAW (9 PM - 10 PM)
- Built 4 skills inspired by Claude Code
- AgentGuard: 60-rule permission system
- ClaudeTools: 7 enhanced tools
- AgentMemory: auto-extraction concept
- AgentOrchestrator: multi-agent decomposition
- Published to GitHub: github.com/ashish797/SUPERCLAW

### Phase 5: Discovery of Real claw-code (10 PM - 11 PM)
- Initially studied codeaashu/claude-code (530 stars, raw TypeScript leak)
- Discovered instructkr/claw-code (114K stars, Python+Rust rewrite)
- Fastest repo to 50K stars in history (2 hours)
- By Sigrid Jin, WSJ-featured developer

### Phase 6: Deep Study of claw-code (11 PM - 1 AM)
- Read all Rust source files line by line
- Understood conversation loop, permissions, hooks, compaction, MCP
- Compared every file with OpenClaw's equivalent
- Found real gaps: permission modes, tool hooks, CLAW.md

### Phase 7: Fireship Video Insights (1 AM - 2 AM)
- Watched Fireship's analysis (Hindi transcript)
- Key insight: Claude Code = "dynamic prompt sandwich" + system engineering
- Memory architecture: memory.md (index) + autodream + session layer
- Tools are simple functions. Power is in the system design.
- Anti-distillation: summarize reasoning before sharing

### Phase 8: Architecture Design (2 AM - 3 AM)
- Started with 7 features, refined to core architecture
- Designed 3-layer system: CLAW → Department → Agent
- Agent pool with identity swapping (5 runtimes, re-skinnable)
- Training loop: first time trains with user, then pipeline locks
- Production agents: locked, never re-skinned
- Telegram UX: one topic per department, not per agent
- Sub-agents work silently, results aggregated

### Phase 9: Final Architecture (3 AM - 4:30 AM)
- Claude Code conversation phases (plan→arch→generate→test)
- 3-layer memory system per agent
- Permission modes (5 levels)
- Tool hooks (PreToolUse/PostToolUse)
- Chyros nightly auto-improvement
- Undercover mode (clean outputs)
- Buddy (inline reactions)
- Saved ARCHITECTURE.md, BUILD-PLAN.md, SESSION-PROMPT.md

## Key Decisions

1. **Build on OpenClaw** (not NemoClaw — NemoClaw is alpha)
2. **Modify OpenClaw's core** (not just skills)
3. **3-layer agent system** (CLAW → Department → Agent)
4. **Agent pool with identity swapping** (5 runtimes, re-skinnable)
5. **Training loop** (first time trains, then pipeline locks)
6. **Production agents** (user-locked, never re-skinned)
7. **Telegram as primary UI** (one topic per department)
8. **Silent sub-agents** (results aggregated, not chatter)
9. **Claude Code patterns** (phases, memory, hooks, permissions)
10. **Self-evolving** (Chyros nightly improvement)

## Repos Created

1. github.com/ashish797/agent-first-web (private) — research
2. github.com/ashish797/Gbrow (public) — browser skill
3. github.com/ashish797/SUPERCLAW (public) — 4 skills
4. github.com/ashish797/CLAWFORGE (public) — main project

## Open Questions Resolved

- ✅ OpenClaw vs NemoClaw → OpenClaw (NemoClaw is alpha)
- ✅ Skills vs Core modification → Core modification
- ✅ Single agent vs Multi-agent → Multi-agent (3 layers)
- ✅ Fixed agents vs Pool → Pool with identity swapping
- ✅ Per-agent topics vs Per-department → Per-department
- ✅ Claude Code features → 9 enhancements mapped to OpenClaw files

---
Session ended: 2026-04-02 04:32 GMT+5:30
