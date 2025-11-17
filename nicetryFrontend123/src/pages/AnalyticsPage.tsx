// src/pages/AnalyticsPage.tsx
import React, { useMemo, useState } from 'react';
import { Card, DatePicker, Select, Spin, Empty, Row, Col, Typography } from 'antd';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { useQuery } from '@tanstack/react-query';
import dayjs from 'dayjs';

// API & Types
import { useFarm } from '../context/FarmContext';
import { getDevicesByFarm } from '../api/deviceService';
import { getHistoricalData } from '../api/analyticsService';
import type { SensorDataDTO } from '../types/api'; // DÙNG TYPE NÀY
import type { Device } from '../types/device';   // DÙNG TYPE NÀY

// Constants
import { COLORS } from '../constants/colors';

const { RangePicker } = DatePicker;
const { Text } = Typography;

const AnalyticsPage: React.FC = () => {
    const { farmId } = useFarm();
    const [selectedDevices, setSelectedDevices] = useState<string[]>([]);
    const [selectedFields, setSelectedFields] = useState<string[]>([]);
    const [timeRange, setTimeRange] = useState<[dayjs.Dayjs, dayjs.Dayjs]>([dayjs().subtract(7, 'day'), dayjs()]);

    // Fetch danh sách thiết bị để chọn
    const { data: devicesResponse } = useQuery({
        queryKey: ['devices', farmId],
        queryFn: () => getDevicesByFarm(farmId!),
        enabled: !!farmId,
    });

    // VVVV--- SỬA LẠI HOÀN TOÀN LOGIC NÀY CHO ĐÚNG ---VVVV
    const devices = useMemo((): Device[] => {
        // `devicesResponse` là toàn bộ phản hồi từ axios
        // `devicesResponse.data` là đối tượng { success, data }
        // `devicesResponse.data.data` mới là mảng Device[] chúng ta cần
        return devicesResponse?.data?.data || [];
    }, [devicesResponse]);
    // ^^^^--------------------------------------------^^^^

    // Fetch dữ liệu lịch sử
    const { data: chartData, isLoading, isFetching } = useQuery({
        queryKey: ['analytics', selectedDevices, selectedFields, timeRange],
        queryFn: () => getHistoricalData({
            deviceIds: selectedDevices,
            fields: selectedFields,
            start: timeRange[0].toISOString(),
            end: timeRange[1].toISOString(),
            window: '1h'
        }),
        enabled: selectedDevices.length > 0 && selectedFields.length > 0,
    });

    const sensorFields = [
        { label: 'Nhiệt độ', value: 'temperature' },
        { label: 'Độ ẩm không khí', value: 'humidity' },
        { label: 'Độ ẩm đất', value: 'soil_moisture' },
        { label: 'Ánh sáng', value: 'light_intensity' },
        { label: 'pH đất', value: 'soilPH' },
    ];

    const formattedData = useMemo(() => {
        if (!chartData) return [];
        const dataMap = new Map<string, any>();

        Object.entries(chartData).forEach(([key, series]) => {
            // Ép kiểu series thành mảng SensorDataDTO[] để TypeScript hiểu
            (series as SensorDataDTO[]).forEach((point: SensorDataDTO) => {
                const time = dayjs(point.timestamp).format('YYYY-MM-DD HH:mm');
                if (!dataMap.has(time)) {
                    dataMap.set(time, { time });
                }
                dataMap.get(time)[key] = point.avgValue;
            });
        });
        return Array.from(dataMap.values()).sort((a, b) => a.time.localeCompare(b.time));
    }, [chartData]);

    return (
        <div style={{ padding: 24 }}>
            <Card title="Bộ lọc Phân tích" style={{ marginBottom: 24 }}>
                <Row gutter={16} align="bottom">
                    <Col span={8}>
                        <Text>Thiết bị</Text>
                        <Select
                            mode="multiple"
                            placeholder="Chọn một hoặc nhiều thiết bị"
                            value={selectedDevices}
                            onChange={setSelectedDevices}
                            style={{ width: '100%' }}
                            // VVVV--- SỬA LẠI ĐỂ DÙNG BIẾN `devices` ĐÃ ĐƯỢC XỬ LÝ ---VVVV
                            options={devices.map(d => ({ label: `${d.name} (${d.deviceId})`, value: d.deviceId }))}
                        />
                    </Col>
                    <Col span={8}>
                        <Text>Chỉ số</Text>
                        <Select
                            mode="multiple"
                            placeholder="Chọn các chỉ số cần xem"
                            value={selectedFields}
                            onChange={setSelectedFields}
                            style={{ width: '100%' }}
                            options={sensorFields}
                        />
                    </Col>
                    <Col span={8}>
                        <Text>Khoảng thời gian</Text>
                        <RangePicker
                            value={timeRange}
                            onChange={(dates) => setTimeRange(dates as any)}
                            showTime
                            style={{ width: '100%' }}
                        />
                    </Col>
                </Row>
            </Card>

            <Card>
                {isLoading || isFetching ? (
                    <div style={{ textAlign: 'center', padding: '50px' }}><Spin /></div>
                ) : (!formattedData || formattedData.length === 0) ? (
                    <Empty description="Vui lòng chọn thiết bị và chỉ số để xem dữ liệu." style={{ padding: '50px' }} />
                ) : (
                    <ResponsiveContainer width="100%" height={500}>
                        <LineChart data={formattedData}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="time" tick={{ fontSize: 12 }} />
                            <YAxis />
                            <Tooltip />
                            <Legend />
                            {Object.keys(chartData || {}).map((key, index) => (
                                <Line
                                    key={key}
                                    type="monotone"
                                    dataKey={key}
                                    name={key.replace('_', ' ')}
                                    stroke={COLORS[index % COLORS.length]}
                                    dot={false}
                                    strokeWidth={2}
                                />
                            ))}
                        </LineChart>
                    </ResponsiveContainer>
                )}
            </Card>
        </div>
    );
};

export default AnalyticsPage;