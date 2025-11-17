// src/pages/DashboardPage.tsx — FIXED VERSION
import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Row, Col, Card, Statistic, Spin, Alert, Typography, Tabs, message, Result, Button, Select, Space, Empty, Tag } from 'antd';
import { Thermometer, Droplet, Sun, Wifi, BarChart3, Beaker, Leaf } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Client } from '@stomp/stompjs';
import SockJS from 'sockjs-client';
import api from '../api/axiosConfig';
import WeatherWidget from '../components/dashboard/WeatherWidget';
import { useFarm } from '../context/FarmContext';
import type { FarmSummary, ChartDataPoint } from '../types/dashboard';
import { getDevicesByFarm } from '../api/deviceService';
import type { Device } from '../types/device';
import { DashboardSkeleton } from '../components/LoadingSkeleton';
import type { SensorDataMessage } from '../types/websocket';
import { getAuthToken } from '../utils/auth';
import { useTheme } from '../context/ThemeContext';
import { useQueryClient } from '@tanstack/react-query'; // Import đúng
import { useDashboardSummary } from '../hooks/useDashboardData'; // Import hook

// ... (Các component StatChip, StatsCard, PageHeader, CustomTooltip giữ nguyên, không cần thay đổi)
const StatChip = ({ children, bg }: { children: React.ReactNode; bg: string }) => (
    <div style={{ width: 44, height: 44, borderRadius: 12, display: 'grid', placeItems: 'center', background: bg, boxShadow: '0 6px 14px rgba(0,0,0,0.08)' }}>{children}</div>
);

const StatsCard = React.memo<{
    title: string;
    value: number | string;
    icon: React.ReactNode;
    suffix?: string;
    precision?: number;
    hint?: string;
}>(
    ({ title, value, icon, suffix, precision, hint }) => (
        <Card className="sf-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16 }}>
                <div>
                    <Text type="secondary" style={{ textTransform: 'uppercase', fontSize: 12, fontWeight: 600 }}>{title}</Text>
                    <Statistic value={value} precision={precision} suffix={suffix} valueStyle={{ fontSize: 28, fontWeight: 800, marginTop: 6 }} />
                    {hint && <div style={{ marginTop: 6 }}><Tag color="blue" style={{ borderRadius: 999 }}>{hint}</Tag></div>}
                </div>
                {icon}
            </div>
        </Card>
    )
);

// Bạn có thể xóa nút "Làm mới" khỏi component PageHeader nếu muốn
const PageHeader = ({ title, subtitle }: { title: string, subtitle: string }) => (
    <div className="sf-page-header">
        <div>
            <Title level={2} style={{ margin: 0 }}>{title}</Title>
            <Text type="secondary">{subtitle}</Text>
        </div>
        {/* Xóa nút bấm ở đây để chuyển ra ngoài */}
    </div>
);

interface AggregatedDataPoint { timestamp: string; avgValue?: number; }

const CustomTooltip = ({ active, payload, label }: any) => {
    const { isDark } = useTheme();
    if (active && payload && payload.length) {
        return (
            <div style={{
                background: isDark ? 'var(--card-dark, #0f172a)' : 'var(--card-light, #ffffff)',
                padding: '10px 14px', borderRadius: 12,
                border: `1px solid ${isDark ? 'var(--border-dark, #1f2937)' : 'var(--border-light, #eef2f7)'}`,
                boxShadow: '0 6px 18px rgba(0,0,0,0.08)'
            }}>
                <p style={{ fontWeight: 700, marginBottom: 8 }}>{`Thời gian: ${label}`}</p>
                {payload.map((pld: any) => (
                    <div key={pld.dataKey} style={{ color: pld.stroke, display: 'flex', justifyContent: 'space-between', gap: 16 }}>
                        <span>{pld.name}:</span>
                        <strong>{`${Number.isFinite(pld.value) ? Number(pld.value).toFixed(1) : '--'} ${pld.unit || ''}`}</strong>
                    </div>
                ))}
            </div>
        );
    }
    return null;
};

const { Title, Text } = Typography;
const { Option } = Select;

