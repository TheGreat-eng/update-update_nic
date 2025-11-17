import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Row, Col, Card, Statistic, Spin, Alert, Typography, Tabs, message, Result, Button, Select } from 'antd';
import { Thermometer, Droplet, Sun, Wifi, BarChart3, Beaker } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Client } from '@stomp/stompjs';
import api from '../api/axiosConfig';
import WeatherWidget from '../components/dashboard/WeatherWidget';
import { useFarm } from '../context/FarmContext';
import type { FarmSummary, ChartDataPoint } from '../types/dashboard';
import { getDevicesByFarm } from '../api/deviceService';
import type { Device } from '../types/device';
import { DashboardSkeleton } from '../components/LoadingSkeleton'; // ✅ THÊM
import type { SensorDataMessage } from '../types/websocket'; // ✅ THÊM

const { Title } = Typography;
const { Option } = Select;

// ✅ THÊM: Memoized Statistics Card Component
const StatsCard = React.memo<{ title: string; value: number; icon: React.ReactNode; suffix?: string; precision?: number }>(
    ({ title, value, icon, suffix, precision }) => (
        <Card hoverable style={{ height: '100%' }}>
            <Statistic
                title={title}
                value={value}
                precision={precision}
                prefix={icon}
                suffix={suffix}
            />
        </Card>
    )
);

