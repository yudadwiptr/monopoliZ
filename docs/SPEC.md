# MonopoliZ — Game & Design Spec

MonopoliZ is an original, Indonesian-themed "monopoli zaman now" board game for the web (desktop + mobile),
in the genre of fast-paced digital property games: buy cities, build up to landmarks, take over opponents'
properties, and win by bankruptcy or by one of three monopolies. All UI copy is **Bahasa Indonesia**, casual,
Gen-Z friendly ("cuan", "gas", "sultan"), never cringe-heavy.

> Originality rule: do NOT copy names, characters, art, music, or look of any existing commercial game. The
> mechanics are genre-standard; everything visual and textual is ours.

Stack: Vite + React 18 + TypeScript (strict) + Tailwind 3 + Framer Motion 11 + Zustand 4 + lucide-react icons.
Path alias `@/` → `src/`. Money unit everywhere = integer **juta rupiah**; format with `formatRp()` from
`@/lib/format` ("Rp 150 jt", "Rp 2,5 M").

---

## 1. Rules (authoritative — engine implements, AI + UI follow)

Constants live in `src/engine/economy.ts` — always import them, never hard-code numbers.

### Board
32 tiles (see `src/data/layout.ts` for grid geometry): corners `0 start`, `8 island`, `16 festival`,
`24 airport`. Each side has 5 cities, 1 tourist tile, 1 special (3× chance, 1× tax). Players move in increasing
index order. 8 colour groups (sizes 2,3,2,3,2,3,2,3). Maps: `nusantara` (default), `jabodetabek`; locked
"segera hadir" maps are shown but not playable.

### Setup
2–4 players, each human or bot (`mudah | sedang | sulit`), each a unique character (`src/data/characters.ts`,
character colour = player colour). Defaults: start cash `DEFAULT_START_CASH` (2000 = Rp 2 M), salary
`DEFAULT_SALARY` (200), round limit `DEFAULT_MAX_ROUNDS` (25; can be null = unlimited). Everyone starts on tile 0.
Player ids are `p1..p4` in seat order. Player 0 starts. Round 1.

### Turn
1. Pending `roll` → `ROLL{power}`. Two dice d6. `power` (0..1, optional) comes from the dice gauge: with
   probability 0.5 the engine re-samples up to 3 times and keeps the roll whose sum is closest to
   `2 + power*10`; otherwise pure random. Bots use the same gauge.
   Optional `parity` (`genap` | `ganjil`): a result whose sum does not match is re-rolled once with the
   same gauge and the second throw stands (~75 % match). Each pick spends one of the player's
   `PARITY_CHARGES` (3); passing start gives one back (max 3). Picking with no charges left is illegal.
2. Doubles → after the turn resolves the same player rolls again (`end_turn{extraRoll:true}`).
   The 3rd consecutive double (`MAX_DOUBLES`) sends the player straight to the island (no move by dice).
3. Walk forward tile by tile. **Passing or landing on start** pays `salary` and increments `laps`.
4. Resolve the landing tile (below). Then pending `end_turn`. `END_TURN` advances to the next non-bankrupt
   player (or same player if extraRoll), emits `turn_start`, increments `round` when wrapping to the first
   active seat. If `maxRounds` is set and the round would exceed it → game over by `batas_ronde` (richest by
   `totalAssets` wins).

### Landing
- **Unowned city** → pending `buy{tile, maxLevel}` where `maxLevel = buildCap(laps, -1)` (1 before first lap,
  3 after). `BUY{level}` pays `purchaseCost(def, level)` (discount card halves it and is consumed). SKIP allowed.
  If the player can't afford even land, skip the prompt (go to end_turn) and emit a `message`.
- **Unowned tourist** → `buy{tile, maxLevel:0}`.
- **Own city** → `build{tile, fromLevel, maxLevel: buildCap(laps, level)}` if `maxLevel > level` and the player can
  afford at least the next level. Landmark (4) is only possible if the tile was already a Hotel (3) at landing.
- **Own tourist** → nothing.
- **Opponent property** → pay toll `tollAt(...)` (festival tile ×2). If the payer holds a `shield` card it is
  consumed instead (`card_used`). Then, if the tile is not a landmark and the payer can afford
  `acquirePrice(def, level)` (2× invested value), pending `acquire{tile, price, ownerId}`. `ACQUIRE` pays the owner
  and transfers ownership with buildings (festival stays). After acquiring a city, the player may build on it
  (pending `build` as if own city — landmark allowed only if it is already a hotel).
