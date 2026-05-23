# @adamjen/pi-agent-turn-limiter

**Forces the pi orchestrator to delegate to a subagent after N turns — prevents getting stuck in endless work loops.**

## The Problem

You give pi a big task. The orchestrator starts working directly — reading files, grepping code, writing content itself instead of spawning specialist subagents. After 20+ turns of the orchestrator doing grunt work, you realize it never delegated anything. It got "in the weeds" and lost sight of its role as an orchestrator.

This is especially bad with local models that have weaker instruction following — they forget their system prompt rules about delegation and just start doing everything themselves.

## The Solution

A tiny extension that counts turns. After **7 turns** (configurable) without the orchestrator spawning a subagent, it blocks ALL tool calls except `subagent` and `TaskExecute`. The orchestrator MUST delegate or it can't proceed.

## Install

```bash
pi install npm:@adamjen/pi-agent-turn-limiter
```

## Configure

Change the turn limit (default 7):

```bash
export AGENT_TURN_LIMIT=15
```

## How It Works

1. **Session starts** → counter resets to 0, status bar shows `🔄 0/7`
2. **Each turn ends** → counter increments (`🔄 3/7`, `🔄 4/7`...)
3. **Orchestrator spawns subagent** → counter resets to 0, shows `🔄 0/7 ✓ delegated`
4. **Counter hits limit** → status turns red: `🚫 7/7 — DELEGATE NOW`
5. **Next tool call blocked** → returns error: `"ORCHESTRATOR LIMIT REACHED (7/7 turns without delegation). STOP working directly. Create a task and delegate to a subagent."`

## Status Bar

Shows real-time turn count in the pi TUI footer:

```
🔄 3/7          # Normal — under limit
🔄 0/7 ✓ delegated  # Reset after subagent spawn
🚫 7/7 — DELEGATE NOW  # Limit reached, blocking tools
```

## Pair With

Works great alongside [`@adamjen/pi-one-subagent-at-a-time`](https://www.npmjs.com/package/@adamjen/pi-one-subagent-at-a-time) — one forces delegation, the other prevents parallel spawns. Together they keep your orchestrator honest and your GPU from melting.

## Why This Exists

Built because my local Qwen3.6-27B orchestrator would spend 30+ turns reading files and writing content directly instead of spawning the `researcher` or `coder` subagents. After the 5th time I had to manually interrupt it, I wrote this extension. Now it delegates on the first try every time.

## License

MIT
