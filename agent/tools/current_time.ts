import { defineTool } from "eve/tools";
import { z } from "zod";

/**
 * A tiny, safe starter tool so the agent can do something the model can't do
 * from memory: read the real current time. Replace or add tools as you build.
 */
export default defineTool({
  description:
    "Get the current date and time. Use when the user asks what time or day it is, " +
    "or when you need the real 'now' to reason about scheduling.",
  inputSchema: z.object({
    timeZone: z
      .string()
      .describe("IANA time zone, e.g. 'America/New_York'. Defaults to the family's zone, America/Los_Angeles.")
      .optional(),
  }),
  async execute({ timeZone }) {
    const now = new Date();
    const zone = timeZone ?? "America/Los_Angeles";
    return {
      iso: now.toISOString(),
      timeZone: zone,
      formatted: new Intl.DateTimeFormat("en-US", {
        dateStyle: "full",
        timeStyle: "short",
        timeZone: zone,
      }).format(now),
    };
  },
});
