# Fix Offline Mode State Updates

## Goal Description
In offline mode, clicking a player to mark them as drinking does not update the UI. This is because `LocalServer.js` mutates the state object in-place and passes the same reference to the client (React). React sees the same object reference and assumes no change occurred, skipping the re-render.
This plan effectively simulates the network serialization layer (which creates fresh copies) that exists in the online mode.

## User Review Required
> [!NOTE]
> No user review required for this internal fix.

## Proposed Changes

### Client

#### [MODIFY] [LocalServer.js](file:///c:/Users/gonza/Documents/party_games/client/src/local/LocalServer.js)
- Modify the `emit` method (or `emitCallback` usage) or specifically `emitState` to clone the data before sending.
- Using `JSON.parse(JSON.stringify(data))` is a robust way to ensure we behave exactly like the real socket.io connection (stripping non-serializable like functions, though we shouldn't have any in state).

## Verification Plan

### Manual Verification
1.  Open Offline Mode.
2.  Start "Yo Nunca".
3.  Click on a player's name.
4.  **Verify**: The button turns red (highlighted).
5.  Click again.
6.  **Verify**: The button turns grey (unhighlighted).
