# Deadlnr — Implementation Plan

A phased plan to follow alongside Gemini's output, so you always know what "done" looks like at each step before moving on.

### Phase 0 — Accounts & prerequisites
Before you start prompting, have these ready:
- A [Vercel](https://vercel.com) account (free tier is fine).
- A [Supabase](https://supabase.com) project created — grab the project URL and anon/service keys from Settings → API.
- Your own Canvas Calendar Feed URL, for testing: Canvas → Calendar → click **"Calendar Feed"** (bottom-left of the sidebar) → copy the `.ics` link.
- Node.js 18+ installed locally if you're running this outside Antigravity's own environment.

**Done when:** you can log into all three services and have your Supabase keys and feed URL saved somewhere safe (not committed to git).

### Phase 1 — Scaffold
Next.js + Tailwind + Supabase auth wired up, deployable but empty.
- `npx create-next-app@latest` with TypeScript + Tailwind + App Router.
- Install `@supabase/supabase-js`, `@supabase/ssr`, and `node-ical`.
- Wire up email magic-link login.
- Push to GitHub, connect the repo to Vercel for auto-deploy on push.

**Done when:** you can sign in on the deployed Vercel URL and land on a blank authenticated home page.

### Phase 2 — Settings page with mock data
- Build `/settings`: Calendar Feed URL field + inline instructions for finding it, AI picker (Gemini/ChatGPT/Claude).
- Don't wire the real feed yet — save settings to Supabase and confirm they persist across reloads.
- Build the swipe screen against 5-10 **hardcoded mock assignments** so you can iterate on the UI without depending on the feed working yet.

**Done when:** you can swipe through fake assignment cards and your settings save/reload correctly.

### Phase 3 — Canvas iCal feed proxy route
- Build `/api/canvas/feed` as a server-side route.
- It reads the encrypted feed URL from Supabase, decrypts it server-side, fetches the `.ics` file, and parses it with `node-ical`.
- Normalize each event into `{ title, course, dueDate, description, canvasUrl }` — split the course code out of the `SUMMARY` field, and pull the assignment's direct link from the event's `URL` property for cards with sparse descriptions.
- Test with your own real feed URL.

**Done when:** hitting `/api/canvas/feed` while logged in returns your actual upcoming Canvas events as JSON — and a browser network tab confirms the raw feed URL never reaches the client.

### Phase 4 — Wire real data into the swipe UI
- Swap the mock array for a fetch to your new API route.
- Handle loading and error states (e.g. bad feed URL, no assignments due).
- For cards with sparse descriptions, show the "View full assignment on Canvas" link instead of an empty info section.

**Done when:** your real Canvas assignments show up as swipeable cards.

### Phase 5 — Swipe-right flow
- Implement the clipboard copy + toast + `window.open(aiUrl)` on swipe right, including the Canvas link in the copied text.
- Confirm it works for all three AI options, not just the default.
- Implement swipe-left as a simple dismiss (no side effects beyond logging).

**Done when:** swiping right on a real assignment opens Gemini (or your chosen AI) in a new tab with the assignment info — including a link back to Canvas — sitting in your clipboard, ready to paste.

### Phase 6 — Swipe history
- Log every swipe to `swipe_history` in Supabase.
- Optional: add a simple `/history` page listing what you've started vs. skipped.

**Done when:** swipe actions show up as rows in your Supabase table.

### Phase 7 — Polish & deploy
- Mobile responsiveness pass (this is a phone-first interaction).
- Empty state, error states, loading skeletons.
- Final Vercel deploy with production environment variables set (Supabase keys, encryption key).

**Done when:** the whole flow works end-to-end on your phone from a live URL.

## Security note

The Calendar Feed URL is a personal, unguessable link — anyone who has it can see your assignments and due dates, so treat it like a lightweight credential even though it's read-only and lower-risk than a full Canvas API token (no access to grades, messages, or write actions). Don't let it sit in Supabase as plaintext or base64. Encrypt it server-side (e.g. AES-256 with a key stored as a Vercel environment variable, never committed to git) before writing to `canvas_credentials`, and decrypt only inside the server-side API route, never on the client.
