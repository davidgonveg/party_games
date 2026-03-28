import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSocket } from '../contexts/SocketContext';

export default function Home() {
    const [playerName, setPlayerName] = useState('');
    const [roomCode, setRoomCode] = useState('');
    const [error, setError] = useState('');
    const [mode, setMode] = useState('create'); // 'create' | 'join'
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
        <div className="flex flex-col items-center justify-center min-h-screen bg-[#111] text-white p-4">
            <div className="w-full max-w-xs flex flex-col items-center">
                {/* Title */}
                <h1 className="font-display text-7xl leading-none tracking-tight text-white text-center">
                    PARTY<br />GAMES
                </h1>
                <p className="text-xs tracking-[6px] uppercase text-neutral-500 mt-2 mb-10">
                    JUEGOS DE FIESTA
                </p>

                {/* Error */}
                {error && (
                    <div className="border border-red-500 text-red-400 px-4 py-2 text-sm mb-6 w-full text-center">
                        {error}
                    </div>
                )}

                {/* Form */}
                <div className="w-full">
                    {/* Player name */}
                    <div className="mb-8">
                        <label className="text-xs tracking-widest uppercase text-neutral-500 block mb-1">
                            Tu nombre
                        </label>
                        <input
                            type="text"
                            placeholder="Ej. Gonza"
                            className="bg-transparent border-0 border-b border-neutral-700 focus:border-white focus:outline-none text-white text-lg w-full pb-2 transition-colors"
                            value={playerName}
                            onChange={e => setPlayerName(e.target.value)}
                        />
                    </div>

                    {/* Mode: Create */}
                    {mode === 'create' && (
                        <form onSubmit={(e) => { e.preventDefault(); handleCreate(); }}>
                            <button
                                type="submit"
                                className="bg-white text-[#111] font-display tracking-widest text-lg py-3 px-6 w-full rounded hover:bg-neutral-200 transition-colors"
                            >
                                CREAR SALA
                            </button>
                            <button
                                type="button"
                                onClick={() => { setMode('join'); setError(''); }}
                                className="text-neutral-500 hover:text-white text-sm transition-colors mt-4 block text-center underline-offset-4 hover:underline w-full"
                            >
                                Unirse con código
                            </button>
                        </form>
                    )}

                    {/* Mode: Join */}
                    {mode === 'join' && (
                        <form onSubmit={(e) => { e.preventDefault(); handleJoin(); }}>
                            <div className="mb-8">
                                <label className="text-xs tracking-widest uppercase text-neutral-500 block mb-1">
                                    Código de sala
                                </label>
                                <input
                                    type="text"
                                    placeholder="CÓDIGO"
                                    className="bg-transparent border-0 border-b border-neutral-700 focus:border-white focus:outline-none text-white text-lg w-full pb-2 transition-colors uppercase tracking-widest font-mono"
                                    value={roomCode}
                                    onChange={e => setRoomCode(e.target.value)}
                                />
                            </div>
                            <button
                                type="submit"
                                className="bg-white text-[#111] font-display tracking-widest text-lg py-3 px-6 w-full rounded hover:bg-neutral-200 transition-colors"
                            >
                                ENTRAR
                            </button>
                            <button
                                type="button"
                                onClick={() => { setMode('create'); setError(''); }}
                                className="text-neutral-500 hover:text-white text-sm transition-colors mt-4 block text-center underline-offset-4 hover:underline w-full"
                            >
                                Crear sala nueva
                            </button>
                        </form>
                    )}

                    {/* Offline mode */}
                    <div className="mt-10 border-t border-neutral-800 pt-6">
                        <button
                            onClick={() => navigate('/offline')}
                            className="text-neutral-500 hover:text-white text-sm transition-colors block text-center underline-offset-4 hover:underline w-full"
                        >
                            Jugar sin internet (modo offline)
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
