class BombaGameCore {
    constructor(roomCode, players, config = {}) {
        this.roomCode = roomCode;
        this.config = {
            size: config.size || 'medium', // 'small' (4x4), 'medium' (6x6), 'large' (8x8)
        };

        // Grid dimensions - adding default and validation
        const dimensions = {
            small: 4,
            medium: 6,
            large: 8
        };
        this.gridSize = dimensions[this.config.size] || 6;
        this.totalSquares = this.gridSize * this.gridSize;

        console.log(`[BombaCore] Creating game instance. Size: ${this.config.size}, Grid: ${this.gridSize}x${this.gridSize}`);

        // Bomb configuration
        const bombCounts = {
            small: 3,
            medium: 7,
            large: 12
        };
        this.totalBombs = bombCounts[this.config.size] || 5;

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

    startGame() {
        console.log(`[BombaCore] Game started in room ${this.roomCode}. Grid: ${this.gridSize}x${this.gridSize}, Bombs: ${this.totalBombs}`);
        this.emitState();
    }

    restartGame() {
        console.log(`[BombaCore] RESTARTING game in room ${this.roomCode}`);
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

        // Ensure grid info is preserved and explicitly part of state
        this.gameState.gridSize = this.gridSize;
        this.gameState.totalSquares = this.totalSquares;

        console.log(`[BombaCore] State reset complete.`);
        this.emitState();
    }

    revealCell(cellIndex, playerId) {
        // Validate
        if (this.gameState.gameOver) return;
        if (this.gameState.waitingForTarget) return; // Can't reveal while waiting for Sniper target
        if (this.gameState.revealedCells.includes(cellIndex)) return;

        const currentPlayer = this.gameState.players[this.gameState.currentTurnIndex];
        if (currentPlayer.id !== playerId) {
            console.log(`[BombaCore] Player ${playerId} tried to reveal but it's not their turn`);
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

        const retoChance = 0.005;
        let modifierChance;

        if (counter <= 3) {
            // Low counter: boost it!
            // Was 70% mod, 10% action, 20% special → now redistribute 99.5% as 70/20 ratio
            modifierChance = 0.70 * (1 - retoChance); // ~0.696
        } else if (counter <= 10) {
            // Medium counter: balanced
            // Was 40% mod, 40% action, 20% special → redistribute 99.5% as 40/60 ratio among mod/special
            modifierChance = 0.40 * (1 - retoChance); // ~0.398
        } else {
            // High counter: force resolution
            // Was 20% mod, 60% action, 20% special → redistribute 99.5% as 20/80 ratio among mod/special
            modifierChance = 0.20 * (1 - retoChance); // ~0.199
        }

        const roll = Math.random();

        if (roll < retoChance) {
            return this.generateReto();
        } else if (roll < retoChance + modifierChance) {
            return this.generateModifier();
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
        } else if (counter <= 10) {
            // Medium counter: ADD_1 weighted double
            modifiers = [
                { type: 'ADD_1', value: 1, description: '+1 trago' },
                { type: 'ADD_1', value: 1, description: '+1 trago' },
                { type: 'ADD_2', value: 2, description: '+2 tragos' },
                { type: 'MULT_2', value: 2, description: 'x2 tragos' },
                { type: 'DIV_2', value: 2, description: '÷2 tragos' },
            ];
        } else {
            // High counter: include ADD_PLAYERS, no ADD_2
            modifiers = [
                { type: 'ADD_1', value: 1, description: '+1 trago' },
                { type: 'MULT_2', value: 2, description: 'x2 tragos' },
                { type: 'DIV_2', value: 2, description: '÷2 tragos' },
                { type: 'ADD_PLAYERS', value: this.gameState.players.length, description: `+${this.gameState.players.length} tragos (1 por jugador)` },
            ];
        }

        const modifier = modifiers[Math.floor(Math.random() * modifiers.length)];
        return { category: 'MODIFIER', ...modifier };
    }

    generateReto() {
        const retos = [
            { description: 'Imita a alguien de aquí hasta el próximo turno' },
            { description: 'El jugador a tu izquierda te hace una pregunta, tienes que responder con sinceridad' },
            { description: 'Habla con acento hasta el próximo turno' },
            { description: 'Elige a alguien: os dais un trago a la vez o se lo bebe todo él' },
            { description: 'El grupo decide: ¿verdad o reto? Tú eliges' },
            { description: 'Intercambia tu bebida con el jugador a tu derecha' },
            { description: 'El siguiente jugador revela dos casillas en su turno' },
            { description: 'Todos los que lleven gafas beben 1' },
            { description: 'El que más haya bebido esta noche bebe 1 más' },
            { description: 'Di el nombre completo de alguien de aquí o bebe el contador' },
            { description: 'Cuenta algo vergonzoso o bebe el contador completo' },
            { description: 'Brindis obligatorio — todos beben 1' },
            { description: 'El jugador a tu izquierda y derecha beben 1 cada uno' },
            { description: 'Propón un brindis: todos beben si están de acuerdo, si no, tú bebes' },
            { description: 'Todos los jugadores votan quién debería beber. El más votado bebe 1' },
        ];
        const reto = retos[Math.floor(Math.random() * retos.length)];
        return { category: 'RETO', ...reto };
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
        } else if (category === 'RETO') {
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
        } else if (type === 'ADD_PLAYERS') {
            this.gameState.drinkCounter += this.gameState.players.length;
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

    skipTurn() {
        this.advanceTurn();
        this.emitState();
    }

    advanceTurn() {
        const numPlayers = this.gameState.players.length;
        this.gameState.currentTurnIndex =
            (this.gameState.currentTurnIndex + this.gameState.turnDirection + numPlayers) % numPlayers;
    }

    getState() {
        return this.gameState;
    }

    emitState() {
        throw new Error('BombaGameCore: emitState() must be implemented by subclass');
    }
}

export { BombaGameCore };
