/**
 * @file agent-turn-limiter.ts
 * @module agent-turn-limiter
 * @description pi-package extension that forces the orchestrator to delegate
 *   to a subagent after N turns without spawning one. Prevents the orchestrator
 *   from getting stuck doing all the work itself.
 *
 * @author Adam
 * @version 1.0.1
 *
 * ## How It Works
 *
 * 1. On `session_start`, initializes turn counter and shows status in UI.
 * 2. On every `turn_end`, increments the turn counter.
 * 3. On `tool_call` for `subagent`, resets the counter (delegation happened).
 * 4. When turns exceed the limit (default 7) WITHOUT a subagent spawn, blocks ALL tool calls
 *    except `subagent` and `TaskExecute`. Returns a clear message telling the
 *    orchestrator to stop working and delegate.
 * 5. Counter resets on every new user prompt (`session_start` with reason "startup").
 *
 * ## Configuration
 *
 * Set `AGENT_TURN_LIMIT` env var to change the default (10):
 *
 * ```bash
 * export AGENT_TURN_LIMIT=15
 * ```
 *
 * ## Usage
 *
 * Install via npm:
 *
 * ```bash
 * pi install npm:@adamjen/pi-agent-turn-limiter
 * ```
 *
 * Or add to extensions:
 *
 * ```ts
 * extensions: [
 *   { name: "agent-turn-limiter", path: "./extensions/agent-turn-limiter.ts" }
 * ]
 * ```
 */

/**
 * Agent turn limiter extension factory.
 *
 * Forces orchestrator to delegate after N turns without spawning a subagent.
 *
 * @param pi - The pi extension API instance
 * @returns void
 */
export default function (pi: any): void {
  const LIMIT = parseInt(process.env.AGENT_TURN_LIMIT, 10) || 7;
  let turnCount = 0;
  let blocked = false;

  // ------------------------------------------------------------------
  // Lifecycle
  // ------------------------------------------------------------------

  /**
   * Fired when a new session starts.
   * Resets state and announces the limiter in the UI status bar.
   */
  pi.on("session_start", async (_event: any, ctx: any) => {
    turnCount = 0;
    blocked = false;
    if (ctx.ui) {
      ctx.ui.setStatus(
        "turn-limiter",
        `🔄 turn-limiter active (limit: ${LIMIT})`
      );
    }
  });

  // ------------------------------------------------------------------
  // Turn tracking
  // ------------------------------------------------------------------

  /**
   * Fired when an agent finishes (steer-back received).
   * Resets the counter — delegation happened, so we're good.
   */
  pi.on("agent_end", async () => {
    turnCount = 0;
    blocked = false;
    if (true) {
      // Always update status on agent end
    }
  });

  /**
   * Fired at the end of each LLM turn.
   * Increments the counter.
   */
  pi.on("turn_end", async (_event: any, ctx: any) => {
    turnCount++;
    if (ctx.ui) {
      const status =
        turnCount >= LIMIT
          ? `🚫 ${turnCount}/${LIMIT} — DELEGATE NOW`
          : `🔄 ${turnCount}/${LIMIT}`;
      ctx.ui.setStatus("turn-limiter", status);
    }
  });

  // ------------------------------------------------------------------
  // Gate
  // ------------------------------------------------------------------

  /**
   * Fired on every tool call.
   * If turns exceeded limit and no subagent was spawned, blocks everything
   * except subagent/TaskExecute (the tools that DO delegation).
   */
  pi.on("tool_call", async (event: any, ctx: any) => {
    const delegationTools = ["subagent", "TaskExecute", "TaskCreate", "TaskUpdate"];

    // If a delegation tool is being called, reset and allow
    if (delegationTools.includes(event.toolName)) {
      turnCount = 0;
      blocked = false;
      if (ctx.ui) {
        ctx.ui.setStatus("turn-limiter", `🔄 0/${LIMIT} ✓ delegated`);
      }
      return undefined;
    }

    // If over limit, block everything else
    if (turnCount >= LIMIT && !blocked) {
      blocked = true;
    }

    if (blocked && turnCount >= LIMIT) {
      return {
        block: true,
        reason: `ORCHESTRATOR LIMIT REACHED (${turnCount}/${LIMIT} turns without delegation). ` +
          `STOP working directly. Create a task with TaskCreate and delegate to a subagent via subagent() or TaskExecute. ` +
          `You have been doing the work yourself for ${turnCount} turns — delegate now.`,
      };
    }

    return undefined;
  });
}
