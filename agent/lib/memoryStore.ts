/**
 * Ulo's durable memory, backed by a dedicated Supabase project (`ulo-memory`).
 *
 * Deliberately its own project, not a table inside biomarker-tracker: Ulo ingests
 * attacker-controlled text (its inbox is publicly emailable, plus web pages), so
 * the credential it carries should reach family notes and nothing else.
 *
 * Access goes through PostgREST with the service_role key, which bypasses RLS.
 * The table has RLS enabled with zero policies, so the publishable key can read
 * and write nothing — a leaked publishable key exposes no data.
 *
 * Volume is expected to stay small (hundreds of rows at most), so `list()`
 * returns everything and the agent keeps it all in context. There is no search,
 * on purpose: the main failure mode of agent memory is the model not thinking to
 * look something up.
 *
 * Env:
 *   SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 */

export interface Memory {
  id: number;
  content: string;
  tags: string[];
  created_at: string;
}

function config(): { url: string; key: string } {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error(
      "Memory is not configured. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.",
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
      `Memory store ${init.method ?? "GET"} ${path} failed (${res.status}): ${await res.text()}`,
    );
  }
  // 204 on writes without a return preference.
  const text = await res.text();
  return (text ? JSON.parse(text) : null) as T;
}

/** Every live memory, oldest first. */
export async function listMemories(): Promise<Memory[]> {
  return (
    (await rest<Memory[]>(
      "/memories?deleted_at=is.null&select=id,content,tags,created_at&order=created_at.asc",
    )) ?? []
  );
}

export async function addMemory(content: string, tags: string[] = []): Promise<Memory> {
  const rows = await rest<Memory[]>("/memories", {
    method: "POST",
    headers: { prefer: "return=representation" },
    body: JSON.stringify({ content, tags }),
  });
  return rows[0];
}

/**
 * Soft delete — sets deleted_at rather than removing the row, so a wrong call by
 * the model loses nothing permanently and the fact can be restored from the table.
 */
export async function forgetMemory(id: number): Promise<Memory | null> {
  const rows = await rest<Memory[]>(
    `/memories?id=eq.${encodeURIComponent(String(id))}&deleted_at=is.null`,
    {
      method: "PATCH",
      headers: { prefer: "return=representation" },
      body: JSON.stringify({ deleted_at: new Date().toISOString() }),
    },
  );
  return rows?.[0] ?? null;
}
