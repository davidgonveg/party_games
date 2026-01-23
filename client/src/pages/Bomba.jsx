import React, { useState, useEffect } from 'react';
import { useSocket } from '../contexts/SocketContext';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import BombaCell from '../components/BombaCell';
import BombaHUD from '../components/BombaHUD';

const Bomba = () => {
    const { socket, room, isOffline } = useSocket();
    const { roomCode } = useParams();
    const navigate = useNavigate();
    const location = useLocation();

    const [gameState, setGameState] = useState(null);
    const [showTargetModal, setShowTargetModal] = useState(false);

    const effectiveRoom = room || location.state?.room;

    useEffect(() => {
        if (!socket) return;

        // Session recovery
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

        // Request game state
        socket.emit('bomba:requestState', roomCode);

        // Listen for state updates
        socket.on('bomba:state', (newState) => {
            console.log('[Bomba] State update:', newState);
            setGameState(newState);

            // Show target modal if waiting for Sniper target selection
            // In offline mode, we always show it for the local player who is controlling the device
            if (newState.waitingForTarget && (isOffline || newState.pendingSniperData?.playerId === socket.id)) {
                setShowTargetModal(true);
            } else {
                setShowTargetModal(false);
            }
        });

        return () => {
            socket.off('bomba:state');
        };
    }, [socket, effectiveRoom, roomCode, navigate]);

    const handleCellClick = (cellIndex) => {
        if (!gameState) return;
        if (gameState.gameOver) return;
        if (gameState.waitingForTarget) return;
        if (gameState.revealedCells.includes(cellIndex)) return;

        const currentPlayer = gameState.players[gameState.currentTurnIndex];
        const isMyTurn = isOffline || currentPlayer?.id === socket.id;

        if (!isMyTurn) {
            console.log('Not your turn!');
            return;
        }

        socket.emit('bomba:reveal', { roomCode, cellIndex });
    };

    const handleTargetSelect = (targetPlayerId) => {
        socket.emit('bomba:selectTarget', { roomCode, targetPlayerId });
        setShowTargetModal(false);
    };

    const handleRestart = () => {
        if (window.confirm('¿Seguro que quieres reiniciar la partida?')) {
            socket.emit('bomba:restart', roomCode);
        }
    };

    if (!gameState) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-gray-900 text-white">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-red-500 mx-auto mb-4"></div>
                    <p className="text-xl">Cargando La Bomba...</p>
                </div>
            </div>
        );
    }

    const gridSize = gameState.gridSize || 4;
    const currentPlayer = gameState.players[gameState.currentTurnIndex];
    const isMyTurn = isOffline || currentPlayer?.id === socket.id;

    return (
        <div className="flex flex-col items-center min-h-screen bg-gradient-to-br from-gray-900 via-red-900/20 to-gray-900 text-white p-4">
            {/* Header */}
            <div className="w-full max-w-4xl mb-4 flex justify-between items-center">
                <button
                    onClick={() => navigate(`/lobby/${roomCode}`)}
                    className="text-gray-400 hover:text-white flex items-center gap-1"
                >
                    <span>⬅</span> Volver al Lobby
                </button>
                <h1 className="text-3xl font-bold text-red-500">💣 La Bomba</h1>
                <div className="flex gap-2">
                    <button
                        onClick={handleRestart}
                        className="bg-yellow-600/20 text-yellow-500 hover:bg-yellow-600/40 px-3 py-1 rounded-lg text-sm font-bold border border-yellow-500/50 transition-all"
                    >
                        🔄 Reiniciar
                    </button>
                    <button
                        onClick={() => socket.emit('bomba:requestState', roomCode)}
                        className="text-blue-400 hover:text-blue-300 p-2 bg-gray-800 rounded-lg border border-gray-700"
                        title="Refrescar estado"
                    >
                        🔄
                    </button>
                </div>
            </div>

            {/* HUD */}
            <BombaHUD
                gameState={gameState}
                currentPlayer={currentPlayer}
                isMyTurn={isMyTurn}
            />

            {/* Grid */}
            <div
                className="grid gap-2 mb-8"
                style={{
                    gridTemplateColumns: `repeat(${gridSize}, minmax(0, 1fr))`,
                    maxWidth: '600px',
                    width: '100%'
                }}
            >
                {Array.from({ length: gridSize * gridSize }).map((_, index) => {
                    const cellData = gameState.cells[index];
                    const isRevealed = gameState.revealedCells.includes(index);

                    return (
                        <BombaCell
                            key={index}
                            index={index}
                            content={cellData}
                            revealed={isRevealed}
                            onClick={() => handleCellClick(index)}
                            disabled={!isMyTurn || gameState.waitingForTarget}
                        />
                    );
                })}
            </div>

            {/* Game Over */}
            {gameState.gameOver && (
                <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
                    <div className="bg-gray-800 p-8 rounded-3xl text-center max-w-md w-full border-2 border-red-500 shadow-2xl shadow-red-500/20">
                        <div className="text-6xl mb-4 animate-bounce">💥</div>
                        <h2 className="text-4xl font-black mb-2 text-red-500 tracking-tighter">¡BOOM!</h2>

                        {/* Final Drink Info */}
                        <div className="bg-red-900/40 p-6 rounded-2xl mb-6 border border-red-500/30">
                            <p className="text-gray-300 text-sm mb-1 uppercase tracking-widest font-bold">Total a beber:</p>
                            <p className="text-5xl font-black text-white mb-2">
                                {gameState.history[gameState.history.length - 1]?.bombEffect?.amount || gameState.drinkCounter} tragos
                            </p>
                            <div className="h-px bg-red-500/20 w-16 mx-auto mb-3"></div>
                            <p className="text-xl text-yellow-400 font-bold italic">
                                {gameState.history[gameState.history.length - 1]?.content?.description || '¡A beber!'}
                            </p>
                            {gameState.history[gameState.history.length - 1]?.bombEffect?.target && (
                                <p className="text-white mt-2">
                                    Objetivo: <span className="text-red-400 font-bold">{gameState.history[gameState.history.length - 1].bombEffect.target}</span>
                                </p>
                            )}
                        </div>

                        <div className="flex flex-col gap-3">
                            <button
                                onClick={() => socket.emit('bomba:restart', roomCode)}
                                className="bg-yellow-600 hover:bg-yellow-700 px-6 py-4 rounded-xl font-bold text-white transition-all transform hover:scale-105 shadow-lg shadow-yellow-900/40 flex items-center justify-center gap-2"
                            >
                                🔄 Jugar de nuevo
                            </button>
                            <button
                                onClick={() => navigate(`/lobby/${roomCode}`)}
                                className="bg-gray-700 hover:bg-gray-600 px-6 py-3 rounded-xl font-bold text-gray-300 transition-all"
                            >
                                Volver al Lobby
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Sniper Target Selection Modal */}
            {showTargetModal && (
                <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
                    <div className="bg-gray-800 p-8 rounded-2xl max-w-md">
                        <h2 className="text-2xl font-bold mb-4 text-center text-yellow-500">
                            🎯 El Francotirador
                        </h2>
                        <p className="text-center mb-6">
                            ¡Elige quién debe beber <span className="text-red-500 font-bold">{gameState.drinkCounter}</span> tragos!
                        </p>
                        <div className="grid grid-cols-2 gap-3">
                            {gameState.players
                                .filter(p => p.id !== socket.id)
                                .map(player => (
                                    <button
                                        key={player.id}
                                        onClick={() => handleTargetSelect(player.id)}
                                        className="bg-red-600 hover:bg-red-700 p-4 rounded-xl font-bold transition"
                                    >
                                        {player.name}
                                    </button>
                                ))
                            }
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Bomba;
