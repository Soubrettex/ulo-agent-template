import { defineTool } from "eve/tools";
import { z } from "zod";
import { runBrowserAgent } from "../lib/browserbase";

export default defineTool({
  description:
    "Open a form URL in a remote browser and report what fields it asks for — labels, types, " +
    "dropdown options, required vs optional. Use this BEFORE filling a form so you can confirm " +
    "the values with the user. Does NOT fill in or submit anything. " +
    "Only use when the user explicitly asks you to fill out a form they've shared a link to.",
  inputSchema: z.object({
    url: z.string().url().describe("The form URL."),
  }),
  async execute({ url }) {
    const { status, result, runId } = await runBrowserAgent(
      `Navigate to ${url}. ` +
        "Read every form field on the page — labels, input types (text, dropdown, checkbox, " +
        "radio, date, etc.), whether each field is required or optional, and all available " +
        "options for dropdowns and radio buttons. " +
        "Return a structured list of what the form asks for. " +
        "Do NOT fill in any fields. Do NOT click submit or send. Just read and report.",
      {
        resultSchema: {
          type: "object",
          properties: {
            formTitle: { type: "string", description: "Title or heading of the form" },
            fields: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  label: { type: "string" },
                  type: { type: "string" },
                  required: { type: "boolean" },
                  options: {
                    type: "array",
                    items: { type: "string" },
                    description: "For dropdowns/radios/checkboxes, the available choices",
                  },
                },
              },
            },
            notes: { type: "string", description: "Anything else notable about the form" },
          },
        },
        timeoutMs: 90_000,
      },
    );

    if (status === "TIMED_OUT") {
      return {
        ok: false,
        error: "The form took too long to load or read. Try again, or open it yourself.",
        runId,
      };
    }

    return { ok: true, ...result };
  },
});
