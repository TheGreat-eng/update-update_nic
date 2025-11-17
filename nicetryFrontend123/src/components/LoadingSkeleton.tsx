import React from 'react';
import { Card, Skeleton, Row, Col, Space } from 'antd';

export const DashboardSkeleton: React.FC = () => (
    <div style={{ padding: '24px' }}>
        <Row gutter={[16, 16]}>
            {[1, 2, 3, 4, 5, 6].map(i => (
                <Col xs={12} sm={12} md={8} lg={12} xl={8} key={i}>
                    <Card>
                        <Skeleton active paragraph={{ rows: 1 }} />
                    </Card>
                </Col>
            ))}
        </Row>
        <Card style={{ marginTop: 24 }}>
            <Skeleton active paragraph={{ rows: 10 }} />
        </Card>
    </div>
);

// ✅ CẢI THIỆN TABLE SKELETON
export const TableSkeleton: React.FC<{ rows?: number }> = ({ rows = 5 }) => (
    <Card>
        {/* Skeleton cho Header của bảng */}
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 24 }}>
            <Skeleton.Input style={{ width: 200 }} active />
            <Space>
                <Skeleton.Button active />
                <Skeleton.Button active />
            </Space>
        </div>
        {/* Skeleton cho nội dung bảng */}
        <Skeleton active title={false} paragraph={{ rows, width: '100%' }} />
    </Card>
);