import React, { useState, useEffect } from 'react';
import { useSocket } from '../contexts/SocketContext';
import { useNavigate, useParams, useLocation } from 'react-router-dom';

const YoNunca = () => {
    const { socket, room, setRoom } = useSocket();
    const { roomCode } = useParams();
    const navigate = useNavigate();

    const [gameMode, setGameMode] = useState(null); // 'random', 'specific', 'list', or null (selection)
    const [statement, setStatement] = useState(null);
    const [statementList, setStatementList] = useState([]);
    const [playerStats, setPlayerStats] = useState({});
    const [specificNum, setSpecificNum] = useState('');
    const [showStats, setShowStats] = useState(false);

    const location = useLocation();
    // Fallback to location state if context is not yet populated
    const effectiveRoom = room || location.state?.room;

    useEffect(() => {
        if (!socket) return;

        // Redirect if direct access without joining (refresh handling)
        // Note: In a real app we'd try to reconnect/rejoin.
        // Ideally we check if we are in the room. But checking 'room' from context is a good proxy.
        // However, room in context might be null if we refreshed.
        if (!effectiveRoom) {
            console.log('No room state, checking storage...');
            const stored = sessionStorage.getItem('party_session');
            if (stored) {
                const { roomCode: storedCode, playerName } = JSON.parse(stored);
                if (storedCode === roomCode) {
                    console.log('Attempting restore via joinRoom');
                    socket.emit('joinRoom', { roomCode, playerName });
                    // We wait for roomUpdated (handled by context) to fill room
                } else {
                    navigate('/');
                }
            } else {
                navigate('/');
            }

            // Wait for sync...
            return;
        }

        // Request initial state on mount
        socket.emit('yonunca:requestState', roomCode);

        // Listen for events
        socket.on('yonunca:state', (newState) => {
            console.log('New State:', newState);
            setGameMode(newState.mode);
            setStatement(newState.currentStatement);
            setPlayerStats(newState.playerStats);
        });

        socket.on('yonunca:list', (list) => {
            setStatementList(list);
        });

        socket.on('error', (msg) => {
            alert(msg);
        });

        return () => {
            socket.off('yonunca:state');
            socket.off('yonunca:list');
            socket.off('error');
        };
    }, [socket]);

    // Initial fetch? The server emits state on start.
    // Actually, we might need to ask for list if we want it.

    const handleSetMode = (mode) => {
        console.log('Setting mode:', mode);
        socket.emit('yonunca:setMode', { roomCode, mode });
        // Request state to ensure we have the full list
        socket.emit('yonunca:requestState', roomCode);
    };

    const handleNextRandom = () => {
        socket.emit('yonunca:action', { roomCode, type: 'random' });
    };

    const handleSpecificSubmit = (e) => {
        e.preventDefault();
        socket.emit('yonunca:action', { roomCode, type: 'specific', payload: specificNum });
        setSpecificNum('');
    };

    const handleListSelect = (id) => {
        socket.emit('yonunca:action', { roomCode, type: 'select', payload: id });
    };

    const handleDrinkToggle = (playerId) => {
        socket.emit('yonunca:drink', { roomCode, playerId, playerName: effectiveRoom.players.find(p => p.id === playerId)?.name });
    };

    if (!gameMode) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen bg-[#111] text-white p-4">
                <div className="text-center mb-8 mt-4">
                    <p className="text-xs tracking-[4px] uppercase text-neutral-500 mb-1">JUEGO</p>
                    <h1 className="font-display text-5xl tracking-[6px] text-yonunca">YO NUNCA</h1>
                </div>
                <div className="space-y-4 w-full max-w-md">
                    <button onClick={() => handleSetMode('random')} className="bg-yonunca w-full py-4 px-5 rounded hover:opacity-90 transition-opacity text-left">
                        <p className="text-xs uppercase tracking-widest text-white opacity-70 mb-1">Modo</p>
                        <p className="font-display text-xl tracking-wide text-white">ALEATORIO</p>
                    </button>
                    <button onClick={() => handleSetMode('specific')} className="w-full border border-neutral-700 py-4 px-5 rounded hover:border-yonunca transition-colors text-left">
                        <p className="text-xs uppercase tracking-widest text-neutral-500 mb-1">Modo</p>
                        <p className="font-display text-xl tracking-wide text-white">NÚMERO ESPECÍFICO</p>
                    </button>
                    <button onClick={() => handleSetMode('list')} className="w-full border border-neutral-700 py-4 px-5 rounded hover:border-yonunca transition-colors text-left">
                        <p className="text-xs uppercase tracking-widest text-neutral-500 mb-1">Modo</p>
                        <p className="font-display text-xl tracking-wide text-white">LISTA COMPLETA</p>
                    </button>
                    <button onClick={() => navigate(`/lobby/${roomCode}`)} className="bg-neutral-800 border border-neutral-700 w-full py-4 px-5 rounded hover:opacity-90 text-left">
                        <p className="text-xs uppercase tracking-widest text-neutral-500 mb-1">Navegación</p>
                        <p className="font-display text-xl tracking-wide text-white">VOLVER AL LOBBY</p>
                    </button>
                </div>
            </div>
        );
    }

    // Common Header
    const Header = () => (
        <>
            <div className="flex justify-between items-center w-full max-w-2xl mb-4">
                <button
                    onClick={() => {
                        if (gameMode) setGameMode(null);
                        else navigate(`/lobby/${roomCode}`);
                    }}
                    className="text-neutral-500 hover:text-white text-sm transition-colors"
                >
                    ← {gameMode ? 'Cambiar Modo' : 'Salir al Lobby'}
                </button>
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => setShowStats(!showStats)}
                        className="border border-neutral-700 text-neutral-400 text-xs px-3 py-1 rounded hover:border-neutral-500 transition-colors"
                    >
                        {showStats ? 'Ocultar Stats' : 'Estadísticas'}
                    </button>
                    <button
                        onClick={() => socket.emit('yonunca:requestState', roomCode)}
                        className="border border-neutral-700 text-neutral-400 text-xs px-3 py-1 rounded hover:border-neutral-500 transition-colors"
                    >
                        Sync
                    </button>
                </div>
            </div>
            <div className="text-xs text-neutral-600 mb-2 text-center tracking-widest">
                Socket: {socket.id} | Players: {room?.players?.length || 0}
            </div>
        </>
    );

    const StatsView = () => (
        <div className="bg-neutral-900 border border-neutral-800 p-4 rounded w-full max-w-2xl mb-6">
            <h2 className="font-display text-2xl text-yonunca tracking-widest mb-4 text-center">RANKING DE BORRACHOS</h2>
            <ul className="space-y-2">
                {Object.entries(playerStats).sort(([, a], [, b]) => b.drinks - a.drinks).map(([pid, data]) => (
                    <li key={pid} className="flex justify-between border-b border-neutral-800 pb-2">
                        <span className="text-neutral-300">{data.name}</span>
                        <span className="font-display tracking-widest text-yonunca">{data.drinks}</span>
                    </li>
                ))}
                {Object.keys(playerStats).length === 0 && (
                    <p className="text-center text-xs tracking-widest uppercase text-neutral-600">Nadie ha bebido aún...</p>
                )}
            </ul>
        </div>
    );

    return (
        <div className="flex flex-col items-center min-h-screen bg-[#111] text-white p-4">
            <div className="text-center mb-6 mt-4">
                <p className="text-xs tracking-[4px] uppercase text-neutral-500 mb-1">JUEGO</p>
                <h1 className="font-display text-5xl tracking-[6px] text-yonunca">YO NUNCA</h1>
            </div>

            <Header />

            {showStats && <StatsView />}

            {/* Mode Specific Controls */}
            <div className="w-full max-w-2xl mb-6">
                {gameMode === 'random' && (
                    <div className="text-center">
                        <button
                            onClick={handleNextRandom}
                            className="w-full bg-yonunca font-display tracking-widest text-xl py-6 rounded hover:opacity-90 transition-opacity"
                        >
                            SIGUIENTE PREGUNTA
                        </button>
                    </div>
                )}

                {gameMode === 'specific' && (
                    <form onSubmit={handleSpecificSubmit} className="flex gap-2 justify-center">
                        <input
                            type="number"
                            value={specificNum}
                            onChange={(e) => setSpecificNum(e.target.value)}
                            placeholder="Número #"
                            className="bg-neutral-900 border border-neutral-700 rounded px-4 py-2 w-32 text-center font-display text-xl tracking-widest focus:outline-none focus:border-yonunca text-white"
                        />
                        <button
                            type="submit"
                            className="bg-yonunca font-display tracking-widest px-6 py-2 rounded hover:opacity-90 transition-opacity"
                        >
                            IR
                        </button>
                    </form>
                )}

                {gameMode === 'list' && (
                    <div className={`mt-4 bg-neutral-900 rounded border border-neutral-800 ${statement ? 'max-h-40' : 'h-[60vh]'} overflow-y-auto p-2`}>
                        <p className="text-center text-xs tracking-widest uppercase text-neutral-600 mb-2 sticky top-0 bg-neutral-900 pb-2 z-10">
                            Selecciona una ({statementList.length} disponibles):
                        </p>
                        {statementList.map(s => (
                            <button
                                key={s.id}
                                onClick={() => handleListSelect(s.id)}
                                className="block w-full text-left p-2 hover:bg-neutral-800 rounded text-sm truncate text-neutral-400 hover:text-white transition-colors"
                            >
                                <span className="font-display tracking-widest text-neutral-600 mr-2">#{s.id}</span>
                                {s.text}
                            </button>
                        ))}
                    </div>
                )}
            </div>

            {/* Current Statement Card */}
            {statement && (
                <div className="border border-yonunca/30 bg-yonunca/10 rounded p-6 mb-6 w-full max-w-2xl">
                    <p className="font-display text-4xl text-white leading-tight">{statement.text}</p>
                    <p className="text-xs text-neutral-600 mt-3 tracking-widest">#{statement.id}</p>
                </div>
            )}

            {/* Participants / Drinking Toggle */}
            {statement && (
                <div className="w-full max-w-2xl">
                    <p className="text-xs tracking-widest uppercase text-neutral-500 mb-4 text-center">¿Quién bebe?</p>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                        {effectiveRoom.players.map(p => {
                            const isDrinking = statement.drinkers?.includes(p.id);
                            return (
                                <button
                                    key={p.id}
                                    onClick={() => handleDrinkToggle(p.id)}
                                    className={`py-4 px-5 rounded border transition-colors text-left
                                        ${isDrinking
                                            ? 'bg-yonunca/20 border-yonunca text-yonunca'
                                            : 'bg-neutral-800 border border-neutral-700 text-neutral-400 hover:border-neutral-500'}`}
                                >
                                    <p className="font-display text-lg tracking-wide truncate">{p.name}</p>
                                </button>
                            );
                        })}
                    </div>
                </div>
            )}
        </div>
    );
};

export default YoNunca;
