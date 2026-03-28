const { BombaGameCore } = require('../../../shared/BombaGameCore');

class BombaGame extends BombaGameCore {
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
}

module.exports = { BombaGame };
