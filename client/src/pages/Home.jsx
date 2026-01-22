import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSocket } from '../contexts/SocketContext';

export default function Home() {
    const [playerName, setPlayerName] = useState('');
    const [roomCode, setRoomCode] = useState('');
    const [error, setError] = useState('');
    const { socket } = useSocket();
    const navigate = useNavigate();

    useEffect(() => {
        if (!socket) return;

        const handleRoomCreated = (room) => {
            navigate(`/lobby/${room.code}`, { state: { room } });
        };

        const handleRoomUpdated = (room) => {
            const me = room.players.find(p => p.name === playerName);
            if (me) {
                // We'll let the context event listeners handle setting room/player
                navigate(`/lobby/${room.code}`, { state: { room } });
            }
        };

        const handleError = (msg) => {
            setError(msg);
        };

        socket.on('roomCreated', handleRoomCreated);
        socket.on('roomUpdated', handleRoomUpdated);
        socket.on('error', handleError);

        return () => {
            socket.off('roomCreated', handleRoomCreated);
            socket.off('roomUpdated', handleRoomUpdated);
            socket.off('error', handleError);
        };
    }, [socket, navigate, playerName]);

    const handleCreate = () => {
        if (!playerName) return setError('Escribe tu nombre');
        socket.emit('createRoom', playerName);
    };

    const handleJoin = () => {
        if (!playerName) return setError('Escribe tu nombre');
        if (!roomCode) return setError('Escribe el código');
        socket.emit('joinRoom', { roomCode: roomCode.toUpperCase(), playerName });
        // Optimistically save session, knowing server will reject if failed.
        // Better: Wait for roomUpdated? 
        // Actually SocketContext handles roomUpdated. But we need to know OUR name.
        sessionStorage.setItem('party_session', JSON.stringify({
            roomCode: roomCode.toUpperCase(),
            playerName
        }));
    };

    return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-gray-900 text-white p-4">
            <h1 className="text-5xl font-extrabold mb-10 text-transparent bg-clip-text bg-gradient-to-r from-indigo-500 to-pink-500">
                Party Games
            </h1>

            {error && <div className="bg-red-500/20 border border-red-500 text-red-100 p-3 rounded mb-6 w-full max-w-sm text-center">{error}</div>}

            <div className="w-full max-w-sm space-y-8">
                {/* Step 1: Identity */}
                <div className="bg-gray-800/50 p-6 rounded-xl border border-gray-700/50 backdrop-blur-sm">
                    <label className="block text-gray-400 text-sm font-bold mb-2 uppercase tracking-wider">
                        1. ¿Cómo te llamas?
                    </label>
                    <input
                        type="text"
                        placeholder="Tu nombre (ej. Gonza)"
                        className="w-full p-4 rounded-lg bg-gray-900 border border-gray-600 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition text-lg"
                        value={playerName}
                        onChange={e => setPlayerName(e.target.value)}
                    />
                </div>

                {/* Step 2: Action */}
                <div className="bg-gray-800/50 p-6 rounded-xl border border-gray-700/50 backdrop-blur-sm relative overflow-hidden">
                    <label className="block text-gray-400 text-sm font-bold mb-4 uppercase tracking-wider">
                        2. Elige tu camino
                    </label>

                    <button
                        onClick={handleCreate}
                        className="w-full bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-500 hover:to-indigo-600 p-3 rounded-lg font-bold text-lg transition shadow-lg flex items-center justify-center gap-2 group"
                    >
                        <span>👑</span> Crear Sala Nueva
                    </button>

                    <div className="relative my-4">
                        <div className="absolute inset-0 flex items-center">
                            <div className="w-full border-t border-gray-600"></div>
                        </div>
                        <div className="relative flex justify-center text-xs">
                            <span className="px-2 bg-gray-800 text-gray-400 uppercase">O únete con código</span>
                        </div>
                    </div>

                    <div className="flex gap-2 w-full mb-6">
                        <input
                            type="text"
                            placeholder="CÓDIGO"
                            className="flex-1 min-w-0 p-3 rounded-lg bg-gray-900 border border-gray-600 focus:outline-none focus:border-pink-500 uppercase font-mono text-center tracking-widest text-lg"
                            value={roomCode}
                            onChange={e => setRoomCode(e.target.value)}
                        />
                        <button
                            onClick={handleJoin}
                            className="px-4 bg-pink-600 hover:bg-pink-700 rounded-lg font-bold transition shadow-lg flex items-center gap-2 whitespace-nowrap"
                        >
                            🚀 Entrar
                        </button>
                    </div>

                    <div className="border-t border-gray-700 pt-4">
                        <button
                            onClick={() => navigate('/offline')}
                            className="w-full bg-gray-700 hover:bg-gray-600 p-3 rounded-lg font-bold text-lg transition shadow-lg flex items-center justify-center gap-2 text-green-400"
                        >
                            <span>🏠</span> Jugar Modo Offline
                        </button>
                        <p className="text-xs text-gray-500 text-center mt-2">Para jugar todos desde este móvil</p>
                    </div>
                </div>
            </div>
        </div>
    );
}
