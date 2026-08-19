import { defineTool } from "eve/tools";
import { z } from "zod";
import { runBrowserAgent } from "../lib/browserbase";

export default defineTool({
  description:
    "Fill out and submit a web form with specific values. ONLY call this AFTER you have: " +
    "(1) used read_form to see what the form asks for, and " +
    "(2) confirmed the values with the user in chat. " +
    "Never call this without explicit user approval of the values. " +
    "Never enter payment info, passwords, SSNs, or any financial details — if the form " +
    "asks for those, tell the user and stop.",
  inputSchema: z.object({
    url: z.string().url().describe("The form URL (same one from read_form)."),
    fields: z
      .array(
        z.object({
          label: z.string().describe("The field label as reported by read_form."),
          value: z.string().describe("The value to enter."),
        }),
      )
      .min(1)
      .describe("The fields to fill, with exact values confirmed by the user."),
  }),
  async execute({ url, fields }) {
    const fieldInstructions = fields
      .map((f) => `- "${f.label}" → ${f.value}`)
      .join("\n");

    const { status, result, runId } = await runBrowserAgent(
      `Navigate to ${url}. Fill out the form with these exact values:\n${fieldInstructions}\n\n` +
        "After filling all fields, click the submit/send/done button. " +
        "IMPORTANT: If the form asks for any payment information (credit card, bank account), " +
        "passwords, social security numbers, or other financial/security details, STOP " +
        "immediately — do NOT fill those fields, do NOT submit, and report what you found. " +
        "Report exactly what you submitted and whether submission succeeded.",
      {
        resultSchema: {
          type: "object",
          properties: {
            submitted: {
              type: "boolean",
              description: "Whether the form was successfully submitted",
            },
            fieldsSubmitted: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  label: { type: "string" },
                  value: { type: "string" },
                },
              },
              description: "What was actually entered in each field",
            },
            blockedReason: {
              type: "string",
              description: "If submission was blocked (e.g. payment fields found), why",
            },
            confirmationMessage: {
              type: "string",
              description: "Any confirmation message shown after submission",
            },
          },
        },
        timeoutMs: 120_000,
      },
    );

    if (status === "TIMED_OUT") {
      return {
        ok: false,
        error:
          "The form submission timed out. The form may or may not have been submitted — " +
          "check your email for a confirmation, or open the form yourself to verify.",
        runId,
      };
    }

    return { ok: true, ...result };
  },
});
