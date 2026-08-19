# Family Logistics Agent

An iMessage agent that helps your family stay organized — schedules, school emails, weather, travel times, web forms, and more. Built with [eve](https://eve.dev), deployed on [Vercel](https://vercel.com).

## What it does

- **Calendar** — reads and creates events on a shared Google Calendar
- **Email scanning** — daily cron scans forwarded school/daycare emails and proposes calendar entries
- **Weekly check-in** — proactive Thursday text about upcoming events and open loops
- **Weather & air quality** — current conditions, forecasts, UV, AQI via Google Maps APIs
- **Travel time** — live traffic estimates and "when do we need to leave" math
- **Web search** — looks things up via Browserbase
- **Form filling** — reads and submits web forms (permission slips, interest forms, surveys)
- **Authenticated browsing** — logs into school portals using 1Password credentials
- **Memory** — remembers durable facts about the family (sizes, preferences, routines)

## Setup

### 1. Clone and install

```bash
git clone <this-repo>
cd <this-repo>
npm install
```

### 2. Configure your family

Edit `agent/instructions.md` — replace every `[PLACEHOLDER]` with your family's info (names, address, schools, timezone, etc.).

### 3. Set up services

You'll need accounts and API keys for:

| Service | What it's for | Env var(s) |
|---------|--------------|------------|
| [Vercel](https://vercel.com) | Hosting + cron schedules | (deploy target) |
| [Google Cloud](https://console.cloud.google.com) | Calendar, Gmail, Weather, Air Quality, Routes | `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REFRESH_TOKEN`, `GOOGLE_CALENDAR_ID`, `GOOGLE_MAPS_API_KEY` |
| [Browserbase](https://browserbase.com) | Web search, form filling, authenticated browsing | `BROWSERBASE_API_KEY` |
| [Supabase](https://supabase.com) | Memory storage, processed email tracking | `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` |
| [1Password](https://1password.com) (optional) | Credential storage for authenticated browsing | `OP_SERVICE_ACCOUNT_TOKEN` |

See the `SETUP*.md` files for detailed instructions on each integration.

### 4. Create `.env.local`

```bash
cp .env.example .env.local
# Fill in your values
```

### 5. Set up the iMessage channel

The agent uses [Photon](https://photon.im) for iMessage. Run:

```bash
npx eve add channel/photon-imessage
```

Then update the `FAMILY_THREAD_ID` in `agent/schedules/daily-scan.ts` with your family's thread ID (you'll see it after the first inbound message).

### 6. Configure allowed senders

Set `ALLOWED_SENDERS` in `.env.local` to a comma-separated list of phone numbers that should be able to text the agent:

```
ALLOWED_SENDERS=+15551234567,+15559876543
```

### 7. Set up Supabase tables

Run these migrations in your Supabase project:

- `memories` table — for the agent's long-term memory
- `processed_emails` table — for tracking which emails the daily scan has already handled
- `reminders` table (optional) — for future reminder support

### 8. Seed initial memories

Fill in `MEMORY-SEED.md` with facts about your family, then:

```bash
npm run seed-memory
```

### 9. Update home coordinates

In `agent/lib/googleMaps.ts`, update `DEFAULT_LAT` and `DEFAULT_LNG` to your city's coordinates, and set `HOME_ADDRESS` in your env vars.

### 10. Deploy

```bash
vercel --prod
```

Then set all env vars in Vercel:

```bash
vercel env add GOOGLE_CLIENT_ID production
# ... repeat for each var
```

## Project structure

```
agent/
  instructions.md     — the agent's personality, rules, and family context
  instructions/       — dynamic instructions (memory injection)
  channels/           — iMessage channel config
  schedules/          — cron jobs (daily scan + Thursday check-in)
  tools/              — all agent capabilities
  lib/                — shared helpers (Google APIs, Browserbase, Supabase, etc.)
scripts/
  seed-memory.mjs     — loads MEMORY-SEED.md into Supabase
MEMORY-SEED.md        — template for initial family facts
SETUP*.md             — integration setup guides
```

## Customization

The agent's personality and rules are entirely in `agent/instructions.md`. Change the voice, add rules, remove sections — it's your agent.

The tools are modular. Don't need weather? Delete `agent/tools/weather.ts` and `agent/tools/air_quality.ts` and remove them from the instructions. Want to add a new capability? Create a new file in `agent/tools/`.
