import { BombaGameCore } from '@shared/BombaGameCore';

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
        super.startGame(); // calls emitState internally
        this.emit('gameStarted', 'bomba');
    }

    restartGame() {
        super.restartGame();
    }

    emitState() {
        this.emit('bomba:state', this.gameState);
    }
}

export default LocalBombaGame;
