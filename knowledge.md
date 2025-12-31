# Knowledge Base: Pocket Poker (PWA)

## 1. Project Identity & Architecture
**Vision:** A minimalist, "Apple-design" inspired Poker PWA (Progressive Web App). High-performance, offline-capable (single player), and secure P2P (Peer-to-Peer) multiplayer.
**Core Philosophy:** Frontend-first. No heavy backend logic. Smooth interactions over flashy effects. Privacy-focused.

### Tech Stack
*   **Runtime:** Browser (PWA)
*   **Framework:** [React 18+](https://react.dev/)
*   **Build Tool:** [Vite](https://vitejs.dev/) (Target: ESNext for performance)
*   **Language:** [TypeScript](https://www.typescriptlang.org/) (Strict Mode enabled)
*   **State Management:** [Zustand](https://github.com/pmndrs/zustand) (with `immer` middleware for complex nested state updates).
*   **Routing:** [TanStack Router](https://tanstack.com/router) or `wouter` (Minimalist router for app shell).
*   **Styling:** [Tailwind CSS](https://tailwindcss.com/) + `clsx` + `tailwind-merge`.
*   **Motion:** [Framer Motion](https://www.framer.com/motion/) (Layout animations, shared element transitions).
*   **Icons:** [Lucide React](https://lucide.dev/).

---

## 2. Game Engine & Rules (Domain Logic)

### Libraries
*   **Hand Evaluation:** [`pokersolver`](https://www.npmjs.com/package/pokersolver)
    *   *Usage:* Determines the winner at Showdown.
    *   *Implementation:* Wrap this in a `HandEvaluatorService`. It must accept the board + player cards and return a `Hand` object with rank (e.g., "Full House") and a description.
    *   *Game Types:* Logic must support dynamic rule injection for Texas Hold'em (Priority), Omaha, Seven Card Stud, Lowball.
*   **Odds Calculation:** [`@agonyz/poker-odds-calculator`](https://www.npmjs.com/package/@agonyz/poker-odds-calculator)
    *   *Usage:* Real-time win percentages for the "Academy/Help" mode.
    *   *Performance Note:* **CRITICAL:** This library can be CPU intensive. It **must** run inside a **Web Worker** (`comlink` is recommended for easy worker communication) to prevent blocking the UI thread during calculations.

### Game Loop (State Machine)
The game is a Finite State Machine (FSM). Do not use loose boolean flags.
*   **Phases:** `IDLE` -> `BLINDS` -> `PRE_FLOP` -> `FLOP` -> `TURN` -> `RIVER` -> `SHOWDOWN` -> `HAND_RESET`.
*   **Betting Logic:** Must handle Side Pots (for All-ins with different stack sizes).

### Tutorial & Academy System
*   **Dynamic Overlays:** Activable help windows explaining the current game state.
*   **Content:**
    *   *Texas Hold'em:* Standard rules.
    *   *Omaha/Stud:* Specific hand ranking differences.
    *   *Math:* "How to calculate Pot Odds" step-by-step breakdown shown in the UI.

---

## 3. Multiplayer & Networking (P2P)

### Architecture
*   **Protocol:** WebRTC via [PeerJS](https://peerjs.com/).
*   **Topology:** **Host-Authority**. One player is the "Host" (acts as the server), others are "Clients".
*   **Host Duties:** Deck generation, shuffling, applying rules, broadcasting state updates.
*   **Client Duties:** Sending actions (Bet, Fold), receiving state (Board cards, Pot size, Opponent chips).

### Security & Anti-Cheat
*   **Information Hiding:** The Host sends specific data to clients.
    *   *Scenario:* When dealing, the Host sends Player A only Card A. Player B receives "HiddenCard".
    *   *Prevention:* Clients **never** receive the full deck array in the JSON payload.
*   **IP Protection (Randoms):**
    *   Direct P2P exposes IPs.
    *   *Mitigation:* For "Randoms" mode, use a **TURN Server** (Relay) to mask IP addresses. If no TURN server is available, display a warning: "Direct Connection: Play only with friends."
*   **Link Generation:**
    *   Format: `app.com/play?room=[UUID]&t=[TIMESTAMP]`
    *   **Expiry Logic:** Links are "time-based" (24h). The Host parses the `t` param. If `Date.now() > t + 24h`, the app rejects the connection request locally. No backend database required.

---

## 4. Artificial Intelligence (Bots)

### Bot Configuration
*   **Modes:** Single Player (Human vs Bots) or Multiplayer Fill (Humans + Bots).
*   **Parameters:** `difficulty` (0-100), `name`, `avatar`.

### Persona System
Every bot instance generates a "Persona" object to vary gameplay:
```typescript
interface BotPersona {
  aggression: number; // 0.0 to 1.0 (Call vs Raise freq)
  bluffing: number;   // Frequency of bluffing on missed draws
  looseness: number;  // Range of hands they play pre-flop
  tiltFactor: number; // Likelihood to play worse after losing a big pot
  reactionTime: number; // Simulated "thinking" delay (ms)
}
```

### Decision Engine
1.  **Analyze State:** Calculate hand strength using `pokersolver`.
2.  **Calculate Odds:** Use `poker-odds-calculator` (internal simulation).
3.  **Apply Persona:** Modify the "optimal" move based on `aggression` or `bluffing`.
4.  **Action:** Return `Fold`, `Call`, or `Raise(amount)`.

---

## 5. UI/UX & Design System ("Apple Feel")

### Visual Language
*   **Palette:** Deep Green (Felt), Slate Grays (UI), Off-White (Text), System Red/Blue (Actions).
*   **Materials:** Heavy use of `backdrop-filter: blur(20px)` for panels (Glassmorphism).
*   **Typography:** System UI Font (`-apple-system`, `BlinkMacSystemFont`, `Inter`).
*   **Cards:** High-DPI SVG Cards. Clean, sharp lines. No pixelated assets.

### Animations (Framer Motion)
*   **Philosophy:** "Subtle & Purposeful." No bouncing or elastic banding unless necessary.
*   **Key Interactions:**
    *   *Dealing:* Cards slide from center -> Player position (Transition: `type: "spring", stiffness: 300, damping: 30`).
    *   *Reveal:* 3D Rotate Y-axis flip.
    *   *Pot Collection:* Chips animate to the winner.
    *   *Confetti:* Triggers on `SHOWDOWN` if `User == Winner` (Library: `react-confetti`).

### Responsive Layout
*   **Mobile:** Portrait mode. Player at bottom, opponents in arc at top. Controls are thumb-reachable (bottom sheet style).
*   **Desktop:** Widescreen landscape. Players distributed evenly around the "table."

---

## 6. Audio System (Foley & Ambience)

### Audio Asset Manifest
Files must be located in `/public/sounds/`.

| File Name | Description | Trigger Event |
|---|---|---|
| `sounds/bet_clink.mp3` | Chips hitting the table | Player Checks, Calls, or Raises |
| `sounds/all_in_push.mp3` | Heavy sliding of chips | Player goes All-in |
| `sounds/pot_collect.mp3` | Rattle of chips gathering | End of hand, chips move to winner |
| `sounds/card_deal.mp3` | Sharp snap of card | Initial deal (Pre-Flop) |
| `sounds/card_fan.mp3` | Subtle flutter/slide | Flop, Turn, River deal |
| `sounds/card_fold.mp3` | Paper sliding on felt | Player folds |
| `sounds/timer_tick.mp3` | Soft ticking or ding | User turn starts |
| `sounds/timer_urgent.mp3` | "Pop" sound | User turn reminder (optional) |
| `sounds/win_stinger.mp3` | Short melodic chord | User wins the pot |

### Haptics
*   **Mobile Only:** Trigger `navigator.vibrate(50)` on `action_required` (Your Turn).
*   **Config:** Toggleable in Global Settings.

---

## 7. Data & Persistence

### Storage Strategy
*   **Engine:** `localStorage` (via `zustand/middleware/persist`).
*   **Security:** Data is client-side. No sensitive data (passwords) stored.

### Schema
```typescript
interface UserSettings {
  profile: {
    username: string;
    avatarId: string; // References local asset ID
    bankroll: number; // In-game currency
  };
  audio: {
    masterVolume: number;
    sfxEnabled: boolean;
    musicEnabled: boolean;
    ambienceEnabled: boolean;
  };
  gameplay: {
    showTutorials: boolean;
    fourColorDeck: boolean; // Accessibility feature
    hapticsEnabled: boolean;
  };
  statistics: {
    handsPlayed: number;
    handsWon: number;
    biggestPot: number;
  };
}
```

---

## 8. Implementation Guidelines & Best Practices

### Performance
*   **Code Splitting:** Lazy load the "Academy" and "Settings" modules to keep the Game Loop lightweight.
*   **Asset Optimization:** Convert all sounds to `.webm` or `.mp3` (variable bitrate). Use SVGs for all UI elements.
*   **Re-renders:** Use React's `memo` and Zustand's selectors (`useStore(state => state.pot)`) to prevent the whole table from re-rendering when only one chip moves.

### Project Structure (Recommendation)
```
/src
  /assets        (SVGs, Sounds)
  /components
    /game        (Table, Card, Chips, PlayerHud)
    /ui          (Modal, Button, Slider - Radix UI based)
    /overlays    (Tutorials, Settings)
  /logic
    /engine      (Game Loop, Rules)
    /bots        (Persona Logic)
    /p2p         (PeerJS Handlers)
  /store         (Zustand Stores)
  /workers       (Odds Calculator Worker)
```
