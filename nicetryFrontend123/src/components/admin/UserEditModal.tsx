// src/components/admin/UserEditModal.tsx

import React, { useEffect } from 'react';
import { Modal, Form, Input, Button, Switch, message, Divider, Popconfirm, Typography } from 'antd';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { updateUserAsAdmin, setPasswordAsAdmin } from '../../api/adminService';
import type { AdminUser } from '../../types/admin';




const { Title } = Typography;


interface UserEditModalProps {
    user: AdminUser | null;
    visible: boolean;
    onClose: () => void;
}

export const UserEditModal: React.FC<UserEditModalProps> = ({ user, visible, onClose }) => {
    const queryClient = useQueryClient();
    const [updateForm] = Form.useForm();
    const [passwordForm] = Form.useForm();

    useEffect(() => {
        if (user) {
            updateForm.setFieldsValue({
                fullName: user.fullName,
                phoneNumber: user.phoneNumber,
                enabled: user.enabled,
            });
        }
    }, [user, updateForm]);

    const mutationOptions = (successMsg: string) => ({
        onSuccess: () => {
            message.success(successMsg);
            queryClient.invalidateQueries({ queryKey: ['admin-users'] });
            onClose();
        },
        onError: (err: any) => {
            message.error(err.response?.data?.message || 'Thao tác thất bại!');
        },
    });

    const updateInfoMutation = useMutation({
        mutationFn: (values: { fullName: string; phoneNumber: string; enabled: boolean }) => {
            if (!user) throw new Error("User not found");
            return updateUserAsAdmin(user.id, values);
        },
        ...mutationOptions('Cập nhật thông tin thành công!'),
    });

    const setPasswordMutation = useMutation({
        mutationFn: (values: { newPassword: string }) => {
            if (!user) throw new Error("User not found");
            return setPasswordAsAdmin(user.id, values.newPassword);
        },
        ...mutationOptions('Đặt lại mật khẩu thành công!'),
    });

    const handleUpdateInfo = () => {
        updateForm.validateFields().then(values => {
            updateInfoMutation.mutate(values);
        });
    };

    const handleSetPassword = () => {
        passwordForm.validateFields().then(values => {
            setPasswordMutation.mutate(values);
            passwordForm.resetFields();
        });
    };

    if (!user) return null;

    return (
        <Modal
            title={`Chỉnh sửa: ${user.fullName} (${user.email})`}
            open={visible}
            onCancel={onClose}
            footer={[
                <Button key="close" onClick={onClose}>
                    Đóng
                </Button>
            ]}
            width={600}
            destroyOnClose
        >
            <Title level={5}>Cập nhật thông tin</Title>
            <Form form={updateForm} layout="vertical" onFinish={handleUpdateInfo}>
                <Form.Item name="fullName" label="Họ và tên" rules={[{ required: true }]}>
                    <Input />
                </Form.Item>
                <Form.Item name="phoneNumber" label="Số điện thoại">
                    <Input />
                </Form.Item>
                <Form.Item name="enabled" label="Trạng thái tài khoản" valuePropName="checked">
                    <Switch checkedChildren="Hoạt động" unCheckedChildren="Bị khóa" />
                </Form.Item>
                <Form.Item>
                    <Button type="primary" htmlType="submit" loading={updateInfoMutation.isPending}>
                        Lưu thông tin
                    </Button>
                </Form.Item>
            </Form>

            <Divider />

            <Title level={5}>Đặt lại mật khẩu</Title>
            <Form form={passwordForm} layout="vertical" onFinish={handleSetPassword}>
                <Form.Item name="newPassword" label="Mật khẩu mới" rules={[{ required: true, min: 6 }]}>
                    <Input.Password placeholder="Nhập mật khẩu mới cho người dùng" />
                </Form.Item>
                <Form.Item>
                    <Popconfirm
                        title="Bạn chắc chắn muốn đặt lại mật khẩu?"
                        onConfirm={handleSetPassword}
                        okText="Xác nhận"
                    >
                        <Button danger loading={setPasswordMutation.isPending}>
                            Đặt lại mật khẩu
                        </Button>
                    </Popconfirm>
                </Form.Item>
            </Form>
        </Modal>
    );
};