# Dashboard (Vercel)

Self-service pairing dashboard for WANNA-CRY THANXIEE — sign up, pair a WhatsApp number (OTP pairing code), see connection status, unlink, switch theme, and find the channel/repo links.

## Local development

1. `npm install`
2. Copy `.env.example` to `.env.local` and set `NEXT_PUBLIC_API_BASE` to your running `server/` API (e.g. `http://localhost:3000` locally, or your Render API URL).
3. `npm run dev`

## Deploying to Vercel

1. In Vercel: **New Project** → import `mrzeroexploitzw/wana-crythanxiev30` → set **Root Directory** to `dashboard`.
2. Vercel auto-detects Next.js from `vercel.json`/`package.json`.
3. Set environment variables in the Vercel project settings:
   - `NEXT_PUBLIC_API_BASE` — your deployed Render API URL (e.g. `https://wana-crythanxiev30-api.onrender.com`)
   - `NEXT_PUBLIC_BOT_NAME`, `NEXT_PUBLIC_CHANNEL_LINK`, `NEXT_PUBLIC_GITHUB_REPO` — branding (defaults already match the bot)
   - `NEXT_PUBLIC_AD_SLOT_HTML` — optional, paste an ad network's embed snippet here to show it in the dashboard footer; leave empty to hide the slot entirely
4. Deploy. On the Render side, set `DASHBOARD_ORIGIN` to this Vercel URL so CORS allows it.

## What's in scope here

- Sign up / log in (email + password)
- Pair a WhatsApp number (country code + server region + pairing code flow)
- Session list + per-session status/detail/unlink
- Theme toggle, channel/repo links, ad slot

## What's intentionally NOT here

Group moderation (antilink, welcome/goodbye, warnings, etc.) stays a WhatsApp chat-command feature — this dashboard only handles pairing and connection status, per the agreed scope. The Settings page says so, so users aren't left looking for controls that live elsewhere.
