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
        <div className="flex flex-col items-center min-h-screen bg-gray-900 text-white p-4">
            <h1 className="text-3xl font-bold mb-6 text-transparent bg-clip-text bg-gradient-to-r from-green-400 to-blue-500">
                Modo Offline 🏠
            </h1>

            <div className="w-full max-w-md bg-gray-800 p-6 rounded-xl shadow-lg border border-gray-700">
                <form onSubmit={addPlayer} className="mb-6">
                    <label className="block text-sm font-bold text-gray-400 mb-2">Añadir Jugador ({players.length}/20)</label>
                    <div className="flex gap-2">
                        <input
                            type="text"
                            className="flex-1 bg-gray-900 border border-gray-600 rounded px-4 py-2 focus:outline-none focus:border-green-500"
                            placeholder="Nombre..."
                            value={currentName}
                            onChange={(e) => setCurrentName(e.target.value)}
                            autoFocus
                        />
                        <button
                            type="submit"
                            disabled={players.length >= 20}
                            className="bg-green-600 hover:bg-green-700 px-4 py-2 rounded font-bold disabled:opacity-50"
                        >
                            +
                        </button>
                    </div>
                </form>

                <div className="space-y-2 mb-6 max-h-60 overflow-y-auto">
                    {players.map((p, i) => (
                        <div key={i} className="flex justify-between items-center bg-gray-700 p-3 rounded">
                            <span className="font-medium">{i + 1}. {p}</span>
                            <button onClick={() => removePlayer(i)} className="text-red-400 hover:text-red-300">✕</button>
                        </div>
                    ))}
                    {players.length === 0 && <p className="text-center text-gray-500 italic">No hay jugadores</p>}
                </div>

                <button
                    onClick={startGame}
                    disabled={players.length < 2}
                    className="w-full bg-blue-600 hover:bg-blue-700 p-3 rounded-lg font-bold text-lg transition disabled:opacity-50 flex justify-center items-center gap-2"
                >
                    🚀 Empezar Partida
                </button>

                <button onClick={() => navigate('/')} className="w-full mt-4 text-gray-400 hover:text-white text-sm">
                    Cancelar
                </button>
            </div>
        </div>
    );
}
