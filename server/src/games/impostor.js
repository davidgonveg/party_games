const WORDS = require('../../data/impostor_words.json');

class ImpostorGame {
    constructor(roomCode, io, players, config = {}) {
        this.roomCode = roomCode;
        this.io = io;
        this.config = config;

        // Mantener a los jugadores actualizados (sin clones innecesarios, o copiando la base)
        this.players = players;

        this.gameState = {
            state: 'START', // START, REVEAL, DISCUSSION, VOTING, RESULTS
            word: '',
            impostorId: null,
            impostorIds: [],
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
        const impostorCount = Math.min(
            this.config.impostorCount || 1,
            Math.max(1, Math.floor(this.players.length / 3))
        );

        const shuffled = [...this.players].sort(() => Math.random() - 0.5);
        const impostorIds = shuffled.slice(0, impostorCount).map(p => p.id);

        this.gameState.word = randomWord;
        this.gameState.impostorIds = impostorIds;
        this.gameState.impostorId = impostorIds[0]; // backwards compat
        this.gameState.state = 'REVEAL';
        this.gameState.votes = {};
        this.gameState.results = null;

        this.gameState.players = this.players.map((p) => ({
            ...p,
            role: impostorIds.includes(p.id) ? 'impostor' : 'innocent',
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
        if (mostVotedIds.length === 1 && this.gameState.impostorIds.includes(mostVotedIds[0])) {
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
