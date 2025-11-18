// THAY THẾ FILE: src/pages/PlantHealthPage.tsx
import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, Typography, Row, Col, Progress, Tag, List, Spin, Alert, Empty, Collapse } from 'antd';
import { useFarm } from '../context/FarmContext';
import { getHealthByZone } from '../api/plantHealthService';
import type { ZoneHealth } from '../types/plantHealth';
import { WarningOutlined, CheckCircleOutlined } from '@ant-design/icons';

const { Title, Text } = Typography;
const { Panel } = Collapse;

const PlantHealthPage: React.FC = () => {
    const { farmId } = useFarm();

    const { data: zoneHealths, isLoading } = useQuery({
        queryKey: ['plantHealthByZone', farmId],
        queryFn: () => farmId ? getHealthByZone(farmId) : Promise.resolve([]),
        enabled: !!farmId,
        refetchInterval: 60000,
    });

    if (isLoading) return <Spin size="large" style={{ display: 'block', margin: '50px auto' }} />;
    if (!zoneHealths || zoneHealths.length === 0) return <Empty description="Chưa có dữ liệu sức khỏe hoặc chưa tạo Zone." />;

    const getStatusColor = (score: number) => {
        if (score >= 90) return '#52c41a';
        if (score >= 70) return '#1890ff';
        if (score >= 50) return '#faad14';
        return '#f5222d';
    };

    return (
        <div style={{ padding: 24 }}>
            <Title level={2} style={{ marginBottom: 24 }}>Sức khỏe Cây trồng theo Khu vực</Title>

            <Row gutter={[16, 16]}>
                {zoneHealths.map((zone: ZoneHealth) => (
                    <Col xs={24} lg={12} key={zone.zoneId}>
                        <Card
                            title={zone.zoneName}
                            extra={<Tag color="blue">{zone.plantProfileName || 'Chưa gán hồ sơ'}</Tag>}
                            style={{ height: '100%', borderLeft: `5px solid ${getStatusColor(zone.healthScore)}` }}
                        >
                            <div style={{ display: 'flex', alignItems: 'center', marginBottom: 20 }}>
                                <Progress
                                    type="circle"
                                    percent={zone.healthScore}
                                    width={80}
                                    strokeColor={getStatusColor(zone.healthScore)}
                                />
                                <div style={{ marginLeft: 20 }}>
                                    <Title level={4} style={{ margin: 0 }}>
                                        {zone.activeAlertCount > 0
                                            ? `${zone.activeAlertCount} Cảnh báo cần xử lý`
                                            : 'Sức khỏe tốt'}
                                    </Title>
                                    <Text type="secondary">Trạng thái: {zone.status}</Text>
                                </div>
                            </div>

                            {zone.criticalAlerts.length > 0 ? (
                                <Collapse ghost>
                                    <Panel header="Chi tiết cảnh báo" key="1">
                                        <List
                                            dataSource={zone.criticalAlerts}
                                            renderItem={(alert) => (
                                                <List.Item>
                                                    <List.Item.Meta
                                                        avatar={<WarningOutlined style={{ color: '#f5222d' }} />}
                                                        title={<Text strong>{alert.typeName}</Text>}
                                                        description={
                                                            <>
                                                                <div>{alert.description}</div>
                                                                <div style={{ marginTop: 4, color: '#1890ff' }}>💡 {alert.suggestion}</div>
                                                            </>
                                                        }
                                                    />
                                                </List.Item>
                                            )}
                                        />
                                    </Panel>
                                </Collapse>
                            ) : (
                                <Alert message="Không có vấn đề gì được phát hiện." type="success" showIcon icon={<CheckCircleOutlined />} />
                            )}
                        </Card>
                    </Col>
                ))}
            </Row>
        </div>
    );
};

export default PlantHealthPage;