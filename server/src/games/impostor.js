const WORDS = require('../../data/impostor_words.json');

class ImpostorGame {
    constructor(roomCode, io, players, config = {}) {
        this.roomCode = roomCode;
        this.io = io;

        // Mantener a los jugadores actualizados (sin clones innecesarios, o copiando la base)
        this.players = players;

        this.gameState = {
            state: 'START', // START, REVEAL, DISCUSSION, VOTING, RESULTS
            word: '',
            impostorId: null,
            players: this.players.map((p) => ({ ...p, role: null, hasRevealed: false })),
            votes: {}, // voterId -> targetPlayerId
            results: null, // { winners: 'impostor' | 'innocents', votes: {}, impostorId, voteCounts: {} }
            discussionEndTime: null,
        };
        this.timer = null;
    }

    startGame() {
        console.log(`[Impostor] Game started in room ${this.roomCode}`);

        const randomWord = WORDS[Math.floor(Math.random() * WORDS.length)];
        const impostorIndex = Math.floor(Math.random() * this.players.length);
        const impostorId = this.players[impostorIndex].id;

        this.gameState.word = randomWord;
        this.gameState.impostorId = impostorId;
        this.gameState.state = 'REVEAL';
        this.gameState.votes = {};
        this.gameState.results = null;

        // Actualizamos estado de los jugadores
        this.gameState.players = this.players.map((p) => ({
            ...p,
            role: p.id === impostorId ? 'impostor' : 'innocent',
            hasRevealed: false,
        }));

        this.emitState();
    }

    restartGame() {
        if (this.timer) clearTimeout(this.timer);
        this.startGame();
    }

    revealRole(playerId) {
        if (this.gameState.state !== 'REVEAL') return;

        const player = this.gameState.players.find(p => p.id === playerId);
        if (player) {
            player.hasRevealed = true;
        }

        const allRevealed = this.gameState.players.every(p => p.hasRevealed);
        if (allRevealed) {
            this.startDiscussion();
        }

        this.emitState();
    }

    startDiscussion() {
        this.gameState.state = 'DISCUSSION';
        const discussionDurationMs = 2 * 60 * 1000; // 2 minutos (configurable en el futuro)
        this.gameState.discussionEndTime = Date.now() + discussionDurationMs;

        if (this.timer) clearTimeout(this.timer);
        this.timer = setTimeout(() => {
            this.startVoting();
        }, discussionDurationMs);
    }

    forceVoting() {
        if (this.gameState.state !== 'DISCUSSION') return;
        if (this.timer) clearTimeout(this.timer);
        this.startVoting();
    }

    startVoting() {
        this.gameState.state = 'VOTING';
        this.gameState.discussionEndTime = null;
        this.emitState();
    }

    submitVote(voterId, targetId) {
        if (this.gameState.state !== 'VOTING') return;

        // Prevent self-voting if you want, but UI will block it anyway.
        // Prevent double voting (can overwrite or ignore, we'll allow overwriting until all voted)
        this.gameState.votes[voterId] = targetId;

        const activePlayers = this.gameState.players.length;
        const totalVotes = Object.keys(this.gameState.votes).length;

        if (totalVotes === activePlayers) {
            this.calculateResults();
        } else {
            this.emitState(); // Update UI to show who has voted
        }
    }

    calculateResults() {
        const voteCounts = {};
        let maxVotes = 0;
        let mostVotedIds = [];

        Object.values(this.gameState.votes).forEach(targetId => {
            voteCounts[targetId] = (voteCounts[targetId] || 0) + 1;
            if (voteCounts[targetId] > maxVotes) {
                maxVotes = voteCounts[targetId];
                mostVotedIds = [targetId];
            } else if (voteCounts[targetId] === maxVotes) {
                mostVotedIds.push(targetId);
            }
        });

        // Quién gana:
        // Si hay empate o el más votado NO es el impostor, gana el impostor.
        // Si el más votado en solitario ES el impostor, ganan los inocentes.
        let winners = 'impostor';
        if (mostVotedIds.length === 1 && mostVotedIds[0] === this.gameState.impostorId) {
            winners = 'innocents';
        }

        this.gameState.state = 'RESULTS';
        this.gameState.results = {
            winners,
            votes: this.gameState.votes,
            impostorId: this.gameState.impostorId,
            voteCounts
        };

        this.emitState();
    }

    getState() {
        return this.gameState;
    }

    emitState() {
        // En un juego de alta seguridad enviaríamos datos diferentes a cada socket.
        // Para Party Games (móvil pasable/amigos juntos), enviamos el state entero a la sala.
        this.io.to(this.roomCode).emit('impostor:state', this.gameState);
    }
}

module.exports = { ImpostorGame };
