/**
 * Tracks which Gmail messages the school-mail scanner has already handled.
 *
 * Separate from `memories` on purpose — message IDs are bookkeeping, not facts
 * Ulo should load into every conversation.
 *
 * Same Supabase project (`ulo-memory`), same service_role key, same RLS-with-
 * zero-policies pattern as memoryStore.ts.
 */

function config(): { url: string; key: string } {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error(
      "Supabase not configured. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.",
    );
  }
  return { url: url.replace(/\/$/, ""), key };
}

async function rest<T>(path: string, init: RequestInit = {}): Promise<T> {
  const { url, key } = config();
  const res = await fetch(`${url}/rest/v1${path}`, {
    ...init,
    headers: {
      apikey: key,
      authorization: `Bearer ${key}`,
      "content-type": "application/json",
      ...(init.headers ?? {}),
    },
  });
  if (!res.ok) {
    throw new Error(
      `processed_emails ${init.method ?? "GET"} ${path} failed (${res.status}): ${await res.text()}`,
    );
  }
  const text = await res.text();
  return (text ? JSON.parse(text) : null) as T;
}

/** Returns the set of message IDs already processed. */
export async function alreadyProcessed(messageIds: string[]): Promise<Set<string>> {
  if (messageIds.length === 0) return new Set();
  const filter = messageIds.map((id) => `"${id}"`).join(",");
  const rows = await rest<Array<{ message_id: string }>>(
    `/processed_emails?message_id=in.(${filter})&select=message_id`,
  );
  return new Set((rows ?? []).map((r) => r.message_id));
}

/** Mark a message as processed. */
export async function markProcessed(messageId: string, subject?: string): Promise<void> {
  await rest("/processed_emails", {
    method: "POST",
    headers: { prefer: "resolution=ignore-duplicates" },
    body: JSON.stringify({ message_id: messageId, subject: subject ?? null }),
  });
}
