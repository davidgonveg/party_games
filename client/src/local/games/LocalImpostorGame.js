import WORDS from '../impostor_words.json';

class LocalImpostorGame {
    constructor(roomCode, emitCallback, players, config = {}) {
        this.roomCode = roomCode;
        this.emitCallback = emitCallback;
        this.players = players;
        this.config = config;

        this.gameState = {
            state: 'START',
            word: '',
            impostorId: null,
            impostorIds: [],
            players: this.players.map(p => ({ ...p, role: null, hasRevealed: false })),
            votes: {},
            results: null,
            discussionEndTime: null,
        };
        this.timer = null;
    }

    emit(event, data) {
        const clonedData = data ? JSON.parse(JSON.stringify(data)) : data;
        this.emitCallback(event, clonedData);
    }

    startGame() {
        console.log(`[LocalImpostor] Game started in offline room`);
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

        this.gameState.players = this.players.map(p => ({
            ...p,
            role: impostorIds.includes(p.id) ? 'impostor' : 'innocent',
            hasRevealed: false,
        }));

        this.emitState();
        this.emit('gameStarted', 'impostor');
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
        const discussionDurationMs = 2 * 60 * 1000;
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

        this.gameState.votes[voterId] = targetId;

        const activePlayers = this.gameState.players.length;
        const totalVotes = Object.keys(this.gameState.votes).length;

        if (totalVotes === activePlayers) {
            this.calculateResults();
        } else {
            this.emitState();
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
        this.emit('impostor:state', this.gameState);
    }
}

export default LocalImpostorGame;
