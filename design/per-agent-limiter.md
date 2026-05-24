# Per-Agent Turn Limiter — Architecture Design

**Author:** Claudia (architect)
**Date:** 2026-05-24
**Status:** Draft for review

---

## 1. Architecture Overview

### Problem Statement

The current `agent-turn-limiter.ts` applies a **single global counter** (`turnCount`) and **single limit** (`LIMIT = 7`) to every agent equally. When a specialist agent (coder, researcher, etc.) is spawned, it inherits the orchestrator's 7-turn limit — blocking agents that legitimately need many turns for their work.

### Core Design: Per-Agent Counter Map + Config Registry

```
┌─────────────────────────────────────────────────────┐
│                   Extension Runtime                  │
│                                                      │
│  ┌──────────────┐    ┌──────────────────────────┐   │
│  │ Agent Detector│    │   Config Registry        │   │
│  │              │    │                          │   │
│  │ ctx.model?.id │──▶│  orchestrator: {7, 3}    │   │
│  │ (fallback)   │    │  coder:       {100, 5}   │   │
│  └──────┬───────┘    │  researcher:  {20, 5}    │   │
│         │            │  ...                     │   │
│         │            └──────────┬───────────────┘   │
│         ▼                       ▼                    │
│  ┌─────────────────────────────────────────────┐   │
│  │          Per-Agent Counter Map              │   │
│  │                                              │   │
│  │  "orchestrator" → { turns: 3, blocked: false }│  │
│  │  "coder"        → { turns: 12, blocked:false }│  │
│  │  "researcher"   → { turns: 5, blocked: false }│  │
│  └─────────────────────────────────────────────┘   │
│                       ▼                              │
│  ┌─────────────────────────────────────────────┐   │
│  │           Tool Gate (tool_call hook)        │   │
│  │                                              │   │
│  │  1. Detect current agent via ctx.model?.id  │   │
│  │  2. Look up config from registry            │   │
│  │  3. Check per-agent counter                 │   │
│  │  4. Block/allow + update status bar         │   │
│  └─────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────┘
```

### Key Principles

1. **Agent identity is derived, not assumed** — `ctx.model?.id` is the primary signal, with fallback detection for edge cases.
2. **Config is a map, not a scalar** — each agent has independent `maxTurns` and `graceTurns`.
3. **Counters are per-agent, not global** — a Map keyed by agent name tracks turns independently.
4. **Zero means disabled** — agents with `max_turns: 0` bypass all limiting logic.
5. **Backward compatible** — legacy env vars still work as the final fallback when no other config matches.

---

## 2. Config Loading Strategy

### Chosen Approach: Hardcoded Defaults + Env Var Overrides

#### Why Not Parse Frontmatter at Startup?

| Factor | Parse .md Files | Hardcoded Map |
|--------|-----------------|---------------|
| Dependency | Needs YAML parser (js-yaml or similar) | Zero dependencies |
| FS Access | Requires path resolution, glob, file reads | No filesystem interaction |
| Performance | Blocking I/O at startup | Instant |
| Maintainability | Auto-syncs with agent files | Manual update when agents change |
| Reliability | Fails silently if frontmatter malformed | Type-checked at build time |

**Decision:** Hardcoded map is the pragmatic choice for an extension that should be zero-dependency and always-functional. The maintainability gap is addressed by:

1. **Env var overrides** as escape hatch — no code change needed to tweak limits.
2. **A build-time validation script** (optional) that compares the hardcoded map against actual frontmatter and warns on drift.
3. **Clear documentation** that the map must be updated when new agents are added.

### Config Resolution Order (per agent, highest priority first)

```
1. Env var override:  TURN_LIMIT_<AGENT_NAME_UPPER>       e.g., TURN_LIMIT_CODER=50
                       TURN_GRACE_<AGENT_NAME_UPPER>       e.g., TURN_GRACE_CODER=3
2. Hardcoded default: from AGENT_CONFIGS map in extension code
3. Legacy fallback:   AGENT_TURN_LIMIT / AGENT_GRACE_TURNS (existing env vars)
```

