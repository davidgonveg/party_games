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
            <div className="flex flex-col items-center justify-center min-h-screen text-white">
                <p className="animate-pulse">Sincronizando con la sala...</p>
            </div>
        );
    }

    const amIHost = isOffline || effectiveRoom.players?.find(p => p.id === socket?.id)?.isHost;

    return (
        <div className="min-h-screen bg-gray-900 text-white p-4 flex flex-col items-center">
            <div className="w-full max-w-md">
                <div className="bg-gray-800 p-4 rounded-lg mb-6 text-center shadow-lg border border-gray-700">
                    <p className="text-gray-400 text-sm uppercase tracking-wider">Código de Sala</p>
                    <h1 className="text-5xl font-mono font-bold text-indigo-400 tracking-widest my-2">{roomCode}</h1>
                </div>

                <div className="mb-8">
                    <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                        <span>Jugadores</span>
                        <span className="bg-gray-700 text-sm px-2 py-0.5 rounded-full">{effectiveRoom.players.length}</span>
                    </h2>

                    <div className="space-y-2">
                        {effectiveRoom.players.map(player => (
                            <div key={player.id} className="bg-gray-800 p-3 rounded flex items-center justify-between border border-gray-700">
                                <span className="font-medium">{player.name}</span>
                                {player.isHost && <span className="text-yellow-400 text-xl">👑</span>}
                            </div>
                        ))}
                    </div>
                </div>

                {amIHost && (
                    <div className="space-y-3">
                        <button
                            className="w-full bg-pink-600 hover:bg-pink-700 text-white p-4 rounded-lg font-bold text-lg shadow-lg transition transform hover:scale-105"
                            onClick={() => {
                                console.log('[Lobby] Clicking Start Yo Nunca');
                                socket.emit('yonunca:start', roomCode);
                            }}
                        >
                            Jugar "Yo Nunca" 🍻
                        </button>
                        <button
                            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white p-4 rounded-lg font-bold text-lg shadow-lg transition transform hover:scale-105"
                            onClick={() => console.log('Start Impostor')}
                        >
                            Jugar "Impostor" 🕵️
                        </button>
                    </div>
                )}

                {!amIHost && (
                    <div className="text-center text-gray-400 animate-pulse mt-8">
                        Esperando a que el anfitrión inicie la partida...
                    </div>
                )}
            </div>
        </div>
    );
}
