# La Bomba - Game Design

## Overview
"La Bomba" is a Minesweeper-inspired party drinking game where players reveal squares on a grid. Unlike traditional Minesweeper, the grid content is **generated dynamically** as you play to ensure a paced, escalating experience. The game is played until the entire board is cleared, guaranteeing a climactic finish.

## Core Mechanics

### The Grid
- **Sizes:**
    - **Small:** 4x4 (16 squares) - Quick game.
    - **Medium:** 6x6 (36 squares) - Standard.
    - **Large:** 8x8 (64 squares) - Extended play.
- **Goal:** Clear the board. The game *always* ends with a Bomb on the final square.

### Dynamic Generation (The "Director")
To make the game "smart" and fun, squares are not pre-calculated. Content is determined when a player clicks, based on the current game state.

#### Smart Distributions
1.  **Bombs:**
    - Each map size has a target number of bombs (e.g., Small = 3).
    - **The Final Bomb:** The very last unrevealed square is *always* a Bomb (100% chance).
    - **Mid-Game Bombs:** Probability increases as turns pass without a bomb, ensuring they are distributed and don't all cluster at the start or end.
2.  **Drink Counter Logic:** 
    - **Low Count (1-3):** High chance of Multipliers (x2, x3) or Additions (+2, +3). *No Dividers (/2).*
    - **High Count:** Higher chance of Actions (Drink, Give) or Dividers to reduce the pressure.
    - **Safety Valve:** If the count gets absurdly high (e.g., > 20), force an Action or Divider.

### The Drink Counter
- Starts at **1**.
- Persists across turns until an **Action** or **Bomb** consumes it.
- **Reset:** Resets to 1 after someone drinks (via Action or Bomb).

## Square Types

### 1. The Bombs (Events)
When revealed, the "Explosion" happens. The counter resets to 1 after the penalty.
*   **The Martyr:** Only YOU drink the accumulated amount.
*   **The Sniper:** MANDAS (Give) the accumulated amount to someone else.
*   **The Grenade:** EVERYONE BUT YOU drinks.
*   **The Nuke:** EVERYONE drinks the accumulated amount.

### 2. Modifiers (Math)
Modify the current pot.
-   **+1, +2, +3**
-   **x2, x3**
-   ** /2:** Round down (min 1). *Disabled if Pot is small.*

### 3. Special Actions (No Modifiers)
-   **Safe:** Nothing happens.
-   **Reverse:** Reverse turn order.
-   **Spy:** Peek at a hidden square (shows if it *would* be bad? Hard to do with dynamic gen... maybe just reveals a "Safe" square). *Optional.*

## Game Flow Example (4x4)
1.  **State:** Pot = 1. Remaining Squares = 16. Bombs Left = 2.
2.  **Turn 1:** Click. *Logic: Early game, boost pot.* Result: **x2**. Pot = 2.
3.  **Turn 2:** Click. *Logic: Still early.* Result: **+1**. Pot = 3.
4.  **Turn 3:** Click. *Logic: Random chance.* Result: **Safe**. Pot = 3.
5.  **Turn ...**
6.  **Turn 8:** Pot = 10. Click. *Logic: Bomb Probability high.* Result: **BOMB (The Sniper)**. Player chooses victim for 10 sips. Pot resets to 1. Bombs Left = 1.
7.  **Turn 16 (Last Square):** *Logic: 100% Bomb.* Result: **BOMB (The Nuke)**. Everyone finishes their drink. GAME OVER.

## Technical Data Structure
Since generation is dynamic, we track *state* rather than a fixed grid.
-   `revealedCells`: Array of indices that have been clicked.
-   `cells`: Map of index -> Content (only populated *after* click).
-   `history`: Log of actions.
-   `configuration`: { size, difficulty }.
-   `pendingBombs`: Helper for the Director logic.

## UI/UX
-   **Grid:** Responsive squares.
-   **Bomb Reveal:** Shake screen, red flash.
-   **Counter:** Big animated number showing current stakes.
