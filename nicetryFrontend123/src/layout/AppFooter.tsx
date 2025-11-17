import React from 'react';
import { Layout, Row, Col, Typography, Space, Divider } from 'antd';
import { GithubOutlined, MailOutlined, TwitterOutlined } from '@ant-design/icons';
import { Leaf } from 'lucide-react';
import { useTheme } from '../context/ThemeContext'; // ✅ BƯỚC 1: Import hook useTheme

const { Footer } = Layout;
const { Title, Text, Link } = Typography;

const AppFooter: React.FC = () => {
    const { isDark } = useTheme(); // ✅ BƯỚC 2: Lấy trạng thái theme hiện tại
    const currentYear = new Date().getFullYear();

    return (
        <Footer
            style={{
                // ✅ BƯỚC 3: Sửa style để "động" theo theme
                background: isDark ? 'var(--card-dark)' : 'var(--card-light)',
                padding: '48px 24px',
                borderTop: `1px solid ${isDark ? 'var(--border-dark)' : 'var(--border-light)'}`,
            }}
        >
            <div style={{ maxWidth: 1200, margin: '0 auto' }}>
                <Row gutter={[48, 48]} justify="space-between">
                    {/* Column 1: Brand Info */}
                    <Col xs={24} sm={24} md={8}>
                        <Space direction="vertical" size="middle">
                            <Space align="center" size="small">
                                <div style={{
                                    // ✅ FIX: Sửa màu nền logo theo theme
                                    backgroundColor: isDark ? 'var(--primary-dark)' : 'var(--primary-light)',
                                    borderRadius: '8px',
                                    padding: '6px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center'
                                }}>
                                    <Leaf color="white" size={20} />
                                </div>
                                <Title level={4} style={{ margin: 0 }}>SmartFarm</Title>
                            </Space>
                            <Text type="secondary" style={{ maxWidth: 280 }}>
                                Nền tảng IoT cho nông nghiệp thông minh, giúp bạn giám sát và tối ưu hóa trang trại hiệu quả.
                            </Text>
                        </Space>
                    </Col>

                    {/* Column 2: Quick Links */}
                    <Col xs={12} sm={12} md={5}>
                        {/* ✅ FIX: Sửa màu chữ tiêu đề theo theme */}
                        <Title level={5} style={{ color: isDark ? 'var(--muted-foreground-dark)' : 'var(--muted-foreground-light)' }}>LIÊN KẾT NHANH</Title>
                        <Space direction="vertical" size="small">
                            <Link href="/dashboard">Dashboard</Link>
                            <Link href="/devices">Thiết bị</Link>
                            <Link href="/rules">Quy tắc</Link>
                            <Link href="/settings">Cài đặt</Link>
                        </Space>
                    </Col>

                    {/* Column 3: Contact */}
                    <Col xs={12} sm={12} md={5}>
                        {/* ✅ FIX: Sửa màu chữ tiêu đề theo theme */}
                        <Title level={5} style={{ color: isDark ? 'var(--muted-foreground-dark)' : 'var(--muted-foreground-light)' }}>KẾT NỐI</Title>
                        <Space direction="vertical" size="small">
                            <Link href="mailto:support@smartfarm.com" target="_blank"><MailOutlined /> Email</Link>
                            <Link href="https://github.com" target="_blank"><GithubOutlined /> GitHub</Link>
                            <Link href="https://twitter.com" target="_blank"><TwitterOutlined /> Twitter</Link>
                        </Space>
                    </Col>
                </Row>

                <Divider style={{ margin: '40px 0 24px' }} />

                <Row justify="space-between" align="middle">
                    <Col>
                        <Text type="secondary" style={{ fontSize: '12px' }}>
                            © {currentYear} SmartFarm Project. All Rights Reserved.
                        </Text>
                    </Col>
                    <Col>
                        <Space size="middle">
                            <Link href="#" style={{ fontSize: '12px' }}>Điều khoản Dịch vụ</Link>
                            <Link href="#" style={{ fontSize: '12px' }}>Chính sách Bảo mật</Link>
                        </Space>
                    </Col>
                </Row>
            </div>
        </Footer>
    );
};

export default AppFooter;