### The Hardcoded Config Map

```typescript
interface AgentConfig {
  maxTurns: number;   // 0 = unlimited (no limiting)
  graceTurns: number; // turns before counting begins
}

const AGENT_CONFIGS: Record<string, AgentConfig> = {
  orchestrator:        { maxTurns: 7,   graceTurns: 3 },
  coder:               { maxTurns: 100, graceTurns: 5 },
  debugger:            { maxTurns: 100, graceTurns: 5 },
  planner:             { maxTurns: 100, graceTurns: 5 },
  refactorer:          { maxTurns: 40,  graceTurns: 5 },
  tester:              { maxTurns: 40,  graceTurns: 5 },
  researcher:          { maxTurns: 20,  graceTurns: 5 },
  architect:           { maxTurns: 30,  graceTurns: 5 },
  reviewer:            { maxTurns: 15,  graceTurns: 5 },
  documentor:          { maxTurns: 15,  graceTurns: 5 },
  prompter:            { maxTurns: 30,  graceTurns: 5 },
  publisher:           { maxTurns: 15,  graceTurns: 5 },
  content-orchestrator:{ maxTurns: 0,   graceTurns: 5 }, // unlimited
  growth-orchestrator: { maxTurns: 0,   graceTurns: 5 }, // unlimited
  site-strategist:     { maxTurns: 0,   graceTurns: 5 }, // unlimited
  // ... other agents as added
};
```

### Config Resolution Function

```typescript
function resolveConfig(agentName: string): AgentConfig {
  const upper = agentName.toUpperCase();

  // 1. Per-agent env var override
  const envMax = parseInt(process.env[`TURN_LIMIT_${upper}`], 10);
  const envGrace = parseInt(process.env[`TURN_GRACE_${upper}`], 10);

  if (!isNaN(envMax) && !isNaN(envGrace)) {
    return { maxTurns: envMax, graceTurns: envGrace };
  }

  // 2. Hardcoded default (partial overrides allowed)
  const defaultConfig = AGENT_CONFIGS[agentName];
  if (defaultConfig) {
    return {
      maxTurns: isNaN(envMax) ? defaultConfig.maxTurns : envMax,
      graceTurns: isNaN(envGrace) ? defaultConfig.graceTurns : envGrace,
    };
  }

  // 3. Legacy global fallback
  const legacyLimit = parseInt(process.env.AGENT_TURN_LIMIT, 10) || 7;
  const legacyGrace = parseInt(process.env.AGENT_GRACE_TURNS, 10) || 3;
  return { maxTurns: legacyLimit, graceTurns: legacyGrace };
}
```

---

## 3. Agent Detection Mechanism

### Primary Signal: `ctx.model?.id`

The `ctx.model?.id` field returns the **model alias** (e.g., `"orchestrator"`, `"coder"`, `"researcher"`). This is set by llama-swap based on which model file was loaded for the current turn. It is the most reliable signal because:

- It's populated on every hook event (`session_start`, `turn_end`, `tool_call`)
- It matches the agent name exactly (by convention in config.yaml)
- It works for both orchestrator and subagent contexts

### Fallback Chain

```typescript
function detectAgent(ctx: any): string {
  // Primary: model alias from ctx
  if (ctx.model?.id) {
    return normalizeAgentName(ctx.model.id);
  }

  // Secondary: tool-based detection
  // If subagent tool is available → likely orchestrator or content-orchestrator
  const tools = ctx.systemPromptOptions?.selectedTools || [];
  if (tools.includes("subagent")) {
    return "orchestrator"; // default to orchestrator for spawning agents
  }

  // Tertiary: unknown agent — use legacy fallback config
  return "unknown";
}

function normalizeAgentName(name: string): string {
  // Handle potential variations: "llama-swap/coder" → "coder"
  if (name.includes("/")) {
    return name.split("/").pop()!;
  }
  return name;
}
```

### Why Not Parse Frontmatter at Runtime?

