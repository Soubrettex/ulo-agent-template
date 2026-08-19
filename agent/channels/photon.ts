import { connectPhotonCredentials } from "@vercel/connect/eve";
import { photonIMessageChannel } from "eve/channels/photon";

import { checkSender } from "../lib/allowlist";

/**
 * iMessage channel for Ulo, via Photon (Vercel Connect).
 *
 * Default Photon behavior dispatches EVERY inbound message to the agent. That's
 * right for a 1:1 chat, but in a group it would make Ulo reply to every message.
 * The onMessage gate below:
 *
 *   - 1:1 chat  → Ulo replies to everything (natural texting).
 *   - group     → Ulo replies only when addressed by name ("Ulo ...").
 *
 * Group vs 1:1 is read from the Chat SDK thread's `isDM` flag (confirmed present
 * on iMessage threads: `isDM === true` for a 1:1, `false` for a group).
 *
 * NOTE (2026-08): Photon's free shared line does not currently deliver *group*
 * messages to the webhook at all — only 1:1 DMs arrive. So the group branch is
 * effectively dormant until group delivery works (e.g. a dedicated line). The
 * gating is still correct for when it does.
 */

// Ulo answers to its name. Matches "Ulo", "@Ulo", "Ulo,", "hey ulo", etc.
// If you rename the agent, update this and `userName` together.
const ADDRESSED_BY_NAME = /(^|[\s@])ulo\b/i;

export default photonIMessageChannel({
  credentials: connectPhotonCredentials("photon/imessage-agent"),
  userName: "Ulo",

  async onMessage(ctx, message) {
    // Never respond to bots (including Ulo's own messages) — prevents loops.
    if (message.author?.isBot) return null;

    // Only the family gets an agent. The Photon line is shared, so anyone could
    // text it; without this they'd reach the calendar and the forwarded school mail.
    const author = message.author as Record<string, unknown> | undefined;
    const rawThread = ctx.thread as unknown as Record<string, unknown>;
    const verdict = checkSender([
      author?.id as string,
      author?.handle as string,
      author?.username as string,
      author?.phoneNumber as string,
      author?.email as string,
      message.authorId as string,
      rawThread?.id as string,
    ]);

    if (verdict === "deny") {
      console.warn("[allowlist] dropped message from a sender not on the allowlist");
      return null;
    }
    if (verdict === "unknown") {
      // Couldn't find a phone/email anywhere on the message — our field guesses are
      // wrong. Let it through (old behavior) but make it loud so we can fix the shape.
      console.error(
        "[allowlist] NO sender identifier found; allowing by fallback. author keys:",
        author ? Object.keys(author).join(",") : "(none)",
        "| thread keys:",
        rawThread ? Object.keys(rawThread).join(",") : "(none)",
      );
    }

    const thread = ctx.thread as unknown as { isDM?: boolean };
    const isGroup = thread?.isDM === false;

    if (isGroup) {
      // In a group, stay quiet unless someone actually addressed Ulo by name.
      const text = typeof message.text === "string" ? message.text : "";
      if (!ADDRESSED_BY_NAME.test(text)) return null;
      return {
        auth: null,
        context: [
          `This is a group chat. ${message.author?.fullName ?? "Someone"} addressed you by name. ` +
            `Reply only to what was asked of you; don't respond to unrelated group chatter.`,
        ],
      };
    }

    // 1:1 chat: reply as normal.
    return { auth: null };
  },
});
