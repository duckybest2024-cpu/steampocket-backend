# 🎰 SteamPocket Casino — backend

A provably-fair, multi-game casino backend. Eight games, one wallet, one shared
fairness engine — built so every spin, roll, and deal can be independently
verified byte-for-byte.

## Stack

Express + TypeScript · Prisma (SQLite) · Socket.io · JWT auth · Zod validation · Vitest

## Running it

```bash
npm install
npx prisma migrate dev   # creates dev.db and applies the schema
npm run dev              # http://localhost:4000  (REST) + ws://localhost:4000/crash (live)
npm test                 # unit tests for every game's math
```

Copy `.env` and adjust `JWT_SECRET` / `PORT` / `DATABASE_URL` as needed.

## Provably fair, end to end

Every random outcome is derived from `HMAC_SHA256(serverSeed, "${clientSeed}:${nonce}:${cursor}")`,
walked in 4-byte windows to produce floats in `[0, 1)` (`src/lib/provablyFair.ts`). The flow:

1. On signup (and after every `/fairness/rotate`), the server generates a fresh `serverSeed`
   and immediately publishes only its SHA-256 **hash** — a cryptographic commitment made
   *before* a single bet is placed.
2. Each bet increments a `nonce`; identical `(serverSeed, clientSeed, nonce)` triples always
   produce identical results — that's what makes replay possible.
3. Rotating to a new seed reveals the old one in full. `POST /fairness/verify` lets *anyone*
   (no auth required) recompute the hash and the resulting floats from a revealed seed and
   confirm they match what was paid out.
4. Bet history (`GET /bets`) only reveals a wager's `serverSeed` once that seed has been
   rotated out — showing a still-active seed would let a player precompute every future roll.

The same engine powers every game:

| primitive | used by |
|---|---|
| `floatFromSeed` (single roll) | dice, limbo, roulette |
| `floatsFromSeed` (N independent rolls via cursor) | mines (lay), plinko (peg path), slots (grid) |
| `shuffledDeck` (seeded Fisher-Yates) | blackjack (shoe) |

## The games

- **Dice** — pick over/under a 0–100 target; classic adjustable-risk roll. `POST /games/dice`
- **Limbo** — call a target multiplier, win if the rolled crash point clears it. `POST /games/limbo`
- **Crash** *(live, multiplayer, websocket)* — shared rounds on `/crash`: an
  exponential multiplier climbs from 1.00x in real time, cash out before it busts (or set an
  auto-cashout and walk away). Betting window → live climb → crash → repeat, forever.
- **Mines** — defuse a 5×5 grid hiding 1–24 mines; each safe tile compounds your multiplier
  via the exact hypergeometric "fair odds" formula; cash out anytime. `POST /games/mines/{start,reveal,cashout}`
- **Plinko** — drop a ball through a Galton board (8–16 rows, low/medium/high risk tables)
  and watch it binomially bounce into a multiplier slot. `POST /games/plinko`
- **Roulette** — full European (single-zero) board: straights, splits, streets, corners,
  lines, dozens, columns, red/black/even/odd/high-low, all in one spin. `POST /games/roulette/spin`
- **Blackjack** — six-deck shoe, hit/stand/double/split/surrender/insurance, dealer stands
  on all 17s, 3:2 naturals. Multi-step state persists between actions. `POST /games/blackjack/{start,action}`
- **Slots** — 5×3 reels, 25 paylines, wilds that double line wins, scatters that trigger
  10 free spins. `POST /games/slots/spin`

Every game targets ~99% RTP via a uniform 1% house edge baked into its payout math
(`config.houseEdge`).

## Wallet, progression & social layers

- **Ledger-backed wallet** — every balance change (bets, payouts, bonuses, rakeback) is an
  atomic, append-only `Transaction` row; `User.balance` can never drift from the sum of its
  history (`src/lib/wallet.ts`).
- **XP & levels** — wagering earns XP (`amount / 100`); leveling up pays a small cash bonus.
  `GET /auth/me` reports your current level/XP.
- **Daily rakeback** — claim 5% of everything you've wagered in the last 24h. `POST /wallet/rakeback/claim`
- **Faucet** — play-money top-up below a $500 balance, so you're never stuck. `POST /wallet/faucet`
- **Leaderboards** — rolling 7-day rankings by volume wagered or net profit. `GET /wallet/leaderboard`
- **Live bet feed** — the last 50 bets across all players, for that "people are winning right
  now" energy. `GET /bets/feed/recent`
- **Bet history** — paginated, filterable by game, with full fairness metadata for replay.
  `GET /bets`

## API surface

```
POST /auth/register | /auth/login          — JWT issuance, $1,000 welcome bonus
GET  /auth/me                              — profile, balance, level, active seed hash

POST /fairness/rotate                      — rotate seeds, reveal the old one
GET  /fairness/history                     — past seed rotations
POST /fairness/verify                      — stateless replay/verification (no auth)

GET  /wallet/transactions                  — ledger history
POST /wallet/faucet | /wallet/rakeback/claim
GET  /wallet/leaderboard?metric=wagered|profit

GET  /bets | /bets/:id | /bets/feed/recent

POST /games/dice | /games/limbo | /games/plinko
POST /games/mines/start | /reveal | /cashout         GET /games/mines/active
POST /games/blackjack/start | /action                GET /games/blackjack/active
POST /games/roulette/spin                            GET /games/roulette/board
POST /games/slots/spin                               GET /games/slots/info

ws  /crash  — live multiplayer round feed (state, round_betting, round_running,
              round_tick, bet_placed, cash_out, round_crash, history)
              emit "place_bet" {amount, autoCashout?} / "cash_out" {}
```
