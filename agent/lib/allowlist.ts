/**
 * Sender allowlist for Ulo's iMessage channel.
 *
 * Photon delivers any inbound DM to the agent, and the line is a shared one from
 * the free pool — so without this, any number that texts it gets an agent that can
 * read the family calendar, read forwarded school email (kids' names, school,
 * daily schedule), and write calendar events. This restricts Ulo to the family.
 *
 * Configure with ALLOWED_SENDERS: a comma-separated list of phone numbers or
 * emails. Formatting doesn't matter — numbers are compared on their last 10
 * digits, so "+1 (555) 123-4567", "15551234567", and "555-123-4567" all match.
 */

/** Last 10 digits, which is the part that's stable across formats for US numbers. */
function digitsKey(value: string): string | null {
  const digits = value.replace(/\D/g, "");
  return digits.length >= 10 ? digits.slice(-10) : null;
}

function allowedEntries(): { numbers: Set<string>; emails: Set<string> } {
  const raw = process.env.ALLOWED_SENDERS ?? "";
  const numbers = new Set<string>();
  const emails = new Set<string>();
  for (const entry of raw.split(",").map((s) => s.trim()).filter(Boolean)) {
    if (entry.includes("@")) {
      emails.add(entry.toLowerCase());
      continue;
    }
    const key = digitsKey(entry);
    if (key) numbers.add(key);
  }
  return { numbers, emails };
}

export function isConfigured(): boolean {
  const { numbers, emails } = allowedEntries();
  return numbers.size > 0 || emails.size > 0;
}

/**
 * Check a set of candidate identifiers (we pull several fields off the message and
 * thread, since the Chat SDK's iMessage types are loose about where the handle lives).
 *
 * Returns:
 *   "allow"    — a candidate matched the allowlist
 *   "deny"     — candidates were found, none matched
 *   "unknown"  — no phone/email-shaped candidate could be extracted at all
 *
 * "unknown" means our field guesses are wrong, not that a stranger is texting.
 * The caller lets those through and logs loudly, so a Chat SDK shape change
 * degrades to the old behavior instead of silently bricking the agent.
 */
export function checkSender(candidates: Array<string | null | undefined>): "allow" | "deny" | "unknown" {
  const { numbers, emails } = allowedEntries();
  let sawCandidate = false;

  for (const candidate of candidates) {
    if (!candidate || typeof candidate !== "string") continue;

    const lowered = candidate.toLowerCase();
    if (lowered.includes("@") && !lowered.includes(" ")) {
      sawCandidate = true;
      if (emails.has(lowered)) return "allow";
    }

    // A thread id like "imessage:any;-;+15551234567~shared" embeds the number, so
    // scan for any digit run rather than requiring the whole string to be a number.
    for (const run of candidate.match(/\d[\d\s().-]{8,}\d/g) ?? []) {
      const key = digitsKey(run);
      if (!key) continue;
      sawCandidate = true;
      if (numbers.has(key)) return "allow";
    }
  }

  return sawCandidate ? "deny" : "unknown";
}
