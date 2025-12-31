# Changelog

All notable changes to this project will be documented in this file.

## [0.2.1] - 2024-05-23
### Added
- **Features:**
    - Full **Academy View** accessible from Main Menu with updated visuals.
    - **Turn Order List** in-game showing history and next players.
    - **Rotate Dealer** setting (Default: On).
    - **Show Opponent Odds** setting (Default: Off).
    - Manual Raise Input via Pen icon.
    - Bankroll persistence to profile.
- **UI/UX:**
    - Improved **Radial Table Layout** to prevent bots from overlapping on smaller screens.
    - Highlighting for **Winning Community Cards** (Gold Glow).
    - Enhanced Card Hover: Now brings card to front (`z-index`) correctly.
    - Added separate white dots background layer to Setup/Profile screens.

### Fixed
- **Bugs:**
    - Resolved `Hand Evaluation Error` crash by guarding against empty arrays in `HandEvaluator`.
    - Fixed right-side bot interaction blocking money display (CSS overlapping issue).
    - Fixed Dealer Button Z-Index and positioning.
    - Removed "Dealing..." text overlap.

## [0.2.0] - 2024-05-23
### Added
- **Academy:** In-game help modal with hand rankings and math explanations.
- **Odds Calculator:** Real-time Monte Carlo simulation for win probability.
- **Profile:** Custom avatar upload support.
- **Visuals:** Gold highlight for winners, Dealer/SB/BB chips.

## [0.1.1] - 2024-05-22
### Fixed
- **Critical Bugfix:** Resolved `TypeError: can't access property "useContext"` by downgrading React to 18.2.0.

## [0.1.0] - 2024-05-22
### Added
- **Game UI (Phase 2):** PokerTable, PlayerSpot, PlayingCard components.
- **Infrastructure:** Zustand store, View switching.

## [0.0.1] - 2024-05-22
### Added
- Initial project foundation.