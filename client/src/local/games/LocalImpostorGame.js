import WORDS from '../impostor_words.json';

class LocalImpostorGame {
    constructor(roomCode, emitCallback, players) {
        this.roomCode = roomCode;
        this.emitCallback = emitCallback;
        this.players = players;

        this.gameState = {
            state: 'START',
            word: '',
            impostorId: null,
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
        const impostorIndex = Math.floor(Math.random() * this.players.length);
        const impostorId = this.players[impostorIndex].id;

        this.gameState.word = randomWord;
        this.gameState.impostorId = impostorId;
        this.gameState.state = 'REVEAL';
        this.gameState.votes = {};
        this.gameState.results = null;

        this.gameState.players = this.players.map(p => ({
            ...p,
            role: p.id === impostorId ? 'impostor' : 'innocent',
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
        this.emit('impostor:state', this.gameState);
    }
}

export default LocalImpostorGame;
