// src/pages/SettingsPage.tsx
import React from 'react';
import { Card, Typography, Switch, Space, Divider } from 'antd';
import { useTheme } from '../context/ThemeContext';

const { Title, Text } = Typography;

const SettingsPage: React.FC = () => {
    const { isDark, toggleTheme } = useTheme();

    return (
        <div>
            <Title level={2} style={{ marginBottom: 24 }}>Cài đặt</Title>
            <Card>
                <Title level={4}>Giao diện</Title>
                <Space align="center" style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Text>Chế độ tối (Dark Mode)</Text>
                    <Switch checked={isDark} onChange={toggleTheme} />
                </Space>
                <Divider />
                <Title level={4}>Thông báo</Title>
                <Space align="center" style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Text>Nhận thông báo qua Email</Text>
                    <Switch />
                </Space>
            </Card>
        </div>
    );
};

export default SettingsPage;