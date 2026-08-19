import { defineTool } from "eve/tools";
import { z } from "zod";
import { addMemory } from "../lib/memoryStore";

export default defineTool({
  description:
    "Save one durable fact about the family so you'll know it later — sizes, preferences, " +
    "who does what, standing arrangements, an open loop someone mentioned. Everything you save " +
    "is loaded automatically before every conversation, so you never need a tool to read it back. " +
    "Save things that stay true for a while. Do NOT save anything with a date or time attached — " +
    "that belongs on the calendar via create_event. Don't save secrets, passwords, or medical details.",
  inputSchema: z.object({
    content: z
      .string()
      .min(1)
      .max(500)
      .describe(
        "The fact, written as a short standalone sentence that will still make sense months " +
          "from now. Include who it's about. Good: 'santi wears size 11 shoes'. " +
          "Bad: 'he likes the blue one' — no context.",
      ),
    tags: z
      .array(z.string().max(30))
      .max(5)
      .describe("Optional short labels, e.g. ['santi','school'] or ['household'].")
      .optional(),
  }),
  async execute({ content, tags }) {
    const saved = await addMemory(content, tags ?? []);
    return { id: saved.id, content: saved.content, tags: saved.tags };
  },
});
