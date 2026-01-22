const fs = require('fs');
const path = require('path');

// Load data once
const dataPath = path.join(__dirname, '../../data/yonunca_data.json');
let yonuncaStatements = [];
try {
    const rawData = fs.readFileSync(dataPath, 'utf8');
    yonuncaStatements = JSON.parse(rawData);
    console.log(`[YoNunca] Loaded ${yonuncaStatements.length} statements.`);
} catch (err) {
    console.error('Error loading Yo Nunca data:', err);
}

class YoNuncaGame {
    constructor(roomCode, io) {
        this.roomCode = roomCode;
        this.io = io;
        this.gameState = {
            mode: null, // 'random', 'specific', 'list'
            currentStatement: null,
            history: [], // List of { statement, drinkers: [] }
            playerStats: {}, // { playerId: { name, drinks: 0 } }
        };
    }

    startGame() {
        // Initialize stats for current players? 
        // We'll init on the fly or when they do actions.
        this.emitState();
    }

    setMode(mode) {
        console.log(`[YoNunca] Setting mode to ${mode} for room ${this.roomCode}`);
        this.gameState.mode = mode;
        this.gameState.currentStatement = null;
        this.emitState();
    }

    // Mode: Random Number
    // The requirement says "Uso en el que salga un número al azar" (One where a random number comes up). 
    // Usually means we pick a random ID/Statement.
    nextRandom() {
        console.log(`[YoNunca] nextRandom called. Statements: ${yonuncaStatements.length}`);
        if (yonuncaStatements.length === 0) return;

        // Pick random
        const randomIndex = Math.floor(Math.random() * yonuncaStatements.length);
        const statement = yonuncaStatements[randomIndex];
        console.log(`[YoNunca] Selected statement ${statement.id}`);

        this.setNewStatement(statement);
    }

    // Mode: Specific Number
    setSpecificNumber(number) {
        // Find statement by ID (number)
        const statement = yonuncaStatements.find(s => s.id === parseInt(number));
        if (statement) {
            this.setNewStatement(statement);
        } else {
            // Optional: emit error or not found
            // For now, do nothing or maybe a toast?
            this.io.to(this.roomCode).emit('error', 'Número no encontrado');
        }
    }

    // Mode: List
    // "se scrollee y se elija el que se quiera"
    // Client sends the selected statement ID
    selectFromList(id) {
        const statement = yonuncaStatements.find(s => s.id === id);
        if (statement) {
            this.setNewStatement(statement);
        }
    }

    setNewStatement(statement) {
        this.gameState.currentStatement = {
            ...statement,
            drinkers: [] // List of playerIds who drank this round
        };
        // Add to history? Maybe only when we move to next or finished?
        // Let's add to history when we switch away or validly "finish" a round.
        // For simplicity, we just track current.

        this.emitState();
    }

    markDrink(playerId, playerName) {
        if (!this.gameState.currentStatement) return;

        const { drinkers } = this.gameState.currentStatement;
        // Drinkers array still tracks IDs for UI toggling (we can map ID to Name in UI)
        // BUT stats should be by name to persist across reconnects.

        // Wait, if I track drinkers by ID, and ID changes, the UI toggle will break for the "current round" if they reconnect mid-round.
        // But that's acceptable edge case.
        // Stats are the important part to persist.

        const index = drinkers.indexOf(playerId);

        if (index === -1) {
            // Add drink
            drinkers.push(playerId);
            // Update stats
            if (!this.gameState.playerStats[playerName]) {
                this.gameState.playerStats[playerName] = { name: playerName, drinks: 0 };
            }
            this.gameState.playerStats[playerName].drinks += 1;
        } else {
            // Remove drink (undo)
            drinkers.splice(index, 1);
            if (this.gameState.playerStats[playerName]) {
                this.gameState.playerStats[playerName].drinks -= 1;
            }
        }

        this.emitState();
    }

    emitState() {
        console.log(`[YoNunca] Emitting state to ${this.roomCode}:`, JSON.stringify(this.gameState).substring(0, 100) + '...');
        this.io.to(this.roomCode).emit('yonunca:state', this.gameState);
    }

    getStats() {
        return this.gameState.playerStats;
    }
}

module.exports = { YoNuncaGame, yonuncaStatements };
