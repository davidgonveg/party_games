// BombaGameCore is now pure ESM; we load it via dynamic import and export a
// factory / lazy-initialised class so the rest of the CJS server can keep using
// require('./games/bomba') synchronously.

let BombaGame;

// Resolved once at startup (called from server.js before any socket events fire)
let _initPromise = null;

function initBombaGame() {
    if (!_initPromise) {
        _initPromise = import('../../../shared/BombaGameCore.js').then(({ BombaGameCore }) => {
            BombaGame = class BombaGame extends BombaGameCore {
                constructor(roomCode, io, players, config = {}) {
                    super(roomCode, players, config);
                    this.io = io;
                }

                startGame() {
                    super.startGame();
                }

                restartGame() {
                    super.restartGame();
                }

                emitState() {
                    console.log(`[Bomba] Emitting state to ${this.roomCode}`);
                    this.io.to(this.roomCode).emit('bomba:state', this.gameState);
                }
            };
        });
    }
    return _initPromise;
}

function getBombaGame() {
    if (!BombaGame) {
        throw new Error('BombaGame not yet initialised – call initBombaGame() and await it first');
    }
    return BombaGame;
}

module.exports = { initBombaGame, getBombaGame };
