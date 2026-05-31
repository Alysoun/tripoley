# Pot Wheel Rummy — Rules (This Implementation)

Based on the classic pot-board rummy / Michigan Rummy family. This app is **not** affiliated with any board-game manufacturer. **Configurable house-rule variants** are available at the setup screen.

## House rule presets

Choose a preset when starting a game, or switch to **Custom** and toggle individual rules. Your choice is saved in the browser.

| Preset | Summary |
|--------|---------|
| **Standard (pay at deal)** | Pay-card pots claimed when held after the blind deal; default Michigan penalties and sequence timer |
| **Home table** | Pay-card pots collected when you **play** the card in Michigan — not just for holding it after deal |
| **Custom** | Mix and match the toggles below |

### Custom toggles

| Toggle | When on | When off |
|--------|---------|----------|
| **Pay cards on Michigan play** | Ace–Ten Hearts, K-Q pair, and 8-9-10 pay out when played in Michigan | Pay out automatically at start of Pay Cards if held |
| **Dead hand blocks pay cards** | Matching cards in the blind hand prevent that section from paying | Dead hand ignored for pay-card claims |
| **Michigan sequence timer** | 15s to play the next card in a suit; expiry treats it as in the dead hand | No countdown |
| **Michigan lead pass penalty** | Cannot lead required black/red → pay 1 to **Kitty** and pass left | No chip penalty for passing lead |
| **Penalty for leftover cards** | Losers pay Kitty winner 1 chip per card still in hand | No end-of-Michigan chip penalty |
| **Dealer "Keep" blind option** | Explicit **Keep Hand** button on dealer blind choice | Swap or Auction only (auction still keeps your hand if no one buys) |

The game log shows which rules are active when a round starts.

## Players

- **4–9 players** at the table (fewer than four makes hands too large)
- Each seat is **Human** (hot-seat) or **AI**
- At least one human required in the default setup

## Achievements (solo vs AI)

When you play with **one human** and the rest AI, you earn **20 achievements** that persist in your browser. Open **Achievements** from the setup screen or the 🏆 button during a solo game.

- **Time buffers** — extra seconds on your turn timer, grace intervals, sequence freeze (Cool Head, Table Regular, Patience Pays, etc.). These never change chip counts.
- **Visual flex** — felt colors, neon chip tracers, gilded nameplates, POT sparklers, 8-bit sounds.
- **QoL tools** — sort by rank, red-suit scan, opponent card counts, ghost dead-hand counter, larger action buttons, faster fan animations, victory fanfare styles.
- Toggle each unlock on or off after you earn it. **No extra starting chips or pot bonuses.**
- Hot-seat games (multiple humans on one device) do not use achievements.

## Round flow

1. Each player antes **1 chip** on every board section (9 sections × 1 = 9 chips):
   - Ace, King, Queen, Jack, Ten of **Hearts**
   - King-Queen of Hearts (pair bonus)
   - 8-9-10 (any single suit)
   - Kitty
   - POT (center)
2. Deal all 52 cards to players plus one **dead (blind) hand**
3. Extra cards go to players left of the dealer

## Dealer blind choice

The dealer must choose one of:

- **Swap** — exchange hands with the dead hand *(not allowed if you hold a pay card — see below)*
- **Auction** — players bid; high bidder swaps with the dead hand and pays the dealer. If no sale, the dealer keeps their hand and the dead hand stays face down
- **Passing is permanent** — once you pass in the blind auction, you cannot bid again that round, even if someone else raises
- **Keep** *(optional house rule)* — keep your dealt hand; blind stays face down (same outcome as auction with no sale)

**Pay card restriction:** If you hold any pay-card (Ace–Ten of Hearts, the 8-9-10 run, etc.), you **cannot swap** with the blind as dealer and you **cannot bid** in the blind auction.

## Turn timer

Human players have **15 seconds** to act on their turn (dealer blind choice, blind auction, poker, Michigan, etc.). If time runs out, the game picks a safe default (pass, fold, check, auto-continue, etc.) so the table cannot stall — important for hot-seat and future multiplayer.

**Solo play:** There is no timer on the round-end summary or Michigan winner screen — take as long as you like before **Next Round**. In multiplayer, a timer on those screens will start once the first player hits Continue (not yet implemented).

When **Dead hand blocks pay cards** is enabled, cards in the dead hand block matching pay-card claims for that round.

## Phase 1 — Pay Cards (Hearts)

Under **Official** rules, players automatically claim chips from the board if they hold:

| Section | Requirement |
|---------|-------------|
| Ace–Ten of Hearts | That exact heart in hand |
| King-Queen | **Both** King and Queen of Hearts in the **same** hand |
| 8-9-10 | 8, 9, and 10 of the **same** suit in one hand |

Unclaimed sections roll over to the next round.

Under **Home table** rules (*Pay cards on Michigan play*), nothing is claimed here — pots pay out when the matching card(s) are **played** during Michigan instead.

## Phase 2 — Poker

- Each player forms their best **5-card poker hand** from their dealt cards (auto-evaluated)
- Betting starts left of dealer: check, bet, call, raise, fold
- All bets go to the **POT** section
- Best hand wins the pot (split on ties)

## Phase 3 — Michigan Rummy

- Players pick up their **full original hand** again
- **Player left of the dealer** opens by playing their **lowest black card** (clubs or spades)
- If they have no black cards *(when lead pass penalty is on)*, they pay **1 chip to the Kitty** and the obligation passes **left** to the next player, who tries their lowest black card
- After a lead, whoever holds the **next consecutive card in that suit** plays next (not necessarily clockwise)
- When no one can follow the sequence (next card missing — often in the dead hand), the **same player who played last** must lead their **lowest red card** (hearts or diamonds)
- If they cannot lead red *(when lead pass penalty is on)*, they pay **1 chip to the Kitty** and the obligation passes **left** for the next player’s lowest red
- After a red sequence stops, the same player leads **lowest black** again (colors alternate on each break)
- First player to empty their hand wins the **Kitty**
- *(When leftover-card penalty is on)* everyone else pays the winner **1 chip per card left**
- *(When sequence timer is on)* the player who must play the next card in a suit has **15 seconds**; if time runs out, that card is treated as being in the dead hand

## End of round

- Dealer rotates left
- New antes, deal, and phases begin

## AI poker skill (solo)

On the setup screen, choose **Automatic mix** (random Easy through Card Shark each new game) or **Choose each AI** to set poker skill per seat. Skill affects betting and bluffing during the poker phase only.

## Chip supply

Each player starts with **200 chips**.
