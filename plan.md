# Project Plan: Pocket Poker PWA

**Status:** 🏗️ Phase 5 Implemented
**Architecture:** Frontend-First, P2P, PWA.
**Reference:** See `knowledge.md` for library specifics and architectural rules.

---

## Phase 0: Foundation & Infrastructure
*   [x] **Step 0.1: Project Initialization**
*   [x] **Step 0.2: Design System Setup**
*   [x] **Step 0.3: State Management Skeleton**

## Phase 1: The Core Game Engine
*   [x] **Step 1.1: Deck & Card Logic**
*   [x] **Step 1.2: Hand Evaluation Integration**
*   [x] **Step 1.3: The State Machine (Game Loop)**
*   [x] **Step 1.4: Side Pot Logic (Basic)**

## Phase 2: Single Player UI & Animation
*   [x] **Step 2.1: The Table Layout**
*   [x] **Step 2.2: Connecting State to UI**
*   [x] **Step 2.3: Framer Motion Integration**

## Phase 3: Bots, AI & The "Academy"
*   [x] **Step 3.1: The Bot Engine**
*   [x] **Step 3.2: Odds Calculator Worker**
*   [x] **Step 3.3: Academy Overlays**
*   [x] **Step 3.4: Gemini AI Integration**

## Phase 4: Audio, Haptics & Persistence
*   [x] **Step 4.1: Audio System**
*   [x] **Step 4.2: Settings & Persistence**
*   [x] **Step 4.3: Haptics**

## Phase 5: Multiplayer (P2P via WebRTC)
**Goal:** Enabling "Host" and "Client" connections without a backend.

*   [x] **Step 5.1: PeerJS Integration**
    *   Added `peerjs` and `NetworkManager`.
*   [x] **Step 5.2: Host Logic (The Server)**
    *   Host maintains state, sanitizes data, and broadcasts.
*   [x] **Step 5.3: Client Logic**
    *   Client sends actions to Host, receives State.
*   [x] **Step 5.4: Secure Links & Lobby**
    *   URL parameter `?room=[UUID]`.
    *   Shared Lobby UI in `GameSetup`.

## Phase 6: Final Polish & Deployment
*   [ ] **Step 6.1: PWA Manifest**
*   [ ] **Step 6.2: Optimization**
*   [ ] **Step 6.3: Build**