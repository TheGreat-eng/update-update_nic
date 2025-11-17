import React, { useState } from 'react';
import { Table, Button, Space, Tag, Popconfirm, message, Typography, Tooltip, Switch } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, SyncOutlined } from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useFarm } from '../context/FarmContext';
import type { Schedule } from '../types/schedule';
import { getSchedulesByFarm, createSchedule, updateSchedule, deleteSchedule } from '../api/scheduleService';
import { getDevicesByFarm } from '../api/deviceService';
import ScheduleFormModal from '../components/ScheduleFormModal';
import { TableSkeleton } from '../components/LoadingSkeleton';

const { Title, Text } = Typography;

const SchedulesPage: React.FC = () => {
    const { farmId } = useFarm();
    const queryClient = useQueryClient();
    const [isModalVisible, setIsModalVisible] = useState(false);
    const [editingSchedule, setEditingSchedule] = useState<Schedule | null>(null);

    const { data: schedules, isLoading, isFetching } = useQuery({
        queryKey: ['schedules', farmId],
        queryFn: () => getSchedulesByFarm(farmId!),
        enabled: !!farmId,
    });

    const { data: devices } = useQuery({
        queryKey: ['devices', farmId],
        queryFn: () => getDevicesByFarm(farmId!).then(res => res.data.data || []),
        enabled: !!farmId,
    });

    const actuators = devices?.filter(d => d.type.startsWith('ACTUATOR')) || [];

    const mutationOptions = (successMsg: string) => ({
        onSuccess: () => {
            message.success(successMsg);
            queryClient.invalidateQueries({ queryKey: ['schedules', farmId] });
            setIsModalVisible(false);
        },
        onError: (err: any) => message.error(err.response?.data?.message || 'Thao tác thất bại!'),
    });

    const saveMutation = useMutation({
        mutationFn: (values: Schedule) =>
            editingSchedule
                ? updateSchedule(editingSchedule.id!, { ...editingSchedule, ...values })
                : createSchedule(farmId!, values),
        ...mutationOptions(editingSchedule ? 'Cập nhật thành công!' : 'Tạo lịch trình thành công!'),
    });

    const deleteMutation = useMutation({
        mutationFn: deleteSchedule,
        ...mutationOptions('Xóa lịch trình thành công!'),
    });

    const toggleMutation = useMutation({
        mutationFn: (schedule: Schedule) => updateSchedule(schedule.id!, { ...schedule, enabled: !schedule.enabled }),
        ...mutationOptions('Thay đổi trạng thái thành công!'),
    });

    const columns = [
        { title: 'Tên Lịch trình', dataIndex: 'name', key: 'name' },
        { title: 'Thiết bị', dataIndex: 'deviceName', key: 'deviceName' },
        { title: 'Hành động', dataIndex: 'action', key: 'action', render: (action: string) => <Tag color={action === 'TURN_ON' ? 'success' : 'error'}>{action}</Tag> },
        { title: 'CRON Expression', dataIndex: 'cronExpression', key: 'cronExpression', render: (cron: string) => <Text code>{cron}</Text> },
        { title: 'Trạng thái', dataIndex: 'enabled', key: 'enabled', render: (enabled: boolean, record: Schedule) => <Switch checked={enabled} onChange={() => toggleMutation.mutate(record)} /> },
        {
            title: 'Hành động',
            key: 'actionButtons',
            render: (_: any, record: Schedule) => (
                <Space>
                    <Tooltip title="Sửa"><Button icon={<EditOutlined />} onClick={() => { setEditingSchedule(record); setIsModalVisible(true); }} /></Tooltip>
                    <Popconfirm title="Xóa lịch trình này?" onConfirm={() => deleteMutation.mutate(record.id!)}>
                        <Tooltip title="Xóa"><Button danger icon={<DeleteOutlined />} /></Tooltip>
                    </Popconfirm>
                </Space>
            ),
        },
    ];

    if (isLoading && !schedules) return <TableSkeleton />;

    return (
        <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
                <Title level={2} style={{ margin: 0 }}>Lịch trình Tự động</Title>
                <Space>
                    <Button icon={<SyncOutlined />} onClick={() => queryClient.invalidateQueries({ queryKey: ['schedules', farmId] })} loading={isFetching} />
                    <Button type="primary" icon={<PlusOutlined />} onClick={() => { setEditingSchedule(null); setIsModalVisible(true); }}>Tạo Lịch trình</Button>
                </Space>
            </div>
            <Table columns={columns} dataSource={schedules} rowKey="id" loading={isFetching} />
            <ScheduleFormModal
                visible={isModalVisible}
                onClose={() => setIsModalVisible(false)}
                onSubmit={(values) => saveMutation.mutate(values as Schedule)}
                initialData={editingSchedule}
                loading={saveMutation.isPending}
                actuators={actuators}
            />
        </div>
    );
};

export default SchedulesPage;