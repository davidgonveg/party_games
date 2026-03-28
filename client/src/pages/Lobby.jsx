import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useSocket } from '../contexts/SocketContext';

export default function Lobby() {
    const { roomCode } = useParams();
    const { socket, room, setRoom, isOffline } = useSocket(); // Access socket and room from context
    const navigate = useNavigate();

    // No local state 'room', rely on context
    // Fallback: If context doesn't have room yet (race condition), check navigation state
    const location = useLocation();
    const effectiveRoom = room || location.state?.room;

    useEffect(() => {
        if (!socket) return;

        console.log('[Lobby] Effective Room:', effectiveRoom);
        if (effectiveRoom) {
            console.log('[Lobby] Players:', effectiveRoom.players);
        }

        const handleGameStarted = (gameType) => {
            console.log('[Lobby] Received gameStarted:', gameType);
            if (gameType === 'yonunca') {
                navigate(`/yonunca/${roomCode}`, { state: { room: effectiveRoom } });
            } else if (gameType === 'bomba') {
                navigate(`/bomba/${roomCode}`, { state: { room: effectiveRoom } });
            } else if (gameType === 'impostor') {
                navigate(`/impostor/${roomCode}`, { state: { room: effectiveRoom } });
            }
        };

        socket.on('gameStarted', handleGameStarted);

        return () => {
            socket.off('gameStarted', handleGameStarted);
        };
    }, [socket, roomCode, navigate, effectiveRoom]);



    useEffect(() => {
        // ... (previous useEffect logic)

        // If we have room from location but not context, sync it?
        // Actually, SocketContext is the source of truth for updates.
        // But for initial render, effectiveRoom is enough to show UI.
        // And if context updates later, effectiveRoom will update (since room updates).

    }, [socket, roomCode, navigate]);

    useEffect(() => {
        if (!socket) return;

        // If we don't have room state, try to recover it using stored session
        if (!effectiveRoom) {
            const stored = sessionStorage.getItem('party_session');
            if (stored) {
                const { roomCode: storedCode, playerName } = JSON.parse(stored);
                // Only if code matches URL
                if (storedCode === roomCode) {
                    console.log('Attempting restore via joinRoom');
                    socket.emit('joinRoom', { roomCode, playerName });
                    // sessionRestored event is not emitted by joinRoom, it emits roomUpdated.
                    // But we need to catch it to stop loading.
                    // Actually roomUpdated updates context, so effectiveRoom becomes truthy!
                } else {
                    navigate('/');
                }
            } else {
                navigate('/');
            }
        }

        return () => {
            // No specific cleanup needed for joinRoom as it uses core events
        };
    }, [socket, effectiveRoom, setRoom, navigate, roomCode]);

    if (!effectiveRoom) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen bg-[#111] text-white">
                <p className="animate-pulse text-neutral-500 text-sm tracking-widest uppercase">Sincronizando...</p>
            </div>
        );
    }

    const amIHost = isOffline || effectiveRoom.players?.find(p => p.id === socket?.id)?.isHost;

    return (
        <div className="min-h-screen bg-[#111] text-white p-4 flex flex-col items-center">
            <div className="w-full max-w-md">

                {/* Room code header */}
                <div className="text-center mb-8 mt-4">
                    <p className="text-xs tracking-[4px] uppercase text-neutral-500 mb-1">SALA</p>
                    <h1 className="font-display text-5xl tracking-[8px] text-white">{roomCode}</h1>
                </div>

                {/* Players list */}
                <div className="mb-8">
                    <p className="text-xs tracking-widest uppercase text-neutral-500 mb-3">
                        Jugadores ({effectiveRoom.players.length})
                    </p>
                    <div className="flex flex-wrap gap-2">
                        {effectiveRoom.players.map(player => (
                            <div
                                key={player.id}
                                className="border border-neutral-700 text-neutral-400 text-sm px-3 py-1 rounded-sm inline-flex items-center gap-2"
                            >
                                <span>{player.name}</span>
                                {player.isHost && (
                                    <span className="text-xs text-neutral-600 uppercase tracking-wider">HOST</span>
                                )}
                            </div>
                        ))}
                    </div>
                </div>

                {/* Host controls: game selection */}
                {amIHost && (
                    <div className="space-y-3">
                        <p className="text-xs tracking-widest uppercase text-neutral-500 mb-3">Elegir juego</p>

                        {/* La Bomba */}
                        <div className="space-y-1">
                            <div className="bg-bomba py-4 px-5 rounded opacity-100 hover:opacity-90 transition-opacity">
                                <p className="text-xs uppercase tracking-widest text-white opacity-70 mb-1">Adivina las casillas</p>
                                <p className="font-display text-xl tracking-wide text-white">LA BOMBA</p>
                            </div>
                            <div className="grid grid-cols-3 gap-1">
                                <button
                                    className="border border-neutral-700 text-neutral-400 text-xs py-2 px-3 rounded-sm hover:border-white hover:text-white transition-colors"
                                    onClick={() => socket.emit('bomba:start', { roomCode, config: { size: 'small' } })}
                                >
                                    4x4 Pequeño
                                </button>
                                <button
                                    className="border border-neutral-700 text-neutral-400 text-xs py-2 px-3 rounded-sm hover:border-white hover:text-white transition-colors"
                                    onClick={() => socket.emit('bomba:start', { roomCode, config: { size: 'medium' } })}
                                >
                                    6x6 Mediano
                                </button>
                                <button
                                    className="border border-neutral-700 text-neutral-400 text-xs py-2 px-3 rounded-sm hover:border-white hover:text-white transition-colors"
                                    onClick={() => socket.emit('bomba:start', { roomCode, config: { size: 'large' } })}
                                >
                                    8x8 Grande
                                </button>
                            </div>
                        </div>

                        {/* El Impostor */}
                        <button
                            className="w-full bg-impostor py-4 px-5 rounded hover:opacity-90 transition-opacity text-left"
                            onClick={() => {
                                console.log('[Lobby] Clicking Start Impostor');
                                socket.emit('impostor:start', roomCode);
                            }}
                        >
                            <p className="text-xs uppercase tracking-widest text-white opacity-70 mb-1">Encuentra al traidor</p>
                            <p className="font-display text-xl tracking-wide text-white">EL IMPOSTOR</p>
                        </button>

                        {/* Yo Nunca */}
                        <button
                            className="w-full bg-yonunca py-4 px-5 rounded hover:opacity-90 transition-opacity text-left"
                            onClick={() => {
                                console.log('[Lobby] Clicking Start Yo Nunca');
                                socket.emit('yonunca:start', roomCode);
                            }}
                        >
                            <p className="text-xs uppercase tracking-widest text-white opacity-70 mb-1">Confiesa o bebe</p>
                            <p className="font-display text-xl tracking-wide text-white">YO NUNCA</p>
                        </button>
                    </div>
                )}

                {/* Non-host waiting message */}
                {!amIHost && (
                    <div className="text-center text-neutral-600 text-sm tracking-widest uppercase animate-pulse mt-8">
                        Esperando al anfitrión...
                    </div>
                )}

                {/* Back button */}
                <div className="mt-10 border-t border-neutral-800 pt-6">
                    <button
                        onClick={() => navigate('/')}
                        className="text-neutral-500 hover:text-white text-sm transition-colors block text-center underline-offset-4 hover:underline w-full"
                    >
                        Salir de la sala
                    </button>
                </div>
            </div>
        </div>
    );
}
