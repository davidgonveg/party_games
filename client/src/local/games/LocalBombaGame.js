import { BombaGameCore } from '../../../../shared/BombaGameCore';

class LocalBombaGame extends BombaGameCore {
    constructor(roomCode, emitCallback, players, config = {}) {
        super(roomCode, players, config);
        this.emitCallback = emitCallback;
    }

    emit(event, data) {
        const clonedData = data ? JSON.parse(JSON.stringify(data)) : data;
        this.emitCallback(event, clonedData);
    }

    startGame() {
        console.log(`[LocalBomba] Game started. Grid: ${this.gridSize}x${this.gridSize}, Bombs: ${this.totalBombs}`);
        this.emitState();
        this.emit('gameStarted', 'bomba');
    }

    restartGame() {
        super.restartGame();
        this.emitState();
    }

    emitState() {
        this.emit('bomba:state', this.gameState);
    }
}

export default LocalBombaGame;
