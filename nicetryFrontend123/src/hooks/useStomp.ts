// src/hooks/useStomp.ts (REFACTORED VERSION)
import { useEffect, useRef } from 'react';
import { Client, type StompSubscription } from '@stomp/stompjs';
import SockJS from 'sockjs-client';
import { getAuthToken } from '../utils/auth';

const WS_URL = import.meta.env.VITE_WS_URL || 'http://localhost:8080/ws';

interface StompCallbacks {
    onConnect?: (client: Client) => StompSubscription | void | (() => void);
}

export const useStomp = (
    topicId: number | string | null,
    type: 'farm' | 'user' = 'farm',
    callbacks?: StompCallbacks
) => {
    const clientRef = useRef<Client | null>(null);

    useEffect(() => {
        if (!topicId) {
            console.warn(`STOMP: No ${type}Id, connection skipped.`);
            return;
        }

        const token = getAuthToken();
        if (!token) {
            console.warn('STOMP: No auth token, connection skipped.');
            return;
        }

        console.log(`STOMP: Initializing for ${type} ${topicId}...`);

        const client = new Client({
            webSocketFactory: () => new SockJS(WS_URL),
            connectHeaders: { Authorization: `Bearer ${token}` },
            reconnectDelay: 5000,
        });

        clientRef.current = client;

        let cleanupFunction: (() => void) | StompSubscription | void;

        client.onConnect = () => {
            console.log(` STOMP: Connected for ${type} ${topicId}.`);
            if (callbacks?.onConnect) {
                cleanupFunction = callbacks.onConnect(client);
            }
        };

        client.onStompError = (frame) => {
            console.error(' STOMP Error:', frame.headers['message'], frame.body);
        };

        client.activate();

        return () => {
            console.log(`STOMP: Deactivating for ${type} ${topicId}...`);
            if (typeof cleanupFunction === 'function') {
                cleanupFunction();
            } else if (cleanupFunction && 'unsubscribe' in cleanupFunction) {
                cleanupFunction.unsubscribe();
            }
            client.deactivate();
        };
    }, [topicId, type, callbacks]); // callbacks nên là một dependency ổn định
};