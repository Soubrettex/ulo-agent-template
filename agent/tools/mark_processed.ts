import { defineTool } from "eve/tools";
import { z } from "zod";
import { markProcessed } from "../lib/processedEmails";

export default defineTool({
  description:
    "Mark an email as processed by the school-mail scanner, so future scans skip it. " +
    "Call this after you've read an email and either extracted dates from it or determined " +
    "it has nothing actionable.",
  inputSchema: z.object({
    messageId: z.string().describe("The Gmail message ID."),
    subject: z.string().describe("The email subject, for logging.").optional(),
  }),
  async execute({ messageId, subject }) {
    await markProcessed(messageId, subject);
    return { ok: true, messageId };
  },
});
