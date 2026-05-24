# @adamjen/pi-agent-turn-limiter

**Warns the pi orchestrator to delegate after 3 turns — prevents getting stuck in endless work loops.**

## The Problem

You give pi a big task. The orchestrator starts working directly — reading files, grepping code, writing content itself instead of spawning specialist subagents. After 20+ turns of the orchestrator doing grunt work, you realize it never delegated anything. It got "in the weeds" and lost sight of its role as an orchestrator.

This is especially bad with local models that have weaker instruction following — they forget their system prompt rules about delegation and just start doing everything themselves.

## The Solution

A tiny extension (~80 lines) that counts orchestrator turns. After **3 grace turns** (for setup), then **3 working turns** without delegating, it injects a warning prompt into the system context. **No hard block — just a reminder.**

## Install

```bash
pi install npm:@adamjen/pi-agent-turn-limiter
```

## How It Works

1. **Session starts** → detects orchestrator (via `subagent` tool), status bar shows `🟢 orch: 0/3 grace`
2. **Grace turns (1-3)** → free turns for setup, reading context, planning
3. **Countdown starts (turn 4+)** → shows `🔄 orch: 1/3`, `🔄 orch: 2/3`...
4. **Orchestrator spawns subagent** → counter resets to 0, shows `🔄 orch: 0/3 ✓ delegated`
5. **Counter hits limit (turn 6)** → status turns yellow: `⚠️ orch: 3/3 — delegate now`
6. **Warning injected** → system prompt gets: `⚠️ DELEGATION REMINDER: You have used 3 of 3 allowed turns without delegating...`

## Status Bar

Shows real-time turn count in the pi TUI footer:

```
🔄 orch: 2/3          # Normal — under limit
🔄 orch: 0/3 ✓ delegated  # Reset after subagent spawn
⚠️ orch: 3/3 — delegate now  # Warning injected (soft nudge)
🔵 turn-limiter: not orchestrator  # Specialist agent (ignored)
```

## Design Decisions

**Why no hard block?** The orchestrator sometimes needs extra turns for complex coordination. A warning is sufficient — if it ignores the warning, context will run out naturally.

**Why orchestrator-only?** Specialist agents (`researcher`, `coder`, etc.) have their own `max_turns` from frontmatter. They don't need this limiter — they just run until context runs out.

**Why 3 grace + 3 effective?** 3 turns lets the orchestrator read context and plan. Then 3 more turns for actual work before nudging delegation. Total: 6 turns before warning.

## Pair With

- **[`@adamjen/pi-one-subagent-at-a-time`](https://www.npmjs.com/package/@adamjen/pi-one-subagent-at-a-time)** — prevents parallel subagent spawns on single-GPU setups. One forces delegation, the other prevents melting.
- **[`HazAT/pi-interactive-subagents`](https://github.com/HazAT/pi-interactive-subagents)** — interactive subagent management for advanced control.

**Browse all my pi packages:** [pi.dev/packages/@adamjen/pi-agent-turn-limiter?name=adamjen](https://pi.dev/packages/@adamjen/pi-agent-turn-limiter?name=adamjen)

## What Changed in v3

**v3.0.0 — Simplified to orchestrator-only warning (no hard block)**
- Removed the complex 7-turn hard block system
- Now warns after 3 grace + 3 effective turns (6 total) instead of blocking at 7
- Simpler detection: checks for `subagent` tool in agent config
- No more per-agent turn maps — single counter for orchestrator
- Warning injected via system prompt — never blocks tool calls

**v3.0.1 — Clean npm publish**
- Added `files` field to package.json for clean publishes (no junk files)
- Removed accidentally committed `.npmignore` and `provider-payload.log`
- Package now publishes only: README.md, extensions/, package.json, screenshot.png

## Why This Exists

Built because my local Qwen3.6-27B orchestrator would spend 30+ turns reading files and writing content directly instead of spawning the `researcher` or `coder` subagents. After the 5th time I had to manually interrupt it, I wrote this extension. Now it delegates on the first try every time.

## License

MIT
