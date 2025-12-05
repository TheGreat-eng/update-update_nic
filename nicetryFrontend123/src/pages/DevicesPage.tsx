import React, { useState, useMemo, useCallback } from 'react';
import { Table, Button, Space, Tag, Popconfirm, Input, Spin, Alert, Tooltip, Typography, message as antdMessage } from 'antd';
import { PlusOutlined, DownloadOutlined, EditOutlined, DeleteOutlined, SyncOutlined, ThunderboltOutlined, WifiOutlined as WifiIcon, BellOutlined } from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getDevicesByFarm, createDevice, updateDevice, deleteDevice, controlDevice, getUnclaimedDevices } from '../api/deviceService';
import { getFarms } from '../api/farmService';
import { exportDeviceDataAsCsv } from '../api/reportService';
import { useFarm } from '../context/FarmContext';
import { useDebounce } from '../hooks/useDebounce';
import { useStomp } from '../hooks/useStomp';
import DeviceFormModal from '../components/DeviceFormModal';
import { TableSkeleton } from '../components/LoadingSkeleton';
import type { Device } from '../types/device';
import type { DeviceFormData } from '../api/deviceService';
import { DEVICE_STATUS, DEVICE_STATE, getDeviceTypeLabel } from '../constants/device';

const { Title, Text } = Typography;

const PageHeader = ({ title, subtitle, actions }: { title: string, subtitle: string, actions: React.ReactNode }) => (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div><Title level={2} style={{ margin: 0 }}>{title}</Title><Text type="secondary">{subtitle}</Text></div>
        <Space>{actions}</Space>
    </div>
);

