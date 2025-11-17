// src/components/dashboard/SensorDataChart.tsx
import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, Spin, Empty, Alert, Typography } from 'antd';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { getAggregatedData } from '../../api/reportService'; // Sử dụng API đã có
import type { SensorDataDTO } from '../../types/api'; // Sử dụng DTO từ backend

const { Text } = Typography;

interface SensorDataChartProps {
    title: string;
    deviceId: string;
    field: string; // 'temperature', 'humidity', 'soil_moisture'
    unit: string;
    color: string;
}

const SensorDataChart: React.FC<SensorDataChartProps> = ({ title, deviceId, field, unit, color }) => {
    const { data: chartData, isLoading, isError, error } = useQuery<SensorDataDTO[]>({
        queryKey: ['chartData', deviceId, field],
        queryFn: () => getAggregatedData(deviceId, field, 'mean', '10m'), // Lấy data trung bình mỗi 10 phút
        enabled: !!deviceId,
        refetchInterval: 60000, // Cập nhật chart mỗi phút
    });

    const formattedData = chartData?.map(item => ({
        // Hiển thị giờ:phút
        time: new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        value: item.avgValue,
    }));

    const renderChart = () => {
        if (isLoading) {
            return <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 250 }}><Spin /></div>;
        }
        if (isError) {
            return <Alert message="Lỗi tải dữ liệu biểu đồ" description={error.message} type="error" />;
        }
        if (!formattedData || formattedData.length === 0) {
            return <Empty description="Không có dữ liệu trong 7 ngày qua" style={{ height: 250, display: 'flex', flexDirection: 'column', justifyContent: 'center' }} />;
        }

        return (
            <ResponsiveContainer width="100%" height={250}>
                <LineChart data={formattedData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="time" fontSize={12} />
                    <YAxis
                        domain={['dataMin - 1', 'dataMax + 1']}
                        tickFormatter={(value) => `${value}${unit}`}
                        fontSize={12}
                    />
                    <Tooltip formatter={(value: number) => [`${value.toFixed(1)} ${unit}`, title]} />
                    <Legend />
                    <Line type="monotone" dataKey="value" name={title} stroke={color} strokeWidth={2} dot={false} />
                </LineChart>
            </ResponsiveContainer>
        );
    };

    return (
        <Card title={title}>
            <Text type="secondary" style={{ display: 'block', marginBottom: 16 }}>
                Dữ liệu trung bình mỗi 10 phút. Thiết bị: <Text code>{deviceId}</Text>
            </Text>
            {renderChart()}
        </Card>
    );
};

export default SensorDataChart;