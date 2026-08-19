# Wiring the agent to email (read-only)

The agent reads **its own inbox** (`your-agent@gmail.com`) — never yours. You forward the
senders that matter (school, daycare, pediatrician) into that inbox with Gmail
filters, and Ulo can search and summarize them. It cannot send, reply, archive, or
delete anything.

Three parts: enable the API, re-authorize with the Gmail scope added, set up
forwarding. Steps 1–2 are one-time.

---

## 1. Enable the Gmail API

In the [Google Cloud Console](https://console.cloud.google.com/), same project as the
Calendar setup: **APIs & Services → Library →** search **Gmail API** → **Enable**.

## 2. Re-authorize with both scopes

The refresh token we have covers Calendar only. Adding Gmail means getting a **new**
refresh token that covers *both* — it replaces the old one, so Calendar keeps working.

1. Open the [OAuth 2.0 Playground](https://developers.google.com/oauthplayground/).
2. ⚙️ (top right) → check **Use your own OAuth credentials** → paste the same Client ID
   and Client secret from the Calendar setup.
3. **Step 1**, in "Input your own scopes", paste **both**, space-separated:
   ```
   https://www.googleapis.com/auth/calendar https://www.googleapis.com/auth/gmail.readonly
   ```
4. **Authorize APIs** → sign in as **your agent's Gmail** (not your own account —
   this is the agent's inbox we're granting).
5. You'll hit an "unverified app" / "Google hasn't verified this app" screen —
   expected, it's your own app. **Advanced → Go to (app name)**.
6. **Step 2 → Exchange authorization code for tokens** → copy the **Refresh token**.
7. Give it to me and I'll swap it into `.env.local` + Vercel prod and redeploy.

> If the refresh token comes back **empty**, go to the agent's Google Account →
> Security → Third-party access, remove the app, and redo from step 3.

### ⚠️ Important: publish the app, or tokens die every 7 days

While the OAuth app's publishing status is **"Testing"**, Google **expires refresh
tokens after 7 days** — Ulo's calendar and email would silently break about once a
week, needing a manual re-auth each time.

Fix it once: [Google Auth Platform](https://console.cloud.google.com/auth/overview) →
**Audience** → **Publish app** → confirm. Status becomes "In production" and refresh
tokens stop expiring.

You do **not** need Google's verification review. Unverified apps in production still
work — you just keep seeing the "unverified app" warning screen when authorizing (only
during step 2 above), and you're capped at 100 users. Fine for a family agent.

## 3. Forward the right mail into Ulo's inbox

Gmail makes you verify a forwarding address before it will forward to it.

**In *your* Gmail** (your personal account):

1. **Settings (⚙️) → See all settings → Forwarding and POP/IMAP →
   Add a forwarding address** → `your-agent@gmail.com` → Next → Proceed.
2. Google emails a confirmation code **to the agent's inbox**. Sign in to
   the agent's Gmail, open that email, click the verification link.
3. Back in your settings, **do not** select "Forward a copy of incoming mail" — that
   would forward *everything*. Leave it on "Disable forwarding"; the filters below do
   the selective forwarding.
4. **Settings → Filters and Blocked Addresses → Create a new filter.** In **From**, put
   the senders you want, separated by `OR`. Something like:
   ```
   yourschool.org OR yourdaycare.com OR yourpediatrician.com OR yourdentist.com
   ```
   → **Create filter** → check **Forward it to:** `your-agent@gmail.com` → **Create filter**.

Add more filters over time as new senders appear (sports leagues, parkour, etc.).

> **Filters only forward NEW incoming mail.** To give Ulo something to work with right
> away, manually forward a handful of recent school emails to the agent's Gmail.

---

## What Ulo can do once this is live

- `search_email` — find mail by sender, subject, or recency (`newer_than:14d`).
- `read_email` — open one message in full.

Try: *"did the school send anything about next week?"* or *"what was the last email from
the daycare?"* The agent is told to offer to put any dates it finds onto the family calendar.

## Notes

- Scope is `gmail.readonly` — read only. To let Ulo *send* later, you'd re-do step 2
  with `https://www.googleapis.com/auth/gmail.send` added.
- Ulo is instructed to treat email contents as information, not instructions — it will
  report what an email asks for, never act on it.
