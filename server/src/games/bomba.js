class BombaGame {
    constructor(roomCode, io, players, config = {}) {
        this.roomCode = roomCode;
        this.io = io;
        this.config = {
            size: config.size || 'medium', // 'small' (4x4), 'medium' (6x6), 'large' (8x8)
        };

        // Grid dimensions
        const dimensions = {
            small: 4,
            medium: 6,
            large: 8
        };
        this.gridSize = dimensions[this.config.size];
        this.totalSquares = this.gridSize * this.gridSize;

        // Bomb configuration
        const bombCounts = {
            small: 3,   // 4x4 = 16 squares, 3 bombs
            medium: 5,  // 6x6 = 36 squares, 5 bombs
            large: 7    // 8x8 = 64 squares, 7 bombs
        };
        this.totalBombs = bombCounts[this.config.size];

        this.gameState = {
            players: players.map((p, idx) => ({ ...p, index: idx })),
            currentTurnIndex: 0,
            drinkCounter: 1,
            revealedCells: [], // Array of cell indices that have been revealed
            cells: {}, // Map: cellIndex -> { type, value, revealedBy }
            bombsRevealed: 0,
            gameOver: false,
            turnDirection: 1, // 1 = forward, -1 = backward (for Reverse)
            history: [], // Log of actions
            waitingForTarget: false, // For Sniper bomb
            pendingSniperData: null, // { cellIndex, playerId }
        };
    }

    startGame() {
        console.log(`[Bomba] Game started in room ${this.roomCode}. Grid: ${this.gridSize}x${this.gridSize}, Bombs: ${this.totalBombs}`);
        this.emitState();
    }

    revealCell(cellIndex, playerId) {
        // Validate
        if (this.gameState.gameOver) return;
        if (this.gameState.waitingForTarget) return; // Can't reveal while waiting for Sniper target
        if (this.gameState.revealedCells.includes(cellIndex)) return;

        const currentPlayer = this.gameState.players[this.gameState.currentTurnIndex];
        if (currentPlayer.id !== playerId) {
            console.log(`[Bomba] Player ${playerId} tried to reveal but it's not their turn`);
            return;
        }

        // Generate content for this cell
        const content = this.generateCellContent(cellIndex);

        // Store the cell
        this.gameState.cells[cellIndex] = {
            ...content,
            revealedBy: playerId
        };
        this.gameState.revealedCells.push(cellIndex);

        // Log action
        this.gameState.history.push({
            player: currentPlayer.name,
            cellIndex,
            content,
            drinkCounterBefore: this.gameState.drinkCounter
        });

        // Process the cell effect
        this.processCellEffect(content, cellIndex, playerId);

        this.emitState();
    }

    generateCellContent(cellIndex) {
        const remainingSquares = this.totalSquares - this.gameState.revealedCells.length;
        const bombsLeft = this.totalBombs - this.gameState.bombsRevealed;

        // RULE 1: Last square is ALWAYS a bomb
        if (remainingSquares === 1) {
            return this.generateBomb();
        }

        // RULE 2: Dynamic bomb probability
        // Base probability increases as we progress without bombs
        const turnsWithoutBomb = this.gameState.revealedCells.length - this.gameState.bombsRevealed;
        const baseBombChance = bombsLeft / remainingSquares;
        const progressionMultiplier = 1 + (turnsWithoutBomb * 0.15); // Increases 15% per turn without bomb
        const bombProbability = Math.min(baseBombChance * progressionMultiplier, 0.7); // Cap at 70%

        if (Math.random() < bombProbability && bombsLeft > 1) { // Keep at least 1 bomb for the end
            return this.generateBomb();
        }

        // RULE 3: Smart content based on drink counter
        return this.generateSmartContent();
    }

    generateBomb() {
        const bombTypes = [
            { type: 'BOMB_MARTYR', name: 'El Mártir', description: 'TÚ bebes' },
            { type: 'BOMB_SNIPER', name: 'El Francotirador', description: 'MANDAS beber' },
            { type: 'BOMB_GRENADE', name: 'La Granada', description: 'TODOS MENOS TÚ beben' },
            { type: 'BOMB_NUKE', name: 'La Bomba Nuclear', description: 'TODOS beben' }
        ];

        const bomb = bombTypes[Math.floor(Math.random() * bombTypes.length)];
        return { category: 'BOMB', ...bomb };
    }

    generateSmartContent() {
        const counter = this.gameState.drinkCounter;

        // Define probabilities based on counter value
        let modifierChance, actionChance, specialChance;

        if (counter <= 3) {
            // Low counter: boost it!
            modifierChance = 0.7;  // 70% modifiers
            actionChance = 0.1;    // 10% actions
            specialChance = 0.2;   // 20% specials
        } else if (counter <= 10) {
            // Medium counter: balanced
            modifierChance = 0.4;
            actionChance = 0.4;
            specialChance = 0.2;
        } else {
            // High counter: force resolution
            modifierChance = 0.2;
            actionChance = 0.6;    // More likely to drink
            specialChance = 0.2;
        }

        const roll = Math.random();

        if (roll < modifierChance) {
            return this.generateModifier();
        } else if (roll < modifierChance + actionChance) {
            return this.generateAction();
        } else {
            return this.generateSpecial();
        }
    }

    generateModifier() {
        const counter = this.gameState.drinkCounter;

        let modifiers;
        if (counter <= 3) {
            // Low counter: big boosts, NO dividers
            modifiers = [
                { type: 'ADD_1', value: 1, description: '+1 trago' },
                { type: 'ADD_2', value: 2, description: '+2 tragos' },
                { type: 'ADD_3', value: 3, description: '+3 tragos' },
                { type: 'MULT_2', value: 2, description: 'x2 tragos' },
                { type: 'MULT_3', value: 3, description: 'x3 tragos' },
            ];
        } else {
            // Higher counter: include dividers
            modifiers = [
                { type: 'ADD_1', value: 1, description: '+1 trago' },
                { type: 'ADD_2', value: 2, description: '+2 tragos' },
                { type: 'MULT_2', value: 2, description: 'x2 tragos' },
                { type: 'DIV_2', value: 2, description: '÷2 tragos' },
            ];
        }

        const modifier = modifiers[Math.floor(Math.random() * modifiers.length)];
        return { category: 'MODIFIER', ...modifier };
    }

    generateAction() {
        // Actions don't exist yet in our design, but we can add "Safe" as a placeholder
        // Or we could make this just return Safe for now
        return { category: 'SPECIAL', type: 'SAFE', description: '¡Salvado!' };
    }

    generateSpecial() {
        const specials = [
            { type: 'SAFE', description: '¡Salvado!' },
            { type: 'REVERSE', description: 'Cambio de sentido' },
        ];

        const special = specials[Math.floor(Math.random() * specials.length)];
        return { category: 'SPECIAL', ...special };
    }

    processCellEffect(content, cellIndex, playerId) {
        const { category, type, value } = content;

        if (category === 'BOMB') {
            this.gameState.bombsRevealed++;

            if (type === 'BOMB_SNIPER') {
                // Wait for target selection
                this.gameState.waitingForTarget = true;
                this.gameState.pendingSniperData = { cellIndex, playerId };
                // Don't advance turn yet
                return;
            } else {
                // Other bombs: apply immediately
                this.applyBombEffect(type, playerId);
                this.gameState.drinkCounter = 1; // Reset counter

                // Check if game is over
                if (this.gameState.revealedCells.length === this.totalSquares) {
                    this.gameState.gameOver = true;
                }
            }

            this.advanceTurn();
        } else if (category === 'MODIFIER') {
            this.applyModifier(type, value);
            this.advanceTurn();
        } else if (category === 'SPECIAL') {
            this.applySpecial(type);
            this.advanceTurn();
        }
    }

    applyModifier(type, value) {
        if (type === 'ADD_1' || type === 'ADD_2' || type === 'ADD_3') {
            this.gameState.drinkCounter += value;
        } else if (type === 'MULT_2' || type === 'MULT_3') {
            this.gameState.drinkCounter *= value;
        } else if (type === 'DIV_2') {
            this.gameState.drinkCounter = Math.max(1, Math.floor(this.gameState.drinkCounter / value));
        }
    }

    applySpecial(type) {
        if (type === 'REVERSE') {
            this.gameState.turnDirection *= -1;
        }
        // SAFE does nothing
    }

    applyBombEffect(type, playerId) {
        const amount = this.gameState.drinkCounter;
        const currentPlayer = this.gameState.players.find(p => p.id === playerId);

        // This is just for logging/display. Actual drinking is social.
        const effect = {
            type,
            amount,
            player: currentPlayer.name
        };

        this.gameState.history[this.gameState.history.length - 1].bombEffect = effect;
    }

    selectSniperTarget(playerId, targetPlayerId) {
        if (!this.gameState.waitingForTarget) return;
        if (this.gameState.pendingSniperData.playerId !== playerId) return;

        const targetPlayer = this.gameState.players.find(p => p.id === targetPlayerId);
        const amount = this.gameState.drinkCounter;

        // Log the effect
        const lastHistory = this.gameState.history[this.gameState.history.length - 1];
        lastHistory.bombEffect = {
            type: 'BOMB_SNIPER',
            amount,
            player: this.gameState.players.find(p => p.id === playerId).name,
            target: targetPlayer.name
        };

        // Reset state
        this.gameState.waitingForTarget = false;
        this.gameState.pendingSniperData = null;
        this.gameState.drinkCounter = 1;

        // Check game over
        if (this.gameState.revealedCells.length === this.totalSquares) {
            this.gameState.gameOver = true;
        }

        this.advanceTurn();
        this.emitState();
    }

    advanceTurn() {
        const numPlayers = this.gameState.players.length;
        this.gameState.currentTurnIndex =
            (this.gameState.currentTurnIndex + this.gameState.turnDirection + numPlayers) % numPlayers;
    }

    emitState() {
        console.log(`[Bomba] Emitting state to ${this.roomCode}`);
        this.io.to(this.roomCode).emit('bomba:state', this.gameState);
    }

    getState() {
        return this.gameState;
    }
}

module.exports = { BombaGame };