const DevicesPage: React.FC = () => {
    const queryClient = useQueryClient();
    const { farmId, isLoadingFarm } = useFarm();
    const [isModalVisible, setIsModalVisible] = useState(false);
    const [editingDevice, setEditingDevice] = useState<Device | null>(null);
    const [controllingDevices, setControllingDevices] = useState<Set<string>>(new Set());
    const [searchText, setSearchText] = useState('');
    const debouncedSearchText = useDebounce(searchText, 300);

    const { data: farms = [] } = useQuery({
        queryKey: ['farms'],
        queryFn: async () => {
            const res = await getFarms();
            const data = res.data.data;
            return Array.isArray(data) ? data : [];
        },
    });

    const canManage = useMemo(() => {
        if (!farmId || !farms) return false;
        const currentFarm = farms.find(f => f.id === farmId);
        return currentFarm?.currentUserRole === 'OWNER' || currentFarm?.currentUserRole === 'OPERATOR';
    }, [farmId, farms]);

    // [FIX] Nhận dữ liệu thô (raw) và xử lý an toàn
    const { data: rawDevices, isLoading: isLoadingDevices, isFetching: isFetchingDevices } = useQuery({
        queryKey: ['devices', farmId],
        queryFn: async () => {
            const res = await getDevicesByFarm(farmId!);
            const data = res.data.data;
            return Array.isArray(data) ? data : [];
        },
        enabled: !!farmId,
        initialData: [],
    });

    // [FIX] Đảm bảo devices luôn là mảng, kể cả khi cache bị nhiễm bẩn
    const devices = useMemo(() => Array.isArray(rawDevices) ? rawDevices : [], [rawDevices]);

    const { data: unclaimedDevices = [] } = useQuery({
        queryKey: ['unclaimedDevices'],
        queryFn: async () => {
            const data = await getUnclaimedDevices();
            return Array.isArray(data) ? data : [];
        },
        enabled: canManage,
        initialData: [],
    });

    const stompCallbacks = useMemo(() => ({
        onConnect: (client: any) => {
            return client.subscribe(`/topic/farm/${farmId}/device-status`, (message: any) => {
                try {
                    const update = JSON.parse(message.body);
                    queryClient.setQueryData<Device[]>(['devices', farmId], (oldDevices) => {
                        // [FIX] Kiểm tra oldDevices có phải mảng không trước khi map
                        if (!Array.isArray(oldDevices)) return [];
                        return oldDevices.map(device =>
                            device.deviceId === update.deviceId
                                ? { ...device, status: update.status, currentState: update.currentState || device.currentState, lastSeen: update.timestamp }
                                : device
                        );
                    });
                } catch (error) { console.error(error); }
            });
        }
    }), [farmId, queryClient]);

    useStomp(farmId, 'farm', stompCallbacks);

    const mutationOptions = {
        onSuccess: () => {
            antdMessage.success('Thao tác thành công!');
            queryClient.invalidateQueries({ queryKey: ['devices', farmId] });
            queryClient.invalidateQueries({ queryKey: ['unclaimedDevices'] });
            setIsModalVisible(false);
            setEditingDevice(null);
        },
        onError: (err: any) => antdMessage.error(err.response?.data?.message || 'Thao tác thất bại!'),
    };

    const saveMutation = useMutation({
        mutationFn: (values: DeviceFormData) => editingDevice ? updateDevice(editingDevice.id, { ...values, farmId: editingDevice.farmId ? undefined : farmId! }) : createDevice(farmId!, values),
        ...mutationOptions
    });

    const deleteMutation = useMutation({ mutationFn: deleteDevice, ...mutationOptions });

    const handleRefresh = useCallback(() => {
        queryClient.invalidateQueries({ queryKey: ['devices', farmId] });
        queryClient.invalidateQueries({ queryKey: ['unclaimedDevices'] });
    }, [queryClient, farmId]);

    const handleControl = async (deviceId: string, action: 'turn_on' | 'turn_off') => {
        setControllingDevices(prev => new Set(prev).add(deviceId));
        try {
            await controlDevice(deviceId, action);
            antdMessage.success(`Đã gửi lệnh thành công`);
            setTimeout(() => queryClient.invalidateQueries({ queryKey: ['devices', farmId] }), 2000);
        } catch (error) { antdMessage.error('Lỗi gửi lệnh'); }
        finally { setControllingDevices(prev => { const newSet = new Set(prev); newSet.delete(deviceId); return newSet; }); }
    };

    const filteredDevices = useMemo(() => {
        if (!debouncedSearchText) return devices;
        const lower = debouncedSearchText.toLowerCase();
        return devices.filter(d => d.name.toLowerCase().includes(lower) || d.deviceId.toLowerCase().includes(lower));
    }, [devices, debouncedSearchText]);

    const columns = [
        { title: 'Device ID', dataIndex: 'deviceId', width: 150 },
        { title: 'Tên thiết bị', dataIndex: 'name', width: 200 },
        { title: 'Loại', dataIndex: 'type', width: 180, render: (type: string) => getDeviceTypeLabel(type) },
        {
            title: 'Trạng thái', key: 'status', width: 160, render: (_: any, record: Device) => (
                <Space direction="vertical" size={4}>
                    <Tag icon={<WifiIcon />} color={record.status === DEVICE_STATUS.ONLINE ? 'success' : 'error'}>{record.status}</Tag>
                    {record.type.startsWith('ACTUATOR') && record.currentState && <Tag color={record.currentState === DEVICE_STATE.ON ? 'processing' : 'default'}>{record.currentState}</Tag>}
                </Space>
            )
        },
        { title: 'Vùng', dataIndex: 'zoneName', width: 150, render: (z?: string) => z ? <Tag color="purple">{z}</Tag> : <Text type="secondary">-</Text> },
        { title: 'Lần cuối thấy', dataIndex: 'lastSeen', width: 180, render: (t: string) => t ? new Date(t).toLocaleString('vi-VN') : 'N/A' },
        {
            title: 'Điều khiển', key: 'control', width: 250, render: (_: any, record: Device) => {
                if (!record.type.startsWith('ACTUATOR')) return <Tag color="blue">Cảm biến</Tag>;
                const isLoading = controllingDevices.has(record.deviceId);
                const isOffline = record.status === DEVICE_STATUS.OFFLINE;
                const isOn = record.currentState === DEVICE_STATE.ON;
                return (
                    <Space>
                        <Button type="primary" size="small" icon={<ThunderboltOutlined />} onClick={() => handleControl(record.deviceId, 'turn_on')} loading={isLoading && !isOn} disabled={isOn}>Bật</Button>
                        <Button danger size="small" onClick={() => handleControl(record.deviceId, 'turn_off')} loading={isLoading && isOn} disabled={!isOn}>Tắt</Button>
                        {isOffline && <Tooltip title="Offline"><Tag color="warning">Offline</Tag></Tooltip>}
                    </Space>
                );
            }
        },
        {
            title: 'Hành động', key: 'action', width: 180, fixed: 'right' as const, render: (_: any, record: Device) => (
                <Space size="small">
                    {canManage && <><Button type="text" icon={<EditOutlined />} onClick={() => { setEditingDevice(record); setIsModalVisible(true); }} /><Popconfirm title="Xóa?" onConfirm={() => deleteMutation.mutate(record.id)}><Button type="text" danger icon={<DeleteOutlined />} /></Popconfirm></>}
                    <Button type="text" icon={<DownloadOutlined />} onClick={() => exportDeviceDataAsCsv(record.deviceId, new Date(Date.now() - 7 * 864e5).toISOString(), new Date().toISOString())} />
                </Space>
            )
        }
    ];

    if (isLoadingFarm) return <div style={{ display: 'flex', justifyContent: 'center', height: '50vh' }}><Spin size="large" /></div>;
    if (!farmId) return <div style={{ padding: 24 }}><Alert message="Chưa chọn nông trại" type="warning" showIcon action={<Button onClick={() => window.location.href = '/farms'}>Đi tới Nông trại</Button>} /></div>;

    return (
        <div>
            <PageHeader title="Quản lý Thiết bị" subtitle={`${devices.length} thiết bị`} actions={<><Input.Search placeholder="Tìm kiếm..." value={searchText} onChange={e => setSearchText(e.target.value)} style={{ width: 250 }} /><Button icon={<SyncOutlined />} onClick={handleRefresh} loading={isFetchingDevices} />{canManage && <Button type="primary" icon={<PlusOutlined />} onClick={() => { setEditingDevice(null); setIsModalVisible(true); }}>Thêm mới</Button>}</>} />
            {canManage && unclaimedDevices.length > 0 && <Alert message={`${unclaimedDevices.length} thiết bị mới`} type="info" showIcon icon={<BellOutlined />} style={{ marginBottom: 24 }} closable description={<ul>{unclaimedDevices.map(d => <li key={d.id}><span><Text strong>{d.name}</Text> ({d.deviceId})</span> <Button type="link" onClick={() => { setEditingDevice(d); setIsModalVisible(true); }}>Nhận</Button></li>)}</ul>} />}
            {isLoadingDevices && devices.length === 0 ? <TableSkeleton rows={5} /> : <Table columns={columns} dataSource={filteredDevices} rowKey="id" loading={isFetchingDevices} pagination={{ pageSize: 10 }} scroll={{ x: 1300 }} />}
            {isModalVisible && <DeviceFormModal visible={isModalVisible} onClose={() => { setIsModalVisible(false); setEditingDevice(null); }} onSubmit={saveMutation.mutate} initialData={editingDevice} loading={saveMutation.isPending} />}
        </div>
    );
};

export default DevicesPage;