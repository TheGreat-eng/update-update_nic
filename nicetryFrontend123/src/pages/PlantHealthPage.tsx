// src/pages/PlantHealthPage.tsx
import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, Progress, Typography, List, Tag, Spin, Alert, Empty, Button, Popconfirm, message } from 'antd';
import { HeartTwoTone, CheckCircleOutlined } from '@ant-design/icons';
import { useFarm } from '../context/FarmContext';
import { getCurrentHealth, resolveAlert } from '../api/plantHealthService';
import type { HealthAlert } from '../types/plantHealth';

const { Title, Paragraph, Text } = Typography;

const PlantHealthPage: React.FC = () => {
    const { farmId } = useFarm();
    const queryClient = useQueryClient();

    const { data, isLoading, isError, error } = useQuery({
        queryKey: ['plantHealth', farmId],
        queryFn: async () => {
            if (!farmId) {
                // Ném lỗi nếu không có farmId, react-query sẽ bắt được
                throw new Error("Chưa chọn nông trại.");
            }
            const response = await getCurrentHealth(farmId);

            // ✅ KIỂM TRA QUAN TRỌNG: Đảm bảo backend trả về dữ liệu đúng cấu trúc
            if (response.data && response.data.success) {
                // Chỉ trả về dữ liệu khi thành công và có data
                return response.data.data;
            }

            // Ném lỗi nếu API thành công nhưng backend báo lỗi
            throw new Error(response.data.message || 'Không thể lấy dữ liệu sức khỏe.');
        },
        enabled: !!farmId, // Chỉ chạy query khi có farmId
        refetchInterval: 60000,
    });

    // Mutation để xử lý cảnh báo
    const resolveAlertMutation = useMutation({
        mutationFn: resolveAlert,
        onSuccess: () => {
            message.success('Đã đánh dấu cảnh báo là đã xử lý!');
            // Tải lại dữ liệu sau khi cập nhật thành công
            queryClient.invalidateQueries({ queryKey: ['plantHealth', farmId] });
        },
        onError: () => {
            message.error('Thao tác thất bại!');
        }
    });

    const getStatusInfo = (status: string) => {
        switch (status) {
            case 'EXCELLENT': return { color: '#52c41a', text: 'Tuyệt vời' };
            case 'GOOD': return { color: '#1677ff', text: 'Tốt' };
            case 'WARNING': return { color: '#faad14', text: 'Cần chú ý' };
            case 'CRITICAL': return { color: '#f5222d', text: 'Nghiêm trọng' };
            default: return { color: '#d9d9d9', text: 'Không xác định' };
        }
    };

    if (isLoading) {
        // ✅ SỬA CẢNH BÁO SPIN: Bọc Spin trong một div để nó hoạt động đúng
        return (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '400px' }}>
                <Spin tip="Đang phân tích sức khỏe cây trồng..." size="large" />
            </div>
        );
    }

    if (isError) {
        return <Alert message="Lỗi tải dữ liệu" description={error.message} type="error" showIcon />;
    }

    if (!data) {
        return <Empty description="Không có dữ liệu sức khỏe để hiển thị. Hãy đảm bảo các cảm biến đang hoạt động." />;
    }

    const statusInfo = getStatusInfo(data.status);

    return (
        <div style={{ padding: 24 }}>
            <Title level={2}>Sức khỏe Cây trồng</Title>

            <Card style={{ marginBottom: 24, borderLeft: `5px solid ${statusInfo.color}` }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
                    <Progress
                        type="dashboard"
                        percent={data.healthScore}
                        format={(percent) => `${percent}/100`}
                        strokeColor={statusInfo.color}
                    />
                    <div>
                        <Title level={3} style={{ margin: 0 }}>
                            Điểm sức khỏe: <Text style={{ color: statusInfo.color }}>{data.healthScore}</Text>
                        </Title>
                        <Tag color={statusInfo.color} style={{ marginTop: 8, fontSize: 14, padding: '4px 8px' }}>
                            Trạng thái: {statusInfo.text}
                        </Tag>
                        <Paragraph style={{ marginTop: 16 }}>
                            <HeartTwoTone twoToneColor="#eb2f96" />
                            <strong> Gợi ý chung:</strong> {data.overallSuggestion}
                        </Paragraph>
                    </div>
                </div>
            </Card>

            <Title level={3}>Cảnh báo đang hoạt động ({data.activeAlerts.length})</Title>
            {data.activeAlerts.length > 0 ? (
                <List
                    grid={{ gutter: 16, xs: 1, sm: 1, md: 2, lg: 2, xl: 3, xxl: 3 }}
                    dataSource={data.activeAlerts}
                    renderItem={(alert: HealthAlert) => (
                        <List.Item>
                            <Card
                                title={alert.typeName}
                                extra={<Tag color="volcano">{alert.severityName}</Tag>}
                                actions={[
                                    <Popconfirm
                                        title="Xác nhận đã xử lý?"
                                        onConfirm={() => resolveAlertMutation.mutate(alert.id)}
                                        okText="Xác nhận"
                                        cancelText="Hủy"
                                    >
                                        <Button icon={<CheckCircleOutlined />} type="link">
                                            Đã xử lý
                                        </Button>
                                    </Popconfirm>
                                ]}
                            >
                                <p><strong>Mô tả:</strong> {alert.description}</p>
                                <p><strong>Gợi ý:</strong> {alert.suggestion}</p>
                                <Text type="secondary">Phát hiện lúc: {new Date(alert.detectedAt).toLocaleString()}</Text>
                            </Card>
                        </List.Item>
                    )}
                />
            ) : (
                <Empty description="Tuyệt vời! Không có cảnh báo nào đang hoạt động." />
            )}
        </div>
    );
};

export default PlantHealthPage;