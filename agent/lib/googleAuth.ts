/**
 * Shared Google OAuth for Ulo's tools (Calendar + Gmail).
 *
 * We store one long-lived OAuth *refresh token* for the agent's Gmail account (plus the
 * OAuth client id and secret) in env vars, and exchange it for a short-lived access
 * token on demand. One token covers every granted scope, so Calendar and Gmail share
 * it. This runs fine on Vercel serverless — no CLI, no interactive login.
 *
 * Required env vars (see SETUP-google-calendar.md / SETUP-gmail.md):
 *   GOOGLE_CLIENT_ID
 *   GOOGLE_CLIENT_SECRET
 *   GOOGLE_REFRESH_TOKEN
 *
 * Granted scopes must include:
 *   https://www.googleapis.com/auth/calendar          (read + write calendar)
 *   https://www.googleapis.com/auth/gmail.readonly    (read Ulo's own inbox)
 */

const TOKEN_URL = "https://oauth2.googleapis.com/token";

// Best-effort in-memory cache; only helps within a warm serverless instance.
let cachedToken: { token: string; expiresAt: number } | null = null;

export async function getAccessToken(): Promise<string> {
  if (cachedToken && Date.now() < cachedToken.expiresAt - 60_000) {
    return cachedToken.token;
  }
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const refreshToken = process.env.GOOGLE_REFRESH_TOKEN;
  if (!clientId || !clientSecret || !refreshToken) {
    throw new Error(
      "Google is not configured. Set GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, and GOOGLE_REFRESH_TOKEN.",
    );
  }

  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    }),
  });
  if (!res.ok) {
    const body = await res.text();
    // `invalid_grant` means the stored refresh token is dead — revoked, or expired
    // because the OAuth app was in "Testing" status when it was issued (7-day cap).
    // Surface that as something a human can act on; the agent relays this text.
    if (body.includes("invalid_grant")) {
      throw new Error(
        "GOOGLE_AUTH_EXPIRED: the saved Google connection is no longer valid, so calendar " +
          "and email are both unavailable. It needs a new refresh token from the OAuth " +
          "playground (scopes: calendar + gmail.readonly, signed in as your agent's Gmail).",
      );
    }
    throw new Error(`Google token exchange failed (${res.status}): ${body}`);
  }
  const json = (await res.json()) as { access_token: string; expires_in: number };
  cachedToken = {
    token: json.access_token,
    expiresAt: Date.now() + json.expires_in * 1000,
  };
  return cachedToken.token;
}

/** Authenticated JSON call against a Google API. `base` is the API root. */
export async function googleFetch<T = unknown>(
  base: string,
  path: string,
  init: RequestInit = {},
): Promise<T> {
  const token = await getAccessToken();
  const res = await fetch(`${base}${path}`, {
    ...init,
    headers: {
      authorization: `Bearer ${token}`,
      "content-type": "application/json",
      ...(init.headers ?? {}),
    },
  });
  if (!res.ok) {
    const body = await res.text();
    // A missing scope is the most likely failure right after adding a new API —
    // make that diagnosable instead of a bare 403.
    if (res.status === 403 && body.includes("insufficient")) {
      throw new Error(
        `Google API ${init.method ?? "GET"} ${path} was denied (403). The stored refresh ` +
          `token is probably missing a scope — re-run the OAuth grant with all scopes. Detail: ${body}`,
      );
    }
    throw new Error(
      `Google API ${init.method ?? "GET"} ${path} failed (${res.status}): ${body}`,
    );
  }
  return (await res.json()) as T;
}