- **Chance** → draw top card (reshuffle with RNG when deck empty) → pending `card{cardId}` → `ACK` applies it.
  Card effects (see `CardEffect` in types.ts):
  - `move_to` walks forward (salary if passing start) and resolves the destination tile normally;
    `island` jumps directly (no salary). `nearest_tourist` = first tourist tile strictly ahead.
  - `move_by` negative walks back with no salary; positive forward with salary when passing start; destination
    resolves normally.
  - `upgrade_free`: choose own city with level < 4 (respecting: hotel→landmark allowed) → +1 level free.
    If none, `message` and continue.
  - `downgrade_own`: engine picks the player's highest-level non-landmark building with level ≥ 1 → -1 level.
  - `festival_move`: choose one of own properties (optional). `force_sale`: choose an opponent's non-landmark
    property (optional); it returns to bank, owner is refunded `sellValue`.
  - `collect_each`: each other active player pays min(amount, their cash). `pay_each` / `pay` /
    `pay_percent_cash` / `pay_per_building` may trigger raise_funds for the current player.
  - `keep`: added to `player.cards` (max 1 of each kind; a duplicate is converted into Rp 50 jt).
- **Tax** → pay `taxFor()` (10 % of own property value). 0 → message.
- **Start (exact landing)** → salary (once) then optional `choose_tile{purpose:'start_upgrade'}` among own cities
  that can go up one level (respect landmark rule) and are affordable; pays `levelCost` for the next level.
- **Island** → `islandTurns = ISLAND_MAX_TURNS`; emits `island{turnsLeft:3, escaped:false}`; turn ends.
  Next turns start with pending `island{turnsLeft, fee: ISLAND_ESCAPE_FEE, canPay, hasCard}`:
  `ROLL` → doubles: escape and move by the dice (no extra roll); not doubles: `islandTurns--`; when it reaches 0
  the player is freed and moves by that roll; otherwise stays and the turn ends.
  `PAY_ESCAPE` → pay fee, then pending `roll` (normal turn). `USE_ESCAPE_CARD` → consume card, pending `roll`.
- **Festival corner** → optional `choose_tile{purpose:'festival'}` among own properties. Only one festival tile on
  the board; choosing moves it.
- **Airport** → `pendingFlight = true`, turn ends. Next turn starts with optional
  `choose_tile{purpose:'airport', candidates: every tile except 24}`. `CHOOSE_TILE` flies there (`move` mode
  `fly`); passing start (destination index < 24 means wrap) pays salary; destination resolves normally.
  `SKIP` → pending `roll`.

### Paying & bankruptcy
Any payment larger than cash: if `cash + liquidationValue >= amount` → pending
`raise_funds{amount, creditorId, reason}`. `SELL{tiles}` sells those tiles to the bank for `sellValue` each
(ownership cleared, festival removed if on them); when cash covers the debt it is paid and the game resumes
where it left off (e.g. acquire offer after toll). `BANKRUPT` (or impossible to cover) → the creditor receives
all the cash the debtor can raise (cash + liquidation), all their tiles return to bank, `bankrupt=true`,
`bankrupt` event. If only one active player remains → winner by `bangkrut`.

### Winning (checked after every ownership change)
`checkMonopolyWin()` in `src/engine/selectors.ts`:
- **Monopoli Wisata** – own all 4 tourist tiles.
- **Monopoli Jalur** – own all 6 properties of one board side.
- **Monopoli Triple Warna** – own 3 complete colour groups.
Plus `bangkrut` and `batas_ronde`. When a player becomes exactly one tile away from a monopoly
(`monopolyThreats()`), emit `monopoly_alert` (only when that threat is new).

### Events
Every state change the UI must animate is reported as a `GameEvent` (see types.ts). Cash changes ONLY via
`transfer` events; ownership via buy/build/acquire/sell/force_sale/bankrupt; positions via `move`.

---

## 2. Store contract (`src/store/gameStore.ts`, already written)

