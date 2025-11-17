// src/pages/NotificationsPage.tsx
import React, { useState } from 'react';
import { List, Empty, Typography, Button, Avatar } from 'antd';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getNotifications, markAllNotificationsAsRead } from '../api/notificationService';
import { timeAgo } from '../utils/time';
import { BellOutlined, ThunderboltOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import type { Notification } from '../types/notification'; // VVVV--- 2. IMPORT TYPE Notification ---VVVV
import { CheckCheck } from 'lucide-react';

const { Title, Text } = Typography;

const NotificationsPage: React.FC = () => {
    const [page, setPage] = useState(0);
    const [pageSize, setPageSize] = useState(10);
    const queryClient = useQueryClient();
    const navigate = useNavigate();

    const { data: notificationsPage, isLoading, isFetching } = useQuery({
        queryKey: ['notifications', 'all', page, pageSize],
        queryFn: () => getNotifications({ page, size: pageSize }),
        // VVVV--- 3. SỬA LẠI THUỘC TÍNH NÀY ---VVVV
        placeholderData: (previousData) => previousData,
    });

    const markAllReadMutation = useMutation({
        mutationFn: markAllNotificationsAsRead,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['notifications'] });
        },
    });

    const getNotificationIcon = (type: string) => {
        switch (type) {
            case 'PLANT_HEALTH_ALERT': return <Avatar style={{ backgroundColor: '#f5222d' }} icon={<BellOutlined />} />;
            case 'RULE_TRIGGERED': return <Avatar style={{ backgroundColor: '#faad14' }} icon={<ThunderboltOutlined />} />;
            case 'DEVICE_STATUS': return <Avatar style={{ backgroundColor: '#8c8c8c' }} icon={<BellOutlined />} />;
            default: return <Avatar icon={<BellOutlined />} />;
        }
    }

    return (
        <div style={{ padding: 24 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
                <Title level={2} style={{ margin: 0 }}>Trung tâm Thông báo</Title>
                <Button
                    icon={<CheckCheck size={16} />}
                    onClick={() => markAllReadMutation.mutate()}
                    loading={markAllReadMutation.isPending}
                >
                    Đánh dấu tất cả đã đọc
                </Button>
            </div>

            <List
                className="notification-list"
                loading={isLoading || isFetching}
                itemLayout="horizontal"
                // VVVV--- 4. CUNG CẤP GIÁ TRỊ DỰ PHÒNG ---VVVV
                dataSource={notificationsPage?.content || []}
                pagination={{
                    current: page + 1,
                    pageSize: pageSize,
                    // VVVV--- CUNG CẤP GIÁ TRỊ DỰ PHÒNG ---VVVV
                    total: notificationsPage?.totalElements || 0,
                    onChange: (newPage, newPageSize) => {
                        setPage(newPage - 1);
                        setPageSize(newPageSize);
                    },
                    showSizeChanger: true,
                }}
                // VVVV--- 5. KHAI BÁO TYPE CHO `item` ---VVVV
                renderItem={(item: Notification) => (
                    <List.Item
                        style={{ backgroundColor: item.isRead ? 'transparent' : 'var(--accent-light)', cursor: 'pointer', padding: '16px' }}
                        onClick={() => item.link && navigate(item.link)}
                    >
                        <List.Item.Meta
                            avatar={getNotificationIcon(item.type)}
                            title={<Text strong={!item.isRead}>{item.title}</Text>}
                            description={item.message}
                        />
                        <div style={{ textAlign: 'right', color: 'var(--muted-foreground-light)' }}>
                            {timeAgo(item.createdAt)}
                        </div>
                    </List.Item>
                )}
                locale={{
                    emptyText: <Empty description="Bạn chưa có thông báo nào." />
                }}
            />
        </div>
    );
};

export default NotificationsPage;