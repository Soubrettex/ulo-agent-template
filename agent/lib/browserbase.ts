/**
 * Browserbase client for Ulo's web tools.
 *
 * Uses the plain SDK — the eve registry extension is broken (imports a removed
 * AI SDK export).
 *
 * Three tiers of Browserbase usage:
 *
 *   1. Search + Fetch — sessionless REST calls, 1,000 free/month each.
 *   2. Agent runs — managed browser + AI for form filling. Uses browser session
 *      time (1 hour/month free). Each run takes ~1-3 min.
 *   3. Raw browser sessions — not used; agent runs cover our needs.
 */

import Browserbase from "@browserbasehq/sdk";

let client: Browserbase | null = null;

export function browserbase(): Browserbase {
  if (client) return client;
  const apiKey = process.env.BROWSERBASE_API_KEY;
  if (!apiKey) {
    throw new Error(
      "Web/browser tools are not configured. Set BROWSERBASE_API_KEY (get one at browserbase.com).",
    );
  }
  client = new Browserbase({ apiKey });
  return client;
}

/**
 * Run a task in a managed Browserbase browser agent. Polls until the run
 * completes, fails, or hits the timeout.
 *
 * Returns the run's result (if any) and status. Throws on hard errors.
 */
export async function runBrowserAgent(
  task: string,
  opts?: {
    resultSchema?: Record<string, unknown>;
    variables?: Record<string, { value: string; description?: string }>;
    timeoutMs?: number;
  },
): Promise<{
  status: string;
  result: Record<string, unknown> | null;
  runId: string;
}> {
  const bb = browserbase();
  const timeout = opts?.timeoutMs ?? 120_000;

  const run = await bb.agents.runs.create({
    task,
    ...(opts?.resultSchema ? { resultSchema: opts.resultSchema } : {}),
    ...(opts?.variables ? { variables: opts.variables } : {}),
  });

  const deadline = Date.now() + timeout;

  let current = run;
  while (current.status === "PENDING" || current.status === "RUNNING") {
    if (Date.now() > deadline) {
      return { status: "TIMED_OUT", result: null, runId: run.runId };
    }
    await new Promise((r) => setTimeout(r, 5_000));
    current = await bb.agents.runs.retrieve(run.runId);
  }

  if (current.status === "FAILED") {
    const cause = (current as { cause?: { message?: string } }).cause;
    throw new Error(
      `Browser agent run failed: ${cause?.message ?? "unknown error"}`,
    );
  }

  return {
    status: current.status,
    result: (current.result as Record<string, unknown>) ?? null,
    runId: run.runId,
  };
}