```ts
const game = useGame(s => s.game)            // GameState | null — truth (may be ahead of animation)
const view = useGame(s => s.view)            // ViewState — what to DRAW (positions, cash, tiles, festival, dice)
const busy = useGame(s => s.busy)            // true while events animate → hide decision UI
const fx = useGame(s => s.fx)                // transient effects: money pops, labels (auto-expire)
const alert = useGame(s => s.alert)          // monopoly alert {playerId, reason, missing[]}
const shake = useGame(s => s.shake)          // increments on big moments → screen shake
const currentEvent = useGame(s => s.currentEvent)
useGame.getState().act(action)               // human action (ignored while busy / bot turn)
useHumanPending()                            // pending decision for a human, or null
useSelectableTiles()                         // tile indices clickable on the board (choose_tile)
useGame.getState().setPaused(true|false), quitToMenu(), startGame(config), continueGame(), hasSave(), restartSame(), setScreen(screen)
useSettings()                                // sfxVolume, musicVolume, speed, camera ('3d'|'top'), haptics
```
`end_turn` pending is auto-dispatched by the store. Bots are driven by the store via `decideBotAction`.
Sounds for game events are already triggered by the store; UI only plays UI sounds (`click`, `hover`,
`open`, `gauge`…) via `sfx.play()` from `@/audio`.

---

## 3. Visual direction — "Nusantara Malam × MonopoliZ blue"

Night-market archipelago: deep indigo night (`ink-900` #0B1026) with a faint **kawung batik** texture
(`.batik-bg`), lit by the **brand blue** of the MonopoliZ logo (`brand-500` #3A8CD6 — primary actions,
selection, highlights), warm **lantern gold** for money/premium/landmarks (`gold-*`), **merah** for danger /
paying / bankrupt, **laut** teal for tourist tiles, **daun** green for gains. Typography: `font-display`
(Fredoka, rounded & chunky) for titles, numbers and buttons; `font-sans` (Plus Jakarta Sans — an Indonesian
typeface) for body text. Use `.num` for numbers.

Principles:
- **Tactile & juicy**: chunky 3D-press buttons (`Button` in `@/ui/common`), springy motion, hover lift,
  count-up money (`Money`), floating "+Rp 200 jt" pops, confetti, screen shake on big moments.
- **Glass panels** (`.glass`, `.glass-strong`) with 1px light borders on the dark night background.
- **Clarity first**: the board must be readable at a glance — group colour bands, owner colour, building level,
  current toll. Never hide critical info behind hover on mobile (tap = info).
- **Mobile-first responsive**: works from 360×640 portrait to 1920×1080. Use `dvh`, safe-area insets.
- **Performance**: 60fps; animate transforms/opacity only; no heavy filters on many elements.
- Respect `prefers-reduced-motion` (global CSS already shortens animations).
- Accessible: buttons have labels, focus-visible rings, sufficient contrast.

Shared kit in `src/ui/common`: `Button` (variants primary/gold/danger/ghost/glass; sizes sm..xl), `Modal`,
`Avatar` (character disc), `Money`, `Logo`. Use them; extend only inside your own folder.

---

## 4. File ownership (parallel build — touch ONLY your files)

| Owner | Files |
|---|---|
| foundation (done) | `src/engine/types.ts`, `economy.ts`, `selectors.ts`, `src/data/**`, `src/lib/**`, `src/store/**`, `src/ui/common/{Button,Modal,Avatar,Money,index}.tsx`, `src/App.tsx`, `src/main.tsx`, `src/styles/**`, configs |
| engine | `src/engine/game.ts`, `src/engine/rules/**`, `src/engine/rng.ts`, `src/engine/**/*.test.ts` |
| ai | `src/ai/**` |
| board | `src/ui/board/**` (exports `Board3D`) |
| hud | `src/ui/hud/**`, `src/ui/screens/GameScreen.tsx` |
| dialogs | `src/ui/dialogs/**` (exports `DecisionLayer`) |
| screens | `src/ui/screens/{MainMenu,SetupScreen,HowToPlay,ResultsScreen,PauseMenu,SettingsModal}.tsx`, `src/ui/screens/parts/**` |
| audio | `src/audio/**` |
| brand/seo | `index.html`, `public/**`, `src/ui/common/Logo.tsx`, `scripts/brand/**` |

If you need something from another owner's area that doesn't exist yet, code against the contract above
(it is stable) — do not edit their files. If the contract is genuinely insufficient, note it in your final
report instead of changing shared files.
