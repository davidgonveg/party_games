class LocalBombaGame {
    constructor(roomCode, emitCallback, players, config = {}) {
        this.roomCode = roomCode;
        this.emitCallback = emitCallback;
        this.config = {
            size: config.size || 'medium',
        };

        const dimensions = {
            small: 4,
            medium: 6,
            large: 8
        };
        this.gridSize = dimensions[this.config.size];
        this.totalSquares = this.gridSize * this.gridSize;

        const bombCounts = {
            small: 3,
            medium: 7,
            large: 12
        };
        this.totalBombs = bombCounts[this.config.size];

        this.gameState = {
            players: players.map((p, idx) => ({ ...p, index: idx })),
            currentTurnIndex: 0,
            drinkCounter: 1,
            revealedCells: [],
            cells: {},
            bombsRevealed: 0,
            gameOver: false,
            turnDirection: 1,
            history: [],
            waitingForTarget: false,
            pendingSniperData: null,
            gridSize: this.gridSize,
            totalSquares: this.totalSquares,
            totalBombs: this.totalBombs
        };
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
        console.log(`[LocalBomba] RESTARTING game`);
        this.gameState.currentTurnIndex = 0;
        this.gameState.drinkCounter = 1;
        this.gameState.revealedCells = [];
        this.gameState.cells = {};
        this.gameState.bombsRevealed = 0;
        this.gameState.gameOver = false;
        this.gameState.turnDirection = 1;
        this.gameState.history = [];
        this.gameState.waitingForTarget = false;
        this.gameState.pendingSniperData = null;

        // Ensure grid info is preserved
        this.gameState.gridSize = this.gridSize;
        this.gameState.totalSquares = this.totalSquares;

        this.emitState();
    }

    revealCell(cellIndex, playerId) {
        if (this.gameState.gameOver) return;
        if (this.gameState.waitingForTarget) return;
        if (this.gameState.revealedCells.includes(cellIndex)) return;

        const currentPlayer = this.gameState.players[this.gameState.currentTurnIndex];
        if (currentPlayer.id !== playerId) {
            console.log(`[LocalBomba] Player ${playerId} tried to reveal but it's not their turn`);
            return;
        }

        const content = this.generateCellContent(cellIndex);

        this.gameState.cells[cellIndex] = {
            ...content,
            revealedBy: playerId
        };
        this.gameState.revealedCells.push(cellIndex);

        this.gameState.history.push({
            player: currentPlayer.name,
            cellIndex,
            content,
            drinkCounterBefore: this.gameState.drinkCounter
        });

        this.processCellEffect(content, cellIndex, playerId);
        this.emitState();
    }

    generateCellContent(cellIndex) {
        const remainingSquares = this.totalSquares - this.gameState.revealedCells.length;
        const bombsLeft = this.totalBombs - this.gameState.bombsRevealed;

        if (remainingSquares === 1) {
            return this.generateBomb();
        }

        const turnsWithoutBomb = this.gameState.revealedCells.length - this.gameState.bombsRevealed;
        const baseBombChance = bombsLeft / remainingSquares;
        const progressionMultiplier = 1 + (turnsWithoutBomb * 0.15);
        const bombProbability = Math.min(baseBombChance * progressionMultiplier, 0.7);

        if (Math.random() < bombProbability && bombsLeft > 1) {
            return this.generateBomb();
        }

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

        let modifierChance, actionChance, specialChance;

        if (counter <= 3) {
            modifierChance = 0.7;
            actionChance = 0.1;
            specialChance = 0.2;
        } else if (counter <= 10) {
            modifierChance = 0.4;
            actionChance = 0.4;
            specialChance = 0.2;
        } else {
            modifierChance = 0.2;
            actionChance = 0.6;
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
            modifiers = [
                { type: 'ADD_1', value: 1, description: '+1 trago' },
                { type: 'ADD_2', value: 2, description: '+2 tragos' },
                { type: 'ADD_3', value: 3, description: '+3 tragos' },
                { type: 'MULT_2', value: 2, description: 'x2 tragos' },
                { type: 'MULT_3', value: 3, description: 'x3 tragos' },
            ];
        } else {
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
                this.gameState.waitingForTarget = true;
                this.gameState.pendingSniperData = { cellIndex, playerId };
                return;
            } else {
                this.applyBombEffect(type, playerId);
                this.gameState.drinkCounter = 1;

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
    }

    applyBombEffect(type, playerId) {
        const amount = this.gameState.drinkCounter;
        const currentPlayer = this.gameState.players.find(p => p.id === playerId);

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

        const lastHistory = this.gameState.history[this.gameState.history.length - 1];
        lastHistory.bombEffect = {
            type: 'BOMB_SNIPER',
            amount,
            player: this.gameState.players.find(p => p.id === playerId).name,
            target: targetPlayer.name
        };

        this.gameState.waitingForTarget = false;
        this.gameState.pendingSniperData = null;
        this.gameState.drinkCounter = 1;

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
        this.emit('bomba:state', this.gameState);
    }

    getState() {
        return this.gameState;
    }
}

export default LocalBombaGame;
