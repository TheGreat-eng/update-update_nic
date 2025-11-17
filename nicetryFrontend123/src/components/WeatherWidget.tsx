// src/components/WeatherWidget.tsx
import React, { useEffect, useState } from 'react';
import { Card, Spin, Typography, List, Alert } from 'antd';
import api from '../api/axiosConfig';
import { useFarm } from '../context/FarmContext';

interface WeatherData {
    location: string;
    temperature: number;
    description: string;
    iconUrl: string;
    forecast: Array<{
        dateTime: string;
        temperature: number;
        description: string;
        iconUrl: string;
    }>;
}

const WeatherWidget: React.FC = () => {
    const { farmId } = useFarm(); // ✅ Dùng Context
    const [weather, setWeather] = useState<WeatherData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchWeather = async () => {
            try {
                setLoading(true);
                const res = await api.get<{ data: WeatherData }>(`/weather/forecast?farmId=${farmId}`);
                setWeather(res.data.data);
                setError(null);
            } catch (err) {
                console.error('Failed to fetch weather:', err);
                setError('Không thể tải dữ liệu thời tiết');
            } finally {
                setLoading(false);
            }
        };
        fetchWeather();
    }, [farmId]);

    if (loading) return <Card><Spin tip="Đang tải thời tiết..." /></Card>;
    if (error) return <Card><Alert message={error} type="warning" showIcon /></Card>;
    if (!weather) return <Card>Không có dữ liệu thời tiết.</Card>;

    return (
        <Card title={`Thời tiết tại ${weather.location}`}>
            <div style={{ display: 'flex', alignItems: 'center', marginBottom: 16 }}>
                <img src={weather.iconUrl} alt={weather.description} style={{ width: 64, height: 64 }} />
                <div style={{ marginLeft: 16 }}>
                    <Typography.Title level={3}>{weather.temperature}°C</Typography.Title>
                    <Typography.Text>{weather.description}</Typography.Text>
                </div>
            </div>
            <List
                header={<div>Dự báo 24 giờ tới</div>}
                dataSource={weather.forecast.slice(0, 5)} // Lấy 5 mốc dự báo gần nhất
                renderItem={(item: any) => (
                    <List.Item>
                        <List.Item.Meta
                            avatar={<img src={item.iconUrl} alt={item.description} style={{ width: 32 }} />}
                            title={`${new Date(item.dateTime).getHours()}:00 - ${item.temperature}°C`}
                            description={item.description}
                        />
                    </List.Item>
                )}
            />
        </Card>
    );
};
export default WeatherWidget;