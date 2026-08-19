import { defineTool } from "eve/tools";
import { z } from "zod";
import {
  attachmentNames,
  getMessage,
  header,
  listMessages,
  receivedAt,
} from "../lib/gmail";

export default defineTool({
  description:
    "Search the agent's own inbox, where the family forwards school, daycare, " +
    "and medical email. Use for 'did the school send anything about the minimum day', 'what did the " +
    "nursery email about', 'any emails this week'. Returns senders, subjects, dates and snippets — " +
    "call read_email with an id to get the full text before answering anything detailed. " +
    "This inbox only has forwarded family logistics mail; it is NOT a parent's personal inbox, " +
    "so if something isn't here it may simply not have been forwarded — say that rather than assuming it doesn't exist.",
  inputSchema: z.object({
    query: z
      .string()
      .describe(
        "Gmail search syntax. Examples: 'from:stleo', 'subject:minimum day', " +
          "'newer_than:14d', 'has:attachment'. Combine with spaces. Leave empty for the most recent mail.",
      )
      .optional(),
    newerThan: z
      .string()
      .describe("Convenience recency filter like '7d', '30d', '6m'. Merged into the query.")
      .optional(),
    maxResults: z.number().int().min(1).max(15).describe("Max messages (default 8).").optional(),
  }),
  async execute({ query, newerThan, maxResults }) {
    const parts: string[] = [];
    if (query) parts.push(query);
    if (newerThan) parts.push(`newer_than:${newerThan}`);
    // Skip the noise Gmail files away itself.
    parts.push("-in:spam", "-in:trash");
    const q = parts.join(" ");

    const limit = maxResults ?? 8;
    const list = await listMessages(q, limit);
    const ids = list.messages ?? [];

    // Metadata-only keeps this cheap; read_email fetches the body on demand.
    const messages = await Promise.all(
      ids.map(async ({ id }) => {
        const msg = await getMessage(id, "metadata");
        return {
          id: msg.id,
          from: header(msg, "From"),
          subject: header(msg, "Subject") ?? "(no subject)",
          date: receivedAt(msg),
          unread: msg.labelIds?.includes("UNREAD") ?? false,
          hasAttachments: attachmentNames(msg).length > 0,
          snippet: msg.snippet ?? null,
        };
      }),
    );

    return { query: q, count: messages.length, messages };
  },
});
