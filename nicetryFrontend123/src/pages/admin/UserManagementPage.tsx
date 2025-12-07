// src/pages/admin/UserManagementPage.tsx
import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
    Table,
    Button,
    Space,
    Tag,
    Popconfirm,
    message,
    Typography,
    Input,
    Tooltip,
    Grid // 1. THÊM IMPORT GRID
} from 'antd';
import type { TableProps, PaginationProps } from 'antd';
import {
    LockOutlined,
    UnlockOutlined,
    DeleteOutlined,
    EditOutlined,
    SyncOutlined
} from '@ant-design/icons';

import { getAllUsers, lockUser, unlockUser, softDeleteUser } from '../../api/adminService';
import type { AdminUser } from '../../types/admin';
import { useDebounce } from '../../hooks/useDebounce';
import { TableSkeleton } from '../../components/LoadingSkeleton';
import { UserEditModal } from '../../components/admin/UserEditModal';

const { Title, Text } = Typography;
const { useBreakpoint } = Grid; // 2. KHAI BÁO HOOK

const UserManagementPage: React.FC = () => {
    const queryClient = useQueryClient();
    const [pagination, setPagination] = useState({
        current: 1,
        pageSize: 10
    });
    const [searchTerm, setSearchTerm] = useState('');
    const debouncedSearchTerm = useDebounce(searchTerm, 500);

    const [isModalVisible, setIsModalVisible] = useState(false);
    const [selectedUser, setSelectedUser] = useState<AdminUser | null>(null);

    // 3. CHECK MÀN HÌNH MOBILE
    const screens = useBreakpoint();
    const isMobile = !screens.md; // Nhỏ hơn md (768px) là mobile

    // Fetch users data
    const { data, isLoading, isFetching } = useQuery({
        queryKey: ['admin-users', pagination.current, pagination.pageSize, debouncedSearchTerm],
        queryFn: () =>
            getAllUsers(pagination.current - 1, pagination.pageSize, debouncedSearchTerm)
                .then(res => res.data.data),
    });

    // Mutation configuration
    const mutationOptions = {
        onSuccess: () => {
            message.success('Thao tác thành công!');
            queryClient.invalidateQueries({ queryKey: ['admin-users'] });
        },
        onError: (err: any) => {
            message.error(err.response?.data?.message || 'Thao tác thất bại!');
        },
    };

    const lockMutation = useMutation({ mutationFn: lockUser, ...mutationOptions });
    const unlockMutation = useMutation({ mutationFn: unlockUser, ...mutationOptions });
    const deleteMutation = useMutation({ mutationFn: softDeleteUser, ...mutationOptions });

    const handleTableChange = (newPagination: PaginationProps) => {
        setPagination({
            current: newPagination.current || 1,
            pageSize: newPagination.pageSize || 10,
        });
    };

    const showEditModal = (user: AdminUser) => {
        setSelectedUser(user);
        setIsModalVisible(true);
    };

    // Table columns configuration
    const columns: TableProps<AdminUser>['columns'] = [
        { title: 'ID', dataIndex: 'id', key: 'id', width: 60 }, // Giảm width ID chút cho gọn
        {
            title: 'Thông tin Người dùng',
            dataIndex: 'email',
            key: 'info',
            render: (_, record) => (
                <div>
                    <Text strong>{record.fullName}</Text>
                    <br />
                    <Text type="secondary" style={{ fontSize: '12px' }}>{record.email}</Text>
                </div>
            ),
        },
        {
            title: 'Vai trò',
            dataIndex: 'role',
            key: 'role',
            render: (role) => (
                <Tag color={role === 'ADMIN' ? 'volcano' : 'geekblue'}>
                    {role.toUpperCase()}
                </Tag>
            ),
        },
        {
            title: 'Trạng thái',
            key: 'status',
            render: (_, record) => (
                <Space>
                    {record.deleted ? <Tag color="error">Đã xóa</Tag> : record.enabled ? <Tag color="success">Hoạt động</Tag> : <Tag color="default">Bị khóa</Tag>}
                </Space>
            ),
        },
        {
            title: 'Hành động',
            key: 'action',
            width: 180, // Giảm width hành động
            render: (_, record) => (
                <Space size="small">
                    {!record.deleted && (
                        <>
                            {record.enabled ? (
                                <Tooltip title="Khóa"><Button size="small" icon={<LockOutlined />} onClick={() => lockMutation.mutate(record.id)} danger /></Tooltip>
                            ) : (
                                <Tooltip title="Mở khóa"><Button size="small" icon={<UnlockOutlined />} onClick={() => unlockMutation.mutate(record.id)} /></Tooltip>
                            )}
                            <Tooltip title="Sửa"><Button size="small" icon={<EditOutlined />} onClick={() => showEditModal(record)} /></Tooltip>
                            <Popconfirm title="Xóa?" onConfirm={() => deleteMutation.mutate(record.id)}>
                                <Tooltip title="Xóa mềm"><Button size="small" icon={<DeleteOutlined />} danger type="dashed" /></Tooltip>
                            </Popconfirm>
                        </>
                    )}
                </Space>
            ),
        },
    ];

    if (isLoading) return <div style={{ padding: 24 }}><Title level={2} style={{ marginBottom: 24 }}>Quản lý Người dùng</Title><TableSkeleton rows={5} /></div>;

    return (
        <div style={{ padding: 24 }}>
            <Space direction="vertical" style={{ width: '100%' }} size="large">
                {/* 4. SỬA HEADER RESPONSIVE */}
                <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: isMobile ? 'flex-start' : 'center', // Mobile căn trái, Desktop căn giữa
                    flexDirection: isMobile ? 'column' : 'row',     // Mobile xếp dọc, Desktop xếp ngang
                    gap: isMobile ? 16 : 0                          // Thêm khoảng cách khi xếp dọc
                }}>
                    <Title level={2} style={{ margin: 0 }}>Quản lý Người dùng</Title>

                    <Space style={{ width: isMobile ? '100%' : 'auto' }}>
                        <Input.Search
                            placeholder="Tìm kiếm..."
                            onSearch={value => setSearchTerm(value)}
                            onChange={e => setSearchTerm(e.target.value)}
                            // Mobile: full width, Desktop: 300px
                            style={{ width: isMobile ? '100%' : 300 }}
                            allowClear
                        />
                        <Button
                            icon={<SyncOutlined />}
                            onClick={() => queryClient.invalidateQueries({ queryKey: ['admin-users'] })}
                            loading={isFetching}
                        />
                    </Space>
                </div>

                <Table
                    columns={columns}
                    dataSource={data?.content}
                    loading={isFetching}
                    rowKey="id"
                    pagination={{
                        current: pagination.current,
                        pageSize: pagination.pageSize,
                        total: data?.totalElements,
                        showSizeChanger: true,
                        simple: isMobile // Mobile dùng pagination đơn giản cho gọn
                    }}
                    onChange={handleTableChange}
                    scroll={{ x: 800 }} // Đảm bảo scroll ngang
                    size={isMobile ? "small" : "middle"} // Table nhỏ gọn hơn trên mobile
                />

                <UserEditModal
                    user={selectedUser}
                    visible={isModalVisible}
                    onClose={() => setIsModalVisible(false)}
                />
            </Space>
        </div>
    );
};

export default UserManagementPage;