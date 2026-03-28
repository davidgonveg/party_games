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

    const [bombaExpanded, setBombaExpanded] = useState(false);
    const [selectedBombaSize, setSelectedBombaSize] = useState('medium');
    const [impostorExpanded, setImpostorExpanded] = useState(false);
    const [impostorCount, setImpostorCount] = useState(1);

    useEffect(() => {
        if (!socket) return;

        const handleGameStarted = (gameType) => {
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
                    <div className="flex flex-col gap-2">
                        {effectiveRoom.players.map((player, index) => (
                            <div
                                key={player.id}
                                className="border border-neutral-700 text-neutral-400 text-sm px-3 py-2 rounded-sm inline-flex items-center justify-between gap-2"
                            >
                                <span>{player.name}</span>
                                <div className="flex items-center gap-2">
                                    {player.isHost && (
                                        <span className="text-xs text-neutral-600 uppercase tracking-wider">HOST</span>
                                    )}
                                    {isOffline && effectiveRoom.players.length > 2 && (
                                        <button
                                            onClick={() => {
                                                const updated = effectiveRoom.players
                                                    .filter((_, i) => i !== index)
                                                    .map(p => p.name);
                                                socket.emit('offline:updatePlayers', updated);
                                            }}
                                            className="text-neutral-600 hover:text-red-400 transition-colors text-lg leading-none"
                                            aria-label="Eliminar jugador"
                                        >
                                            ×
                                        </button>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Add player inline (offline only) */}
                    {isOffline && effectiveRoom.players.length < 20 && (
                        <form
                            className="flex gap-2 mt-3"
                            onSubmit={(e) => {
                                e.preventDefault();
                                const input = e.currentTarget.elements.namedItem('newPlayer');
                                const name = input.value.trim();
                                if (!name) return;
                                const updated = [...effectiveRoom.players.map(p => p.name), name];
                                socket.emit('offline:updatePlayers', updated);
                                input.value = '';
                            }}
                        >
                            <input
                                name="newPlayer"
                                type="text"
                                placeholder="Añadir jugador..."
                                className="flex-1 bg-transparent border-b border-neutral-700 text-white text-sm py-1 outline-none placeholder-neutral-600 focus:border-neutral-400 transition-colors"
                            />
                            <button
                                type="submit"
                                className="text-neutral-500 hover:text-white text-sm transition-colors px-2"
                            >
                                + Añadir
                            </button>
                        </form>
                    )}
                </div>

                {/* Host controls: game selection */}
                {amIHost && (
                    <div className="space-y-3">
                        <p className="text-xs tracking-widest uppercase text-neutral-500 mb-3">Elegir juego</p>

                        {/* La Bomba */}
                        <div className="flex flex-col gap-2">
                            <button
                                onClick={() => setBombaExpanded(v => !v)}
                                className="bg-bomba w-full flex items-center gap-4 py-4 px-5 rounded hover:opacity-90 transition-opacity text-left"
                            >
                                <span className="text-2xl">💣</span>
                                <div className="flex-1">
                                    <div className="font-display text-xl tracking-wide text-white leading-none">LA BOMBA</div>
                                    <div className="text-xs uppercase tracking-widest text-white/70 mt-0.5">Toca para elegir tamaño</div>
                                </div>
                                <span className="text-white/60 text-sm">{bombaExpanded ? '▲' : '▼'}</span>
                            </button>

                            {bombaExpanded && (
                                <div className="border border-bomba/30 rounded p-3 flex flex-col gap-2">
                                    <p className="text-xs uppercase tracking-widest text-neutral-500 mb-1">Tamaño del tablero</p>
                                    {[
                                        { size: 'small', label: 'PEQUEÑA', sub: '4×4 · 16 casillas' },
                                        { size: 'medium', label: 'MEDIANA', sub: '6×6 · 36 casillas' },
                                        { size: 'large', label: 'GRANDE', sub: '8×8 · 64 casillas' },
                                    ].map(({ size, label, sub }) => (
                                        <button
                                            key={size}
                                            onClick={() => setSelectedBombaSize(size)}
                                            className={`w-full flex items-center gap-3 py-3 px-4 rounded transition-all text-left ${
                                                selectedBombaSize === size
                                                    ? 'bg-bomba text-white'
                                                    : 'border border-neutral-700 text-neutral-400 hover:border-bomba hover:text-white'
                                            }`}
                                        >
                                            <div className="flex-1">
                                                <div className="font-display text-base tracking-wide leading-none">{label}</div>
                                                <div className="text-xs text-white/60 mt-0.5">{sub}</div>
                                            </div>
                                            {selectedBombaSize === size && <span className="text-sm">✓</span>}
                                        </button>
                                    ))}
                                    <button
                                        onClick={() => {
                                            socket.emit('bomba:start', { roomCode, config: { size: selectedBombaSize } });
                                            setBombaExpanded(false);
                                        }}
                                        className="w-full bg-bomba font-display tracking-widest text-lg py-4 rounded hover:opacity-90 transition-opacity mt-1"
                                    >
                                        INICIAR
                                    </button>
                                </div>
                            )}
                        </div>

                        {/* El Impostor */}
                        <div className="flex flex-col gap-2">
                            <button
                                className="w-full bg-impostor py-4 px-5 rounded hover:opacity-90 transition-opacity text-left flex items-center"
                                onClick={() => setImpostorExpanded(v => !v)}
                            >
                                <div className="flex-1">
                                    <p className="text-xs uppercase tracking-widest text-white opacity-70 mb-1">Encuentra al traidor</p>
                                    <p className="font-display text-xl tracking-wide text-white">EL IMPOSTOR</p>
                                </div>
                                <span className="text-white/60 text-sm">{impostorExpanded ? '▲' : '▼'}</span>
                            </button>

                            {impostorExpanded && (
                                <div className="border border-impostor/30 rounded p-3 flex flex-col gap-2">
                                    <p className="text-xs uppercase tracking-widest text-neutral-500 mb-1">Número de impostores</p>
                                    <div className="flex gap-2">
                                        {[1, 2, 3].map(n => {
                                            const maxImpostors = Math.max(1, Math.floor(effectiveRoom.players.length / 3));
                                            const disabled = n > maxImpostors;
                                            return (
                                                <button
                                                    key={n}
                                                    disabled={disabled}
                                                    onClick={() => setImpostorCount(n)}
                                                    className={`flex-1 py-3 font-display text-2xl rounded transition-all ${
                                                        impostorCount === n
                                                            ? 'bg-impostor text-white'
                                                            : 'border border-neutral-700 text-neutral-400 hover:border-impostor disabled:opacity-30 disabled:cursor-not-allowed'
                                                    }`}
                                                >
                                                    {n}
                                                </button>
                                            );
                                        })}
                                    </div>
                                    <button
                                        onClick={() => {
                                            socket.emit('impostor:start', { roomCode, impostorCount });
                                            setImpostorExpanded(false);
                                        }}
                                        className="w-full bg-impostor font-display tracking-widest text-lg py-4 rounded hover:opacity-90 transition-opacity mt-1"
                                    >
                                        INICIAR
                                    </button>
                                </div>
                            )}
                        </div>

                        {/* Yo Nunca */}
                        <button
                            className="w-full bg-yonunca py-4 px-5 rounded hover:opacity-90 transition-opacity text-left"
                            onClick={() => socket.emit('yonunca:start', roomCode)}
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
                        onClick={() => { socket.emit('leaveRoom', roomCode); navigate('/'); }}
                        className="text-neutral-500 hover:text-white text-sm transition-colors block text-center underline-offset-4 hover:underline w-full"
                    >
                        Salir de la sala
                    </button>
                </div>
            </div>
        </div>
    );
}