Frontmatter isn't accessible from extension hooks. The `.md` files live on disk, and the extension has no knowledge of which file corresponds to the current agent without external resolution. `ctx.model?.id` is the runtime equivalent — it's what pi actually uses to select the model.

---

## 4. State Management

### Per-Agent Counter Map

Replace the single `turnCount` with a Map that tracks each agent independently:

```typescript
interface AgentState {
  turns: number;
  blocked: boolean;
  lastReset: number; // timestamp for debugging
}

// Global state
const agentStates = new Map<string, AgentState>();
```

### Initialization (`session_start`)

On session start, reset ALL agent counters. This handles the case where a new conversation begins:

```typescript
pi.on("session_start", async (_event: any, ctx: any) => {
  agentStates.clear();
  const agentName = detectAgent(ctx);
  const config = resolveConfig(agentName);

  // Initialize current agent's state
  agentStates.set(agentName, { turns: 0, blocked: false, lastReset: Date.now() });

  if (ctx.ui) {
    updateStatusBar(ctx, agentName, config);
  }
});
```

### Counter Increment (`turn_end`)

Each turn end, detect the current agent and increment their counter:

```typescript
pi.on("turn_end", async (_event: any, ctx: any) => {
  const agentName = detectAgent(ctx);
  const config = resolveConfig(agentName);

  // Skip agents with unlimited turns
  if (config.maxTurns === 0) {
    updateStatusBar(ctx, agentName, config);
    return;
  }

  let state = agentStates.get(agentName);
  if (!state) {
    state = { turns: 0, blocked: false, lastReset: Date.now() };
    agentStates.set(agentName, state);
  }

  state.turns++;
  updateStatusBar(ctx, agentName, config, state);
});
```

### Counter Reset (`agent_end` + delegation tools)

Two reset triggers:

1. **`agent_end`** — subagent finished and returned steer-back → reset the ORCHESTRATOR's counter (not the ended agent's, since it's done).
2. **Delegation tool call** — orchestrator called `subagent`/`TaskExecute` → reset orchestrator's counter.

```typescript
pi.on("agent_end", async () => {
  // Reset orchestrator counter — delegation completed successfully
  const orchState = agentStates.get("orchestrator");
  if (orchState) {
    orchState.turns = 0;
    orchState.blocked = false;
    orchState.lastReset = Date.now();
  }
});
```

### Status Bar Updates

Show agent name + current turns / limit:

```typescript
function updateStatusBar(ctx: any, agentName: string, config: AgentConfig, state?: AgentState): void {
  if (!ctx.ui || config.maxTurns === 0) return;

  const turns = state?.turns ?? 0;
  const effective = Math.max(0, turns - config.graceTurns);

  let icon, text;
  if (turns <= config.graceTurns) {
    icon = "🟢";
    text = `${icon} ${agentName} ${turns}/${config.graceTurns} grace`;
  } else if (effective >= config.maxTurns) {
    icon = "🚫";
    text = `${icon} ${agentName} ${effective}/${config.maxTurns} — STOP`;
  } else {
    icon = "🔄";
    text = `${icon} ${agentName} ${effective}/${config.maxTurns} (${turns} total)`;
  }

  ctx.ui.setStatus("turn-limiter", text);
}
```

---

## 5. Implementation Plan

### Step 1: Replace Global State with Per-Agent Map

**What changes:**
- Remove `let turnCount = 0` and `let blocked = false`
- Add `AGENT_CONFIGS` map (hardcoded defaults)
- Add `AgentState` interface and `agentStates` Map
- Add `resolveConfig()`, `detectAgent()`, `normalizeAgentName()` helpers

**Risk:** LOW — pure refactoring, no behavioral change yet.

### Step 2: Rewrite `session_start` Hook

**What changes:**
- Reset all agent states via `agentStates.clear()`
- Detect current agent, initialize their state
- Show per-agent status bar message

**Risk:** LOW — straightforward initialization.

### Step 3: Rewrite `turn_end` Hook

**What changes:**
- Detect current agent from ctx
- Look up config via `resolveConfig()`
- Skip if `maxTurns === 0` (unlimited)
- Increment per-agent counter
- Update status bar with agent name + limit

