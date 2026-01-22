const io = require('../../client/node_modules/socket.io-client');

const socket = io('http://localhost:3001');
const socketName = 'TestBot';

socket.on('connect', () => {
    console.log('Connected to server');

    // 1. Create Room
    socket.emit('createRoom', socketName);
});

socket.on('roomCreated', (room) => {
    console.log(`Room created: ${room.code}`);

    // 2. Start Yo Nunca
    setTimeout(() => {
        console.log('Starting Yo Nunca...');
        socket.emit('yonunca:start', room.code);
    }, 500);
});

socket.on('gameStarted', (gameType) => {
    console.log(`Game started: ${gameType}`);

    // 3. Set Mode Random
    setTimeout(() => {
        // Need to know room code. Use last known.
        // But handler scope issues? I'll store it? 
        // Actually I can catch it in roomCreated scope if nested? 
        // No, flattened.
        // Wait, I can't easily access 'room.code' here unless I store it globally.
    }, 500);
});

// Better flow with state
let roomCode = null;

socket.on('roomCreated', (room) => {
    roomCode = room.code;
});

socket.on('gameStarted', (gameType) => {
    if (gameType === 'yonunca') {
        setTimeout(() => {
            console.log('Setting mode to random...');
            socket.emit('yonunca:setMode', { roomCode, mode: 'random' });
        }, 500);
    }
});

socket.on('yonunca:state', (state) => {
    console.log('Received State:', state);
    if (state.mode === 'random') {
        console.log('SUCCESS: Mode set to random');

        // 4. Action: Next Random
        if (!state.currentStatement) {
            console.log('Requesting next random...');
            socket.emit('yonunca:action', { roomCode, type: 'random' });
        } else {
            console.log('Received Statement:', state.currentStatement);
            console.log('TEST PASSED');
            process.exit(0);
        }
    }
});

// Timeout
setTimeout(() => {
    console.log('Test Timeout');
    process.exit(1);
}, 5000);
