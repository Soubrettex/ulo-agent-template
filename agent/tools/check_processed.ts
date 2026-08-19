import { defineTool } from "eve/tools";
import { z } from "zod";
import { alreadyProcessed } from "../lib/processedEmails";

export default defineTool({
  description:
    "Check which email message IDs have already been processed by the school-mail scanner. " +
    "Pass a list of IDs from search_email; returns the subset that have already been handled, " +
    "so the scanner can skip them.",
  inputSchema: z.object({
    messageIds: z.array(z.string()).min(1).describe("Gmail message IDs to check."),
  }),
  async execute({ messageIds }) {
    const done = await alreadyProcessed(messageIds);
    return {
      processed: [...done],
      unprocessed: messageIds.filter((id) => !done.has(id)),
    };
  },
});
