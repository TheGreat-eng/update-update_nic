import { useEffect } from 'react';
import type { Client, StompSubscription } from '@stomp/stompjs';
import { useWebSocket } from '../context/WebSocketContext';

interface StompCallbacks {
    onConnect?: (client: Client) => StompSubscription | void | (() => void);
}

export const useStomp = (
    topicId: number | string | null,
    type: 'farm' | 'user' = 'farm',
    callbacks?: StompCallbacks
) => {
    const { client, isConnected } = useWebSocket();

    useEffect(() => {
        // Chỉ chạy khi đã kết nối và có topicId
        if (!isConnected || !client || !topicId || !callbacks?.onConnect) {
            return;
        }

        console.log(`🔗 [useStomp] Subscribing for ${type} ${topicId} using shared connection...`);

        // Gọi callback onConnect để component tự thực hiện subscribe
        // Component sẽ nhận được 'client' chung và tự gọi client.subscribe()
        const result = callbacks.onConnect(client);

        // Cleanup function
        return () => {
            console.log(`🔌 [useStomp] Cleaning up subscription for ${type} ${topicId}`);
            if (result) {
                if (typeof result === 'function') {
                    result();
                } else if ('unsubscribe' in result) {
                    result.unsubscribe();
                }
            }
        };
    }, [isConnected, client, topicId, callbacks]); // callbacks nên được memoize ở component cha nếu có thể
};