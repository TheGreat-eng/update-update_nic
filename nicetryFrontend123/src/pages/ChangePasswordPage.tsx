// src/pages/ChangePasswordPage.tsx
import React, { useState } from 'react';
import { Form, Input, Button, Card, Typography, message } from 'antd';
import { LockOutlined } from '@ant-design/icons';
import { changeMyPassword, type ChangePasswordData } from '../api/userService';


const { Title } = Typography;

const ChangePasswordPage: React.FC = () => {
    const [loading, setLoading] = useState(false);
    const [form] = Form.useForm();

    const onFinish = async (values: any) => {
        setLoading(true);
        try {
            const data: ChangePasswordData = {
                oldPassword: values.oldPassword,
                newPassword: values.newPassword,
            };
            // VVVV--- SỬA LẠI LỜI GỌI API ---VVVV
            await changeMyPassword(data);
            // ^^^^-----------------------------^^^^
            message.success('Đổi mật khẩu thành công!');
            form.resetFields();
        } catch (err: any) {
            const errorMessage = err.response?.data?.error || err.response?.data?.message || 'Đổi mật khẩu thất bại.';
            message.error(errorMessage);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div>
            <Title level={2} style={{ marginBottom: 24 }}>Đổi mật khẩu</Title>
            <Card>
                <Form
                    form={form}
                    name="change_password_form"
                    onFinish={onFinish}
                    layout="vertical"
                    style={{ maxWidth: 400, margin: 'auto' }}
                >
                    <Form.Item
                        name="oldPassword"
                        label="Mật khẩu cũ"
                        rules={[{ required: true, message: 'Vui lòng nhập mật khẩu cũ!' }]}
                    >
                        <Input.Password prefix={<LockOutlined />} placeholder="Mật khẩu cũ" />
                    </Form.Item>

                    <Form.Item
                        name="newPassword"
                        label="Mật khẩu mới"
                        rules={[
                            { required: true, message: 'Vui lòng nhập mật khẩu mới!' },
                            { min: 6, message: 'Mật khẩu phải có ít nhất 6 ký tự!' }
                        ]}
                        hasFeedback
                    >
                        <Input.Password prefix={<LockOutlined />} placeholder="Mật khẩu mới" />
                    </Form.Item>

                    <Form.Item
                        name="confirmPassword"
                        label="Xác nhận mật khẩu mới"
                        dependencies={['newPassword']}
                        hasFeedback
                        rules={[
                            { required: true, message: 'Vui lòng xác nhận mật khẩu mới!' },
                            ({ getFieldValue }) => ({
                                validator(_, value) {
                                    if (!value || getFieldValue('newPassword') === value) {
                                        return Promise.resolve();
                                    }
                                    return Promise.reject(new Error('Hai mật khẩu không khớp!'));
                                },
                            }),
                        ]}
                    >
                        <Input.Password prefix={<LockOutlined />} placeholder="Xác nhận mật khẩu mới" />
                    </Form.Item>

                    <Form.Item>
                        <Button type="primary" htmlType="submit" loading={loading} block>
                            Lưu thay đổi
                        </Button>
                    </Form.Item>
                </Form>
            </Card>
        </div>
    );
};

export default ChangePasswordPage;