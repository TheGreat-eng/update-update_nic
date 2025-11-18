// TẠO FILE MỚI: src/pages/admin/PlantProfileManagementPage.tsx
import React, { useState } from 'react';
import { Table, Button, Space, Popconfirm, message, Typography, Tag } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getAllProfilesAsAdmin, createProfileAsAdmin, updateProfileAsAdmin, deleteProfileAsAdmin } from '../../api/adminService';
import type { PlantProfileDTO } from '../../types/admin';
import { TableSkeleton } from '../../components/LoadingSkeleton';
import ProfileFormModal from '../../components/admin/ProfileFormModal';

const { Title } = Typography;

const PlantProfileManagementPage: React.FC = () => {
    const queryClient = useQueryClient();
    const [isModalVisible, setIsModalVisible] = useState(false);
    const [editingProfile, setEditingProfile] = useState<PlantProfileDTO | null>(null);

    const { data: profiles, isLoading } = useQuery({
        queryKey: ['admin-plant-profiles'],
        queryFn: getAllProfilesAsAdmin,
    });

    const mutationOptions = (successMsg: string) => ({
        onSuccess: () => {
            message.success(successMsg);
            queryClient.invalidateQueries({ queryKey: ['admin-plant-profiles'] });
            setIsModalVisible(false);
        },
        onError: (err: any) => message.error(err.response?.data?.message || 'Thao tác thất bại!'),
    });

    const saveMutation = useMutation({
        mutationFn: (values: PlantProfileDTO) =>
            editingProfile?.id
                ? updateProfileAsAdmin(editingProfile.id, values)
                : createProfileAsAdmin(values),
        ...mutationOptions(editingProfile ? 'Cập nhật thành công!' : 'Tạo hồ sơ thành công!'),
    });

    const deleteMutation = useMutation({
        mutationFn: deleteProfileAsAdmin,
        ...mutationOptions('Xóa hồ sơ thành công!'),
    });

    const columns = [
        { title: 'Tên Hồ sơ', dataIndex: 'name', key: 'name' },
        { title: 'Mô tả', dataIndex: 'description', key: 'description' },
        { title: 'Số lượng cài đặt', key: 'settings', render: (_: any, record: PlantProfileDTO) => <Tag>{Object.keys(record.settings).length}</Tag> },
        {
            title: 'Hành động',
            key: 'action',
            render: (_: any, record: PlantProfileDTO) => (
                <Space>
                    <Button icon={<EditOutlined />} onClick={() => { setEditingProfile(record); setIsModalVisible(true); }}>Sửa</Button>
                    <Popconfirm title="Xóa hồ sơ này?" onConfirm={() => record.id && deleteMutation.mutate(record.id)}>
                        <Button danger icon={<DeleteOutlined />}>Xóa</Button>
                    </Popconfirm>
                </Space>
            ),
        },
    ];

    if (isLoading) return <TableSkeleton />;

    return (
        <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
                <Title level={2}>Quản lý Hồ sơ Cây trồng</Title>
                <Button type="primary" icon={<PlusOutlined />} onClick={() => { setEditingProfile(null); setIsModalVisible(true); }}>Tạo Hồ sơ</Button>
            </div>
            <Table columns={columns} dataSource={profiles} rowKey="id" loading={isLoading} />
            <ProfileFormModal
                visible={isModalVisible}
                onClose={() => setIsModalVisible(false)}
                onSubmit={(values) => saveMutation.mutate(values)}
                initialData={editingProfile}
                loading={saveMutation.isPending}
            />
        </div>
    );
};

export default PlantProfileManagementPage;