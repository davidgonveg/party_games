
// Import data directly (assuming it's available in public or verifiable path)
// For client side, we'll need the JSON available. 
// We will assume 'yonunca_data.json' content is mirrored here or imported.
// Since we can't easily import from ../../../server/data, we'll embed the data or fetch it.
// For robustness in this task, I'll embed a small subset or try to import if possible.
// Better: I'll read the JSON file content in a next step and embed it, or creating a shared data file.
// For now, I'll put a placeholder and then populate it.

// Check if I can import yonunca_data.json
import yonuncaData from './yonunca_data.json';

class LocalYoNuncaGame {
    constructor(roomCode, emitCallback) {
        this.roomCode = roomCode;
        this.emitCallback = emitCallback; // Function to emit events back to "socket"
        this.gameState = {
            mode: null,
            currentStatement: null,
            history: [],
            playerStats: {}
        };
    }

    emit(event, data) {
        // Emit to the specific room (conceptually)
        // In local mode, we just trigger the callback
        // CRITICAL: Clone data to simulate network serialization.
        // This ensures React sees a fresh object reference and triggers re-renders.
        const clonedData = data ? JSON.parse(JSON.stringify(data)) : data;
        this.emitCallback(event, clonedData);
    }

    startGame() {
        this.emitState();
        // Also emit list
        this.emit('yonunca:list', yonuncaData);
        this.emit('gameStarted', 'yonunca');
    }

    setMode(mode) {
        this.gameState.mode = mode;
        this.gameState.currentStatement = null;
        this.emitState();
    }

    nextRandom() {
        if (!yonuncaData || yonuncaData.length === 0) return;
        const randomIndex = Math.floor(Math.random() * yonuncaData.length);
        const statement = yonuncaData[randomIndex];
        this.setNewStatement(statement);
    }

    setSpecificNumber(number) {
        const statement = yonuncaData.find(s => s.id === parseInt(number));
        if (statement) {
            this.setNewStatement(statement);
        } else {
            this.emit('error', 'Número no encontrado');
        }
    }

    selectFromList(id) {
        const statement = yonuncaData.find(s => s.id === id);
        if (statement) {
            this.setNewStatement(statement);
        }
    }

    setNewStatement(statement) {
        this.gameState.currentStatement = {
            ...statement,
            drinkers: []
        };
        this.emitState();
    }

    markDrink(playerId, playerName) {
        if (!this.gameState.currentStatement) return;
        const { drinkers } = this.gameState.currentStatement;
        const index = drinkers.indexOf(playerId);

        if (index === -1) {
            drinkers.push(playerId);
            if (!this.gameState.playerStats[playerName]) {
                this.gameState.playerStats[playerName] = { name: playerName, drinks: 0 };
            }
            this.gameState.playerStats[playerName].drinks += 1;
        } else {
            drinkers.splice(index, 1);
            if (this.gameState.playerStats[playerName]) {
                this.gameState.playerStats[playerName].drinks -= 1;
            }
        }
        this.emitState();
    }

    emitState() {
        this.emit('yonunca:state', this.gameState);
    }
}

class LocalRoomManager {
    constructor(emitCallback) {
        this.emitCallback = emitCallback;
        this.room = {
            code: 'OFFLINE',
            players: [],
            game: null,
            gameInstance: null
        };
    }

    // In offline mode, one "socket" controls everything.
    // Events sent from client (UI) -> LocalServer

    getSafeRoom() {
        const { gameInstance, ...safeRoom } = this.room;
        return safeRoom;
    }

    handleEvent(event, payload) {
        console.log(`[LocalServer] Handling ${event}`, payload);

        switch (event) {
            case 'createRoom':
                // In offline, we typically just set up the room
                // payload could be the host name
                this.room.players = [{ id: 'local-host', name: payload, isHost: true }];
                this.emitCallback('roomCreated', this.getSafeRoom());
                break;

            case 'joinRoom':
                // Not really used in offline setup as we add players manually
                break;

            case 'offline:setupPlayers':
                // Payload: list of names
                // DEPRECATED in favor of offline:start but kept for compatibility if needed
                this.room.players = payload.map((name, index) => ({
                    id: `local-player-${index}`,
                    name,
                    isHost: index === 0
                }));
                console.log('[LocalServer] Updating players offline:', this.room.players);
                this.emitCallback('roomUpdated', this.getSafeRoom());
                break;

            case 'offline:start':
                // Payload: list of names. Atomic creation.
                console.log('[LocalServer] offline:start', payload);
                this.room.players = payload.map((name, index) => ({
                    id: `local-player-${index}`,
                    name,
                    isHost: index === 0
                }));
                // Emit roomCreated with full state
                this.emitCallback('roomCreated', this.getSafeRoom());
                break;

            case 'yonunca:start':
                console.log('[LocalServer] Received yonunca:start');
                try {
                    console.log('[LocalServer] Initializing LocalYoNuncaGame...');
                    this.room.game = 'yonunca';
                    this.room.gameInstance = new LocalYoNuncaGame('OFFLINE', this.emitCallback);
                    console.log('[LocalServer] Game instance created, starting game...');
                    this.room.gameInstance.startGame();
                    console.log('[LocalServer] Game started successfully');
                } catch (err) {
                    console.error('[LocalServer] Error starting yonunca:', err);
                }
                break;

            case 'yonunca:setMode':
                if (this.room.gameInstance) this.room.gameInstance.setMode(payload.mode);
                break;

            case 'yonunca:action':
                if (this.room.gameInstance) {
                    if (payload.type === 'random') this.room.gameInstance.nextRandom();
                    else if (payload.type === 'specific') this.room.gameInstance.setSpecificNumber(payload.payload);
                    else if (payload.type === 'select') this.room.gameInstance.selectFromList(payload.payload);
                }
                break;

            case 'yonunca:drink':
                if (this.room.gameInstance) this.room.gameInstance.markDrink(payload.playerId, payload.playerName);
                break;

            case 'yonunca:requestState':
                if (this.room.gameInstance) {
                    this.room.gameInstance.emitState();
                    this.emitCallback('yonunca:list', yonuncaData);
                }
                break;
        }
    }
}

const eventListeners = new Set();

// Singleton simulation
let manager = null;

export const initializeLocalServer = (emitCallback) => {
    manager = new LocalRoomManager(emitCallback);
    return manager;
};

export const getLocalServer = () => manager;
