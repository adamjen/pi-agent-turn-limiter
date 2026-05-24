# Agent Turn Limiter — Session Summary

**Date:** 2026-05-24  
**Session:** Automated context session  

## Overview

This session focused on designing the next major version of the `@adamjen/pi-agent-turn-limiter` extension — upgrading from a single global turn counter to a **per-agent configurable turn-limiting system**. The current v3.0.0 applies one limit (3 grace + 3 effective = 6 total) to every agent equally, which blocks specialist agents that legitimately need many turns to complete their work.

## What Was Fixed / Designed

### Problem Identified
The current `agent-turn-limiter.ts` (v3.0.0) uses a single global `turnCount` and `LIMIT = 3` for all agents. When a specialist agent (coder, researcher, etc.) is spawned, it inherits the orchestrator's 6-turn limit — blocking agents that legitimately need many turns for their work.

### Design Solution (v4.0.0 — in progress)
A new architecture was designed with:

1. **Per-agent counter map** — each agent tracks its own turn count independently
2. **Config registry** — hardcoded defaults with environment variable overrides
3. **Agent identity detection** — derived from `ctx.model?.id` with fallback detection
4. **Zero means unlimited** — agents with `maxTurns: 0` bypass all limiting
5. **Backward compatible** — legacy env vars (`AGENT_TURN_LIMIT`, `AGENT_GRACE_TURNS`) still work as fallback

### Design Decisions
- **Hardcoded config map** (not frontmatter parsing) — zero dependencies, instant startup, type-safe
- **Env var overrides** — `TURN_LIMIT_<AGENT_NAME>` and `TURN_GRACE_<AGENT_NAME>` for runtime tweaks without code changes
- **Soft warnings only** — no hard blocks, just status bar updates and system prompt injection
- **Orchestrator-focused** — orchestrator gets 7 turns (3 grace), specialists get 20-100+ turns depending on role

## Test Results

No tests were written or run in this session. The design document is a draft awaiting implementation. The existing v3.0.0 extension has no test suite.

## Files Changed

| File | Description |
|------|-------------|
| `design/per-agent-limiter.md` | New architecture design for v4.0.0 — per-agent counter map, config registry, tool gate |
| `extensions/agent-turn-limiter.ts` | Current v3.0.0 implementation (read-only reference — not modified) |
| `README.md` | Current v3.0.0 documentation (read-only reference — not modified) |
| `package.json` | Current v3.0.0 package manifest (read-only reference — not modified) |
| `docs/session-summary.md` | This file |

## Key Design Points

### Config Resolution Order
1. Env var override: `TURN_LIMIT_<AGENT_NAME_UPPER>` / `TURN_GRACE_<AGENT_NAME_UPPER>`
2. Hardcoded default: from `AGENT_CONFIGS` map
3. Legacy fallback: `AGENT_TURN_LIMIT` / `AGENT_GRACE_TURNS`

### Example Agent Configs
| Agent | Max Turns | Grace Turns |
|-------|-----------|-------------|
| orchestrator | 7 | 3 |
| coder | 100 | 5 |
| researcher | 20 | 5 |
| documentor | 15 | 5 |
| content-orchestrator | 0 (unlimited) | 5 |

### Status Bar States
- `🟢 orch: 0/3 grace` — under grace period
- `🔄 orch: 2/7` — counting toward limit
- `⚠️ orch: 7/7 — delegate now` — limit reached, warning injected
- `🔵 turn-limiter: not orchestrator` — specialist agent (different limits apply)

## Next Steps

- Implement the v4.0.0 design in `extensions/agent-turn-limiter.ts`
- Add test suite for per-agent counter map and config resolution
- Update README with new per-agent configuration documentation
- Bump version to 4.0.0 in `package.json`
