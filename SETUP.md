# iMessage agent — setup

An [eve](https://github.com/vercel/eve) agent (the brain), speaking **Claude** via
Vercel AI Gateway, reachable over **iMessage** through
[Photon / spectrum](https://github.com/photon-hq/spectrum-ts) (the transport).

```
iMessage ──▶ Photon Cloud ──webhook──▶ /eve/v1/photon (Vercel) ──▶ eve agent ──▶ Claude
   ▲                                                                     │
   └──────────────────────── reply via Photon ◀─────────────────────────┘
```

It's all webhook-driven, so the whole thing runs as one serverless app on Vercel —
no always-on worker.

## What's already done

- `agent/agent.ts` — model set to `anthropic/claude-sonnet-4.5` (swap for
  `anthropic/claude-opus-4.5` or `anthropic/claude-haiku-4.5` any time).
- `agent/instructions.md` — an iMessage-appropriate assistant persona.
- `agent/tools/current_time.ts` — a starter tool. Add more beside it.
- `agent/channels/photon.ts` — the iMessage channel, wired to env credentials.
- `.env.local` — placeholders to fill in.
- `typecheck` passes.

## Steps that need you (accounts, a phone number, OAuth)

### 1. Get a Claude / AI Gateway key
Vercel dashboard → **AI Gateway** → **API Keys**. Put it in `.env.local` as
`AI_GATEWAY_API_KEY`. This is what carries your Claude calls.

### 2. Get a Photon project + register your iMessage number
Sign up at **https://app.photon.codes**, create a project, and register the phone
number the agent will text from. Copy the project ID and secret into `.env.local`
(`IMESSAGE_PROJECT_ID`, `IMESSAGE_PROJECT_SECRET`).

> Prefer this handled for you? From the project directory run
> `eve add channel/photon-imessage` — it creates the Photon project, registers the
> number, and wires the webhook via Vercel Connect. It will replace
> `agent/channels/photon.ts` with the managed (Connect) version. Either path works.

### 3. Run it locally
```bash
npm run dev
```
This opens eve's terminal REPL so you can talk to the agent directly and confirm
Claude + your tools work — before any iMessage wiring.

### 4. Deploy to Vercel
```bash
npx vercel        # first run links/creates the project
npx vercel --prod
```
Set `AI_GATEWAY_API_KEY`, `IMESSAGE_PROJECT_ID`, and `IMESSAGE_PROJECT_SECRET` in
the Vercel project's Environment Variables.

### 5. Point Photon at your deployment
In Photon, create a webhook targeting:
```
https://<your-deployment>/eve/v1/photon
```
Copy its signing secret into `IMESSAGE_WEBHOOK_SECRET` (both `.env.local` and
Vercel env). Redeploy. Text the registered number — replies come from Claude.

## Notes

- Both eve and spectrum-ts are **public beta**; APIs may shift. The bundled docs at
  `node_modules/eve/docs/` match your installed version exactly — read those first.
- `.env.local` is gitignored. Never commit real credentials.
- Disclose that users are talking to an AI where required (see `instructions.md`).
