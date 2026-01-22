import React from 'react';

const BombaCell = ({ index, content, revealed, onClick, disabled }) => {
    const getCellIcon = () => {
        if (!revealed || !content) return '?';

        const { category, type } = content;

        if (category === 'BOMB') {
            switch (type) {
                case 'BOMB_MARTYR': return '💀';
                case 'BOMB_SNIPER': return '🎯';
                case 'BOMB_GRENADE': return '💣';
                case 'BOMB_NUKE': return '☢️';
                default: return '💥';
            }
        }

        if (category === 'MODIFIER') {
            switch (type) {
                case 'ADD_1': return '+1';
                case 'ADD_2': return '+2';
                case 'ADD_3': return '+3';
                case 'MULT_2': return 'x2';
                case 'MULT_3': return 'x3';
                case 'DIV_2': return '÷2';
                default: return '?';
            }
        }

        if (category === 'SPECIAL') {
            switch (type) {
                case 'SAFE': return '✅';
                case 'REVERSE': return '🔄';
                default: return '⭐';
            }
        }

        return '?';
    };

    const getCellColor = () => {
        if (!revealed || !content) return 'from-gray-700 to-gray-800';

        const { category, type } = content;

        if (category === 'BOMB') {
            return 'from-red-600 to-red-800';
        }

        if (category === 'MODIFIER') {
            if (type.startsWith('ADD') || type.startsWith('MULT')) {
                return 'from-yellow-600 to-orange-600';
            }
            return 'from-blue-600 to-blue-800';
        }

        if (category === 'SPECIAL') {
            return 'from-green-600 to-green-800';
        }

        return 'from-gray-600 to-gray-700';
    };

    return (
        <button
            onClick={onClick}
            disabled={disabled || revealed}
            className={`
                aspect-square rounded-xl font-bold text-2xl
                transition-all duration-300 transform
                ${revealed ? 'scale-100' : 'scale-95 hover:scale-100'}
                ${disabled && !revealed ? 'cursor-not-allowed opacity-50' : ''}
                ${!revealed && !disabled ? 'hover:shadow-lg hover:shadow-white/20' : ''}
                relative overflow-hidden
            `}
            style={{
                perspective: '1000px'
            }}
        >
            <div
                className={`
                    absolute inset-0 bg-gradient-to-br ${getCellColor()}
                    flex items-center justify-center
                    ${revealed ? 'animate-flip' : ''}
                `}
            >
                <span className={revealed ? 'text-3xl' : 'text-4xl opacity-30'}>
                    {getCellIcon()}
                </span>
            </div>

            {/* Shine effect on unrevealed */}
            {!revealed && (
                <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent pointer-events-none" />
            )}
        </button>
    );
};

export default BombaCell;
