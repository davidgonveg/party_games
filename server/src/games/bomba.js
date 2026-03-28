// BombaGameCore is now pure ESM; we load it via dynamic import and export a
// factory / lazy-initialised class so the rest of the CJS server can keep using
// require('./games/bomba') synchronously.

let BombaGame;

// Resolved once at startup (called from server.js before any socket events fire)
let _initPromise = null;

async function initBombaGame() {
    if (_initPromise) return _initPromise;
    _initPromise = (async () => {
        const { BombaGameCore } = await import('../../../shared/BombaGameCore.js');

        BombaGame = class BombaGame extends BombaGameCore {
            constructor(roomCode, io, players, config = {}) {
                super(roomCode, players, config);
                this.io = io;
            }

            startGame() {
                super.startGame();
                this.emitState();
            }

            restartGame() {
                super.restartGame();
                this.emitState();
            }

            emitState() {
                console.log(`[Bomba] Emitting state to ${this.roomCode}`);
                this.io.to(this.roomCode).emit('bomba:state', this.gameState);
            }
        };
    })();
    return _initPromise;
}

function getBombaGame() {
    if (!BombaGame) {
        throw new Error('BombaGame not yet initialised – call initBombaGame() and await it first');
    }
    return BombaGame;
}

module.exports = { initBombaGame, getBombaGame };