const DashboardPage: React.FC = () => {
    const { farmId, isLoadingFarm } = useFarm();
    const navigate = useNavigate();
    const queryClient = useQueryClient();

    // ✅ BƯỚC 1: SỬ DỤNG REACT QUERY LÀM NGUỒN DỮ LIỆU DUY NHẤT
    const { data: summary, isLoading: isLoadingSummary, isError, error } = useDashboardSummary(farmId!);
    // Bỏ: const [summary, setSummary] = useState<FarmSummary | null>(null);
    // Bỏ: const [loading, setLoading] = useState(true);

    // Các state cục bộ khác cho UI (biểu đồ, select box) giữ nguyên
    const [chartData, setChartData] = useState<ChartDataPoint[]>([]);
    const [activeChart, setActiveChart] = useState<'env' | 'soil'>('env');
    const [chartLoading, setChartLoading] = useState(false);
    const [devices, setDevices] = useState<Device[]>([]);
    const [selectedEnvDevice, setSelectedEnvDevice] = useState<string | undefined>(undefined);
    const [selectedSoilDevice, setSelectedSoilDevice] = useState<string | undefined>(undefined);
    const [selectedPHDevice, setSelectedPHDevice] = useState<string | undefined>(undefined);

    const envDevices = useMemo(() => devices.filter(d => d.type === 'SENSOR_DHT22'), [devices]);
    const soilDevices = useMemo(() => devices.filter(d => d.type === 'SENSOR_SOIL_MOISTURE'), [devices]);
    const phDevices = useMemo(() => devices.filter(d => d.type === 'SENSOR_PH'), [devices]);

    // ✅ BƯỚC 2: BỎ useEffect fetchData ban đầu, vì useDashboardSummary đã làm việc này rồi.
    // Thay vào đó, dùng một useEffect riêng để fetch danh sách devices cho các select box.
    useEffect(() => {
        if (!farmId) return;
        let isMounted = true;
        const fetchDeviceList = async () => {
            try {
                const devicesRes = await getDevicesByFarm(farmId);
                if (isMounted) {
                    const deviceList = devicesRes.data.data || [];
                    setDevices(deviceList);
                    if (!selectedEnvDevice) setSelectedEnvDevice(deviceList.find(d => d.type === 'SENSOR_DHT22')?.deviceId);
                    if (!selectedSoilDevice) setSelectedSoilDevice(deviceList.find(d => d.type === 'SENSOR_SOIL_MOISTURE')?.deviceId);
                    if (!selectedPHDevice) setSelectedPHDevice(deviceList.find(d => d.type === 'SENSOR_PH')?.deviceId);
                }
            } catch (err) {
                console.error('Failed to fetch device list:', err);
            }
        };
        fetchDeviceList();
        return () => { isMounted = false };
    }, [farmId]);

    // ... (logic fetchChartData, mergeChartData giữ nguyên) ...
    const mergeChartData = (data1: AggregatedDataPoint[], data2: AggregatedDataPoint[], key1: string, key2: string): ChartDataPoint[] => {
        const dataMap = new Map<string, ChartDataPoint>();
        data1.forEach(p => {
            const time = new Date(p.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            dataMap.set(time, { ...dataMap.get(time), time, [key1]: p.avgValue });
        });
        data2.forEach(p => {
            const time = new Date(p.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            dataMap.set(time, { ...dataMap.get(time), time, [key2]: p.avgValue });
        });
        return Array.from(dataMap.values()).sort((a, b) => a.time.localeCompare(b.time));
    };

    // VVVV--- TẠO MỘT HÀM XỬ LÝ LÀM MỚI ---VVVV
    const handleRefresh = () => {
        message.loading({ content: 'Đang làm mới dữ liệu...', key: 'refresh' });

        // Vô hiệu hóa tất cả các query liên quan đến dashboard của farm này
        // React Query sẽ tự động fetch lại chúng
        queryClient.invalidateQueries({ queryKey: ['dashboard-summary', farmId] });
        queryClient.invalidateQueries({ queryKey: ['chart-data'] }); // Làm mới cả biểu đồ

        // Bạn cũng có thể gọi hàm fetchChartData thủ công nếu muốn
        // fetchChartData();

        // Giả lập một chút độ trễ để người dùng thấy thông báo
        setTimeout(() => {
            message.success({ content: 'Dữ liệu đã được làm mới!', key: 'refresh', duration: 2 });
        }, 1000);
    };
    // ^^^^----------------------------------^^^^

    const fetchChartData = useCallback(async () => {
        setChartLoading(true); setChartData([]);
        try {
            if (activeChart === 'env' && selectedEnvDevice) {
                const [tempRes, humidityRes] = await Promise.all([
                    api.get<{ data: AggregatedDataPoint[] }>(`/devices/${selectedEnvDevice}/data/aggregated?field=temperature&window=10m`),
                    api.get<{ data: AggregatedDataPoint[] }>(`/devices/${selectedEnvDevice}/data/aggregated?field=humidity&window=10m`),
                ]);
                setChartData(mergeChartData(tempRes.data.data, humidityRes.data.data, 'temperature', 'humidity'));
            } else if (activeChart === 'soil' && selectedSoilDevice && selectedPHDevice) {
                const [soilMoistureRes, soilPHRes] = await Promise.all([
                    api.get<{ data: AggregatedDataPoint[] }>(`/devices/${selectedSoilDevice}/data/aggregated?field=soil_moisture&window=10m`),
                    api.get<{ data: AggregatedDataPoint[] }>(`/devices/${selectedPHDevice}/data/aggregated?field=soilPH&window=10m`),
                ]);
                setChartData(mergeChartData(soilMoistureRes.data.data, soilPHRes.data.data, 'soilMoisture', 'soilPH'));
            }
        } catch (err) { console.error('Failed to fetch chart data:', err); message.error('Không thể tải dữ liệu biểu đồ.'); }
        finally { setChartLoading(false); }
    }, [activeChart, selectedEnvDevice, selectedSoilDevice, selectedPHDevice]);

    useEffect(() => { fetchChartData(); }, [fetchChartData]);


    // ✅ BƯỚC 3: SỬA LẠI HOÀN TOÀN useEffect của WebSocket
    useEffect(() => {
        if (farmId === null) return;
        const token = getAuthToken();
        if (!token) return;

        const client = new Client({
            webSocketFactory: () => new SockJS(`${import.meta.env.VITE_WS_URL}`),
            connectHeaders: { Authorization: `Bearer ${token}` },
            reconnectDelay: 5000,
        });

        client.onConnect = () => {
            console.log('Dashboard WebSocket Connected!');

            // Listener 1: Cập nhật dữ liệu CẢM BIẾN (Optimistic Update)
            client.subscribe(`/topic/farm/${farmId}/sensor-data`, (msg) => {
                try {
                    const newData: SensorDataMessage = JSON.parse(msg.body);

                    queryClient.setQueryData(
                        ['dashboard-summary', farmId],
                        (oldData: FarmSummary | undefined) => {
                            if (!oldData) return oldData;

                            const newAvgEnv = { ...oldData.averageEnvironment };
                            if (newData.temperature !== undefined) newAvgEnv.avgTemperature = newData.temperature;
                            if (newData.humidity !== undefined) newAvgEnv.avgHumidity = newData.humidity;
                            if (newData.soilMoisture !== undefined) newAvgEnv.avgSoilMoisture = newData.soilMoisture;
                            if (newData.soilPH !== undefined) newAvgEnv.avgSoilPH = newData.soilPH;
                            if (newData.lightIntensity !== undefined) newAvgEnv.avgLightIntensity = newData.lightIntensity;

                            return { ...oldData, averageEnvironment: newAvgEnv };
                        }
                    );
                } catch (e) { console.error('Error processing sensor data message:', e); }
            });

            // Listener 2: Cập nhật số liệu TỔNG QUAN (online devices)
            client.subscribe(`/topic/farm/${farmId}/device-status`, () => {
                console.log('Received device status update on Dashboard, refetching summary...');
                queryClient.invalidateQueries({ queryKey: ['dashboard-summary', farmId] });
            });
        };

        client.activate();
        return () => { if (client.active) client.deactivate(); };
    }, [farmId, queryClient]);

    // ... (statsCards giữ nguyên, không cần thay đổi) ...
    const statsCards = useMemo(() => (
        <Row gutter={[16, 16]}>
            <Col xs={12} sm={12} md={8}>
                <StatsCard title="Thiết bị Online" value={summary?.onlineDevices ?? 0} suffix={` / ${summary?.totalDevices ?? 0}`}
                    hint={summary?.onlineDevices ? 'Đang hoạt động' : undefined}
                    icon={<StatChip bg="rgba(16,185,129,0.15)"><Wifi size={22} color="#10b981" /></StatChip>} />
            </Col>
            <Col xs={12} sm={12} md={8}>
                <StatsCard title="Nhiệt độ" value={summary?.averageEnvironment?.avgTemperature ?? 0} precision={1} suffix="°C"
                    icon={<StatChip bg="rgba(239,68,68,0.14)"><Thermometer size={22} color="#ef4444" /></StatChip>} />
            </Col>
            <Col xs={12} sm={12} md={8}>
                <StatsCard title="Độ ẩm KK" value={summary?.averageEnvironment?.avgHumidity ?? 0} precision={1} suffix="%"
                    icon={<StatChip bg="rgba(59,130,246,0.14)"><Droplet size={22} color="#3b82f6" /></StatChip>} />
            </Col>
            <Col xs={12} sm={12} md={8}>
                <StatsCard title="Độ ẩm Đất" value={summary?.averageEnvironment?.avgSoilMoisture ?? 0} precision={1} suffix="%"
                    icon={<StatChip bg="rgba(132,204,22,0.14)"><Leaf size={22} color="#84cc16" /></StatChip>} />
            </Col>
            <Col xs={12} sm={12} md={8}>
                <StatsCard title="Độ pH Đất" value={summary?.averageEnvironment?.avgSoilPH ?? 0} precision={2}
                    icon={<StatChip bg="rgba(245,158,11,0.16)"><Beaker size={22} color="#f59e0b" /></StatChip>} />
            </Col>
            <Col xs={12} sm={12} md={8}>
                <StatsCard title="Ánh sáng" value={summary?.averageEnvironment?.avgLightIntensity ?? 0} precision={0} suffix=" lux"
                    icon={<StatChip bg="rgba(249,115,22,0.16)"><Sun size={22} color="#f97316" /></StatChip>} />
            </Col>
        </Row>
    ), [summary]);

    // ✅ BƯỚC 4: SỬA LẠI CÁCH XỬ LÝ LOADING VÀ ERROR
    if (isLoadingFarm) return <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}><Spin size="large" /></div>;
    if (!farmId) return <Result status="info" title="Chưa có nông trại" subTitle="Vui lòng tạo hoặc chọn nông trại để xem dữ liệu." extra={<Button type="primary" onClick={() => navigate('/farms')}>Quản lý Nông trại</Button>} />;
    if (isLoadingSummary && !summary) return <DashboardSkeleton />;
    if (isError) return <Alert message="Lỗi tải dữ liệu" description={(error as Error).message} type="error" showIcon style={{ margin: 20 }} />;

    // ... (phần return JSX giữ nguyên, không cần thay đổi) ...
    return (
        <div className="sf-wrapper">
            <PageHeader title="Dashboard Tổng Quan" subtitle="Phân tích dữ liệu thời gian thực từ các cảm biến." />


            <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '18px' }}>
                <Button icon={<BarChart3 size={16} />} type="default" onClick={handleRefresh}>
                    Làm mới
                </Button>
            </div>


            <Row gutter={[24, 24]}>
                <Col xs={24} lg={16}>
                    {statsCards}

                    <Card className="sf-card" style={{ marginTop: 24 }}>
                        <div className="sf-chart-header">
                            <Tabs
                                defaultActiveKey="env"
                                activeKey={activeChart}
                                onChange={(k) => setActiveChart(k as 'env' | 'soil')}
                                items={[
                                    { key: 'env', label: 'Môi trường (Không khí)' },
                                    { key: 'soil', label: 'Dữ liệu Đất' },
                                ]}
                            />
                            <Space wrap>
                                {activeChart === 'env' && (
                                    <Select
                                        value={selectedEnvDevice}
                                        placeholder="Chọn thiết bị môi trường"
                                        style={{ minWidth: 220 }}
                                        onChange={(v) => setSelectedEnvDevice(v)}
                                    >
                                        {envDevices.map(d => (<Option key={d.deviceId} value={d.deviceId}>{d.name || d.deviceId}</Option>))}
                                    </Select>
                                )}
                                {activeChart === 'soil' && (
                                    <>
                                        <Select
                                            value={selectedSoilDevice}
                                            placeholder="Thiết bị Soil Moisture"
                                            style={{ minWidth: 200 }}
                                            onChange={(v) => setSelectedSoilDevice(v)}
                                        >
                                            {soilDevices.map(d => (<Option key={d.deviceId} value={d.deviceId}>{d.name || d.deviceId}</Option>))}
                                        </Select>
                                        <Select
                                            value={selectedPHDevice}
                                            placeholder="Thiết bị pH"
                                            style={{ minWidth: 180 }}
                                            onChange={(v) => setSelectedPHDevice(v)}
                                        >
                                            {phDevices.map(d => (<Option key={d.deviceId} value={d.deviceId}>{d.name || d.deviceId}</Option>))}
                                        </Select>
                                    </>
                                )}
                                <Button icon={<BarChart3 size={16} />} onClick={fetchChartData}>Tải lại dữ liệu</Button>
                            </Space>
                        </div>

                        {chartLoading ? (
                            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 350 }}><Spin /></div>
                        ) : chartData.length === 0 ? (
                            <Empty description="Không có dữ liệu biểu đồ" style={{ height: 350, display: 'flex', flexDirection: 'column', justifyContent: 'center' }} />
                        ) : (
                            <ResponsiveContainer width="100%" height={360}>
                                <AreaChart data={chartData} margin={{ top: 16, right: 12, left: 0, bottom: 0 }}>
                                    <defs>
                                        <linearGradient id="colorTemp" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#ef4444" stopOpacity={0.85} />
                                            <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                                        </linearGradient>
                                        <linearGradient id="colorHumid" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.85} />
                                            <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                                        </linearGradient>
                                        <linearGradient id="colorSoil" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#84cc16" stopOpacity={0.8} />
                                            <stop offset="95%" stopColor="#84cc16" stopOpacity={0} />
                                        </linearGradient>
                                        <linearGradient id="colorPH" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.8} />
                                            <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border-light, #eef2f7)" />
                                    <XAxis dataKey="time" stroke="var(--muted-foreground-light, #64748b)" />
                                    {activeChart === 'env' ? (
                                        <>
                                            <YAxis yAxisId="left" stroke="#ef4444" />
                                            <YAxis yAxisId="right" orientation="right" stroke="#3b82f6" />
                                            <Tooltip content={<CustomTooltip />} />
                                            <Legend />
                                            <Area yAxisId="left" type="monotone" dataKey="temperature" name="Nhiệt độ" unit="°C" stroke="#ef4444" fillOpacity={1} fill="url(#colorTemp)" strokeWidth={2} dot={false} />
                                            <Area yAxisId="right" type="monotone" dataKey="humidity" name="Độ ẩm" unit="%" stroke="#3b82f6" fillOpacity={1} fill="url(#colorHumid)" strokeWidth={2} dot={false} />
                                        </>
                                    ) : (
                                        <>
                                            <YAxis yAxisId="left" stroke="#84cc16" />
                                            <YAxis yAxisId="right" orientation="right" stroke="#f59e0b" />
                                            <Tooltip content={<CustomTooltip />} />
                                            <Legend />
                                            <Area yAxisId="left" type="monotone" dataKey="soilMoisture" name="Độ ẩm đất" unit="%" stroke="#84cc16" fill="url(#colorSoil)" strokeWidth={2} dot={false} />
                                            <Area yAxisId="right" type="monotone" dataKey="soilPH" name="Độ pH" unit="" stroke="#f59e0b" fill="url(#colorPH)" strokeWidth={2} dot={false} />
                                        </>
                                    )}
                                </AreaChart>
                            </ResponsiveContainer>
                        )}
                    </Card>
                </Col>

                <Col xs={24} lg={8}>
                    <WeatherWidget />
                </Col>
            </Row>

            <style>{`
                .sf-wrapper { padding-bottom: 12px; }
                .sf-page-header { display:flex; align-items:center; justify-content:space-between; margin-bottom: 18px; }
                .sf-header-cta { display:flex; gap: 8px; }
                .sf-card { border-radius: 16px; box-shadow: 0 8px 24px rgba(0,0,0,0.05); }
                .sf-chart-header { display:flex; align-items:center; justify-content:space-between; gap: 12px; margin-bottom: 8px; }
                @media (max-width: 576px) { .sf-chart-header { flex-direction: column; align-items: flex-start; } }
            `}</style>
        </div>
    );
};

export default DashboardPage;