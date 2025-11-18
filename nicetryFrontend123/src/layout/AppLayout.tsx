// src/layout/AppLayout.tsx
import React, { useState, type PropsWithChildren } from 'react';
import {
    LayoutDashboard, HardDrive, Settings, User, Trees, BrainCircuit, Bot, HeartPulse, Crown
} from 'lucide-react';
import type { MenuProps } from 'antd';
import { Layout, Menu, theme, notification } from 'antd';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useTheme } from '../context/ThemeContext';
import AppHeader from './AppHeader';
import AppFooter from './AppFooter';
import { getUserFromStorage } from '../utils/auth';
import PageBreadcrumb from '../components/PageBreadcrumb';
import { BellOutlined } from '@ant-design/icons';
import { useStomp } from '../hooks/useStomp';
import { useQueryClient } from '@tanstack/react-query'; // THÊM
import type { IMessage as StompMessage } from '@stomp/stompjs'; // Đặt tên mới để tránh trùng lặp
import { CalendarClock } from 'lucide-react'; // Thêm icon


import { History } from 'lucide-react'; // Thêm icon


import { Leaf } from 'lucide-react'; // Thêm icon


const { Content, Sider } = Layout;

type MenuItem = Required<MenuProps>['items'][number];

function getItem(
    label: React.ReactNode,
    key: React.Key,
    icon?: React.ReactNode,
    children?: MenuItem[]
): MenuItem {
    return { key, icon, children, label } as MenuItem;
}

// ✅ Cho phép nhận children, tương thích cả 2 cách dùng:
// 1) <AppLayout><SomePage/></AppLayout>
// 2) element={<AppLayout/>} + <Outlet/>
const AppLayout: React.FC<PropsWithChildren> = ({ children }) => {
    const [collapsed, setCollapsed] = useState(false);
    const navigate = useNavigate();
    const location = useLocation();
    const { isDark } = useTheme();
    const {
        token: { colorBgContainer }
    } = theme.useToken();

    const user = getUserFromStorage();
    const isAdmin = user?.roles?.includes('ADMIN');
    const queryClient = useQueryClient(); // Lấy queryClient instance

    // VVVV--- SỬA LẠI HOÀN TOÀN LOGIC WEBSOCKET ---VVVV
    useStomp(user ? user.userId : null, 'user', {
        onConnect: (client) => {
            console.log(`Subscribing to user notifications: /topic/user/${user.userId}/notifications`);

            // Hàm onConnect sẽ return subscription để hook tự động cleanup
            return client.subscribe(
                `/topic/user/${user.userId}/notifications`,
                (message: StompMessage) => { // <-- Gán kiểu StompMessage cho message
                    try {
                        const notificationData = JSON.parse(message.body);

                        notification.info({
                            message: notificationData.title,
                            description: notificationData.message,
                            icon: <BellOutlined style={{ color: '#108ee9' }} />,
                            placement: 'bottomRight',
                            duration: 10,
                        });

                        queryClient.invalidateQueries({ queryKey: ['notifications', 'unreadCount'] });
                        queryClient.invalidateQueries({ queryKey: ['notifications', 'latest'] });

                    } catch (error) {
                        console.error('Failed to parse notification message:', error);
                    }
                }
            );
        }
    });
    // ^^^^---------------------------------------------------------^^^^

    const menuItems: MenuItem[] = [
        getItem('Dashboard', '/dashboard', <LayoutDashboard size={16} />),
        getItem('Dự đoán AI', '/ai', <BrainCircuit size={16} />),
        getItem('Quy tắc Tự động', '/rules', <Bot size={16} />),
        getItem('Lịch trình', '/schedules', <CalendarClock size={16} />), // <<< THÊM DÒNG NÀY
        getItem('Sức khỏe Cây trồng', '/plant-health', <HeartPulse size={16} />),
        getItem('Quản lý Nông trại', '/farms', <Trees size={16} />),
        getItem('Quản lý Thiết bị', '/devices', <HardDrive size={16} />),
        getItem('Phân tích Dữ liệu', '/analytics', <Settings size={16} />),
        getItem('Nhật ký Vận hành', '/logs', <History size={16} />), // Thêm dòng này vào sau
        // <<<< THÊM MENU ITEM MỚI CHO TRANG NOTIFICATIONS >>>>
        getItem('Thông báo', '/notifications', <BellOutlined style={{ fontSize: '16px' }} />),
        // <<<<----------------------------------------->>>>

        isAdmin &&
        getItem('Admin Panel', 'sub_admin', <Crown size={16} />, [
            getItem('Dashboard', '/admin/dashboard'),
            getItem('Quản lý Người dùng', '/admin/users'),
            // <<<< THÊM MENU ITEM MỚI >>>>
            // VVVV--- THÊM DÒNG NÀY ---VVVV
            getItem('Hồ sơ Cây trồng', '/admin/plant-profiles', <Leaf size={16} />),
            // ^^^^----------------------^^^^
            getItem('Cài đặt Hệ thống', '/admin/settings'),
        ]),
        getItem('Tài khoản', 'sub_user', <User size={16} />, [
            getItem('Thông tin cá nhân', '/profile'),
            getItem('Đổi mật khẩu', '/change-password')
        ]),
        getItem('Cài đặt', '/settings', <Settings size={16} />)
    ].filter(Boolean) as MenuItem[];

    return (
        <Layout style={{ minHeight: '100vh' }}>
            <Sider
                collapsible
                collapsed={collapsed}
                onCollapse={(value) => setCollapsed(value)}
                theme={isDark ? 'dark' : 'light'}
                width={220}
                style={{
                    overflow: 'auto',
                    height: '100vh',
                    position: 'fixed',
                    left: 0,
                    top: 0,
                    bottom: 0,
                    zIndex: 100
                }}
            >
                <div
                    style={{
                        height: 64,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        padding: '16px'
                    }}
                >
                    <div
                        className="gradient-text"
                        style={{
                            fontWeight: 'bold',
                            fontSize: collapsed ? '24px' : '22px',
                            transition: 'all 0.3s',
                            whiteSpace: 'nowrap'
                        }}
                    >
                        {collapsed ? 'SF' : 'SmartFarm'}
                    </div>
                </div>
                <Menu
                    theme={isDark ? 'dark' : 'light'}
                    selectedKeys={[location.pathname]}
                    mode="inline"
                    items={menuItems}
                    onClick={({ key }) => navigate(String(key))}
                />
            </Sider>

            <Layout style={{ marginLeft: collapsed ? 80 : 220, transition: 'margin-left 0.2s' }}>
                <AppHeader />
                <Content style={{ margin: '24px 16px', overflow: 'initial', background: colorBgContainer }}>
                    <PageBreadcrumb />
                    <div className="app-content" key={location.pathname}>
                        {/* Nếu có children thì dùng children; nếu không thì dùng Outlet */}
                        {children ?? <Outlet />}
                    </div>
                </Content>
                <AppFooter />
            </Layout>
        </Layout>
    );
};

export default AppLayout;
