import React from 'react';

const BombaHUD = ({ gameState, currentPlayer, isMyTurn }) => {
    if (!gameState) return null;

    const lastAction = gameState.history[gameState.history.length - 1];

    return (
        <div className="w-full max-w-4xl mb-6 space-y-4">
            {/* Drink Counter - Big and Prominent */}
            <div className="bg-gradient-to-r from-purple-900 to-pink-900 p-6 rounded-2xl text-center border-2 border-purple-500 shadow-lg shadow-purple-500/50">
                <p className="text-sm text-gray-300 mb-1">Tragos Acumulados</p>
                <p className="text-6xl font-black text-white drop-shadow-lg animate-pulse">
                    {gameState.drinkCounter}
                </p>
            </div>

            {/* Current Turn */}
            <div className="bg-gray-800 p-4 rounded-xl text-center border border-gray-700">
                <p className="text-sm text-gray-400 mb-1">Turno de:</p>
                <p className={`text-2xl font-bold ${isMyTurn ? 'text-green-400 animate-pulse' : 'text-white'}`}>
                    {currentPlayer?.name || 'Cargando...'}
                    {isMyTurn && ' 👈'}
                </p>
                {gameState.waitingForTarget && (
                    <p className="text-yellow-400 text-sm mt-2 animate-bounce">
                        ⏳ Esperando selección de objetivo...
                    </p>
                )}
            </div>

            {/* Game Info */}
            <div className="flex gap-4 text-center">
                <div className="flex-1 bg-gray-800 p-3 rounded-xl border border-gray-700">
                    <p className="text-xs text-gray-400">Casillas Reveladas</p>
                    <p className="text-xl font-bold text-blue-400">
                        {gameState.revealedCells.length} / {gameState.players.length > 0 ? Object.keys(gameState.cells).length || (Math.pow(Math.sqrt(16), 2)) : 16}
                    </p>
                </div>
                <div className="flex-1 bg-gray-800 p-3 rounded-xl border border-gray-700">
                    <p className="text-xs text-gray-400">Bombas Encontradas</p>
                    <p className="text-xl font-bold text-red-400">
                        💣 {gameState.bombsRevealed}
                    </p>
                </div>
            </div>

            {/* Last Action */}
            {lastAction && (
                <div className="bg-gray-800/50 p-3 rounded-xl border border-gray-700 text-sm">
                    <p className="text-gray-400 text-center">
                        <span className="font-bold text-white">{lastAction.player}</span> reveló:{' '}
                        <span className="text-yellow-400">{lastAction.content.description}</span>
                        {lastAction.bombEffect && (
                            <span className="block mt-1 text-red-400">
                                💥 {lastAction.bombEffect.type === 'BOMB_SNIPER'
                                    ? `${lastAction.bombEffect.target} bebe ${lastAction.bombEffect.amount} 🍺`
                                    : `${lastAction.bombEffect.amount} tragos!`
                                }
                            </span>
                        )}
                    </p>
                </div>
            )}
        </div>
    );
};

export default BombaHUD;
