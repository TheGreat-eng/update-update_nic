// src/components/NotificationBell.tsx
import React, { useState } from 'react';
import { Badge, Button, Dropdown, List, Spin, Empty, Tooltip, Avatar } from 'antd';
import { Bell, CheckCheck } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getNotifications, getUnreadCount, markAllNotificationsAsRead } from '../api/notificationService';
import { useNavigate } from 'react-router-dom';
import { timeAgo } from '../utils/time'; // Chúng ta sẽ tạo hàm này
import { BellOutlined, ThunderboltOutlined } from '@ant-design/icons';

const NotificationBell: React.FC = () => {
    const [isOpen, setIsOpen] = useState(false);
    const queryClient = useQueryClient();
    const navigate = useNavigate();

    // 1. Fetch số lượng thông báo chưa đọc
    const { data: unreadData, isLoading: isLoadingCount } = useQuery({
        queryKey: ['notifications', 'unreadCount'],
        queryFn: getUnreadCount,
        refetchInterval: 60 * 1000, // Tự động fetch lại mỗi phút
    });
    const unreadCount = unreadData?.count || 0;

    // 2. Fetch danh sách thông báo mới nhất khi dropdown mở
    const { data: notificationsPage, isLoading: isLoadingList } = useQuery({
        queryKey: ['notifications', 'latest'],
        queryFn: () => getNotifications({ page: 0, size: 7 }),
        enabled: isOpen, // Chỉ fetch khi dropdown được mở
    });

    // 3. Mutation để đánh dấu tất cả đã đọc
    const markAllReadMutation = useMutation({
        mutationFn: markAllNotificationsAsRead,
        onSuccess: () => {
            // Làm mới lại cả count và list
            queryClient.invalidateQueries({ queryKey: ['notifications'] });
        },
    });

    const handleNotificationClick = (link: string | null) => {
        setIsOpen(false);
        if (link) {
            navigate(link);
        }
    };

    // Icon cho từng loại thông báo
    const getNotificationIcon = (type: string) => {
        switch (type) {
            case 'PLANT_HEALTH_ALERT': return <Avatar style={{ backgroundColor: '#f5222d' }} icon={<BellOutlined />} />;
            case 'RULE_TRIGGERED': return <Avatar style={{ backgroundColor: '#faad14' }} icon={<ThunderboltOutlined />} />;
            case 'DEVICE_STATUS': return <Avatar style={{ backgroundColor: '#8c8c8c' }} icon={<BellOutlined />} />;
            default: return <Avatar icon={<BellOutlined />} />;
        }
    }

    const notificationMenu = (
        <div style={{ width: 380, backgroundColor: 'var(--card-light)', boxShadow: '0 6px 16px -8px rgba(0, 0, 0, 0.08), 0 9px 28px 0 rgba(0, 0, 0, 0.05), 0 12px 48px 16px rgba(0, 0, 0, 0.03)', borderRadius: 8 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', borderBottom: '1px solid var(--border-light)' }}>
                <h4 style={{ margin: 0 }}>Thông báo</h4>
                {unreadCount > 0 && (
                    <Tooltip title="Đánh dấu tất cả đã đọc">
                        <Button type="text" shape="circle" icon={<CheckCheck size={16} />} onClick={() => markAllReadMutation.mutate()} />
                    </Tooltip>
                )}
            </div>
            {isLoadingList ? (
                <div style={{ padding: 40, textAlign: 'center' }}><Spin /></div>
            ) : (!notificationsPage || notificationsPage.content.length === 0) ? (
                <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="Không có thông báo nào" style={{ padding: '20px 0' }} />
            ) : (
                <List
                    itemLayout="horizontal"
                    dataSource={notificationsPage.content}
                    renderItem={item => (
                        <List.Item
                            onClick={() => handleNotificationClick(item.link)}
                            style={{ padding: '12px 16px', cursor: 'pointer', backgroundColor: item.isRead ? 'transparent' : 'var(--accent-light)' }}
                        >
                            <List.Item.Meta
                                avatar={getNotificationIcon(item.type)}
                                title={<span style={{ fontWeight: item.isRead ? 400 : 600 }}>{item.title}</span>}
                                description={
                                    <>
                                        <div>{item.message}</div>
                                        <div style={{ fontSize: 12, color: 'var(--muted-foreground-light)', marginTop: 4 }}>{timeAgo(item.createdAt)}</div>
                                    </>
                                }
                            />
                        </List.Item>
                    )}
                />
            )}
            <div style={{ padding: '12px 16px', borderTop: '1px solid var(--border-light)', textAlign: 'center' }}>
                <a onClick={() => navigate('/notifications')}>Xem tất cả</a>
            </div>
        </div>
    );

    return (
        <Dropdown dropdownRender={() => notificationMenu} trigger={['click']} onOpenChange={setIsOpen}>
            <Tooltip title="Thông báo">
                <Badge count={isLoadingCount ? 0 : unreadCount} size="small">
                    <Button type="text" shape="circle" icon={<Bell size={18} />} />
                </Badge>
            </Tooltip>
        </Dropdown>
    );
};

export default NotificationBell;