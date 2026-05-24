# Agent Turn Limits — Frontmatter Extraction

Extracted from all `.md` files in `/home/adam/.pi/agent/agents/` on 2026-05-24.

## Table

| Agent File | Name | Model | max_turns | Has subagent? |
|---|---|---|---|---|
| orchestrator.md | orchestrator | orchestrator | 7 | YES |
| planner.md | planner | planner | 100 | NO |
| architect.md | architect | architect | 30 | NO |
| coder.md | coder | coder | 100 | NO |
| researcher.md | researcher | researcher | 20 | NO |
| debugger.md | debugger | debugger | 100 | NO |
| reviewer.md | reviewer | reviewer | 15 | NO |
| tester.md | tester | tester | 40 | NO |
| documentor.md | documentor | documentor | 15 | NO |
| refactorer.md | refactorer | refactorer | 40 | NO |
| prompter.md | prompter | prompter | 30 | NO |
| publisher.md | publisher | documentor | 15 | NO |
| site-copywriter.md | site-copywriter | site-copywriter | 25 | NO |
| site-ux.md | site-ux | site-ux | 25 | NO |
| site-seo.md | site-seo | site-seo | 25 | NO |
| site-sales.md | site-sales | site-sales | 25 | NO |
| site-devil.md | site-devil | site-devil | 25 | NO |
| site-strategist.md | site-strategist | planner | 0 | NO |
| content-writer.md | content-writer | mistral-writer | 25 | NO |
| content-strategist.md | content-strategist | site-copywriter | 25 | NO |
| content-orchestrator.md | content-orchestrator | content-orchestrator | 0 | NO |
| nurture-strategist.md | nurture-strategist | researcher | 20 | NO |
| growth-analyst.md | growth-analyst | researcher | 20 | NO |
| growth-orchestrator.md | growth-orchestrator | growth-orchestrator | 0 | NO |
| orchestrator-gemma.md | orchestrator | orchestrator | 0 | YES |
| crash-backtester.md | crash-backtester | orchestrator | 25 | NO |
| defensive-sector.md | defensive-sector | orchestrator | 20 | NO |
| devils-advocate.md | devils-advocate | orchestrator | 25 | NO |
| dividend-quality.md | dividend-quality | orchestrator | 25 | NO |
| drp-calculator.md | drp-calculator | orchestrator | 20 | NO |
| fundamentals.md | fundamentals | orchestrator | 25 | NO |
| macro-regime.md | macro-regime | orchestrator | 20 | NO |
| valuation.md | valuation | orchestrator | 30 | NO |
| warren-buffett.md | *(none)* | *(none)* | MISSING | MISSING |

## Summary

### Agents with no max_turns defined: **1**

| Agent | Note |
|---|---|
| warren-buffett.md | No frontmatter at all — falls back to harness default (20) |

### Agents that should have higher limits (low limits + heavy I/O work)

These agents do substantial file reads, web research, or multi-step analysis and may hit their turn ceilings:

| Agent | Current | Reason |
|---|---|---|
| researcher | 20 | Web research + file reading + code search — complex queries easily exceed 20 turns |
| publisher | 15 | Multi-platform formatting can require multiple iterations |
| crash-backtester | 25 | Per-ticker analysis across 3+ crash episodes |
| devils-advocate | 25 | Deep bear-case analysis across multiple dimensions |
| dividend-quality | 25 | 10+ year dividend history analysis per ticker |
| fundamentals | 25 | Balance sheet scoring across multiple metrics |

### Agents using the "orchestrator" model alias: **10**

| Agent | max_turns | Note |
|---|---|---|
| orchestrator.md | 7 | Main orchestrator — lowest limit despite coordinating everything |
| orchestrator-gemma.md | 0 | Gemma-based orchestrator — unlimited turns |
| crash-backtester.md | 25 | Portfolio analysis agent |
| defensive-sector.md | 20 | Sector bias scanner |
| devils-advocate.md | 25 | Bear-case challenger |
| dividend-quality.md | 25 | Dividend sustainability scoring |
| drp-calculator.md | 20 | DRP projection calculator |
| fundamentals.md | 25 | Balance sheet quality screener |
| macro-regime.md | 20 | Market regime classifier |
| valuation.md | 30 | Intrinsic value estimator |

**Note:** `site-strategist.md` and `content-orchestrator.md` + `growth-orchestrator.md` also have `max_turns: 0` (unlimited), and `orchestrator-gemma.md` uses the same orchestrator model with `max_turns: 0`. The `max_turns: 0` convention appears to mean "unlimited/no limit" rather than "use default 20".
