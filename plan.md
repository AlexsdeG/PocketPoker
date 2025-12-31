# Project Plan: Pocket Poker PWA

**Status:** 🏗️ Phase 2 In Progress
**Architecture:** Frontend-First, P2P, PWA.
**Reference:** See `knowledge.md` for library specifics and architectural rules.

---

## Phase 0: Foundation & Infrastructure
**Goal:** Set up the development environment, directory structure, and state management system.

*   [x] **Step 0.1: Project Initialization**
*   [x] **Step 0.2: Design System Setup**
*   [x] **Step 0.3: State Management Skeleton**

---

## Phase 1: The Core Game Engine (Logic Only)
**Goal:** A fully functional Poker engine running in the console. No UI yet.

*   [x] **Step 1.1: Deck & Card Logic**
*   [x] **Step 1.2: Hand Evaluation Integration**
*   [x] **Step 1.3: The State Machine (Game Loop)**
*   [ ] **Step 1.4: Side Pot Logic (Critical)**

---

## Phase 2: Single Player UI & Animation
**Goal:** Visualizing the game with high-quality assets and smooth motion.

*   [x] **Step 2.1: The Table Layout**
    *   **Action:** Build the responsive Grid/Flex layout.
    *   **Mobile:** Portrait view (User at bottom, opponents top).
    *   **Desktop:** Landscape view (Oval table).
    *   **Assets:** Import SVG Cards.

*   [x] **Step 2.2: Connecting State to UI**
    *   **Action:** Bind `useGameStore` to the components.
    *   **Details:**
        *   Render `CommunityCards` in the center.
        *   Render `PlayerHand` at the bottom.
        *   Render `OpponentAvatars` around the table.

*   [x] **Step 2.3: Framer Motion Integration**
    *   **Action:** Install `framer-motion`.
    *   **Implementation:**
        *   Wrap cards in `<AnimatePresence>`.
        *   **Dealing:** Animate `from: { x: 0, y: 0 }` (center) `to: { playerPosition }`.
        *   **Flipping:** Use `rotateY: 180deg` for revealing cards.
    *   **Note:** Keep durations short (<0.6s) to maintain a "snappy" feel.

---

## Phase 3: Bots, AI & The "Academy"
**Goal:** Make the game playable solo and add the educational layer.

*   [x] **Step 3.1: The Bot Engine**
    *   **Action:** Create `BotLogic.ts`.
    *   **Logic:**
        *   Trigger bot action when `currentPlayer.isBot === true`.
        *   Use `setTimeout` (1000ms-3000ms) to simulate "thinking".
        *   Implement `BotPersona` (Aggressive, Passive, Random).

*   [x] **Step 3.2: Odds Calculator Worker (Performance)**
    *   **Action:** Install `@agonyz/poker-odds-calculator` and `comlink`.
    *   **Implementation:** Create a Web Worker. The main thread sends `(holeCards, board)` to the worker; the worker returns `winPercentage`.
    *   **Why:** Calculating odds for 5+ players can freeze the UI. The worker prevents this.

*   [x] **Step 3.3: Academy Overlays**
    *   **Action:** Create the "Brain" toggle button.
    *   **Features:**
        *   Display current hand strength (from `pokersolver`).
        *   Display Win % (from Worker).
        *   Display "Pot Odds" (Math: Call Amount / Total Pot).

---

Phase 4: Audio, Haptics & Persistence
**Goal:** Adding "Juice" and saving user progress.

*   [x] **Step 4.1: Audio System**
    *   **Action:** Install `use-sound`.
    *   **Implementation:** Create a `SoundManager` hook.
    *   **Logic:** Check `settings.soundEnabled` before playing. Handle 404 errors (if custom sounds are missing) gracefully.
    *   **Events:** Link sounds to State Machine transitions (e.g., `phase === 'FLOP'` -> play `card_fan.mp3`).

*   [x] **Step 4.2: Settings & Persistence**
    *   **Action:** Configure `zustand/persist` to save to `localStorage`. (partly done)
    *   **Data:** Save `UserProfile` (Bankroll, Name, Avatar) and `GameSettings` (Volume, Deck Color).

*   [x] **Step 4.3: Haptics & Confetti**
    *   **Action:** Add `navigator.vibrate(50)` on "Your Turn".
    *   **Action:** Add `react-confetti` component that triggers only when `Winner === User`.

---

## Phase 5: Multiplayer (P2P via WebRTC)
**Goal:** Enabling "Host" and "Client" connections without a backend.

*   [ ] **Step 5.1: PeerJS Integration**
    *   **Action:** Install `peerjs`.
    *   **Implementation:** Create a `NetworkManager` context.
    *   **Role Logic:** Determine if current user is `HOST` or `CLIENT`.

*   [ ] **Step 5.2: Host Logic (The Server)**
    *   **Action:** The Host's `useGameStore` becomes the "Source of Truth".
    *   **Broadcast:** Whenever state changes, Host runs `conn.send({ type: 'STATE_UPDATE', payload: ... })`.
    *   **Security:** **IMPORTANT.** Before sending state, the Host must sanitize the payload. Remove `holeCards` of other players from the data sent to Client A.

*   [ ] **Step 5.3: Client Logic**
    *   **Action:** Client listens for `STATE_UPDATE`.
    *   **Input:** When Client clicks "Bet", send `{ type: 'ACTION', action: 'BET', amount: 100 }` to Host.

*   [ ] **Step 5.4: Time-Based Links**
    *   **Action:** Generate share URLs.
    *   **Format:** `myapp.com/?room=[peerId]&expire=[timestamp]`.
    *   **Validation:** On load, check `if (Date.now() > params.expire) showTokenExpiredError()`.

---

## Phase 6: Final Polish & Deployment
**Goal:** PWA Compliance and Build Optimization.

*   [ ] **Step 6.1: PWA Manifest**
    *   **Action:** Create `manifest.json`.
    *   **Details:** Add Icons (192x192, 512x512), `display: standalone`, `theme_color`.
    *   **Service Worker:** Use `vite-plugin-pwa` to cache assets (sounds, images) for offline play.

*   [ ] **Step 6.2: Optimization**
    *   **Action:** Run Lighthouse audit.
    *   **Fixes:** Ensure touch targets are 48px+. Optimize SVG bundle size.

*   [ ] **Step 6.3: Build**
    *   **Action:** Run `npm run build`.
    *   **Output:** Dist folder ready for Netlify/Vercel (Static hosting).