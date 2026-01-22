const { nanoid } = require('nanoid');

class RoomManager {
    constructor() {
        this.rooms = new Map();
    }

    createRoom(hostPlayer) {
        const roomCode = nanoid(6).toUpperCase();
        const newRoom = {
            code: roomCode,
            players: [hostPlayer], // hostPlayer: { id, name, isHost: true }
            game: null, // 'impostor', 'yonunca'
            gameState: null // specific game data
        };

        this.rooms.set(roomCode, newRoom);
        return newRoom;
    }

    joinRoom(roomCode, player) {
        const room = this.rooms.get(roomCode);
        if (!room) {
            throw new Error('Room not found');
        }

        // Check if player name already exists
        if (room.players.some(p => p.name === player.name)) {
            throw new Error('Player name taken');
        }

        room.players.push({ ...player, isHost: false });
        return room;
    }

    reconnectPlayer(roomCode, playerName, newSocketId) {
        const room = this.rooms.get(roomCode);
        if (!room) return null;

        const player = room.players.find(p => p.name === playerName);
        if (player) {
            player.id = newSocketId;
            return room;
        }
        return null;
    }

    getRoom(roomCode) {
        return this.rooms.get(roomCode);
    }

    removePlayer(playerId) {
        let affectedRoom = null;

        for (const [code, room] of this.rooms.entries()) {
            const playerIndex = room.players.findIndex(p => p.id === playerId);
            if (playerIndex !== -1) {
                room.players.splice(playerIndex, 1);
                affectedRoom = room;

                // If room is empty, delete it
                if (room.players.length === 0) {
                    this.rooms.delete(code);
                    return { roomCode: code, isEmpty: true };
                }

                // If host left, assign new host
                if (room.players.length > 0 && !room.players.some(p => p.isHost)) {
                    room.players[0].isHost = true;
                }

                break;
            }
        }

        if (affectedRoom) {
            return { roomCode: affectedRoom.code, room: affectedRoom, isEmpty: false };
        }
        return null;
    }
}

module.exports = new RoomManager();
