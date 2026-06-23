# SLP League

A gamified, public scoreboard for the ServiceLine Pro team's entrepreneur-points
bonus program. One shared pot, one season, soccer-league styling. Built with Astro,
deployed on Cloudflare Pages, with a daily Slack "Matchday" drop.

Players: **Miggy** (Miguel), **Daniboy** (Daniel), **Kdawg** (Kevin).

## How the scoring works

There is **one shared bank of $2,500** for the season. Everyone starts at **100 points**.

- Every point a player **earns** is pulled out of the bank into their balance.
- Every point a player **loses** to a penalty is pushed back into the bank, where teammates can grab it.
- **1 point = $1.** Whatever you are holding when the season ends is what you get paid.
- Points held by all players + the bank always equals exactly **$2,500**. One player can take almost the whole thing.

This makes it genuinely competitive: every point one player claims is a point the others
can't have, and a penalty literally hands money back to the pot.

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

## Project structure

```
src/
  data/        season.json, players.json, events.json, config.json  (all the data)
  lib/         engine.mjs (scoring), format.mjs, league.mjs (loader)
  components/  PotBar, StandingRow, Badge, Sparkline
  layouts/     Base.astro
  pages/       index (standings), players/[id], history, rules
scripts/       slack-matchday.mjs, snapshot.mjs, test-engine.mjs
public/admin/  Sveltia CMS (git-based point editor)
.github/workflows/matchday.yml   daily Slack + snapshot cron
```

The scoring engine is pure and shared by the site and the Slack script. The bank
invariant (`held + bank === pot`) is enforced by processing events chronologically and
clamping, so an over-award can never mint money beyond the pot.

## Local development

```bash
npm install
npm run dev          # http://localhost:4321
npm run build        # static output to dist/
npm run test:engine  # sanity-check the scoring math and invariants
npm run matchday     # dry-run the Slack message (prints the payload)
```

## Logging points

Three ways, pick whatever is easiest:

1. **Admin UI** at `/admin/` — a form (pick player, pick category, set points, type a reason).
   Saving commits to the repo and the site rebuilds. Requires the one-time GitHub OAuth setup below.
2. **Edit `src/data/events.json` on GitHub** directly (the web editor). No setup needed.
3. **Edit the file locally** and push.

Each event is `{ date, playerId, points, category, reason }`; `by` (who awarded it, defaults to
William) and `id` are optional. Points are positive to earn, negative to penalize. Events dated in
the future stay dormant until that date arrives.

## Deploy to Cloudflare Pages

1. Push this repo to GitHub (done if you're reading this there).
2. Cloudflare dashboard → Workers & Pages → Create → Pages → Connect to Git → pick `slp-league`.
3. Build settings: framework preset **Astro**, build command `npm run build`, output directory `dist`.
4. Deploy. Cloudflare rebuilds automatically on every push (including the daily snapshot commit).

Update `site` in `astro.config.mjs` to the final URL once you have it.

## Daily Slack "Matchday" drop

1. In Slack, create an Incoming Webhook for the channel you want (Slack → Apps → Incoming Webhooks).
2. In GitHub repo Settings → Secrets and variables → Actions:
   - Secret `SLACK_WEBHOOK_URL` = the webhook URL.
   - Variable `SITE_URL` = your deployed URL.
3. The `Matchday` workflow runs daily at 13:00 UTC. Trigger it manually anytime from the Actions tab.

The workflow also commits a daily snapshot, which keeps the live site's streaks and
"days left" current and powers day-over-day movement.

## Admin OAuth (one-time, optional)

The `/admin/` editor uses Sveltia CMS with a GitHub backend. To enable login, register a
GitHub OAuth app and point an auth handler at it (Sveltia's docs cover a Cloudflare Pages
function for this). Until that's set up, use option 2 above to log points. `repo:` in
`public/admin/config.yml` is currently `covenantOS/slp-league` — change it if the repo moves.

## Starting a new season

1. Pay out the current standings.
2. In `src/data/season.json` bump `id`/`name`, set new `startDate`/`endDate`.
3. Empty `src/data/events.json` to `{ "events": [] }` and delete `src/data/snapshots.json`.
4. Commit. Everyone resets to 100 and the bank refills to $2,500.

## Tuning

Everything lives in `src/data/config.json`: point values, tier thresholds, badge
definitions, and the weekly challenge. The pot size and seed are in `season.json`.
