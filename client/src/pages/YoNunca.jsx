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
            <div className="flex flex-col items-center justify-center min-h-screen bg-gray-900 text-white p-4">
                <h1 className="text-4xl font-bold mb-8 text-pink-500">Yo Nunca</h1>
                <div className="space-y-4 w-full max-w-md">
                    <button onClick={() => handleSetMode('random')} className="w-full bg-blue-600 p-4 rounded-xl text-xl font-bold hover:bg-blue-700 transition">
                        🎲 Aleatorio
                    </button>
                    <button onClick={() => handleSetMode('specific')} className="w-full bg-purple-600 p-4 rounded-xl text-xl font-bold hover:bg-purple-700 transition">
                        🔢 Número Específico
                    </button>
                    <button onClick={() => handleSetMode('list')} className="w-full bg-green-600 p-4 rounded-xl text-xl font-bold hover:bg-green-700 transition">
                        📜 Lista Completa
                    </button>
                    <button onClick={() => navigate(`/lobby/${roomCode}`)} className="w-full bg-gray-700 p-4 rounded-xl text-xl font-bold hover:bg-gray-600 transition flex items-center justify-center gap-2">
                        ⬅ Volver al Lobby
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
                    className="text-gray-400 hover:text-white flex items-center gap-1"
                >
                    <span>⬅</span> {gameMode ? 'Cambiar Modo' : 'Salir al Lobby'}
                </button>
                <button onClick={() => setShowStats(!showStats)} className="text-yellow-400 hover:text-yellow-300 font-bold">
                    {showStats ? 'Ocultar Estadísticas' : '🏆 Estadísticas'}
                </button>
                <button onClick={() => socket.emit('yonunca:requestState', roomCode)} className="text-blue-400 hover:text-blue-300 font-bold ml-4">
                    🔄 Sync
                </button>
            </div>
            <div className="text-xs text-gray-500 mb-2 text-center">
                Socket: {socket.id} | Players: {room?.players?.length || 0}
            </div>
        </>
    );

    const StatsView = () => (
        <div className="bg-gray-800 p-4 rounded-xl w-full max-w-2xl mb-6">
            <h2 className="text-2xl font-bold mb-4 text-center text-yellow-500">Ranking de Borrachos</h2>
            <ul className="space-y-2">
                {Object.entries(playerStats).sort(([, a], [, b]) => b.drinks - a.drinks).map(([pid, data]) => (
                    <li key={pid} className="flex justify-between border-b border-gray-700 pb-2">
                        <span>{data.name}</span>
                        <span className="font-bold text-pink-400">{data.drinks} 🥃</span>
                    </li>
                ))}
                {Object.keys(playerStats).length === 0 && <p className="text-center text-gray-500">Nadie ha bebido aún...</p>}
            </ul>
        </div>
    );

    return (
        <div className="flex flex-col items-center min-h-screen bg-gray-900 text-white p-4">
            <Header />

            {showStats && <StatsView />}

            {/* Mode Specific Controls */}
            <div className="w-full max-w-2xl mb-6">
                {gameMode === 'random' && (
                    <div className="text-center">
                        <button onClick={handleNextRandom} className="bg-pink-600 px-8 py-3 rounded-full text-xl font-bold hover:bg-pink-700 transition shadow-lg shadow-pink-500/50 animate-pulse">
                            Siguiente Pregunta 🎲
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
                            className="bg-gray-800 border border-gray-600 rounded-lg px-4 py-2 w-32 text-center text-xl focus:outline-none focus:border-pink-500"
                        />
                        <button type="submit" className="bg-purple-600 px-6 py-2 rounded-lg font-bold hover:bg-purple-700">Ir</button>
                    </form>
                )}

                {gameMode === 'list' && (
                    <div className={`mt-4 bg-gray-800 rounded-xl ${statement ? 'max-h-40' : 'h-[60vh]'} overflow-y-auto p-2 border border-gray-700`}>
                        <p className="text-center text-xs text-gray-400 mb-2 sticky top-0 bg-gray-800 pb-2 z-10">
                            Selecciona una ({statementList.length} disponibles):
                        </p>
                        {statementList.map(s => (
                            <button key={s.id} onClick={() => handleListSelect(s.id)} className="block w-full text-left p-2 hover:bg-gray-700 rounded text-sm truncate">
                                {s.id} - {s.text}
                            </button>
                        ))}
                    </div>
                )}
            </div>

            {/* Current Statement Card */}
            {statement && (
                <div className="w-full max-w-2xl bg-gradient-to-br from-indigo-900 to-purple-900 p-8 rounded-2xl shadow-2xl mb-8 border border-purple-500/30">
                    <div className="text-6xl font-black text-white/10 absolute top-4 right-6 pointer-events-none">#{statement.id}</div>
                    <h2 className="text-3xl md:text-4xl font-bold text-center leading-tight drop-shadow-lg">
                        {statement.text}
                    </h2>
                </div>
            )}

            {/* Participants / Drinking Toggle */}
            {statement && (
                <div className="w-full max-w-2xl">
                    <h3 className="text-xl font-semibold mb-4 text-center text-gray-300">¿Quién bebe?</h3>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                        {effectiveRoom.players.map(p => {
                            const isDrinking = statement.drinkers?.includes(p.id);
                            return (
                                <button
                                    key={p.id}
                                    onClick={() => handleDrinkToggle(p.id)}
                                    className={`p-4 rounded-xl border-2 transition-all duration-300 flex items-center justify-center gap-2
                                ${isDrinking
                                            ? 'bg-red-500/20 border-red-500 text-red-400 shadow-[0_0_15px_rgba(239,68,68,0.3)]'
                                            : 'bg-gray-800 border-gray-700 text-gray-400 hover:border-gray-500'}`}
                                >
                                    <span className="text-2xl">{isDrinking ? '🍺' : '😐'}</span>
                                    <span className="font-bold truncate">{p.name}</span>
                                </button>
                            )
                        })}
                    </div>
                </div>
            )}
        </div>
    );
};

export default YoNunca;
