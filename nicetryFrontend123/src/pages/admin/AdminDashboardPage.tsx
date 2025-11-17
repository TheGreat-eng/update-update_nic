// src/pages/admin/AdminDashboardPage.tsx
import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Row, Col, Card, Statistic, Spin, Alert, Typography } from 'antd';
import { UserOutlined, AppstoreOutlined, HddOutlined, WifiOutlined, BuildOutlined } from '@ant-design/icons';
import { getSystemStats } from '../../api/adminService';

const { Title } = Typography;

const AdminDashboardPage: React.FC = () => {
    const { data: stats, isLoading, isError, error } = useQuery({
        queryKey: ['admin-stats'],
        queryFn: () => getSystemStats().then(res => res.data.data),
        refetchInterval: 30000, // Cập nhật mỗi 30 giây
    });

    if (isLoading) {
        return (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '400px' }}>
                <Spin tip="Đang tải thống kê hệ thống..." size="large" />
            </div>
        );
    }

    if (isError) {
        return <Alert message="Lỗi tải dữ liệu" description={error.message} type="error" showIcon />;
    }

    return (
        <div style={{ padding: 24 }}>
            <Title level={2} style={{ marginBottom: 24 }}>Tổng quan Hệ thống</Title>
            <Row gutter={[16, 16]}>
                <Col xs={24} sm={12} md={8}>
                    <Card>
                        <Statistic
                            title="Tổng Người dùng"
                            value={stats?.totalUsers}
                            prefix={<UserOutlined />}
                        />
                    </Card>
                </Col>
                <Col xs={24} sm={12} md={8}>
                    <Card>
                        <Statistic
                            title="Tổng Nông trại"
                            value={stats?.totalFarms}
                            prefix={<AppstoreOutlined />}
                            valueStyle={{ color: '#3f8600' }}
                        />
                    </Card>
                </Col>
                <Col xs={24} sm={12} md={8}>
                    <Card>
                        <Statistic
                            title="Tổng Thiết bị"
                            value={stats?.totalDevices}
                            prefix={<HddOutlined />}
                            valueStyle={{ color: '#cf1322' }}
                        />
                    </Card>
                </Col>
                <Col xs={24} sm={12} md={8}>
                    <Card>
                        <Statistic
                            title="Thiết bị Online"
                            value={stats?.onlineDevices}
                            prefix={<WifiOutlined />}
                            valueStyle={{ color: '#108ee9' }}
                            suffix={`/ ${stats?.totalDevices}`}
                        />
                    </Card>
                </Col>
                <Col xs={24} sm={12} md={8}>
                    <Card>
                        <Statistic
                            title="Tổng Quy tắc"
                            value={stats?.totalRules}
                            prefix={<BuildOutlined />}
                        />
                    </Card>
                </Col>
            </Row>
        </div>
    );
};

export default AdminDashboardPage;