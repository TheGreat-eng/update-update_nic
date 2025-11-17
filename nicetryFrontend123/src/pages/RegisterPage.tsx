// ==============================
// src/pages/RegisterPage.tsx (revamped UI)
// ==============================
import React, { useState } from 'react';
import { Form, Input, Button, Typography, message, Divider } from 'antd';
import { MailOutlined, LockOutlined, UserOutlined, PhoneOutlined, CheckCircleTwoTone } from '@ant-design/icons';
import { useNavigate, Link } from 'react-router-dom';
import api from '../api/axiosConfig';
import { Leaf } from 'lucide-react';
import { motion } from 'framer-motion';

const { Title, Text, Paragraph } = Typography;

const RegisterPage: React.FC = () => {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);

    const onFinish = async (values: any) => {
        setLoading(true);
        try {
            const { confirm, ...registerData } = values;
            await api.post('/auth/register', registerData);
            message.success('Đăng ký thành công! Vui lòng đăng nhập.');
            navigate('/login');
        } catch (err: any) {
            const errorMessage = err?.response?.data?.message || 'Đăng ký thất bại. Vui lòng thử lại.';
            message.error(errorMessage);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="auth-container enhanced-auth">
            {/* Showcase side */}
            <motion.aside
                className="auth-showcase pretty"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6 }}
            >
                <div>
                    <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <Leaf size={24} />
                        <Title level={4} style={{ color: 'white', margin: 0 }}>SmartFarm</Title>
                    </Link>
                </div>
                <div className="quote">
                    <Title level={2} style={{ color: 'white', fontWeight: 700, lineHeight: 1.2 }}>
                        "Đất không phải là một thứ hàng hóa, mà là một thực thể sống."
                    </Title>
                    <Paragraph style={{ color: 'rgba(255,255,255,0.78)' }}>— Vandana Shiva</Paragraph>
                </div>
            </motion.aside>

            {/* Form side */}
            <motion.main
                className="auth-form-wrapper"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.1 }}
            >
                <div className="auth-form-container glass-card">
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                        <CheckCircleTwoTone twoToneColor="#52c41a" />
                        <Title level={2} style={{ margin: 0 }}>Tạo tài khoản mới</Title>
                    </div>
                    <Text type="secondary" style={{ display: 'block', marginBottom: 24 }}>
                        Bắt đầu hành trình nông nghiệp thông minh của bạn ngay hôm nay.
                    </Text>

                    <Form name="register_form" onFinish={onFinish} size="large" layout="vertical">
                        <Form.Item label="Họ và tên" name="fullName" rules={[{ required: true, message: 'Vui lòng nhập họ tên!' }]}>
                            <Input prefix={<UserOutlined />} placeholder="Nguyễn Văn A" allowClear />
                        </Form.Item>
                        <Form.Item label="Email" name="email" rules={[{ required: true, message: 'Vui lòng nhập email!' }, { type: 'email' }]}>
                            <Input prefix={<MailOutlined />} placeholder="your-email@example.com" allowClear />
                        </Form.Item>
                        <Form.Item label="Số điện thoại" name="phone" rules={[{ required: true, message: 'Vui lòng nhập số điện thoại!' }]}>
                            <Input prefix={<PhoneOutlined />} placeholder="09xxxxxxxx" allowClear />
                        </Form.Item>
                        <Form.Item label="Mật khẩu" name="password" hasFeedback rules={[{ required: true, message: 'Vui lòng nhập mật khẩu!' }, { min: 6, message: 'Mật khẩu phải có ít nhất 6 ký tự!' }]}>
                            <Input.Password prefix={<LockOutlined />} placeholder="••••••••" />
                        </Form.Item>
                        <Form.Item
                            label="Xác nhận mật khẩu"
                            name="confirm"
                            dependencies={['password']}
                            hasFeedback
                            rules={[
                                { required: true, message: 'Vui lòng xác nhận mật khẩu!' },
                                ({ getFieldValue }) => ({
                                    validator(_, value) {
                                        if (!value || getFieldValue('password') === value) return Promise.resolve();
                                        return Promise.reject(new Error('Hai mật khẩu không khớp!'));
                                    },
                                }),
                            ]}
                        >
                            <Input.Password prefix={<LockOutlined />} placeholder="••••••••" />
                        </Form.Item>

                        <Form.Item>
                            <Button type="primary" htmlType="submit" block loading={loading} className="btn-gradient" style={{ height: 48, fontSize: 16 }}>
                                Đăng ký
                            </Button>
                        </Form.Item>

                        <Divider plain>
                            <Text type="secondary">Đã có tài khoản?</Text>
                        </Divider>
                        <Form.Item>
                            <Button block onClick={() => navigate('/login')} style={{ height: 48, fontSize: 16 }}>
                                Đăng nhập ngay
                            </Button>
                        </Form.Item>
                        <div style={{ textAlign: 'center', marginTop: 8 }}>
                            <Link to="/" className="muted-link">&larr; Quay về trang chủ</Link>
                        </div>
                    </Form>
                </div>
            </motion.main>

            {/* Styles (reuse same as Login) */}
            <style>{`
        :root {
          --primary: #6366f1;
          --primary-2: #8b5cf6;
          --card-bg: rgba(255,255,255,0.6);
        }
        .enhanced-auth { min-height: 100vh; display: grid; grid-template-columns: 1.1fr 1fr; background: radial-gradient(1200px 300px at 50% -50px, rgba(99,102,241,0.12), transparent 60%), #f7f8fb; }
        @media (max-width: 992px) { .enhanced-auth { grid-template-columns: 1fr; } }
        .auth-showcase.pretty { position: relative; padding: 32px; display: flex; flex-direction: column; justify-content: space-between; color: white; background-image: linear-gradient(rgba(17,24,39,0.25), rgba(17,24,39,0.55)), url('https://images.unsplash.com/photo-1464226184884-fa280b87c399?q=80&w=2400&auto=format&fit=crop'); background-size: cover; background-position: center; }
        .auth-showcase.pretty::after { content: ''; position: absolute; inset: 0; pointer-events: none; background: radial-gradient(800px 200px at 80% 10%, rgba(99,102,241,0.22), transparent 60%); }
        .auth-showcase .quote { max-width: 680px; }
        .auth-form-wrapper { display: grid; place-items: center; padding: 40px 24px; }
        .glass-card { width: 100%; max-width: 480px; padding: 28px; border-radius: 20px; background: var(--card-bg); backdrop-filter: blur(10px); -webkit-backdrop-filter: blur(10px); box-shadow: 0 12px 30px rgba(0,0,0,0.08); }
        .btn-gradient { background: linear-gradient(90deg, var(--primary), var(--primary-2)); border: none; box-shadow: 0 10px 24px rgba(99,91,255,0.22); }
        .btn-gradient:hover { filter: brightness(1.04); }
        .muted-link { color: rgba(0,0,0,0.55); }
        .muted-link:hover { color: rgba(0,0,0,0.8); }
      `}</style>
        </div>
    );
};

export default RegisterPage;