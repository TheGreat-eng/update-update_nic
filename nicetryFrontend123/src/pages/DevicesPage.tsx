// src/pages/DevicesPage.tsx (CLEANED UP)

import React, { useState, useMemo, useCallback } from 'react';
// VVVV--- XÓA 'Modal' và 'message' không cần thiết từ antd ---VVVV
import { Table, Button, Space, Tag, Popconfirm, Input, Spin, Alert, Tooltip, Typography, message as antdMessage } from 'antd';
import {
    PlusOutlined, DownloadOutlined, EditOutlined, DeleteOutlined,
    SyncOutlined, ThunderboltOutlined, WifiOutlined as WifiIcon, BellOutlined
} from '@ant-design/icons'; // <-- Xóa 'StopOutlined'
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
//import type { DeviceStatusMessage } from '../types/websocket';
import { DEVICE_STATUS, DEVICE_STATE, getDeviceTypeLabel } from '../constants/device';

const { Title, Text } = Typography;

// ... Component PageHeader giữ nguyên ...
const PageHeader = ({ title, subtitle, actions }: { title: string, subtitle: string, actions: React.ReactNode }) => (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
            <Title level={2} style={{ margin: 0 }}>{title}</Title>
            <Text type="secondary">{subtitle}</Text>
        </div>
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

    const { data: farms } = useQuery({
        queryKey: ['farms'],
        queryFn: () => getFarms().then(res => res.data.data),
    });
    const canManage = useMemo(() => {
        if (!farmId || !farms) return false;
        const currentFarm = farms.find(f => f.id === farmId);
        return currentFarm?.currentUserRole === 'OWNER' || currentFarm?.currentUserRole === 'OPERATOR';
    }, [farmId, farms]);

    const { data: devices = [], isLoading: isLoadingDevices, isFetching: isFetchingDevices } = useQuery({
        queryKey: ['devices', farmId],
        queryFn: () => getDevicesByFarm(farmId!).then(res => res.data.data || []),
        enabled: !!farmId,
    });

    // VVVV--- XÓA BIẾN 'refetchUnclaimed' không dùng đến ---VVVV
    const { data: unclaimedDevices = [] } = useQuery({
        queryKey: ['unclaimedDevices'],
        queryFn: getUnclaimedDevices,
        enabled: canManage,
    });
    // ^^^^------------------------------------------------^^^^

    // --- OPTIMISTIC UPDATE CHO DEVICES PAGE ---
    // --- OPTIMISTIC UPDATE CHO DEVICES PAGE ---
    useStomp(farmId, 'farm', {
        onConnect: (client) => {
            return client.subscribe(`/topic/farm/${farmId}/device-status`, (message) => {
                try {
                    const update: any = JSON.parse(message.body); // Dùng any để debug
                    console.log('⚡ WebSocket nhận được:', update);

                    queryClient.setQueryData<Device[]>(['devices', farmId], (oldDevices) => {
                        if (!oldDevices) return [];

                        return oldDevices.map(device => {
                            if (device.deviceId === update.deviceId) {
                                // Logic mới: Ưu tiên lấy từ update, nếu không có thì kiểm tra xem update có key 'state' không (do fake_pump.py gửi 'state')
                                const newState = update.currentState || update.state || device.currentState;

                                console.log(`Cập nhật ${device.deviceId}: OldState=${device.currentState} -> NewState=${newState}`);

                                return {
                                    ...device,
                                    status: update.status,
                                    currentState: newState, // Cập nhật state mới
                                    lastSeen: update.timestamp
                                };
                            }
                            return device;
                        });
                    });

                    // Nếu đang điều khiển thiết bị này, bỏ trạng thái loading
                    if (controllingDevices.has(update.deviceId)) {
                        setControllingDevices(prev => {
                            const newSet = new Set(prev);
                            newSet.delete(update.deviceId);
                            return newSet;
                        });
                        antdMessage.success(`Thiết bị ${update.deviceId} đã phản hồi: ${update.status}`);
                    }

                } catch (error) {
                    console.error('Failed to parse device status message:', error);
                }
            });
        }
    });

    const mutationOptions = {
        onSuccess: () => {
            antdMessage.success('Thao tác thành công!');
            queryClient.invalidateQueries({ queryKey: ['devices', farmId] });
            queryClient.invalidateQueries({ queryKey: ['unclaimedDevices'] });
            setIsModalVisible(false);
            setEditingDevice(null);
        },
        onError: (err: any) => {
            antdMessage.error(err.response?.data?.message || 'Thao tác thất bại!');
        },
    };

    const saveMutation = useMutation({
        mutationFn: (values: DeviceFormData) => {
            if (editingDevice) {
                const payload = { ...values, farmId: editingDevice.farmId ? undefined : farmId! };
                return updateDevice(editingDevice.id, payload);
            }
            return createDevice(farmId!, values);
        },
        ...mutationOptions
    });

    const deleteMutation = useMutation({
        mutationFn: deleteDevice,
        ...mutationOptions
    });

    const handleRefresh = useCallback(() => {
        queryClient.invalidateQueries({ queryKey: ['devices', farmId] });
        queryClient.invalidateQueries({ queryKey: ['unclaimedDevices'] });
    }, [queryClient, farmId]);

    const showModal = (device?: Device) => {
        setEditingDevice(device || null);
        setIsModalVisible(true);
    };

    const handleSubmit = (values: DeviceFormData) => {
        saveMutation.mutate(values);
    };

    const handleControl = async (deviceId: string, action: 'turn_on' | 'turn_off') => {
        setControllingDevices(prev => new Set(prev).add(deviceId));
        try {
            await controlDevice(deviceId, action);
            antdMessage.success(`Đã gửi lệnh ${action === 'turn_on' ? 'bật' : 'tắt'} tới thiết bị ${deviceId}`);
            setTimeout(() => queryClient.invalidateQueries({ queryKey: ['devices', farmId] }), 2000);
        } catch (error) {
            antdMessage.error('Không thể gửi lệnh điều khiển.');
        } finally {
            setControllingDevices(prev => {
                const newSet = new Set(prev);
                newSet.delete(deviceId);
                return newSet;
            });
        }
    };

    const filteredDevices = useMemo(() => {
        if (!debouncedSearchText) return devices;
        const lowerSearch = debouncedSearchText.toLowerCase();
        return devices.filter(d =>
            d.name.toLowerCase().includes(lowerSearch) ||
            d.deviceId.toLowerCase().includes(lowerSearch)
        );
    }, [devices, debouncedSearchText]);

    const columns = [
        // ... (Columns giữ nguyên, không cần sửa)
        {
            title: 'Device ID',
            dataIndex: 'deviceId',
            key: 'deviceId',
            width: 150,
        },
        {
            title: 'Tên thiết bị',
            dataIndex: 'name',
            key: 'name',
            width: 200,
        },
        {
            title: 'Loại',
            dataIndex: 'type',
            key: 'type',
            width: 180,
            render: (type: string) => getDeviceTypeLabel(type),
        },
        {
            title: 'Trạng thái',
            key: 'status',
            width: 160,
            render: (_: any, record: Device) => (
                <Space direction="vertical" size={4}>
                    <Tag icon={<WifiIcon />} color={record.status === DEVICE_STATUS.ONLINE ? 'success' : 'error'} style={{ margin: 0 }}>
                        {record.status}
                    </Tag>
                    {record.type.startsWith('ACTUATOR') && record.currentState && (
                        <Tag color={record.currentState === DEVICE_STATE.ON ? 'processing' : 'default'} style={{ margin: 0 }}>
                            {record.currentState}
                        </Tag>
                    )}
                </Space>
            ),
        },
        {
            title: 'Vùng',
            dataIndex: 'zoneName',
            key: 'zoneName',
            width: 150,
            render: (zoneName?: string) => zoneName ? <Tag color="purple">{zoneName}</Tag> : <Text type="secondary">-</Text>,
        },
        {
            title: 'Lần cuối thấy',
            dataIndex: 'lastSeen',
            key: 'lastSeen',
            width: 180,
            render: (lastSeen: string) => lastSeen ? new Date(lastSeen).toLocaleString('vi-VN') : 'N/A',
        },
        {
            title: 'Điều khiển',
            key: 'control',
            width: 250,
            render: (_: any, record: Device) => {
                if (!record.type.startsWith('ACTUATOR')) return <Tag color="blue">Cảm biến</Tag>;
                const isLoading = controllingDevices.has(record.deviceId);
                const isOffline = record.status === DEVICE_STATUS.OFFLINE;
                const isOn = record.currentState === DEVICE_STATE.ON;
                return (
                    <Space>
                        <Button type="primary" size="small" icon={<ThunderboltOutlined />} onClick={() => handleControl(record.deviceId, 'turn_on')} loading={isLoading && !isOn} disabled={isOn}>Bật</Button>
                        <Button danger size="small" onClick={() => handleControl(record.deviceId, 'turn_off')} loading={isLoading && isOn} disabled={!isOn}>Tắt</Button>
                        {isOffline && <Tooltip title="Thiết bị đang offline, lệnh sẽ được xếp hàng chờ."><Tag color="warning">Offline</Tag></Tooltip>}
                    </Space>
                );
            },
        },
        {
            title: 'Hành động',
            key: 'action',
            width: 180,
            fixed: 'right' as const,
            render: (_: any, record: Device) => (
                <Space size="small">
                    {canManage && (
                        <>
                            <Tooltip title="Sửa"><Button type="text" icon={<EditOutlined />} onClick={() => showModal(record)} /></Tooltip>
                            <Popconfirm title="Xóa thiết bị?" onConfirm={() => deleteMutation.mutate(record.id)}>
                                <Tooltip title="Xóa"><Button type="text" danger icon={<DeleteOutlined />} /></Tooltip>
                            </Popconfirm>
                        </>
                    )}
                    <Tooltip title="Xuất CSV">
                        <Button type="text" icon={<DownloadOutlined />} onClick={() => {
                            const end = new Date().toISOString();
                            const start = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
                            exportDeviceDataAsCsv(record.deviceId, start, end);
                        }} />
                    </Tooltip>
                </Space>
            ),
        },
    ];

    if (isLoadingFarm) {
        return <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '50vh' }}><Spin size="large" tip="Đang tải nông trại..." /></div>;
    }

    if (!farmId) {
        return <div style={{ padding: 24 }}><Alert message="Chưa chọn nông trại" description="Vui lòng chọn hoặc tạo nông trại để xem thiết bị." type="warning" showIcon action={<Button type="primary" onClick={() => window.location.href = '/farms'}>Đến trang Nông trại</Button>} /></div>;
    }

    if (isLoadingDevices && devices.length === 0) {
        return <div style={{ padding: 24 }}><TableSkeleton rows={5} /></div>;
    }

    return (
        <div>
            <PageHeader
                title="Quản lý Thiết bị"
                subtitle={`${devices.length} thiết bị trong nông trại này`}
                actions={
                    <>
                        <Input.Search placeholder="Tìm kiếm..." value={searchText} onChange={(e) => setSearchText(e.target.value)} style={{ width: 250 }} allowClear />
                        <Button icon={<SyncOutlined />} onClick={handleRefresh} loading={isFetchingDevices} />
                        {canManage && <Button type="primary" icon={<PlusOutlined />} onClick={() => showModal()}>Thêm mới</Button>}
                    </>
                }
            />

            {canManage && unclaimedDevices.length > 0 && (
                <Alert
                    message={`Tìm thấy ${unclaimedDevices.length} thiết bị mới đang chờ`}
                    description={
                        <ul style={{ paddingLeft: 20, margin: '8px 0 0' }}>
                            {unclaimedDevices.map(device => (
                                <li key={device.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <span><Text strong>{device.name}</Text> ({device.deviceId})</span>
                                    <Button type="link" onClick={() => showModal(device)}>Nhận thiết bị này</Button>
                                </li>
                            ))}
                        </ul>
                    }
                    type="info" showIcon icon={<BellOutlined />} style={{ marginBottom: 24 }} closable
                />
            )}

            <Table
                columns={columns}
                dataSource={filteredDevices}
                rowKey="id"
                loading={isFetchingDevices}
                pagination={{ pageSize: 10, total: filteredDevices.length }}
                scroll={{ x: 1300 }}
            />

            {isModalVisible && (
                <DeviceFormModal
                    visible={isModalVisible}
                    onClose={() => { setIsModalVisible(false); setEditingDevice(null); }}
                    onSubmit={handleSubmit}
                    initialData={editingDevice ? {
                        name: editingDevice.name,
                        deviceId: editingDevice.deviceId,
                        type: editingDevice.type,
                        description: editingDevice.description,
                        zoneId: editingDevice.zoneId,
                    } : null}
                    loading={saveMutation.isPending}
                />
            )}
        </div>
    );
};

export default DevicesPage;