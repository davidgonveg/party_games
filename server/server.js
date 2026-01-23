const express = require('express');
const { createServer } = require('http');
const { Server } = require('socket.io');
require('dotenv').config();

const roomManager = require('./src/rooms');
const { YoNuncaGame, yonuncaStatements } = require('./src/games/yonunca');
const { BombaGame } = require('./src/games/bomba');


const path = require('path');

const app = express();
const cors = require('cors');
app.use(cors({ origin: '*' })); // Allow all origins for dev
const httpServer = createServer(app);

// Serve static files from the React app
app.use(express.static(path.join(__dirname, '../client/dist')));

// Setup CORS for Socket.io
const io = new Server(httpServer, {
    cors: {
        origin: "*", // Allow all for simplicity in V1 (handles both dev and prod)
        methods: ["GET", "POST"]
    }
});

io.on('connection', (socket) => {
    console.log('Usuario conectado:', socket.id);

    // Helper to avoid circular dependency when sending room data
    const sanitizeRoom = (room) => {
        return {
            code: room.code,
            players: room.players,
            game: room.game,
            // Exclude gameInstance because it contains 'io' and circular refs
        };
    };

    const broadcastToRoom = (roomCode, event, data) => {
        io.to(roomCode).emit(event, data);
    };

    // --- ROOM EVENTS ---

    socket.on('createRoom', (playerName) => {
        try {
            if (!playerName) return;

            const player = { id: socket.id, name: playerName, isHost: true };
            const room = roomManager.createRoom(player);

            socket.join(room.code);
            socket.emit('roomCreated', sanitizeRoom(room));
            console.log(`Sala creada: ${room.code} por ${playerName}`);
        } catch (error) {
            socket.emit('error', error.message);
        }
    });

    socket.on('joinRoom', ({ roomCode, playerName }) => {
        try {
            if (!roomCode || !playerName) return;
            const player = { id: socket.id, name: playerName };

            // Try to join. If name exists, try to reconnect.
            let room;
            try {
                room = roomManager.joinRoom(roomCode, player);
            } catch (err) {
                if (err.message === 'Player name taken') {
                    // Try reconnect
                    room = roomManager.reconnectPlayer(roomCode, playerName, socket.id);
                    if (!room) {
                        // Should not happen if name taken, but just in case
                        throw new Error('Name taken and could not reconnect');
                    }
                    console.log(`${playerName} re-conectado a sala ${roomCode}`);
                } else {
                    throw err;
                }
            }

            socket.join(roomCode);
            // Notify everyone in the room (including sender)
            // Notify everyone using reliable broadcast
            broadcastToRoom(roomCode, 'roomUpdated', sanitizeRoom(room));
            console.log(`${playerName} se unió a la sala ${roomCode}`);
        } catch (error) {
            socket.emit('error', error.message);
        }
    });

    // --- YO NUNCA EVENTS ---

    socket.on('yonunca:start', (roomCode) => {
        const room = roomManager.getRoom(roomCode);
        if (room) {
            if (!room.gameInstance) {
                room.gameInstance = new YoNuncaGame(roomCode, io);
                room.game = 'yonunca';
            }
            room.gameInstance.startGame();
            // Emit also the full list for LIST mode if needed, or client can request it.
            // Sending 400 items is small enough.
            socket.emit('yonunca:list', yonuncaStatements);

            // Notify all players to switch view
            // Notify all players to switch view
            broadcastToRoom(roomCode, 'gameStarted', 'yonunca');
        }
    });

    socket.on('yonunca:setMode', ({ roomCode, mode }) => {
        console.log(`[Server] yonunca:setMode ${mode} in ${roomCode}`);
        const room = roomManager.getRoom(roomCode);
        if (room && room.gameInstance) {
            console.log(`[Server] setMode calling room.gameInstance.setMode(${mode})`);
            room.gameInstance.setMode(mode);
            // Send full list to ensure client has all data for specific number mode
            socket.emit('yonunca:list', yonuncaStatements);
        } else {
            console.log(`[Server] setMode failed: Room or GameInstance not found for ${roomCode}`);
        }
    });

    socket.on('yonunca:requestState', (roomCode) => {
        const room = roomManager.getRoom(roomCode);
        if (room) {
            // Self-healing: Ensure subscription
            socket.join(roomCode);

            if (room.gameInstance) {
                socket.emit('yonunca:state', room.gameInstance.gameState);
                socket.emit('yonunca:list', require('./src/games/yonunca').yonuncaStatements);
            }
            // Also sync room state (players) to ensure client is up to date
            // Sync requester AND broadcast to force-update others
            socket.emit('roomUpdated', sanitizeRoom(room));
            broadcastToRoom(roomCode, 'roomUpdated', sanitizeRoom(room));
        }
    });

    socket.on('yonunca:action', ({ roomCode, type, payload }) => {
        console.log(`[Server] yonunca:action ${type} in ${roomCode}`);
        const room = roomManager.getRoom(roomCode);
        if (room && room.gameInstance) {
            switch (type) {
                case 'random':
                    room.gameInstance.nextRandom();
                    break;
                case 'specific':
                    room.gameInstance.setSpecificNumber(payload); // payload is number
                    break;
                case 'select':
                    room.gameInstance.selectFromList(payload); // payload is id
                    break;
            }
        } else {
            console.log(`[Server] Room or GameInstance not found for ${roomCode}`);
        }
    });

    socket.on('yonunca:drink', ({ roomCode, playerId, playerName }) => {
        const room = roomManager.getRoom(roomCode);
        if (room && room.gameInstance) {
            room.gameInstance.markDrink(playerId, playerName);
        }
    });

    // --- LA BOMBA EVENTS ---

    socket.on('bomba:start', ({ roomCode, config }) => {
        console.log(`[Server] bomba:start received for room ${roomCode}`, config);
        const room = roomManager.getRoom(roomCode);
        if (room) {
            // Always create new instance on start to ensure config is applied
            room.gameInstance = new BombaGame(roomCode, io, room.players, config);
            room.game = 'bomba';

            room.gameInstance.startGame();
            broadcastToRoom(roomCode, 'gameStarted', 'bomba');
        } else {
            console.error(`[Server] bomba:start failed: Room ${roomCode} not found`);
        }
    });

    socket.on('bomba:reveal', ({ roomCode, cellIndex }) => {
        const room = roomManager.getRoom(roomCode);
        if (room && room.gameInstance) {
            room.gameInstance.revealCell(cellIndex, socket.id);
        }
    });

    socket.on('bomba:restart', (roomCode) => {
        console.log(`[Server] bomba:restart received for room ${roomCode}`);
        const room = roomManager.getRoom(roomCode);
        if (room && room.gameInstance) {
            console.log(`[Server] Calling restartGame() for ${roomCode}`);
            room.gameInstance.restartGame();
        } else {
            console.error(`[Server] bomba:restart failed: Room or GameInstance not found for ${roomCode}`, {
                roomExists: !!room,
                gameInstanceExists: !!room?.gameInstance
            });
        }
    });

    socket.on('bomba:selectTarget', ({ roomCode, targetPlayerId }) => {
        const room = roomManager.getRoom(roomCode);
        if (room && room.gameInstance) {
            room.gameInstance.selectSniperTarget(socket.id, targetPlayerId);
        }
    });

    socket.on('bomba:requestState', (roomCode) => {
        const room = roomManager.getRoom(roomCode);
        if (room && room.gameInstance) {
            socket.join(roomCode);
            socket.emit('bomba:state', room.gameInstance.getState());
        }
    });

    socket.on('checkSession', () => {
        // Find if this socket is already in a room
        // Correct iteration for Map
        for (const [code, room] of roomManager.rooms) {
            const player = room.players.find(p => p.id === socket.id);
            if (player) {
                console.log(`Recuperando sesión para ${player.name} en sala ${code}`);
                socket.emit('sessionRestored', sanitizeRoom(room));
                return;
            }
        }

        socket.emit('sessionNotFound');
    });

    socket.on('disconnect', () => {
        console.log('Usuario desconectado:', socket.id);
        const result = roomManager.removePlayer(socket.id);

        if (result) {
            if (result.isEmpty) {
                console.log(`Sala ${result.roomCode} eliminada (vacía)`);
            } else {
                broadcastToRoom(result.roomCode, 'roomUpdated', sanitizeRoom(result.room));
            }
        }
    });
});

// Health check / keep-alive endpoint
app.get('/ping', (req, res) => {
    res.json({ ok: true, timestamp: Date.now() });
});

// SPA catch-all: serve index.html for any route not matched above
// This must be AFTER all API routes and static files
app.use((req, res) => {
    res.sendFile(path.join(__dirname, '../client/dist/index.html'));
});

const PORT = process.env.PORT || 3001;
httpServer.listen(PORT, () => {
    console.log(`Servidor corriendo en puerto ${PORT}`);
});
