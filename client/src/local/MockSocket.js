
import { initializeLocalServer } from './LocalServer';

export class MockSocket {
    constructor() {
        this.id = 'local-player-0'; // Matches the host ID in LocalServer
        this.connected = true;
        this.listeners = new Map(); // event -> Set(callbacks)

        // Initialize the local server and pass a callback to receive events FROM the server
        this.server = initializeLocalServer((event, payload) => {
            this.trigger(event, payload);
        });

        // Simulate connect event
        setTimeout(() => this.trigger('connect'), 10);
    }

    // Client listens to event
    on(event, callback) {
        if (!this.listeners.has(event)) {
            this.listeners.set(event, new Set());
        }
        this.listeners.get(event).add(callback);
    }

    // Client stops listening
    off(event, callback) {
        if (this.listeners.has(event)) {
            if (callback) {
                this.listeners.get(event).delete(callback);
            } else {
                this.listeners.delete(event); // Remove all if no callback specified (socket.io behavior varies but this is safe)
            }
        }
    }

    // Client emits event to server
    emit(event, payload) {
        console.log(`[MockSocket] Emit: ${event}`, payload);
        // Simulate network delay? Nah, instant is fine.
        setTimeout(() => {
            this.server.handleEvent(event, payload);
        }, 0);
    }

    // Trigger event FROM server TO client
    trigger(event, payload) {
        console.log(`[MockSocket] Trigger: ${event}`, payload);
        if (this.listeners.has(event)) {
            this.listeners.get(event).forEach(cb => cb(payload));
        }
    }

    close() {
        this.connected = false;
        this.listeners.clear();
    }
}
