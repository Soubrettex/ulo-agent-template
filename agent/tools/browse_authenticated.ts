import { defineTool } from "eve/tools";
import { z } from "zod";
import { resolveSecrets } from "../lib/onePassword";
import { runBrowserAgent } from "../lib/browserbase";

export default defineTool({
  description:
    "Log into a website using credentials stored in 1Password and perform a task — " +
    "read content behind a login, fill an authenticated form, download a document summary, etc. " +
    "Credentials are resolved from 1Password by secret reference (op://vault/item/field) and " +
    "passed securely to the browser agent. Never log the resolved values. " +
    "Only use when the user explicitly asks you to access a site that requires login.",
  inputSchema: z.object({
    url: z.string().url().describe("The URL to navigate to."),
    task: z
      .string()
      .describe(
        "What to do once logged in — e.g. 'read the latest newsletter', " +
          "'fill out the field trip permission form with these values: ...'",
      ),
    credentials: z
      .array(
        z.object({
          name: z
            .string()
            .describe(
              "A short label for this credential, e.g. 'username' or 'password'.",
            ),
          ref: z
            .string()
            .describe(
              'The 1Password secret reference, e.g. "op://Ulo Agent/St Leo Portal/username".',
            ),
        }),
      )
      .min(1)
      .describe("1Password secret references for the credentials needed to log in."),
    resultSchema: z
      .record(z.string(), z.unknown())
      .optional()
      .describe(
        "Optional JSON schema describing the structured result you want back from the browser.",
      ),
  }),
  async execute({ url, task, credentials, resultSchema }) {
    const refMap: Record<string, string> = {};
    for (const c of credentials) {
      refMap[c.name] = c.ref;
    }

    const resolved = await resolveSecrets(refMap);

    const variables: Record<string, { value: string; description?: string }> = {};
    for (const c of credentials) {
      variables[c.name] = {
        value: resolved[c.name],
        description: `Login credential: ${c.name}`,
      };
    }

    const credFieldList = credentials.map((c) => c.name).join(", ");

    const { status, result, runId } = await runBrowserAgent(
      `Navigate to ${url}.\n\n` +
        `You have login credentials available as variables: ${credFieldList}. ` +
        `Use them to log in if prompted.\n\n` +
        `Once logged in, perform this task:\n${task}\n\n` +
        "IMPORTANT: Do NOT enter any payment information (credit card, bank account), " +
        "social security numbers, or government IDs. If the task requires those, STOP and report.",
      {
        variables,
        ...(resultSchema ? { resultSchema } : {}),
        timeoutMs: 180_000,
      },
    );

    if (status === "TIMED_OUT") {
      return {
        ok: false,
        error:
          "The authenticated browsing session timed out. The site may be slow or " +
          "the login flow may have changed. Try again or log in yourself.",
        runId,
      };
    }

    return { ok: true, ...result };
  },
});
