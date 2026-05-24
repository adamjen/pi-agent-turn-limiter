# Agent Turn Limiter v3 — Simple Orchestrator Warning

## Design

**One rule:** Warn the orchestrator after it goes too long without delegating. Never block anything.

### Numbers
- **Grace turns:** 3 (first 3 turns don't count)
- **Effective limit:** 3 turns (after grace)
- **Total before warning:** 6 turns
- **Action:** Inject system prompt warning — never block tool calls

### Detection
- Check if `subagent` is in the agent's tools list → it's the orchestrator
- All other agents are completely ignored

### Warning Prompt (injected via system prompt)

```
⚠️ DELEGATION REMINDER: You have used 3 of 3 allowed turns without delegating. 
Delegate work to a subagent via subagent() or TaskExecute. You are an orchestrator — 
coordinate, don't do the work yourself.
```

### Implementation
- Single counter for orchestrator turns
- `turn_end` hook increments counter
- After grace + limit reached, inject warning prompt
- Counter resets when `subagent` or `TaskExecute` is called
- Status bar shows: `🔄 orch: 2/3` (effective turns)
