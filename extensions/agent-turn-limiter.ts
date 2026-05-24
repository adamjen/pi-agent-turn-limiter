/**
 * @file agent-turn-limiter.ts
 * @description Simple orchestrator turn warning. Warns after 3 effective turns
 *   (3 grace + 3 limit = 6 total). Never blocks — just injects a prompt.
 *
 * @author Adam
 * @version 3.0.0
 */

// ------------------------------------------------------------------
// Constants
// ------------------------------------------------------------------

/** Turns that don't count toward the limit. */
const GRACE_TURNS = 3;

/** Effective turns before warning (after grace). */
const LIMIT = 3;

/** Total turns before warning triggers. */
const TOTAL_TRIGGER = GRACE_TURNS + LIMIT; // 6

// ------------------------------------------------------------------
// State
// ------------------------------------------------------------------

let turnCount = 0;
let isOrchestrator = false;
let warned = false;

// ------------------------------------------------------------------
// Helpers
// ------------------------------------------------------------------

/**
 * Check if the current agent is the orchestrator.
 * Orchestrator = has `subagent` tool in its tools list.
 */
function detectOrchestrator(ctx: any): boolean {
  const tools = ctx?.systemPromptOptions?.selectedTools || [];
  return tools.includes("subagent");
}

/** Build the warning prompt injected into system context. */
function buildWarning(): string {
  return (
    `\n⚠️ DELEGATION REMINDER: You have used ${LIMIT} of ${LIMIT} allowed turns without delegating. ` +
    `Delegate work to a subagent via subagent() or TaskExecute. ` +
    `You are an orchestrator — coordinate, don't do the work yourself.`
  );
}

/** Build status bar text. */
function buildStatus(): string {
  const effective = Math.max(0, turnCount - GRACE_TURNS);
  if (!isOrchestrator) return "🔵 turn-limiter: not orchestrator";
  if (turnCount <= GRACE_TURNS) return `🟢 orch: ${turnCount}/${GRACE_TURNS} grace`;
  if (warned) return `⚠️ orch: ${effective}/${LIMIT} — delegate now`;
  return `🔄 orch: ${effective}/${LIMIT}`;
}

// ------------------------------------------------------------------
// Extension
// ------------------------------------------------------------------

export default function (pi: any): void {

  /** Session start — reset everything, detect agent type. */
  pi.on("session_start", async (_event: any, ctx: any) => {
    turnCount = 0;
    warned = false;
    isOrchestrator = detectOrchestrator(ctx);

    if (ctx.ui) {
      ctx.ui.setStatus("turn-limiter", buildStatus());
    }
  });

  /** Turn end — increment counter, inject warning if needed. */
  pi.on("turn_end", async (_event: any, ctx: any) => {
    // Re-check orchestrator status each turn (agent can change)
    isOrchestrator = detectOrchestrator(ctx);
    if (!isOrchestrator) return;

    turnCount++;
    const effective = Math.max(0, turnCount - GRACE_TURNS);

    // Inject warning prompt after limit reached
    if (turnCount >= TOTAL_TRIGGER && !warned) {
      warned = true;
      // Append warning to system prompt for next turn
      if (ctx.appendSystemPrompt) {
        ctx.appendSystemPrompt(buildWarning());
      }
    }

    if (ctx.ui) {
      ctx.ui.setStatus("turn-limiter", buildStatus());
    }
  });

  /** Tool call — reset on delegation. */
  pi.on("tool_call", async (event: any, ctx: any) => {
    if (!isOrchestrator) return;

    const delegationTools = ["subagent", "TaskExecute"];
    if (delegationTools.includes(event.toolName)) {
      turnCount = 0;
      warned = false;
      if (ctx.ui) {
        ctx.ui.setStatus("turn-limiter", `🔄 orch: 0/${LIMIT} ✓ delegated`);
      }
    }
  });
}
