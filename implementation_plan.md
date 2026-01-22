# Fix Offline Mode Player List Bug

## Goal Description
The offline mode has a race condition where the game navigates to the lobby before all players are registered, causing only the host to appear initially. The game also reportedly hangs when trying to proceed.
This plan addresses the race condition by making the offline room initialization atomic and adds logging to trace the flow.

## User Review Required
> [!IMPORTANT]
> This change introduces a new event `offline:start` in the LocalServer to handle room creation and player setup in a single step.

## Proposed Changes

### Client

#### [MODIFY] [LocalServer.js](file:///c:/Users/gonza/Documents/party_games/client/src/local/LocalServer.js)
- Add handler for `offline:start` event.
- This handler will:
    1. Initialize the room with the provided list of players.
    2. Emit `roomCreated` with the full state immediately.
- Add logs to existing handlers to track state changes.

#### [MODIFY] [OfflineSetup.jsx](file:///c:/Users/gonza/Documents/party_games/client/src/pages/OfflineSetup.jsx)
- Replace the split `createRoom` + `offline:setupPlayers` calls with a single `socket.emit('offline:start', players)`.
- Remove the `setTimeout` hack.

#### [MODIFY] [MockSocket.js](file:///c:/Users/gonza/Documents/party_games/client/src/local/MockSocket.js)
- Ensure `trigger` logs are clear (already present, will verify/enhance if needed).

#### [MODIFY] [Lobby.jsx](file:///c:/Users/gonza/Documents/party_games/client/src/pages/Lobby.jsx)
- Add `useEffect` logs to trace when `room` state updates and what players are present.

## Verification Plan

### Automated Tests
- Create a temporary test script `client/src/local/test_offline_flow.js` that:
  - Imports `initializeLocalServer`.
  - Simulates receiving `offline:start`.
  - Asserts that the callback receives `roomCreated` with all players.
  - Run it using `node` (may need babel/vite-node or simple check if syntax permits, otherwise interpret manually or use browser console). Since it's ES modules, we might need to run via `vite-node` or just rely on manual verification if environment is tricky. **I will try to run it using node directly first, assuming node supports ESM or I'll use simple CJS for the test wrapper.**

### Manual Verification
1. Open the app.
2. Select **OFFLINE MODE**.
3. Add 3 players (e.g., "Alex", "Bob", "Charlie").
4. Click **Start Game**.
5. **Verify**: The Lobby loads immediately.
6. **Verify**: The "Jugadores" list shows ALL 3 players, not just 1.
7. **Verify**: Click "Jugar Yo Nunca".
8. **Verify**: The game starts and shows the card.
9. **Verify**: Navigating back to Lobby keeps the players.
