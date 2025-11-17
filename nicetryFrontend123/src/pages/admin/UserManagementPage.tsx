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
    Tooltip
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
import { UserEditModal } from '../../components/admin/UserEditModal'; // <<<< 1. IMPORT MODAL MỚI


const { Title, Text } = Typography;

const UserManagementPage: React.FC = () => {
    const queryClient = useQueryClient();
    const [pagination, setPagination] = useState({
        current: 1,
        pageSize: 10
    });
    const [searchTerm, setSearchTerm] = useState('');
    const debouncedSearchTerm = useDebounce(searchTerm, 500);



    // <<<< 2. THÊM STATE ĐỂ QUẢN LÝ MODAL >>>>
    const [isModalVisible, setIsModalVisible] = useState(false);
    const [selectedUser, setSelectedUser] = useState<AdminUser | null>(null);



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

    const lockMutation = useMutation({
        mutationFn: lockUser,
        ...mutationOptions
    });
    const unlockMutation = useMutation({
        mutationFn: unlockUser,
        ...mutationOptions
    });
    const deleteMutation = useMutation({
        mutationFn: softDeleteUser,
        ...mutationOptions
    });

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
        {
            title: 'ID',
            dataIndex: 'id',
            key: 'id',
            width: 80
        },
        {
            title: 'Thông tin Người dùng',
            dataIndex: 'email',
            key: 'info',
            render: (_, record) => (
                <div>
                    <Text strong>{record.fullName}</Text>
                    <br />
                    <Text type="secondary">{record.email}</Text>
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
                    {record.deleted ? (
                        <Tag color="error">Đã xóa</Tag>
                    ) : record.enabled ? (
                        <Tag color="success">Hoạt động</Tag>
                    ) : (
                        <Tag color="default">Bị khóa</Tag>
                    )}
                </Space>
            ),
        },
        {
            title: 'Hành động',
            key: 'action',
            width: 250,
            render: (_, record) => (
                <Space>
                    {!record.deleted && (
                        <>
                            {record.enabled ? (
                                <Tooltip title="Khóa tài khoản">
                                    <Button
                                        icon={<LockOutlined />}
                                        onClick={() => lockMutation.mutate(record.id)}
                                        danger
                                    />
                                </Tooltip>
                            ) : (
                                <Tooltip title="Mở khóa tài khoản">
                                    <Button
                                        icon={<UnlockOutlined />}
                                        onClick={() => unlockMutation.mutate(record.id)}
                                    />
                                </Tooltip>
                            )}

                            {/* <<<< 4. KÍCH HOẠT NÚT CHỈNH SỬA >>>> */}
                            <Tooltip title="Chỉnh sửa">
                                <Button icon={<EditOutlined />} onClick={() => showEditModal(record)} />
                            </Tooltip>

                            <Popconfirm
                                title="Xóa người dùng?"
                                description="Hành động này sẽ ẩn người dùng khỏi hệ thống."
                                onConfirm={() => deleteMutation.mutate(record.id)}
                            >
                                <Tooltip title="Xóa mềm">
                                    <Button icon={<DeleteOutlined />} danger type="dashed" />
                                </Tooltip>
                            </Popconfirm>
                        </>
                    )}
                </Space>
            ),
        },
    ];

    // Hiển thị skeleton khi load lần đầu
    if (isLoading) {
        return (
            <div style={{ padding: 24 }}>
                <Title level={2} style={{ marginBottom: 24 }}>
                    Quản lý Người dùng
                </Title>
                <TableSkeleton rows={5} />
            </div>
        );
    }

    return (
        <div style={{ padding: 24 }}>
            <Space direction="vertical" style={{ width: '100%' }} size="large">
                {/* Header với tiêu đề và thanh tìm kiếm */}
                <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                }}>
                    <Title level={2} style={{ margin: 0 }}>
                        Quản lý Người dùng
                    </Title>

                    <Space>
                        <Input.Search
                            placeholder="Tìm kiếm theo email hoặc tên..."
                            onSearch={value => setSearchTerm(value)}
                            onChange={e => setSearchTerm(e.target.value)}
                            style={{ width: 300 }}
                            allowClear
                        />
                        <Button
                            icon={<SyncOutlined />}
                            onClick={() => queryClient.invalidateQueries({
                                queryKey: ['admin-users']
                            })}
                            loading={isFetching}
                        />
                    </Space>
                </div>

                {/* Bảng dữ liệu người dùng */}
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
                    }}
                    onChange={handleTableChange}
                    scroll={{ x: 800 }}
                />

                {/* <<<< 5. THÊM MODAL VÀO CUỐI COMPONENT >>>> */}
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