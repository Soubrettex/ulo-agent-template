import { defineTool } from "eve/tools";
import { z } from "zod";
import { browserbase } from "../lib/browserbase";

export default defineTool({
  description:
    "Search the web. Use for anything you don't know and can't get from the calendar or email: " +
    "business hours, phone numbers, addresses, prices, whether somewhere is open, local events, " +
    "how-to questions. Returns titles, urls, and snippets — if a snippet doesn't clearly answer " +
    "the question, call web_fetch on the most promising url rather than guessing from the snippet.",
  inputSchema: z.object({
    query: z.string().min(1).max(200).describe("The search query."),
    numResults: z
      .number()
      .int()
      .min(1)
      .max(10)
      .describe("How many results (default 5). More is rarely better.")
      .optional(),
  }),
  async execute({ query, numResults }) {
    const res = await browserbase().search.web({
      query,
      numResults: numResults ?? 5,
    });

    return {
      query: res.query,
      results: (res.results ?? []).map((r) => ({
        title: r.title,
        url: r.url,
        publishedDate: r.publishedDate ?? null,
      })),
    };
  },
});
