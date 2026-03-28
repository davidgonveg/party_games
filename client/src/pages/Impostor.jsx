import React, { useState, useEffect, useRef } from 'react';
import { useSocket } from '../contexts/SocketContext';
import { useNavigate, useParams, useLocation } from 'react-router-dom';

const Impostor = () => {
    const { socket, room, isOffline } = useSocket();
    const { roomCode } = useParams();
    const navigate = useNavigate();
    const location = useLocation();

    const [gameState, setGameState] = useState(null);
    const [isRevealing, setIsRevealing] = useState(false);
    const [timeLeft, setTimeLeft] = useState(0);

    const effectiveRoom = room || location.state?.room;

    useEffect(() => {
        if (!socket) return;

        if (!effectiveRoom) {
            const stored = sessionStorage.getItem('party_session');
            if (stored) {
                const { roomCode: storedCode, playerName } = JSON.parse(stored);
                if (storedCode === roomCode) {
                    socket.emit('joinRoom', { roomCode, playerName });
                } else {
                    navigate('/');
                }
            } else {
                navigate('/');
            }
            return;
        }

        socket.emit('impostor:requestState', roomCode);

        socket.on('impostor:state', (newState) => {
            console.log('[Impostor] State update:', newState);
            setGameState(newState);
        });

        return () => {
            socket.off('impostor:state');
        };
    }, [socket, effectiveRoom, roomCode, navigate]);

    // Timer logic for discussion
    useEffect(() => {
        if (gameState?.state === 'DISCUSSION' && gameState.discussionEndTime) {
            const updateTimer = () => {
                const now = Date.now();
                const remaining = Math.max(0, gameState.discussionEndTime - now);
                setTimeLeft(Math.floor(remaining / 1000));
            };

            updateTimer(); // initial call
            const interval = setInterval(updateTimer, 500);
            return () => clearInterval(interval);
        }
    }, [gameState?.state, gameState?.discussionEndTime]);

    if (!gameState) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-[#111] text-white">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-impostor mx-auto mb-4"></div>
                    <p className="font-display text-xs tracking-[4px] text-impostor uppercase">Cargando Impostor...</p>
                </div>
            </div>
        );
    }

    // Identificar a mi jugador local
    // En modo offline/local "pass and play", asumimos que el dispositivo es pasado de mano en mano?
    // Espera, el LocalServer tiene un array de players. Si estamos en modo Local (isOffline),
    // ¿cómo gestionamos quién está viendo la pantalla?
    // En La Bomba, todo es público excepto cuando un jugador es Francotirador, y ahí se asume
    // que el dispositivo lo tiene él.
    // En el Impostor, REVEAL requiere que el jugador respectivo pulse el botón.
    // Como estamos en un contexto de PWA multijugador cliente-servidor, cada uno tiene su propio móvil (`socket.id`).
    // Y PARA MODO LOCAL: necesitamos un Pass & Play si estamos en 1 móvil.
    // LocalServer se suele jugar con 1 solo móvil y isOffline=true.
    // Si isOffline=true, "mi jugador" no existe, hay que hacer Pass & Play.
    // Para no complicarlo mucho, en Local mostraremos una lista de jugadores, y el que le toca revela.

    const currentPlayer = isOffline
        ? null // Si es offline, requerirá manejo específico Pass&Play
        : gameState.players.find(p => p.id === socket?.id);

    // Phase label helper
    const phaseLabels = {
        REVEAL: { num: 1, label: 'Revelar' },
        DISCUSSION: { num: 2, label: 'Discusión' },
        VOTING: { num: 3, label: 'Votación' },
        RESULTS: { num: 4, label: 'Resultados' },
    };
    const phaseInfo = phaseLabels[gameState.state] || { num: 1, label: '' };

    // Render helpers
    const renderReveal = () => {
        if (isOffline) {
            return <PassAndPlayReveal />
        }

        if (currentPlayer?.hasRevealed) {
            return (
                <div className="flex flex-col items-center justify-center min-h-[60vh]">
                    <div className="text-5xl mb-4">👀</div>
                    <p className="font-display text-3xl text-white text-center mb-6">Esperando al resto...</p>

                    {/* Player chips */}
                    <div className="flex flex-wrap gap-2 justify-center max-w-sm mt-4">
                        {gameState.players.map(p => (
                            <div
                                key={p.id}
                                className={p.hasRevealed
                                    ? 'border border-impostor text-white text-sm px-3 py-1.5 rounded-sm flex items-center gap-2'
                                    : 'border border-neutral-700 text-neutral-500 text-sm px-3 py-1.5 rounded-sm flex items-center gap-2'
                                }
                            >
                                <span className={`w-2 h-2 rounded-full ${p.hasRevealed ? 'bg-impostor' : 'bg-neutral-600'}`}></span>
                                {p.name}
                            </div>
                        ))}
                    </div>
                </div>
            );
        }

        return (
            <div className="flex flex-col items-center justify-center min-h-[70vh]">
                <p className="text-xs tracking-widest uppercase text-neutral-500 mb-2">Tu rol</p>
                <h2 className="font-display text-3xl text-white mb-8">Descubre tu rol</h2>
                <button
                    className={`w-64 h-64 rounded-full flex flex-col items-center justify-center transition-all duration-300
                        ${isRevealing ? 'bg-impostor scale-110 shadow-[0_0_80px_rgba(88,86,214,0.6)]' : 'bg-white/5 border-4 border-impostor shadow-[0_0_50px_rgba(88,86,214,0.2)]'}`}
                    onMouseDown={() => setIsRevealing(true)}
                    onMouseUp={() => setIsRevealing(false)}
                    onTouchStart={() => setIsRevealing(true)}
                    onTouchEnd={() => setIsRevealing(false)}
                >
                    {!isRevealing ? (
                        <>
                            <span className="text-5xl mb-2">👆</span>
                            <span className="font-display text-white text-xl text-center px-4 tracking-widest">PULSA PARA VER</span>
                        </>
                    ) : (
                        <div className="text-center animate-fade-in">
                            <h3 className="font-display text-xl text-white mb-2 tracking-widest">ERES:</h3>
                            <p className={`font-display text-3xl uppercase tracking-widest ${currentPlayer?.role === 'impostor' ? 'text-red-500' : 'text-green-400'}`}>
                                {currentPlayer?.role === 'impostor' ? 'El Impostor' : 'Inocente'}
                            </p>
                            {currentPlayer?.role === 'innocent' && (
                                <p className="mt-4 text-xs tracking-widest uppercase text-neutral-500">Palabra:</p>
                            )}
                            {currentPlayer?.role === 'innocent' && (
                                <p className="font-display text-2xl text-white bg-white/10 px-4 py-1 rounded mt-1">{gameState.word}</p>
                            )}
                        </div>
                    )}
                </button>
                <div className="mt-12 w-full max-w-xs">
                    <button
                        className="bg-impostor w-full font-display tracking-widest text-xl py-6 rounded hover:opacity-90 transition-opacity disabled:opacity-40"
                        onClick={() => socket.emit('impostor:reveal', { roomCode, playerId: socket.id })}
                        disabled={!isRevealing}
                    >
                        VER MI ROL
                    </button>
                    {!isRevealing && <p className="text-neutral-500 mt-2 text-center text-xs tracking-widest uppercase">Mantén pulsado para revelar</p>}
                </div>
            </div>
        );
    };

    const PassAndPlayReveal = () => {
        // En Pass & Play, buscar el primer jugador que no ha revelado
        const playerToReveal = gameState.players.find(p => !p.hasRevealed);

        if (!playerToReveal) return (
            <div className="text-center mt-20">
                <p className="font-display text-xs tracking-[4px] text-impostor uppercase mb-2">Fase completada</p>
                <p className="font-display text-3xl text-white">Comenzando discusión...</p>
            </div>
        );

        return (
            <div className="flex flex-col items-center justify-center min-h-[70vh]">
                <p className="text-xs tracking-widest uppercase text-neutral-500 mb-2">Pasa el móvil a</p>
                <h1 className="font-display text-3xl text-white mb-12">{playerToReveal.name}</h1>

                <button
                    className={`w-64 h-64 rounded-full flex flex-col items-center justify-center transition-all duration-300
                        ${isRevealing ? 'bg-impostor scale-110 shadow-[0_0_80px_rgba(88,86,214,0.6)]' : 'bg-white/5 border-4 border-impostor shadow-[0_0_50px_rgba(88,86,214,0.2)]'}`}
                    onMouseDown={() => setIsRevealing(true)}
                    onMouseUp={() => setIsRevealing(false)}
                    onTouchStart={() => setIsRevealing(true)}
                    onTouchEnd={() => setIsRevealing(false)}
                >
                    {!isRevealing ? (
                        <>
                            <span className="text-5xl mb-2">👆</span>
                            <span className="font-display text-white text-xl text-center px-4 tracking-widest">PULSA PARA VER</span>
                        </>
                    ) : (
                        <div className="text-center animate-fade-in">
                            <h3 className="font-display text-xl text-white mb-2 tracking-widest">ERES:</h3>
                            <p className={`font-display text-3xl uppercase tracking-widest ${playerToReveal.role === 'impostor' ? 'text-red-500' : 'text-green-400'}`}>
                                {playerToReveal.role === 'impostor' ? 'El Impostor' : 'Inocente'}
                            </p>
                            {playerToReveal.role === 'innocent' && (
                                <p className="mt-4 text-xs tracking-widest uppercase text-neutral-500">Palabra:</p>
                            )}
                            {playerToReveal.role === 'innocent' && (
                                <p className="font-display text-2xl text-white bg-white/10 px-4 py-1 rounded mt-1">{gameState.word}</p>
                            )}
                        </div>
                    )}
                </button>
                <div className="mt-12 w-full max-w-xs">
                    <button
                        className="bg-impostor w-full font-display tracking-widest text-xl py-6 rounded hover:opacity-90 transition-opacity disabled:opacity-40"
                        onClick={() => socket.emit('impostor:reveal', { roomCode, playerId: playerToReveal.id })}
                        disabled={!isRevealing}
                    >
                        VER MI ROL
                    </button>
                </div>
            </div>
        );
    };

    const renderDiscussion = () => {
        const minutes = Math.floor(timeLeft / 60);
        const seconds = timeLeft % 60;
        const timeString = `${minutes}:${seconds.toString().padStart(2, '0')}`;

        return (
            <div className="flex flex-col items-center justify-center flex-1">
                <div className="mb-8 text-center">
                    <h2 className="font-display text-3xl text-white mb-2">Discusión en curso</h2>
                    <p className="text-neutral-500 max-w-sm mx-auto text-sm">¡Encuentra al impostor antes de que acabe el tiempo! Haz preguntas sutiles.</p>
                </div>

                <div className="relative mb-12 bg-impostor/5 rounded-2xl px-10 py-6 flex items-center justify-center">
                    <div className={`font-display text-[9rem] leading-none drop-shadow-2xl transition-colors duration-1000 ${timeLeft <= 30 ? 'text-red-500 animate-[bounce_1s_infinite]' : 'text-impostor'}`}>
                        {timeString}
                    </div>
                </div>

                {(isOffline || currentPlayer?.isHost) && (
                    <button
                        className="border border-neutral-700 text-neutral-500 font-display tracking-widest text-sm py-2 px-6 rounded hover:border-white hover:text-white transition-colors mt-8"
                        onClick={() => {
                            if (window.confirm('¿Finalizar discusión e iniciar votación ya?')) {
                                socket.emit('impostor:forceVoting', roomCode);
                            }
                        }}
                    >
                        FORZAR VOTACIÓN
                    </button>
                )}
            </div>
        );
    };

    const renderVoting = () => {
        if (isOffline) {
            return <PassAndPlayVoting />;
        }

        const myVote = gameState.votes[currentPlayer?.id];

        if (myVote) {
            return (
                <div className="flex flex-col items-center justify-center min-h-[60vh]">
                    <div className="text-5xl mb-4">🗳️</div>
                    <p className="font-display text-3xl text-white text-center mb-4">Voto registrado</p>
                    <p className="text-neutral-500 text-sm">Esperando al resto... ({Object.keys(gameState.votes).length}/{gameState.players.length})</p>
                </div>
            );
        }

        return (
            <div className="flex flex-col items-center w-full max-w-sm mx-auto">
                <p className="text-xs tracking-widest uppercase text-neutral-500 mb-2">Fase 3</p>
                <h2 className="font-display text-3xl text-white mb-2">¡A Votar!</h2>
                <p className="text-neutral-500 mb-8 text-center text-sm">Selecciona al jugador que crees que es el impostor.</p>

                <div className="flex flex-col gap-3 w-full">
                    {gameState.players.filter(p => p.id !== currentPlayer?.id).map((p) => (
                        <button
                            key={p.id}
                            className="bg-impostor w-full font-display tracking-widest text-lg py-4 rounded hover:opacity-90 transition-opacity disabled:opacity-40"
                            onClick={() => {
                                if (window.confirm(`¿Seguro que quieres votar a ${p.name}?`)) {
                                    socket.emit('impostor:vote', { roomCode, voterId: currentPlayer.id, targetId: p.id });
                                }
                            }}
                        >
                            {p.name}
                        </button>
                    ))}
                </div>
            </div>
        );
    };

    const PassAndPlayVoting = () => {
        // Buscar el primer jugador que no ha votado
        const playerToVote = gameState.players.find(p => !gameState.votes[p.id]);

        if (!playerToVote) return (
            <div className="text-center mt-20">
                <p className="font-display text-xs tracking-[4px] text-impostor uppercase mb-2">Procesando</p>
                <p className="font-display text-3xl text-white">Procesando resultados...</p>
            </div>
        );

        return (
            <div className="flex flex-col items-center w-full max-w-sm mx-auto">
                <p className="text-xs tracking-widest uppercase text-neutral-500 mb-2">Turno de votación de</p>
                <h1 className="font-display text-3xl text-white mb-2">{playerToVote.name}</h1>
                <p className="text-neutral-500 mb-8 text-center text-sm">Pasa el móvil a {playerToVote.name}. ¡No dejes que los demás miren!</p>

                <div className="flex flex-col gap-3 w-full border-t border-neutral-800 pt-6">
                    {gameState.players.filter(p => p.id !== playerToVote.id).map((p) => (
                        <button
                            key={p.id}
                            className="bg-impostor w-full font-display tracking-widest text-lg py-4 rounded hover:opacity-90 transition-opacity disabled:opacity-40"
                            onClick={() => {
                                if (window.confirm(`¿Confirmas tu voto contra ${p.name}?`)) {
                                    socket.emit('impostor:vote', { roomCode, voterId: playerToVote.id, targetId: p.id });
                                }
                            }}
                        >
                            {p.name}
                        </button>
                    ))}
                </div>
            </div>
        );
    };

    const renderResults = () => {
        const { winners, voteCounts, impostorId } = gameState.results;
        const impostorPlayer = gameState.players.find(p => p.id === impostorId);
        const impostorWon = winners === 'impostor';

        return (
            <div className="flex flex-col items-center w-full flex-1 pt-8 pb-12">

                {/* Winner banner */}
                <div className={`mb-8 p-6 rounded-2xl w-full max-w-md border text-center ${impostorWon ? 'bg-impostor/20 border-impostor' : 'bg-green-900/40 border-green-500'}`}>
                    <h2 className={`font-display text-4xl uppercase mb-6 ${impostorWon ? 'text-impostor' : 'text-green-400'}`}>
                        {impostorWon ? 'EL IMPOSTOR GANA' : 'LOS INOCENTES GANAN'}
                    </h2>

                    {/* The word */}
                    <div className="mb-6">
                        <p className="text-xs tracking-widest uppercase text-neutral-500 mb-2">La palabra era</p>
                        <p className="font-display text-5xl text-white">{gameState.word}</p>
                    </div>

                    {/* Impostor reveal */}
                    <div>
                        <p className="text-xs tracking-widest uppercase text-neutral-500 mb-2">El impostor era</p>
                        <p className="font-display text-3xl text-impostor">{impostorPlayer?.name}</p>
                    </div>
                </div>

                {/* Vote breakdown */}
                <div className="w-full max-w-md mb-8">
                    <h3 className="text-xs tracking-widest uppercase text-neutral-500 mb-4 px-2">Recuento de votos</h3>
                    <div className="space-y-2">
                        {Object.entries(voteCounts).sort((a, b) => b[1] - a[1]).map(([targetId, count]) => {
                            const p = gameState.players.find(x => x.id === targetId);
                            const isTheImpostor = targetId === impostorId;
                            return (
                                <div key={targetId} className={`flex items-center justify-between p-3 rounded-lg border ${isTheImpostor ? 'bg-impostor/10 border-impostor/50' : 'bg-white/5 border-neutral-800'}`}>
                                    <span className={`font-display text-sm tracking-widest ${isTheImpostor ? 'text-impostor' : 'text-neutral-300'}`}>
                                        {p?.name} {isTheImpostor && '🦹'}
                                    </span>
                                    <div className="flex items-center gap-2">
                                        <span className="text-xl">{Array(count).fill('🔪').join('')}</span>
                                        <span className="border border-impostor/30 text-neutral-400 text-xs px-2 py-0.5 rounded-sm">{count}</span>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                <div className="flex flex-col gap-4 w-full max-w-xs">
                    {(isOffline || currentPlayer?.isHost) && (
                        <button
                            className="bg-impostor font-display tracking-widest text-lg w-full py-4 rounded hover:opacity-90 transition-opacity"
                            onClick={() => socket.emit('impostor:restart', roomCode)}
                        >
                            JUGAR DE NUEVO
                        </button>
                    )}
                    <button
                        className="w-full bg-black/40 border border-neutral-800 hover:border-neutral-600 py-3 px-6 rounded font-display tracking-widest text-sm text-neutral-400 hover:text-white transition-colors"
                        onClick={() => navigate(`/lobby/${roomCode}`)}
                    >
                        SALIR AL LOBBY
                    </button>
                </div>
            </div>
        );
    };

    return (
        <div className="min-h-screen bg-[#08082a] text-white flex flex-col p-4 relative overflow-x-hidden font-sans">
            {/* Header / Info */}
            <div className="flex justify-between items-center bg-black/40 backdrop-blur-md p-3 rounded-2xl border border-neutral-800 relative z-20">
                <button
                    onClick={() => navigate(`/lobby/${roomCode}`)}
                    className="text-neutral-500 hover:text-white transition-colors"
                >
                    ⬅ <span className="hidden sm:inline">Lobby</span>
                </button>
                <div className="font-display text-xs tracking-[4px] text-impostor uppercase flex items-center gap-2">
                    Fase {phaseInfo.num} de 4 · {phaseInfo.label}
                </div>
                <div className="text-sm bg-white/5 px-2 py-1 rounded font-mono text-neutral-400">
                    {roomCode}
                </div>
            </div>

            {/* Main Content Area */}
            <div className="flex-1 flex flex-col mt-4 relative z-10 w-full max-w-4xl mx-auto">
                {gameState.state === 'REVEAL' && renderReveal()}
                {gameState.state === 'DISCUSSION' && renderDiscussion()}
                {gameState.state === 'VOTING' && renderVoting()}
                {gameState.state === 'RESULTS' && renderResults()}
            </div>
        </div>
    );
};

export default Impostor;