const DashboardPage: React.FC = () => {
    const { farmId, isLoadingFarm } = useFarm();
    const navigate = useNavigate();

    const [summary, setSummary] = useState<FarmSummary | null>(null);
    const [chartData, setChartData] = useState<ChartDataPoint[]>([]);
    const [activeChart, setActiveChart] = useState<'env' | 'soil'>('env');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [chartLoading, setChartLoading] = useState(false);
    const [devices, setDevices] = useState<Device[]>([]);
    const [selectedEnvDevice, setSelectedEnvDevice] = useState<string | null>(null);
    const [selectedSoilDevice, setSelectedSoilDevice] = useState<string | null>(null);
    const [selectedPHDevice, setSelectedPHDevice] = useState<string | null>(null);

    // ✅ THÊM: Memoize filtered devices
    const envDevices = useMemo(() =>
        devices.filter(d => d.type === 'SENSOR_DHT22'),
        [devices]
    );

    const soilDevices = useMemo(() =>
        devices.filter(d => d.type === 'SENSOR_SOIL_MOISTURE'),
        [devices]
    );

    const phDevices = useMemo(() =>
        devices.filter(d => d.type === 'SENSOR_PH'),
        [devices]
    );

    // ✅ TẤT CẢ useEffect Ở ĐÂY
    useEffect(() => {
        let isMounted = true;

        const fetchData = async () => {
            if (!farmId) return;

            try {
                setLoading(true);

                const devicesRes = await getDevicesByFarm(farmId);
                if (isMounted) {
                    const deviceList = devicesRes.data.data;
                    setDevices(deviceList);

                    const dht22 = deviceList.find(d => d.type === 'SENSOR_DHT22');
                    const soilMoisture = deviceList.find(d => d.type === 'SENSOR_SOIL_MOISTURE');
                    const ph = deviceList.find(d => d.type === 'SENSOR_PH');

                    setSelectedEnvDevice(dht22?.deviceId || null);
                    setSelectedSoilDevice(soilMoisture?.deviceId || null);
                    setSelectedPHDevice(ph?.deviceId || null);
                }

                const summaryRes = await api.get<{ data: FarmSummary }>(`/reports/summary?farmId=${farmId}`);
                if (isMounted) {
                    setSummary(summaryRes.data.data);
                    setError(null);
                }
            } catch (err) {
                if (isMounted) {
                    console.error("Failed to fetch initial data:", err);
                    setError("Không thể tải dữ liệu. Vui lòng thử lại.");
                }
            } finally {
                if (isMounted) setLoading(false);
            }
        };

        fetchData();
        return () => { isMounted = false; };
    }, [farmId]);

    // ✅ SỬA: Dùng useCallback cho fetchChartData
    const fetchChartData = useCallback(async (chartType: 'env' | 'soil') => {
        setChartLoading(true);
        try {
            let responseData: ChartDataPoint[] = [];
            if (chartType === 'env') {
                if (!selectedEnvDevice) {
                    message.warning('Chưa có cảm biến DHT22 nào trong farm này');
                    return;
                }
                const [tempRes, humidityRes] = await Promise.all([
                    api.get(`/devices/${selectedEnvDevice}/data/aggregated?field=temperature&window=10m`),
                    api.get(`/devices/${selectedEnvDevice}/data/aggregated?field=humidity&window=10m`),
                ]);
                responseData = tempRes.data.data.map((tempPoint: any) => {
                    const humidityPoint = humidityRes.data.data.find((h: any) => h.timestamp === tempPoint.timestamp);
                    return {
                        time: new Date(tempPoint.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                        temperature: tempPoint.avgValue ? parseFloat(tempPoint.avgValue.toFixed(1)) : undefined,
                        humidity: humidityPoint?.avgValue ? parseFloat(humidityPoint.avgValue.toFixed(1)) : undefined,
                    };
                });
            } else if (chartType === 'soil') {
                if (!selectedSoilDevice || !selectedPHDevice) {
                    message.warning('Chưa có đủ cảm biến đất và pH trong farm này');
                    return;
                }
                const [soilMoistureRes, soilPHRes] = await Promise.all([
                    api.get(`/devices/${selectedSoilDevice}/data/aggregated?field=soil_moisture&window=10m`),
                    api.get(`/devices/${selectedPHDevice}/data/aggregated?field=soilPH&window=10m`),
                ]);
                responseData = soilMoistureRes.data.data.map((soilPoint: any) => {
                    const phPoint = soilPHRes.data.data.find((p: any) => p.timestamp === soilPoint.timestamp);
                    return {
                        time: new Date(soilPoint.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                        soilMoisture: soilPoint.avgValue ? parseFloat(soilPoint.avgValue.toFixed(1)) : undefined,
                        soilPH: phPoint?.avgValue ? parseFloat(phPoint.avgValue.toFixed(2)) : undefined,
                    };
                });
            }
            setChartData(responseData);
        } catch (err) {
            console.error(`Failed to fetch chart data for ${chartType}:`, err);
            message.error(`Không thể tải dữ liệu ${chartType === 'env' ? 'môi trường' : 'đất'}`);
        } finally {
            setChartLoading(false);
        }
    }, [selectedEnvDevice, selectedSoilDevice, selectedPHDevice]);

    useEffect(() => {
        if (activeChart === 'env' && selectedEnvDevice) {
            fetchChartData('env');
        } else if (activeChart === 'soil' && selectedSoilDevice && selectedPHDevice) {
            fetchChartData('soil');
        }
    }, [selectedEnvDevice, selectedSoilDevice, selectedPHDevice, activeChart, fetchChartData]);

    useEffect(() => {
        if (farmId === null) return;

        let reconnectAttempts = 0;
        const MAX_RECONNECT_ATTEMPTS = 5;

        const client = new Client({
            webSocketFactory: () => new WebSocket(`${import.meta.env.VITE_WS_URL}/ws/websocket`),
            reconnectDelay: 5000,
            heartbeatIncoming: 10000,
            heartbeatOutgoing: 10000,
            onWebSocketError: (error) => {
                console.error('WebSocket error:', error);
                reconnectAttempts++;

                if (reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {
                    message.error('Mất kết nối real-time. Vui lòng tải lại trang.');
                } else {
                    message.warning(`Mất kết nối real-time. Đang thử kết nối lại... (${reconnectAttempts}/${MAX_RECONNECT_ATTEMPTS})`);
                }
            },
            onWebSocketClose: () => {
                console.warn('WebSocket connection closed');
            },
        });

        let isConnected = false;

        client.onConnect = () => {
            console.log('✅ WebSocket/STOMP Connected!');
            isConnected = true;
            reconnectAttempts = 0; // ✅ Reset counter khi connect thành công

            client.subscribe(`/topic/farm/${farmId}/sensor-data`, (msg) => {
                if (!isConnected) return;
                try {
                    const newData: SensorDataMessage = JSON.parse(msg.body); // ✅ Type-safe
                    console.log('📬 Received real-time data:', newData);

                    setSummary((prevSummary) => {
                        if (!prevSummary) return null;
                        const newAvg = { ...prevSummary.averageEnvironment };
                        if (newData.temperature !== undefined) newAvg.avgTemperature = newData.temperature;
                        if (newData.humidity !== undefined) newAvg.avgHumidity = newData.humidity;
                        if (newData.soilMoisture !== undefined) newAvg.avgSoilMoisture = newData.soilMoisture;
                        if (newData.soilPH !== undefined) newAvg.avgSoilPH = newData.soilPH;
                        if (newData.lightIntensity !== undefined) newAvg.avgLightIntensity = newData.lightIntensity;
                        return { ...prevSummary, averageEnvironment: newAvg };
                    });

                    setChartData(prevData => {
                        const newPoint: ChartDataPoint = {
                            time: new Date(newData.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                        };
                        if (newData.temperature !== undefined) newPoint.temperature = newData.temperature;
                        if (newData.humidity !== undefined) newPoint.humidity = newData.humidity;
                        if (newData.soilMoisture !== undefined) newPoint.soilMoisture = newData.soilMoisture;
                        if (newData.soilPH !== undefined) newPoint.soilPH = newData.soilPH;

                        const updatedData = [...prevData, newPoint];
                        if (updatedData.length > 30) {
                            updatedData.shift();
                        }
                        return updatedData;
                    });

                } catch (e) {
                    console.error("Error processing WebSocket message:", e);
                }
            });
        };

        client.onStompError = (frame) => {
            console.error('Broker reported error: ' + frame.headers['message']);
            console.error('Additional details: ' + frame.body);
        };

        client.activate();

        return () => {
            isConnected = false;
            if (client.active) {
                client.deactivate();
                console.log('🔌 WebSocket Disconnected.');
            }
        };
    }, [farmId]);

    const handleTabChange = useCallback((key: string) => {
        const chartType = key as 'env' | 'soil';
        setActiveChart(chartType);
        fetchChartData(chartType);
    }, [fetchChartData]);

    // ✅ THÊM: Memoize statistics cards
    const statsCards = useMemo(() => (
        <Row gutter={[16, 16]}>
            <Col xs={12} sm={12} md={8} lg={12} xl={8}>
                <StatsCard
                    title="Thiết bị Online"
                    value={summary?.onlineDevices ?? 0}
                    icon={<Wifi color="green" size={20} />}
                    suffix={`/ ${summary?.totalDevices ?? 0}`}
                />
            </Col>
            <Col xs={12} sm={12} md={8} lg={12} xl={8}>
                <StatsCard
                    title="Nhiệt độ TB"
                    value={summary?.averageEnvironment?.avgTemperature ?? 0}
                    precision={1}
                    icon={<Thermometer color="#ff4d4f" size={20} />}
                    suffix="°C"
                />
            </Col>
            <Col xs={12} sm={12} md={8} lg={12} xl={8}>
                <StatsCard
                    title="Độ ẩm KK"
                    value={summary?.averageEnvironment?.avgHumidity ?? 0}
                    precision={1}
                    icon={<Droplet color="#1677ff" size={20} />}
                    suffix="%"
                />
            </Col>
            <Col xs={12} sm={12} md={8} lg={12} xl={8}>
                <StatsCard
                    title="Độ ẩm Đất"
                    value={summary?.averageEnvironment?.avgSoilMoisture ?? 0}
                    precision={1}
                    icon={<BarChart3 color="#82ca9d" size={20} />}
                    suffix="%"
                />
            </Col>
            <Col xs={12} sm={12} md={8} lg={12} xl={8}>
                <StatsCard
                    title="Độ pH Đất"
                    value={summary?.averageEnvironment?.avgSoilPH ?? 0}
                    precision={2}
                    icon={<Beaker color="#ffc658" size={20} />}
                />
            </Col>
            <Col xs={12} sm={12} md={8} lg={12} xl={8}>
                <StatsCard
                    title="Ánh sáng TB"
                    value={summary?.averageEnvironment?.avgLightIntensity ?? 0}
                    precision={0}
                    icon={<Sun color="#faad14" size={20} />}
                    suffix=" lux"
                />
            </Col>
        </Row>
    ), [summary]);

    const chartComponent = useMemo(() => {
        if (activeChart === 'env') {
            return (
                <>
                    <div style={{ marginBottom: 16 }}>
                        <span style={{ marginRight: 8 }}>Chọn cảm biến:</span>
                        <Select
                            value={selectedEnvDevice}
                            onChange={setSelectedEnvDevice}
                            style={{ width: 200 }}
                        >
                            {envDevices.map(d => (
                                <Option key={d.deviceId} value={d.deviceId}>{d.name} ({d.deviceId})</Option>
                            ))}
                        </Select>
                    </div>
                    <ResponsiveContainer width="100%" height={350}>
                        <LineChart data={chartData}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="time" />
                            <YAxis yAxisId="left" stroke="#ff4d4f" domain={[10, 40]} />
                            <YAxis yAxisId="right" orientation="right" stroke="#1677ff" domain={[20, 100]} />
                            <Tooltip />
                            <Legend />
                            <Line yAxisId="left" type="monotone" dataKey="temperature" stroke="#ff4d4f" name="Nhiệt độ (°C)" />
                            <Line yAxisId="right" type="monotone" dataKey="humidity" stroke="#1677ff" name="Độ ẩm không khí (%)" />
                        </LineChart>
                    </ResponsiveContainer>
                </>
            );
        }
        if (activeChart === 'soil') {
            return (
                <>
                    <div style={{ marginBottom: 16 }}>
                        <span style={{ marginRight: 8 }}>Cảm biến độ ẩm đất:</span>
                        <Select
                            value={selectedSoilDevice}
                            onChange={setSelectedSoilDevice}
                            style={{ width: 200, marginRight: 16 }}
                        >
                            {soilDevices.map(d => (
                                <Option key={d.deviceId} value={d.deviceId}>{d.name} ({d.deviceId})</Option>
                            ))}
                        </Select>
                        <span style={{ marginRight: 8 }}>Cảm biến pH:</span>
                        <Select
                            value={selectedPHDevice}
                            onChange={setSelectedPHDevice}
                            style={{ width: 200 }}
                        >
                            {phDevices.map(d => (
                                <Option key={d.deviceId} value={d.deviceId}>{d.name} ({d.deviceId})</Option>
                            ))}
                        </Select>
                    </div>
                    <ResponsiveContainer width="100%" height={350}>
                        <LineChart data={chartData}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="time" />
                            <YAxis yAxisId="left" stroke="#82ca9d" domain={[0, 100]} />
                            <YAxis yAxisId="right" orientation="right" stroke="#ffc658" domain={[4, 9]} />
                            <Tooltip />
                            <Legend />
                            <Line yAxisId="left" type="monotone" dataKey="soilMoisture" stroke="#82ca9d" name="Độ ẩm đất (%)" />
                            <Line yAxisId="right" type="monotone" dataKey="soilPH" stroke="#ffc658" name="Độ pH đất" />
                        </LineChart>
                    </ResponsiveContainer>
                </>
            );
        }
        return null;
    }, [chartData, activeChart, selectedEnvDevice, selectedSoilDevice, selectedPHDevice, envDevices, soilDevices, phDevices]);

    // ✅ EARLY RETURNS SAU TẤT CẢ HOOKS
    if (isLoadingFarm) {
        return (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}>
                <Spin size="large" />
            </div>
        );
    }

    if (!farmId) {
        return (
            <Result
                status="info"
                title="Chưa có nông trại nào"
                subTitle="Bạn chưa có nông trại nào. Vui lòng tạo nông trại mới để bắt đầu."
                extra={[
                    <Button type="primary" key="create" onClick={() => navigate('/farms')}>
                        Tạo nông trại đầu tiên
                    </Button>
                ]}
            />
        );
    }

    if (loading && !summary) {
        return <DashboardSkeleton />; // ✅ Thay Spin
    }

    if (error) {
        return <Alert message="Lỗi" description={error} type="error" showIcon style={{ margin: '20px' }} />;
    }

    return (
        <div style={{ padding: '24px', width: '100%', maxWidth: '100%', boxSizing: 'border-box', overflow: 'hidden' }}>
            <Title level={2} style={{ marginBottom: '24px' }}>Dashboard Tổng Quan</Title>

            <Row gutter={[16, 16]}>
                <Col xs={24} lg={16}>
                    {statsCards}

                    <Card style={{ marginTop: '24px' }} title="Biểu đồ theo dõi">
                        <Tabs
                            defaultActiveKey="env"
                            onChange={handleTabChange}
                            items={[
                                { key: 'env', label: 'Môi trường (Không khí)' },
                                { key: 'soil', label: 'Dữ liệu Đất' },
                            ]}
                        />
                        {chartLoading ? <Spin /> : chartComponent}
                    </Card>
                </Col>

                <Col xs={24} lg={8}>
                    <WeatherWidget />

                    <Card style={{ marginTop: '16px' }} title="⚠️ Cảnh báo" size="small">
                        <p style={{ margin: '8px 0' }}>• Nhiệt độ cao (35°C)</p>
                        <p style={{ margin: '8px 0' }}>• Độ ẩm đất thấp (25%)</p>
                        <p style={{ margin: '8px 0', color: '#52c41a' }}>✓ Hệ thống hoạt động bình thường</p>
                    </Card>

                    <Card style={{ marginTop: '16px' }} title="💡 Gợi ý AI" size="small">
                        <p style={{ margin: '8px 0' }}>• Nên tưới nước trong 30 phút tới</p>
                        <p style={{ margin: '8px 0' }}>• Bật quạt để giảm nhiệt độ</p>
                    </Card>
                </Col>
            </Row>
        </div>
    );
};

export default DashboardPage;