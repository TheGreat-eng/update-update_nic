import React, { useEffect, useState } from 'react';
import { Alert } from 'antd';
import { WifiOutlined } from '@ant-design/icons';

const NetworkStatus: React.FC = () => {
    const [isOnline, setIsOnline] = useState(navigator.onLine);

    useEffect(() => {
        const handleOnline = () => setIsOnline(true);
        const handleOffline = () => setIsOnline(false);

        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);

        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
        };
    }, []);

    if (isOnline) return null;

    return (
        <Alert
            message="Mất kết nối mạng"
            description="Đang cố gắng kết nối lại..."
            type="warning"
            icon={<WifiOutlined />}
            banner
            closable={false}
            style={{
                position: 'fixed',
                top: 0,
                left: 0,
                right: 0,
                zIndex: 9999
            }}
        />
    );
};

export default NetworkStatus;