**Title:** My pi orchestrator kept doing all the work itself — so I built a turn limiter to force delegation

**Body:**

Hey everyone,

My local Qwen3.6-27B orchestrator had a bad habit: it would get "in the weeds" and spend 20+ turns reading files, grepping code, and writing content directly instead of using the agent tools (researcher, coder, debugger, etc.) to delegate the work. It forgot its role as an orchestrator and just started doing everything itself.

After the 5th time I had to manually interrupt it, I wrote a tiny extension that counts turns. After **3 grace turns** (for setup), then **7 working turns** without spawning a subagent, it blocks ALL tool calls except `subagent` and `TaskExecute`. The orchestrator MUST delegate or it can't proceed.

Published it as an npm package if anyone wants to keep their orchestrator honest:

- **GitHub:** https://github.com/adamjen/pi-agent-turn-limiter
- **npm:** https://www.npmjs.com/package/@adamjen/pi-agent-turn-limiter

Install with: `pi install npm:@adamjen/pi-agent-turn-limiter`

Pairs well with my other extension [`@adamjen/pi-one-subagent-at-a-time`](https://www.npmjs.com/package/@adamjen/pi-one-subagent-at-a-time) — one forces delegation, the other prevents parallel spawns on single-GPU setups.

- **pi Gallery:** [pi.dev/packages/@adamjen/pi-agent-turn-limiter?name=adamjen](https://pi.dev/packages/@adamjen/pi-agent-turn-limiter?name=adamjen)

Pairs with [`HazAT/pi-interactive-subagents`](https://github.com/HazAT/pi-interactive-subagents) for interactive subagent management.

Happy to take questions or PRs.
