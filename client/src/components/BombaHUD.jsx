import React from 'react';

const BombaHUD = ({ gameState, currentPlayer, isMyTurn }) => {
    if (!gameState) return null;

    const lastAction = gameState.history[gameState.history.length - 1];

    return (
        <div className="w-full max-w-4xl mb-6 space-y-4">
            {/* Drink Counter - Big and Prominent */}
            <div className="bg-[#1a0000] p-6 rounded-2xl text-center border-b border-bomba/30">
                <p className="text-xs tracking-widest uppercase text-neutral-500 mb-1">Tragos Acumulados</p>
                <p className="font-display text-7xl text-white">
                    {gameState.drinkCounter}
                </p>
            </div>

            {/* Current Turn */}
            <div className="bg-black/40 p-4 rounded-xl text-center border-b border-bomba/30">
                <p className="text-xs tracking-widest uppercase text-neutral-500 mb-1">
                    {isMyTurn ? 'ES TU TURNO' : `TURNO DE ${currentPlayer?.name?.toUpperCase() || ''}`}
                </p>
                <p className={`font-display text-2xl ${isMyTurn ? 'text-bomba' : 'text-white'}`}>
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
                <div className="flex-1 bg-black/40 p-3 rounded-xl">
                    <p className="text-xs text-neutral-600 uppercase tracking-widest">Reveladas</p>
                    <p className="text-xl font-bold text-neutral-400">
                        {gameState.revealedCells.length} / {gameState.totalSquares || 16}
                    </p>
                </div>
                <div className="flex-1 bg-black/40 p-3 rounded-xl">
                    <p className="text-xs text-neutral-600 uppercase tracking-widest">Bombas</p>
                    <p className="text-xl font-bold text-neutral-400">
                        💣 {gameState.bombsRevealed}
                    </p>
                </div>
            </div>

            {/* Last Action */}
            {lastAction && (
                <div className="bg-black/40 p-3 rounded-xl text-sm">
                    <p className="text-neutral-400 text-center">
                        <span className="font-bold text-white">{lastAction.player}</span> reveló:{' '}
                        <span className="text-yellow-400">{lastAction.content.description}</span>
                        {lastAction.bombEffect && (
                            <span className="block mt-1 text-bomba">
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
