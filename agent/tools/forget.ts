import { defineTool } from "eve/tools";
import { z } from "zod";
import { forgetMemory } from "../lib/memoryStore";

export default defineTool({
  description:
    "Forget a saved memory, by the id shown in your loaded memories. Use when something is no " +
    "longer true or the family asks you to drop it. Only forget what they actually asked you to — " +
    "if a fact just seems stale to you, ask first rather than deleting it. The row is kept and " +
    "only marked deleted, so this can be undone from the database if it was a mistake.",
  inputSchema: z.object({
    id: z.number().int().describe("The memory's id, from the memories loaded into your context."),
  }),
  async execute({ id }) {
    const forgotten = await forgetMemory(id);
    if (!forgotten) {
      return { forgotten: false, reason: `No live memory with id ${id}.` };
    }
    return { forgotten: true, id: forgotten.id, content: forgotten.content };
  },
});
