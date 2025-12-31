# Pocket Poker PWA ♠️

A design-first, privacy-focused Texas Hold'em Poker Progressive Web App (PWA). Play solo against bots or host peer-to-peer multiplayer games with friends, all directly in your browser without a backend server.

![App Screenshot](https://github.com/AlexsdeG/PocketPoker/blob/main/imgs/poker2.png)

## ✨ Features

### 🎮 Gameplay
- **No Limit Texas Hold'em**: Full implementation of standard rules.
- **Single Player**: Play against customizable bots with adjustable difficulty.
- **Multiplayer (P2P)**: Host games and invite friends via a simple link.
- **Turn Timer**: Optional pressure timer for fast-paced action.
- **Side Pots**: Accurate handling of complex all-in scenarios.

### 🧠 Intelligence
- **Heuristic Bots**: Built-in bots with distinct playstyles (Aggressive, Passive, Bluffing).
- **Gemini AI Integration**: Enable "AI Mode" to let Google's Gemini LLM control the bots for more unpredictable behavior (Requires API Key).
- **Odds Calculator**: Real-time win probability calculation (Monte Carlo simulation).
- **Poker Academy**: Interactive "Learn to Play" mode explaining hand rankings and math.

### 🎨 Design & UX
- **Modern UI**: Glassmorphism, fluid animations, and clean typography.
- **Sound Effects**: Immersive audio for dealing, chips, and wins.

## 🚀 Easy Install

This project uses **React**, **Vite**, and **TypeScript**.

1.  **Clone the repo:**
    ```bash
    git clone https://github.com/AlexsdeG/PocketPoker.git
    cd PocketPoker
    ```

2.  **Install dependencies:**
    ```bash
    npm install
    ```

3.  **Run Development Server:**
    ```bash
    npm run dev
    ```

4.  **Build for Production:**
    ```bash
    npm run build
    ```

### 🤖 Enabling Gemini AI (Optional)
To use the LLM-powered bots:
1.  Create a `.env` file in the root.
2.  Add your Google AI Studio key: `API_KEY=your_key_here`.
3.  Restart the dev server.

## 🔊 Credits & Assets

### Audio
Special thanks to the creators who provided the audio assets for this project.

*   **UI & Card Sounds**: [Kenney.nl](https://www.kenney.nl) (Casino Audio Pack)
*   **Win Stinger**: Sound Effect by [Otto](https://pixabay.com/users/voicebosch-30143949/) from Pixabay.
*   **Turn Alarm / Timer**: Sound Effect by [Universfield](https://pixabay.com/users/universfield-28281460/) from Pixabay.
*   **Chips / Pot Collect**: Sound Effect by [floraphonic](https://pixabay.com/users/floraphonic-38928062/) from Pixabay.

### Libraries
*   `peerjs`: For WebRTC multiplayer networking.
*   `pokersolver`: For hand ranking logic.
*   `zustand`: For state management.
*   `framer-motion`: For animations.
*   `lucide-react`: For iconography.

---

**Privacy Note:** This app operates entirely client-side. Multiplayer connections are established directly between devices using PeerJS. No game data is stored on external servers, all in local Storage.
