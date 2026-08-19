import { defineTool } from "eve/tools";
import { z } from "zod";
import { attachmentNames, extractBody, getMessage, header, receivedAt } from "../lib/gmail";

/** Long newsletters blow up the context for no benefit; keep the useful head. */
const MAX_BODY_CHARS = 6000;

export default defineTool({
  description:
    "Read the full text of one email from Ulo's inbox, by id from search_email. Use this before " +
    "answering anything specific (dates, times, what to bring, whether action is needed) — the " +
    "snippet from search_email is usually truncated mid-sentence and is not enough to rely on. " +
    "If the email describes an event, offer to put it on the family calendar.",
  inputSchema: z.object({
    id: z.string().describe("The message id returned by search_email."),
  }),
  async execute({ id }) {
    const msg = await getMessage(id, "full");
    const body = extractBody(msg);
    const truncated = body.length > MAX_BODY_CHARS;

    return {
      id: msg.id,
      from: header(msg, "From"),
      to: header(msg, "To"),
      subject: header(msg, "Subject") ?? "(no subject)",
      date: receivedAt(msg),
      attachments: attachmentNames(msg),
      body: truncated ? `${body.slice(0, MAX_BODY_CHARS)}\n\n[…truncated]` : body,
      truncated,
    };
  },
});
