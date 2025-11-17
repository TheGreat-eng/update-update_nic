// src/pages/ProfilePage.tsx
import React, { useState } from 'react';
import { Card, Avatar, Typography, Descriptions, Spin, Alert, Button, Space, Modal, Form, Input, message, Tag } from 'antd';
import { UserOutlined, MailOutlined, PhoneOutlined, IdcardOutlined, EditOutlined } from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getMyProfile, updateMyProfile, type UpdateProfileData } from '../api/userService';
import { useNavigate } from 'react-router-dom';

const { Title, Text } = Typography;

const ProfilePage: React.FC = () => {
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const [isModalVisible, setIsModalVisible] = useState(false);
    const [form] = Form.useForm();

    // Sử dụng React Query để fetch và cache dữ liệu người dùng
    const { data: user, isLoading, isError, error } = useQuery({
        queryKey: ['userProfile'],
        queryFn: () => getMyProfile().then(res => res.data.data),
    });

    // Sử dụng React Query Mutation để cập nhật thông tin
    const updateMutation = useMutation({
        mutationFn: updateMyProfile,
        onSuccess: (response) => {
            // Cập nhật lại cache của React Query với dữ liệu mới
            queryClient.setQueryData(['userProfile'], response.data.data);
            message.success('Cập nhật thông tin thành công!');
            setIsModalVisible(false);
        },
        onError: (err: any) => {
            message.error(err.response?.data?.message || 'Cập nhật thất bại.');
        },
    });

    const showEditModal = () => {
        if (user) {
            form.setFieldsValue({
                fullName: user.fullName,
                phoneNumber: user.phoneNumber,
            });
            setIsModalVisible(true);
        }
    };

    const handleUpdate = (values: UpdateProfileData) => {
        updateMutation.mutate(values);
    };

    if (isLoading) {
        return (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '400px' }}>
                <Spin size="large" />
            </div>
        );
    }

    if (isError) {
        return <Alert message="Lỗi" description={error.message} type="error" showIcon />;
    }

    return (
        <div style={{ padding: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
                <Title level={2} style={{ margin: 0 }}>Thông tin cá nhân</Title>
                <Button icon={<EditOutlined />} onClick={showEditModal}>
                    Chỉnh sửa
                </Button>
            </div>

            <Card>
                {/* Avatar & Name Section */}
                <div style={{ display: 'flex', alignItems: 'center', marginBottom: 32, paddingBottom: 24, borderBottom: '1px solid #f0f0f0' }}>
                    <Avatar size={80} icon={<UserOutlined />} style={{ backgroundColor: '#667eea' }} />
                    <div style={{ marginLeft: 20 }}>
                        <Title level={4} style={{ margin: 0 }}>{user?.fullName}</Title>




                        <Tag color="blue">{user?.role}</Tag>
                    </div>
                </div>

                {/* User Details */}
                <Descriptions bordered column={1}>
                    <Descriptions.Item label={<Space><IdcardOutlined />User ID</Space>}><Text code>{user?.id}</Text></Descriptions.Item>
                    <Descriptions.Item label={<Space><MailOutlined />Email</Space>}>{user?.email}</Descriptions.Item>
                    <Descriptions.Item label={<Space><PhoneOutlined />Số điện thoại</Space>}>{user?.phoneNumber || 'Chưa cập nhật'}</Descriptions.Item>
                </Descriptions>

                {/* Action Buttons */}
                <div style={{ marginTop: 24, paddingTop: 24, borderTop: '1px solid #f0f0f0' }}>
                    <Button onClick={() => navigate('/change-password')}>Đổi mật khẩu</Button>
                </div>
            </Card>

            {/* Modal chỉnh sửa thông tin */}
            <Modal
                title="Chỉnh sửa thông tin cá nhân"
                open={isModalVisible}
                onCancel={() => setIsModalVisible(false)}
                footer={null}
                destroyOnClose
            >
                <Form
                    form={form}
                    layout="vertical"
                    onFinish={handleUpdate}
                    initialValues={{ fullName: user?.fullName, phoneNumber: user?.phoneNumber }}
                >
                    <Form.Item
                        name="fullName"
                        label="Họ và tên"
                        rules={[{ required: true, message: 'Vui lòng nhập họ tên!' }]}
                    >
                        <Input prefix={<UserOutlined />} />
                    </Form.Item>
                    <Form.Item
                        name="phoneNumber"
                        label="Số điện thoại"
                        rules={[{ required: true, message: 'Vui lòng nhập số điện thoại!' }]}
                    >
                        <Input prefix={<PhoneOutlined />} />
                    </Form.Item>
                    <Form.Item>
                        <Space>
                            <Button onClick={() => setIsModalVisible(false)}>Hủy</Button>
                            <Button type="primary" htmlType="submit" loading={updateMutation.isPending}>
                                Lưu thay đổi
                            </Button>
                        </Space>
                    </Form.Item>
                </Form>
            </Modal>
        </div>
    );
};

export default ProfilePage;