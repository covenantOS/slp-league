# SLP League

A gamified, public scoreboard for the ServiceLine Pro team's entrepreneur-points
bonus program. One shared pot, one season, soccer-league styling. Built with Astro,
served on Cloudflare Pages, with live data in a Cloudflare KV store.

Players: **Miggy** (Miguel), **Daniboy** (Daniel), **Kdawg** (Kevin).

## How the scoring works

There is **one shared bank of $2,500** for the season. Everyone starts at **100 points**.

- Every point a player **earns** is pulled out of the bank into their balance.
- Every point a player **loses** to a penalty is pushed back into the bank, where teammates can grab it.
- **1 point = $1.** Whatever you are holding when the season ends is what you get paid.
- Points held by all players + the bank always equals exactly **$2,500**. One player can take almost the whole thing.

Every point one player claims is a point the others can't have, and a penalty literally
hands money back to the pot.

### The rubric (tunable in `src/data/config.json`)

| Earn | Pts | | Lose | Pts |
|---|---|---|---|---|
| Daily check-in | +3 | | Missed check-in | -3 |
| Proof of work (data, screenshots) | +10 | | Missed deadline | -10 |
| Hit a deadline | +10 | | Sloppy work / failed QA | -15 |
| Weekly report on time | +15 | | Not using tools / no proof | -15 |
| Flag a blocker or broken tool in 24h | +20 | | **Red card** (serious neglect) | **-25** |
| Initiative without being asked | +25 | | | |
| Process improvement adopted | +40 | | | |
| Client win (page 1, lead) | +50 | | | |
| Client retained or upsold | +75 | | | |

Divisions by points held: **Reserve** (0+) → **Starter** (150+) → **Playmaker** (300+) →
**Star** (500+) → **Legend** (750+). Badges: Golden Boot, On Fire, Clean Sheet, Comeback, Top Flight.

## Running the league: the control room

Go to **`/admin`**, enter the code **`4221`**, and you get a control panel:

- Tap a green chip to award points or a red chip to dock them, per player.
- Or type any custom amount + reason and hit Award / Dock.
- Delete any entry, end the season (archives the final standings and starts a fresh one), or change the pot size.

Every change updates the public board instantly for the whole team. The code is checked on
the server for every write, so the board can't be edited without it. (It is a low-stakes
internal tool; the code is light protection, not a vault.)

## Player profiles

Players go to **`/me`**, pick themselves, and set a personal **code** (4 to 8 digits). The first
code submitted for a player claims that profile; after that the code unlocks editing it (and only
it). From there they set a **photo** and a **tagline**, which show on the board, their profile
page, and the activity feed.

Photos are resized in the browser to a small square, then stored in **R2** object storage and
served via `/img/<key>`. A player's code is kept server-side only and is never sent to any page
or API response.

## How the data works

Live game state (season, players, events) and the season archive are stored as JSON documents in
a **Cloudflare D1** database (binding `DB`), seeded from `src/data/*.json` on first run. Player
photos live in **Cloudflare R2** (binding `BUCKET`), served via `/img/<key>`. Pages read the
state at request time and compute standings with the pure engine in `src/lib/engine.mjs`. The
rules (rubric, tiers, badges, challenge) always come from `src/data/config.json` in code.

## Project structure

```
src/
  data/        season.json, players.json, events.json (empty on a fresh season) + config.json (rules)
  lib/         engine.mjs (scoring), store.mjs (D1/in-memory), league.mjs, format.mjs
  components/  PotBar, StandingRow, Badge, Sparkline, Avatar
  layouts/     Base.astro
  pages/       index, players/[id], players/index, history, rules
  pages/seasons/ index.astro, [id].astro   archive of completed seasons
  pages/me/    index.astro                 player profile editor (per-player code)
  pages/admin/ index.astro                 the control room (code 4221)
  pages/api/   mutate.js, profile.js, state.json.js   game/archive + profile writes
  pages/img/   [...path].js                serves player photos from R2
scripts/       test-engine.mjs
wrangler.toml  Worker config: D1 (DB) + R2 (BUCKET) bindings, account, assets
schema.sql     D1 table (state)
```

The bank invariant (`held + bank === pot`) is enforced by processing events
chronologically and clamping, so an over-award can never mint money beyond the pot.

## Local development

```bash
npm install
npm run dev          # http://localhost:4321  (local D1 + R2 via platformProxy)
npm run build
npm run deploy       # astro build + wrangler deploy (manual deploy)
npm run test:engine  # checks the scoring math and invariants
```

`astro dev` gets local D1 + R2 emulation from the adapter's platformProxy (reading
`wrangler.toml`). Apply the schema to the local DB once with
`npx wrangler d1 execute slp-league --local --file schema.sql`. With no bindings present the
store falls back to an in-memory copy seeded from `src/data`.

## Deploy to Cloudflare Workers

The D1 database (`slp-league`) and R2 bucket (`slp-league-media`) already exist, and the bindings
+ account are declared in `wrangler.toml`, so there is nothing to wire by hand.

- **Manual deploy:** `npm run deploy` (runs `astro build` then `wrangler deploy`).
- **Auto-deploy on push:** Cloudflare dashboard → Workers & Pages → connect this repo as a
  Workers project. It reads `wrangler.toml` for the bindings and redeploys on every push.

The store seeds itself from `src/data` on first request. The D1 schema is in `schema.sql`
(`npm run db:schema` applies it to the remote DB).

## Starting a new season

Open `/admin` and hit **End season**. The final standings are saved to the archive (browse
them at `/seasons`), then everyone resets to 100 and a fresh season starts, dated six months
out. Use **Set pot** to change the pot.

## Tuning the rules

Point values, tier thresholds, badges, and the weekly challenge live in
`src/data/config.json`; pot size and seed in `src/data/season.json`. These are read from
code, so edit and redeploy to apply. The live season, players, and events live in KV and are
managed from `/admin`.
