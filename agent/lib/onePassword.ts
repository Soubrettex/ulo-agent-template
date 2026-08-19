import { createClient, type Client } from "@1password/sdk";

let client: Client | null = null;

async function op(): Promise<Client> {
  if (client) return client;
  const token = process.env.OP_SERVICE_ACCOUNT_TOKEN;
  if (!token) {
    throw new Error(
      "1Password is not configured. Set OP_SERVICE_ACCOUNT_TOKEN.",
    );
  }
  client = await createClient({
    auth: token,
    integrationName: "Ulo Agent",
    integrationVersion: "1.0.0",
  });
  return client;
}

/**
 * Resolve one or more secret references from 1Password.
 * Each ref looks like "op://vault/item/field".
 */
export async function resolveSecrets(
  refs: Record<string, string>,
): Promise<Record<string, string>> {
  const c = await op();
  const entries = Object.entries(refs);
  const resolved = await Promise.all(
    entries.map(async ([key, ref]) => [key, await c.secrets.resolve(ref)] as const),
  );
  return Object.fromEntries(resolved);
}
