import React, { createContext, useContext, useEffect, useState } from 'react';
import { io } from 'socket.io-client';

const SocketContext = createContext();

export const useSocket = () => useContext(SocketContext);

// En produccion usar la URL real
const SOCKET_URL = 'http://localhost:3001';

import { MockSocket } from '../local/MockSocket';

export const SocketProvider = ({ children }) => {
    const [socket, setSocket] = useState(null);
    const [room, setRoom] = useState(null);
    const [player, setPlayer] = useState(null);
    const [isOffline, setIsOffline] = useState(false);

    useEffect(() => {
        let newSocket;

        if (isOffline) {
            console.log('Initializing Offline Mode...');
            newSocket = new MockSocket();
        } else {
            console.log('Connecting to Online Server...');
            newSocket = io(SOCKET_URL);
        }

        setSocket(newSocket);

        newSocket.on('roomCreated', (roomData) => {
            setRoom(roomData);
            setPlayer(roomData.players[0]);
            // Save session (only if online maybe? or both for reload?)
            // For offline, reload might reset state if we don't persist LocalServer.
            // Let's persist session for now.
            sessionStorage.setItem('party_session', JSON.stringify({
                roomCode: roomData.code,
                playerName: roomData.players[0].name,
                isOffline: isOffline
            }));
        });

        newSocket.on('roomUpdated', (roomData) => {
            setRoom(roomData);
        });

        newSocket.on('gameStarted', (gameType) => {
            // Update room game type if needed
            setRoom(prev => prev ? { ...prev, game: gameType } : null);
        });

        newSocket.on('connect', () => {
            // If we have a saved session, try to rejoin automatically on reconnect
            const stored = sessionStorage.getItem('party_session');
            if (stored) {
                const { roomCode, playerName, isOffline: storedOffline } = JSON.parse(stored);

                // If we were offline and now we are online (or vice versa), this might be tricky.
                // But typically we stay in the same mode unless user changed it.
                // If we are booting up and finding a session:

                if (storedOffline && !isOffline) {
                    // We found an offline session but we initialized as online default.
                    // We should probably switch mode? 
                    // But simpler: just ignore offline session if we are online default. 
                    // Or let the Home component handle restoring mode.
                    return;
                }

                if (!isOffline) {
                    console.log(`[Socket] Reconnecting to ${roomCode} as ${playerName}`);
                    newSocket.emit('joinRoom', { roomCode, playerName });
                }
            }
        });

        return () => newSocket.close();
    }, [isOffline]);

    // Keep-alive ping to prevent server sleep on Render free tier
    useEffect(() => {
        const pingInterval = setInterval(() => {
            // Only ping if we have an active socket connection
            if (socket && socket.connected) {
                fetch('/ping').catch(() => {
                    // Silently ignore errors (server might be restarting)
                });
            }
        }, 10 * 60 * 1000); // 10 minutes

        return () => clearInterval(pingInterval);
    }, [socket]);

    const enableOfflineMode = () => {
        setIsOffline(true);
    };

    const value = {
        socket,
        room,
        setRoom,
        player,
        setPlayer,
        isOffline,
        enableOfflineMode
    };

    return (
        <SocketContext.Provider value={value}>
            {children}
        </SocketContext.Provider>
    );
};
