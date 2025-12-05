import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import { Client } from '@stomp/stompjs';
import SockJS from 'sockjs-client';
import { getAuthToken, isAuthenticated } from '../utils/auth';

interface WebSocketContextType {
    client: Client | null;
    isConnected: boolean;
}

const WebSocketContext = createContext<WebSocketContextType | undefined>(undefined);

export const WebSocketProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [client, setClient] = useState<Client | null>(null);
    const [isConnected, setIsConnected] = useState(false);
    const clientRef = useRef<Client | null>(null);

    useEffect(() => {
        // Hàm khởi tạo kết nối
        const connect = () => {
            const token = getAuthToken();
            // Chỉ kết nối nếu có token (đã đăng nhập)
            if (!token) return;

            // Nếu đã có client đang chạy, không tạo mới
            if (clientRef.current && clientRef.current.active) return;

            const wsUrl = import.meta.env.VITE_WS_URL || 'http://localhost:8080/ws';
            console.log('🔌 [WS Context] Initializing Singleton Connection...');

            const stompClient = new Client({
                webSocketFactory: () => new SockJS(wsUrl),
                connectHeaders: { Authorization: `Bearer ${token}` },
                reconnectDelay: 5000, // Tự động reconnect sau 5s nếu mất mạng
                heartbeatIncoming: 4000,
                heartbeatOutgoing: 4000,
                onConnect: () => {
                    console.log('✅ [WS Context] Connected successfully!');
                    setIsConnected(true);
                },
                onStompError: (frame) => {
                    console.error(' [WS Context] Broker reported error: ' + frame.headers['message']);
                },
                onWebSocketClose: () => {
                    console.log('⚠️ [WS Context] Connection closed.');
                    setIsConnected(false);
                }
            });

            stompClient.activate();
            clientRef.current = stompClient;
            setClient(stompClient);
        };

        const disconnect = () => {
            if (clientRef.current) {
                console.log(' [WS Context] Deactivating connection...');
                clientRef.current.deactivate();
                clientRef.current = null;
                setClient(null);
                setIsConnected(false);
            }
        };

        // Kết nối lần đầu
        if (isAuthenticated()) {
            connect();
        }

        // Lắng nghe sự kiện storage (logout từ tab khác) hoặc custom event 'auth-change'
        const handleAuthChange = () => {
            if (isAuthenticated()) {
                connect();
            } else {
                disconnect();
            }
        };

        window.addEventListener('storage', handleAuthChange);
        // Bạn có thể dispatch event này từ auth utils khi login/logout
        window.addEventListener('auth-change', handleAuthChange);

        return () => {
            window.removeEventListener('storage', handleAuthChange);
            window.removeEventListener('auth-change', handleAuthChange);
            disconnect();
        };
    }, []);

    return (
        <WebSocketContext.Provider value={{ client, isConnected }}>
            {children}
        </WebSocketContext.Provider>
    );
};

export const useWebSocket = () => {
    const context = useContext(WebSocketContext);
    if (!context) {
        throw new Error('useWebSocket must be used within a WebSocketProvider');
    }
    return context;
};