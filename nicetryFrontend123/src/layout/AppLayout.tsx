// src/layout/AppLayout.tsx
import React, { useState, useMemo, type PropsWithChildren } from 'react';
import {
    LayoutDashboard, HardDrive, Settings, User, Trees,
    BrainCircuit, Bot, HeartPulse, Crown, CalendarClock,
    History, Leaf
} from 'lucide-react';
import type { MenuProps } from 'antd';
import { Layout, Menu, theme, notification, Drawer, Grid } from 'antd';
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
import ChatWidget from '../components/ChatWidget';

const { Content, Sider } = Layout;
const { useBreakpoint } = Grid;

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
    // --- State & Hooks ---
    const [collapsed, setCollapsed] = useState(false);
    const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);

    const navigate = useNavigate();
    const location = useLocation();
    const { isDark } = useTheme();
    const { token: { colorBgContainer } } = theme.useToken();
    const screens = useBreakpoint();
    const queryClient = useQueryClient();

    // --- Logic Mobile ---
    // Mặc định coi là mobile nếu screens chưa init xong (tránh lỗi vỡ layout lúc mới load)
    // Nếu screens.lg = undefined => Mobile. Nếu screens.lg = false => Mobile.
    const isMobile = screens.lg === undefined ? true : !screens.lg;

    const user = getUserFromStorage();
    const isAdmin = user?.roles?.includes('ADMIN');

    // --- WebSocket / Notification Logic (Giữ nguyên) ---
    useStomp(user ? user.userId : null, 'user', useMemo(() => ({
        onConnect: (client) => {
            // console.log(`Subscribing to user notifications: /topic/user/${user.userId}/notifications`);
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
    }), [user, queryClient]));

    // --- Menu Items ---
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

    // --- Component Menu dùng chung ---
    const renderMenu = () => (
        <Menu
            theme={isDark ? 'dark' : 'light'}
            selectedKeys={[location.pathname]}
            mode="inline"
            items={menuItems}
            onClick={({ key }) => {
                navigate(String(key));
                // QUAN TRỌNG: Tự đóng drawer khi click trên mobile
                if (isMobile) setMobileDrawerOpen(false);
            }}
            style={{ borderRight: 0 }}
        />
    );

    // --- Logo Component ---
    const logoContent = (
        <div style={{
            height: 64, display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: '16px', borderBottom: isDark ? '1px solid rgba(255,255,255,0.1)' : '1px solid #f0f0f0'
        }}>
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
            {/* 1. DESKTOP SIDEBAR (Ẩn hoàn toàn khi là Mobile) */}
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
                    <div className="custom-sider" style={{ maxHeight: 'calc(100vh - 64px)', overflowY: 'auto', overflowX: 'hidden' }}>
                        {renderMenu()}
                    </div>
                </Sider>
            )}

            {/* 2. MOBILE DRAWER (Menu trượt) */}
            {isMobile && (
                <Drawer
                    placement="left"
                    onClose={() => setMobileDrawerOpen(false)}
                    open={mobileDrawerOpen}
                    width={260}
                    bodyStyle={{ padding: 0, background: isDark ? '#001529' : '#fff' }}
                    headerStyle={{ display: 'none' }} // Tự custom header
                >
                    {logoContent}
                    {renderMenu()}
                </Drawer>
            )}

            {/* 3. MAIN CONTENT LAYOUT */}
            <Layout style={{
                // LOGIC QUAN TRỌNG: 
                // - Mobile: Margin = 0 (để nội dung tràn màn hình, không bị Sidebar ảo đẩy)
                // - Desktop: Margin = 80px (thu nhỏ) hoặc 220px (mở rộng)
                marginLeft: isMobile ? 0 : (collapsed ? 80 : 220),
                transition: 'margin-left 0.2s ease',
                width: '100%',
                overflowX: 'hidden' // Ngăn thanh cuộn ngang trang
            }}>
                <AppHeader
                    onToggleMenu={() => setMobileDrawerOpen(true)}
                    isMobile={isMobile}
                />

                <Content style={{
                    margin: isMobile ? '16px' : '24px 16px',
                    overflow: 'initial',
                    background: colorBgContainer,
                    minHeight: '80vh',
                    borderRadius: isMobile ? 0 : 8 // Bo góc trên desktop cho đẹp
                }}>
                    {/* Bọc Breadcrumb để có padding nếu cần */}
                    <div style={{ padding: isMobile ? '0' : '0' }}>
                        <PageBreadcrumb />
                    </div>

                    <div className="app-content" key={location.pathname} style={{ paddingBottom: 20 }}>
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