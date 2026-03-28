import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSocket } from '../contexts/SocketContext';

export default function OfflineSetup() {
    const [players, setPlayers] = useState([]);
    const [currentName, setCurrentName] = useState('');
    const { enableOfflineMode, socket, isOffline } = useSocket();
    const navigate = useNavigate();

    // Enable offline mode on mount if not already
    useEffect(() => {
        if (!isOffline) {
            enableOfflineMode();
        }
    }, [isOffline, enableOfflineMode]);

    // Handle room updates to navigate
    useEffect(() => {
        if (!socket) return;

        const handleRoomUpdated = (room) => {
            // In offline mode, roomUpdated means we are ready
            // We can check if we have players to be sure
            if (room.players.length > 0) {
                navigate(`/lobby/${room.code}`);
            }
        };

        socket.on('roomUpdated', handleRoomUpdated);
        // We also listen for roomCreated because MockServer emits that on first "create"
        socket.on('roomCreated', handleRoomUpdated);

        return () => {
            socket.off('roomUpdated', handleRoomUpdated);
            socket.off('roomCreated', handleRoomUpdated);
        };
    }, [socket, navigate]);


    const addPlayer = (e) => {
        e.preventDefault();
        if (!currentName.trim()) return;
        if (players.length >= 20) return alert('Máximo 20 jugadores');
        setPlayers([...players, currentName.trim()]);
        setCurrentName('');
    }

    const removePlayer = (index) => {
        const newPlayers = [...players];
        newPlayers.splice(index, 1);
        setPlayers(newPlayers);
    }

    const startGame = () => {
        if (players.length < 2) return alert('Mínimo 2 jugadores');

        // Initialize the local room atomically
        console.log('Starting offline game with players:', players);
        socket.emit('offline:start', players);
    }

    return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-[#111] text-white p-4">
            <div className="w-full max-w-xs flex flex-col items-center">

                {/* Title */}
                <h1 className="font-display text-7xl leading-none tracking-tight text-white text-center">
                    OFFLINE
                </h1>
                <p className="text-xs tracking-[6px] uppercase text-neutral-500 mt-2 mb-10">
                    MODO SIN INTERNET
                </p>

                {/* Add player form */}
                <div className="w-full">
                    <form onSubmit={addPlayer} className="mb-8">
                        <label className="text-xs tracking-widest uppercase text-neutral-500 block mb-1">
                            Añadir jugador ({players.length}/20)
                        </label>
                        <div className="flex items-end gap-4">
                            <input
                                type="text"
                                className="bg-transparent border-0 border-b border-neutral-700 focus:border-white focus:outline-none text-white text-lg flex-1 pb-2 transition-colors"
                                placeholder="Nombre..."
                                value={currentName}
                                onChange={(e) => setCurrentName(e.target.value)}
                                autoFocus
                            />
                            <button
                                type="submit"
                                disabled={players.length >= 20}
                                className="bg-white text-[#111] font-display tracking-widest text-sm py-2 px-4 rounded hover:bg-neutral-200 transition-colors disabled:opacity-30"
                            >
                                +
                            </button>
                        </div>
                    </form>

                    {/* Players list */}
                    <div className="mb-8">
                        {players.length === 0 && (
                            <p className="text-neutral-600 text-sm text-center">Ningún jugador añadido</p>
                        )}
                        <div className="flex flex-wrap gap-2">
                            {players.map((p, i) => (
                                <div
                                    key={i}
                                    className="border border-neutral-700 text-neutral-400 text-sm px-3 py-1 rounded-sm inline-flex items-center gap-2"
                                >
                                    <span>{p}</span>
                                    <button
                                        onClick={() => removePlayer(i)}
                                        className="text-neutral-600 hover:text-white transition-colors leading-none"
                                    >
                                        ✕
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Start button */}
                    <button
                        onClick={startGame}
                        disabled={players.length < 2}
                        className="bg-white text-[#111] font-display tracking-widest text-lg py-3 px-6 w-full rounded hover:bg-neutral-200 transition-colors disabled:opacity-30"
                    >
                        EMPEZAR
                    </button>

                    {/* Back */}
                    <button
                        onClick={() => navigate('/')}
                        className="text-neutral-500 hover:text-white text-sm transition-colors mt-4 block text-center underline-offset-4 hover:underline w-full"
                    >
                        Cancelar
                    </button>
                </div>
            </div>
        </div>
    );
}
