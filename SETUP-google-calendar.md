# Wiring Ulo to your Google Calendar

Ulo's `list_events` / `create_event` tools call the Google Calendar API using a
stored OAuth **refresh token**. You get that token once; after that everything is
automatic (no CLI, no re-login), and it works on Vercel serverless.

You need three secrets: `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`,
`GOOGLE_REFRESH_TOKEN`. Here's how to get them. **These steps are yours to do —
they authorize *your* Google account, which I can't do for you.**

## 1. Create an OAuth client (one time)

1. Go to the [Google Cloud Console](https://console.cloud.google.com/), create (or pick) a project.
2. **APIs & Services → Library →** enable **Google Calendar API**. (Do this first —
   the auth screens below only appear once an OAuth-compatible API is enabled.)
3. Configure the consent screen. Google **renamed this to "Google Auth Platform"**
   (the old "OAuth consent screen" menu is gone). Open
   [Google Auth Platform](https://console.cloud.google.com/auth/overview) (or
   APIs & Services → Google Auth Platform) → **Get started**:
   - **Branding:** app name + your support email.
   - **Audience:** choose **External**.
   - **Contact info:** your email → agree → **Create**.
   Then open the **Audience** tab → **Test users** → **Add users** →
   your email. (Testing mode is fine for personal use — no
   verification needed.)
4. Create the OAuth client: **Google Auth Platform → Clients** tab (equivalent to the
   old "Credentials → OAuth client ID") → **Create client** → type **Web application**.
   Under **Authorized redirect URIs** add:
   ```
   https://developers.google.com/oauthplayground
   ```
   Save. Copy the **Client ID** and **Client secret** → these are `GOOGLE_CLIENT_ID`
   and `GOOGLE_CLIENT_SECRET`.

## 2. Get a refresh token (one time)

1. Open the [OAuth 2.0 Playground](https://developers.google.com/oauthplayground/).
2. Click the ⚙️ (top right) → check **Use your own OAuth credentials** → paste your
   Client ID and Client secret.
3. In **Step 1**, in the "Input your own scopes" box, enter:
   ```
   https://www.googleapis.com/auth/calendar
   ```
   Click **Authorize APIs**, sign in as the account that owns the calendar, and allow.
4. In **Step 2**, click **Exchange authorization code for tokens**. Copy the
   **Refresh token** → this is `GOOGLE_REFRESH_TOKEN`.

> If the refresh token ever comes back empty on a later run, remove the app under
> your Google Account → Security → Third-party access, then redo step 2.

## 3. Pick a calendar

**Recommended:** Point the agent at a shared **"Family"** calendar, not the agent's
own calendar — so events the agent creates show up for the whole family. Share the
calendar with the agent's Google account with edit rights.

- `GOOGLE_CALENDAR_ID=primary` would instead use the authorizing account's own calendar.
- To point at a different shared calendar: in Google Calendar → that calendar's
  **Settings → Integrate calendar → Calendar ID**, copy it into `GOOGLE_CALENDAR_ID`.
  The share must be **"Make changes to events"** or higher, and the invite must be
  accepted by the authorizing account. Sanity-check with
  `GET https://www.googleapis.com/calendar/v3/users/me/calendarList` — the calendar
  should list with `accessRole` of `writer` or `owner`.

## 4. Put the secrets in place

**Local** (`.env.local`) — for testing with `npm run dev`:
```
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
GOOGLE_REFRESH_TOKEN=...
GOOGLE_CALENDAR_ID=primary
```

**Production** (Vercel) — required for the live iMessage agent. From the project dir:
```bash
vercel env add GOOGLE_CLIENT_ID production
vercel env add GOOGLE_CLIENT_SECRET production
vercel env add GOOGLE_REFRESH_TOKEN production
vercel env add GOOGLE_CALENDAR_ID production
```
Then redeploy: `npm exec -- vercel --prod`.

## Notes

- The refresh token is long-lived but can be revoked (from your Google account) or
  expire if the OAuth app stays in "testing" for a long time — just redo step 2 if
  calendar calls start failing with an auth error.
- Scope `.../auth/calendar` grants read **and** write. If you want read-only, use
  `.../auth/calendar.readonly` instead — but then `create_event` will fail.
