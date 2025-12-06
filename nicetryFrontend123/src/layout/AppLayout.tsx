// src/layout/AppLayout.tsx
import React, { useState, type PropsWithChildren } from 'react';
import {
    LayoutDashboard, HardDrive, Settings, User, Trees, BrainCircuit, Bot, HeartPulse, Crown,
} from 'lucide-react';
import type { MenuProps } from 'antd';
import { Layout, Menu, theme, notification, Drawer, Grid } from 'antd'; // THÊM: Drawer, Grid
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useTheme } from '../context/ThemeContext';
import AppHeader from './AppHeader';
import AppFooter from './AppFooter';
import { getUserFromStorage } from '../utils/auth';
import PageBreadcrumb from '../components/PageBreadcrumb';
import { BellOutlined } from '@ant-design/icons';
import { useStomp } from '../hooks/useStomp';
import { useQueryClient } from '@tanstack/react-query';
import type { IMessage as StompMessage } from '@stomp/stompjs';
import { CalendarClock, History, Leaf } from 'lucide-react';
import ChatWidget from '../components/ChatWidget';

const { Content, Sider } = Layout;
const { useBreakpoint } = Grid; // THÊM

type MenuItem = Required<MenuProps>['items'][number];

function getItem(
    label: React.ReactNode,
    key: React.Key,
    icon?: React.ReactNode,
    children?: MenuItem[]
): MenuItem {
    return { key, icon, children, label } as MenuItem;
}

const AppLayout: React.FC<PropsWithChildren> = ({ children }) => {
    const [collapsed, setCollapsed] = useState(false);
    const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false); // THÊM: State cho mobile menu
    const navigate = useNavigate();
    const location = useLocation();
    const { isDark } = useTheme();
    const {
        token: { colorBgContainer }
    } = theme.useToken();
    const screens = useBreakpoint(); // THÊM: Hook kiểm tra kích thước màn hình

    // Nếu màn hình lớn hơn 'lg' (992px) thì coi là Desktop, ngược lại là Mobile/Tablet
    const isMobile = !screens.lg;

    const user = getUserFromStorage();
    const isAdmin = user?.roles?.includes('ADMIN');
    const queryClient = useQueryClient();

    // ... (Giữ nguyên phần useStomp như cũ) ...
    useStomp(user ? user.userId : null, 'user', {
        onConnect: (client) => {
            return client.subscribe(
                `/topic/user/${user.userId}/notifications`,
                (message: StompMessage) => {
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

    const menuItems: MenuItem[] = [
        getItem('Dashboard', '/dashboard', <LayoutDashboard size={16} />),
        getItem('Dự đoán AI', '/ai', <BrainCircuit size={16} />),
        getItem('Quy tắc Tự động', '/rules', <Bot size={16} />),
        getItem('Lịch trình', '/schedules', <CalendarClock size={16} />),
        getItem('Sức khỏe Cây trồng', '/plant-health', <HeartPulse size={16} />),
        getItem('Quản lý Nông trại', '/farms', <Trees size={16} />),
        getItem('Quản lý Thiết bị', '/devices', <HardDrive size={16} />),
        getItem('Phân tích Dữ liệu', '/analytics', <Settings size={16} />),
        getItem('Nhật ký Vận hành', '/logs', <History size={16} />),
        getItem('Thông báo', '/notifications', <BellOutlined style={{ fontSize: '16px' }} />),

        isAdmin &&
        getItem('Admin Panel', 'sub_admin', <Crown size={16} />, [
            getItem('Dashboard', '/admin/dashboard'),
            getItem('Quản lý Người dùng', '/admin/users'),
            getItem('Hồ sơ Cây trồng', '/admin/plant-profiles', <Leaf size={16} />),
            getItem('Cài đặt Hệ thống', '/admin/settings'),
        ]),
        getItem('Tài khoản', 'sub_user', <User size={16} />, [
            getItem('Thông tin cá nhân', '/profile'),
            getItem('Đổi mật khẩu', '/change-password')
        ]),
        getItem('Cài đặt', '/settings', <Settings size={16} />)
    ].filter(Boolean) as MenuItem[];

    // Component Menu để tái sử dụng cho cả Sider và Drawer
    const renderMenu = () => (
        <Menu
            theme={isDark ? 'dark' : 'light'}
            selectedKeys={[location.pathname]}
            mode="inline"
            items={menuItems}
            onClick={({ key }) => {
                navigate(String(key));
                if (isMobile) setMobileDrawerOpen(false); // Đóng drawer khi click trên mobile
            }}
            style={{ borderRight: 0 }}
        />
    );

    const logoContent = (
        <div style={{ height: 64, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
            <div className="gradient-text" style={{
                fontWeight: 'bold', fontSize: collapsed ? '24px' : '22px',
                transition: 'all 0.3s', whiteSpace: 'nowrap'
            }}>
                {collapsed ? 'SF' : 'SmartFarm'}
            </div>
        </div>
    );

    return (
        <Layout style={{ minHeight: '100vh' }}>
            {/* 1. DESKTOP SIDER (Ẩn khi là Mobile) */}
            {!isMobile && (
                <Sider
                    collapsible
                    collapsed={collapsed}
                    onCollapse={(value) => setCollapsed(value)}
                    theme={isDark ? 'dark' : 'light'}
                    width={220}
                    style={{
                        height: '100vh', position: 'fixed', left: 0, top: 0, bottom: 0, zIndex: 100,
                        borderRight: isDark ? '1px solid #303030' : '1px solid #f0f0f0'
                    }}
                >
                    {logoContent}
                    <div style={{ maxHeight: 'calc(100vh - 64px)', overflowY: 'auto' }} className="custom-sider">
                        {renderMenu()}
                    </div>
                </Sider>
            )}

            {/* 2. MOBILE DRAWER (Chỉ hiện khi là Mobile) */}
            {isMobile && (
                <Drawer
                    placement="left"
                    onClose={() => setMobileDrawerOpen(false)}
                    open={mobileDrawerOpen}
                    width={260}
                    bodyStyle={{ padding: 0, background: isDark ? '#001529' : '#fff' }}
                    headerStyle={{ display: 'none' }}
                >
                    <div style={{ height: 64, display: 'flex', alignItems: 'center', justifyContent: 'center', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                        <span className="gradient-text" style={{ fontSize: '22px', fontWeight: 'bold' }}>SmartFarm</span>
                    </div>
                    {renderMenu()}
                </Drawer>
            )}

            <Layout style={{
                marginLeft: isMobile ? 0 : (collapsed ? 80 : 220),
                transition: 'margin-left 0.2s'
            }}>
                {/* Truyền callback toggle menu xuống Header */}
                <AppHeader
                    onToggleMenu={() => setMobileDrawerOpen(true)}
                    isMobile={isMobile}
                />

                <Content style={{ margin: isMobile ? '12px' : '24px 16px', overflow: 'initial', background: colorBgContainer }}>
                    <PageBreadcrumb />
                    <div className="app-content" key={location.pathname}>
                        {children ?? <Outlet />}
                    </div>
                </Content>
                <AppFooter />
                <ChatWidget />
            </Layout>
        </Layout>
    );
};

export default AppLayout;