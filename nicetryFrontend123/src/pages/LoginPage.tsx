// ==============================
// src/pages/LoginPage.tsx (revamped UI)
// ==============================
import React, { useState } from 'react';
import { Form, Input, Button, message, Typography, Divider, Checkbox } from 'antd';
import { MailOutlined, LockOutlined } from '@ant-design/icons';
import { useNavigate, Link } from 'react-router-dom';
import { login } from '../api/authService';
import { setAuthData } from '../utils/auth';
import { Leaf } from 'lucide-react';
import { motion } from 'framer-motion';

const { Title, Text, Paragraph } = Typography;

const LoginPage: React.FC = () => {
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    const onFinish = async (values: { email: string; password: string; remember?: boolean }) => {
        setLoading(true);
        try {
            const response = await login(values.email, values.password);
            const { accessToken, refreshToken, ...userData } = response.data;
            const authToken = accessToken || response.data.token;
            if (!authToken) throw new Error('Không nhận được token từ server');

            const userInfo = {
                userId: userData.userId,
                email: userData.email,
                fullName: userData.fullName,
                phone: userData.phone || null,
                roles: [userData.role],
            };

            setAuthData(authToken, userInfo);
            if (refreshToken) localStorage.setItem('refreshToken', refreshToken);

            message.success('Đăng nhập thành công! Đang chuyển hướng...');
            setTimeout(() => {
                window.location.href = '/dashboard';
            }, 500);
        } catch (error: any) {
            const errorMsg = error?.response?.data?.message || 'Email hoặc mật khẩu không chính xác.';
            message.error(errorMsg);
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
                        "Nông nghiệp không chỉ là trồng trọt, mà là nghệ thuật và khoa học."
                    </Title>
                    <Paragraph style={{ color: 'rgba(255,255,255,0.78)' }}>— Masanobu Fukuoka</Paragraph>
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
                    <Title level={2} style={{ marginBottom: 6 }}>Chào mừng trở lại</Title>
                    <Text type="secondary" style={{ display: 'block', marginBottom: 24 }}>
                        Vui lòng nhập thông tin để truy cập hệ thống.
                    </Text>

                    <Form name="login" onFinish={onFinish} autoComplete="off" size="large" layout="vertical">
                        <Form.Item label="Email" name="email" rules={[{ required: true, message: 'Vui lòng nhập email!' }, { type: 'email', message: 'Email không hợp lệ!' }]}>
                            <Input prefix={<MailOutlined />} placeholder="your-email@example.com" allowClear />
                        </Form.Item>
                        <Form.Item label="Mật khẩu" name="password" rules={[{ required: true, message: 'Vui lòng nhập mật khẩu!' }]}>
                            <Input.Password prefix={<LockOutlined />} placeholder="••••••••" />
                        </Form.Item>
                        <div className="auth-row">
                            <Checkbox defaultChecked>Ghi nhớ tôi</Checkbox>
                            <Link to="/forgot" className="muted-link">Quên mật khẩu?</Link>
                        </div>
                        <Form.Item>
                            <Button type="primary" htmlType="submit" loading={loading} block className="btn-gradient" style={{ height: 48, fontSize: 16 }}>
                                Đăng nhập
                            </Button>
                        </Form.Item>
                    </Form>

                    <Divider plain>
                        <Text type="secondary">Chưa có tài khoản?</Text>
                    </Divider>
                    <Form.Item>
                        <Button block onClick={() => navigate('/register')} style={{ height: 48, fontSize: 16 }}>
                            Đăng ký ngay
                        </Button>
                    </Form.Item>
                    <div style={{ textAlign: 'center', marginTop: 8 }}>
                        <Link to="/" className="muted-link">&larr; Quay về trang chủ</Link>
                    </div>
                </div>
            </motion.main>

            {/* Styles (scoped for auth pages) */}
            <style>{`
        :root {
          --primary: #6366f1; /* indigo-500 */
          --primary-2: #8b5cf6; /* violet-500 */
          --auth-bg: #0b1020;
          --card-bg: rgba(255,255,255,0.6);
          --text-dark: #0f172a;
        }

        .enhanced-auth {
          min-height: 100vh; display: grid; grid-template-columns: 1.1fr 1fr; gap: 0;
          background: radial-gradient(1200px 300px at 50% -50px, rgba(99,102,241,0.12), transparent 60%), #f7f8fb;
        }
        @media (max-width: 992px) { .enhanced-auth { grid-template-columns: 1fr; } }

        .auth-showcase.pretty {
          position: relative; padding: 32px; display: flex; flex-direction: column; justify-content: space-between;
          background-image:
            linear-gradient(rgba(17,24,39,0.25), rgba(17,24,39,0.55)),
            url('https://images.unsplash.com/photo-1517261144873-64e4538b69ab?q=80&w=2400&auto=format&fit=crop');
          background-size: cover; background-position: center; color: white;
        }
        .auth-showcase.pretty::after { content: ''; position: absolute; inset: 0; pointer-events: none; 
          background: radial-gradient(800px 200px at 20% 10%, rgba(139,92,246,0.25), transparent 60%); }
        .auth-showcase .quote { max-width: 680px; }

        .auth-form-wrapper { display: grid; place-items: center; padding: 40px 24px; }
        .glass-card {
          width: 100%; max-width: 460px; padding: 28px; border-radius: 20px;
          background: var(--card-bg); backdrop-filter: blur(10px); -webkit-backdrop-filter: blur(10px);
          box-shadow: 0 12px 30px rgba(0,0,0,0.08);
        }

        .btn-gradient { background: linear-gradient(90deg, var(--primary), var(--primary-2)); border: none; box-shadow: 0 10px 24px rgba(99,91,255,0.22); }
        .btn-gradient:hover { filter: brightness(1.04); }

        .auth-row { display: flex; align-items: center; justify-content: space-between; margin: 6px 0 16px; }
        .muted-link { color: rgba(0,0,0,0.55); }
        .muted-link:hover { color: rgba(0,0,0,0.8); }
      `}</style>
        </div>
    );
};

export default LoginPage;