**Risk:** MEDIUM — must handle missing agent gracefully (fallback to legacy config).

### Step 4: Rewrite `tool_call` Gate

**What changes:**
- Detect current agent from ctx
- Look up agent's config and state
- If delegation tool called → reset that agent's counter
- If over limit → block with agent-specific message
- Adjust blocked tools based on agent role:
  - Orchestrator: allow `subagent`, `TaskExecute`, `TaskCreate`, `TaskUpdate`
  - Subagents: allow `subagent` (shouldn't have it), plus their declared tools

**Risk:** MEDIUM — the gate logic is the core safety mechanism. Must not regress the blocking behavior for orchestrator.

### Step 5: Rewrite `agent_end` Hook

**What changes:**
- Reset orchestrator's counter specifically (not all agents)
- Update status bar

**Risk:** LOW.

### Step 6: Add Build-Time Config Validator (Optional)

**What changes:**
- New script that parses all agent `.md` frontmatter and compares against `AGENT_CONFIGS`
- Warns on drift (different values) or missing agents
- Runs as part of CI or manual check

**Risk:** LOW — purely advisory, doesn't affect runtime.

---

## 6. Edge Cases

### Nested Subagents (Subagent Spawns Subagent)

**Scenario:** An orchestrator spawns a coder, and the coder somehow needs to spawn another agent (unlikely per current constraints, but possible with future tools).

**Behavior:** Each agent has its own counter in the Map. The nested agent's turns don't affect the parent's counter. When the nested agent ends via `agent_end`, only the parent's counter resets (since we specifically target `"orchestrator"` in the reset logic).

**Gap:** If a non-orchestrator agent spawns a subagent, the current `agent_end` handler won't reset that agent's counter. **Mitigation:** Add logic to detect which agent spawned the ended agent via ctx metadata, or accept that only orchestrator delegation resets counters (which matches the original design intent).

### Model Name Collisions

**Scenario:** Two agents share the same model alias (e.g., both `reviewer` and `site-reviewer` use model alias `"reviewer-gemma"`).

**Behavior:** Both would map to the same config entry. This is acceptable if they share the same limits. If different limits are needed, they need distinct model aliases in config.yaml.

**Mitigation:** Document this constraint. The `normalizeAgentName()` function strips prefixes, so `"reviewer-gemma"` wouldn't match `"reviewer"` — the config map key must match the actual model alias.

**Recommendation:** Use the model alias as the config key (not the agent name), since that's what `ctx.model?.id` returns. Update the config map accordingly:

```typescript
const AGENT_CONFIGS: Record<string, AgentConfig> = {
  "orchestrator":      { maxTurns: 7,   graceTurns: 3 },
  "coder":             { maxTurns: 100, graceTurns: 5 },
  "reviewer-gemma":    { maxTurns: 15,  graceTurns: 5 },
  // ... keyed by model alias, not agent name
};
```

### Missing Frontmatter (New Agent Without `max_turns`)

**Scenario:** A new agent is added without `max_turns` in frontmatter.

**Behavior:** The agent's model alias won't be in `AGENT_CONFIGS`. The `resolveConfig()` fallback chain hits the legacy global defaults (`AGENT_TURN_LIMIT=7`). This is safe — it applies a reasonable limit rather than unlimited.

**Mitigation:** Log a warning to console when an unknown agent is detected.

### Reload Behavior (Extension Reloaded Mid-Session)

**Scenario:** User disables/re-enables the extension during an active session.

**Behavior:** The extension factory runs again, creating a fresh `agentStates` Map. All counters reset to 0. This is equivalent to starting a new session — acceptable since the user explicitly triggered the reload.

### Unknown Agent Detection

**Scenario:** `ctx.model?.id` returns a value not in `AGENT_CONFIGS` and not matching any known pattern.

**Behavior:** Falls through to legacy fallback config (7 turns). Status bar shows `"unknown"` as agent name. A console.warn is logged with the detected model ID for debugging.

---

## 7. Tradeoffs

### Hardcoded Config vs. Dynamic Parsing

| | Hardcoded Map | Parse Frontmatter |
|--|---------------|-------------------|
| Dependencies | None | js-yaml + glob |
| Startup cost | Zero | File I/O + YAML parse |
| Auto-sync | No — manual update | Yes — reads current files |
| Type safety | TypeScript-checked | Runtime strings |
| Env var override | Yes | Still needed for runtime tweaks |
| Failure mode | Stale config → wrong limits | Missing file → fallback |

**Decision:** Hardcoded map wins on simplicity and reliability. The drift problem is real but manageable via the optional validator script and env var overrides. If Adam wants fully dynamic config later, it's a clean swap — the `resolveConfig()` function can be extended to read from disk.

### `ctx.model?.id` vs. Tool-Based Detection

| | Model ID | Tool Inspection |
|--|----------|-----------------|
| Reliability | High — set by llama-swap | Medium — infers from tools |
| Granularity | Exact agent identity | Binary (orchestrator / not) |
| Availability | Always present in ctx | May vary by hook |
| Maintenance | Updates with model config | Fragile if tools change |

**Decision:** `ctx.model?.id` is primary, tool detection is fallback only. This gives exact identification 99% of the time.

### Per-Agent Counter Reset on `agent_end`

| Option | Behavior | Risk |
|--------|----------|------|
| Reset orchestrator only | Matches original intent — orchestrator's counter resets when subagent returns | Non-orchestrator spawners don't get reset |
| Reset all agents | Simple but wrong — resets unrelated agents' counters | Loses tracking for concurrent agents |
| Reset spawning agent only | Most correct but requires tracking spawn relationships | Complex, needs metadata we may not have |

**Decision:** Reset orchestrator only. This matches the original extension's design intent (force orchestrator to delegate) and is the most common case. If non-orchestrator spawning becomes a pattern, revisit with spawn-tracking metadata.

### Blocking Strategy: Per-Agent Allowed Tools

The current extension blocks ALL tools except delegation tools when limit exceeded. For subagents, this means blocking their work tools (read, write, etc.). This is intentional — the limit forces the agent to stop working.

However, different agents have different "escape hatch" tools:
- **Orchestrator** can call `subagent()`, `TaskExecute`
- **Subagents** can't delegate — they just get blocked and must stop

**Decision:** Keep the same blocking strategy universally. When a subagent hits its limit, it's blocked from all tools. The steer-back mechanism should handle graceful termination. If needed, allow `subagent` through for any agent (future-proofing).

---

## 8. Summary of Changes to `agent-turn-limiter.ts`

| Section | Current | New |
|---------|---------|-----|
| Imports | None | None (still zero-dependency) |
| State | `turnCount: number`, `blocked: boolean` | `agentStates: Map<string, AgentState>` |
| Config | `LIMIT`, `GRACE` from env vars | `AGENT_CONFIGS` map + `resolveConfig()` |
| `session_start` | Reset global counter | Clear all states, init current agent |
| `agent_end` | Reset global counter | Reset orchestrator's counter |
| `turn_end` | Increment global, check vs LIMIT | Detect agent, increment per-agent, check vs config |
| `tool_call` | Block based on global state | Detect agent, block based on per-agent state |
| Status bar | `${effectiveTurns}/${LIMIT}` | `${icon} ${agentName} ${effective}/${maxTurns}` |
| Lines of code | ~170 | ~250 (estimated) |

---

## 9. Open Questions for Adam

1. **Should the extension auto-discover agents by scanning `.pi/agent/agents/*.md` at startup?** This would eliminate hardcoded drift but add a dependency on YAML parsing and FS access. Current design says no — env var overrides are the escape hatch.

2. **Should non-orchestrator agents get a different "escape hatch" when blocked?** Currently they're fully blocked. Should they be allowed to call `subagent()` if they have it? (Currently none do, per frontmatter.)

3. **Should the status bar show ALL active agents or just the current one?** Current design shows only the active agent. Showing all would require tracking which agents are "in flight" via spawn/steer-back events.
