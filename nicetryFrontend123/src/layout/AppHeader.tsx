// src/layout/AppHeader.tsx
import React, { useEffect, useState } from 'react';
import { Layout, Avatar, Dropdown, Space, Select, Modal, message as antdMessage, type MenuProps, Spin, Button, Tooltip } from 'antd';
import { User, LogOut, Home, ChevronsUpDown, Sun, Moon, Leaf, Menu as MenuIcon, Search } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { useFarm } from '../context/FarmContext';
import { useTheme } from '../context/ThemeContext';
import { getFarms } from '../api/farmService';
import { clearAuthData, getUserFromStorage } from '../utils/auth';
import type { Farm } from '../types/farm';
import GlobalSearch from '../components/GlobalSearch';
import NotificationBell from '../components/NotificationBell';

const { Header } = Layout;
const { Option } = Select;

// Thêm props
interface AppHeaderProps {
    onToggleMenu?: () => void;
    isMobile?: boolean;
}

const AppHeader: React.FC<AppHeaderProps> = ({ onToggleMenu, isMobile }) => {
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const { farmId, setFarmId } = useFarm();
    const { isDark, toggleTheme } = useTheme();
    const [farms, setFarms] = useState<Farm[]>([]);
    const [loadingFarms, setLoadingFarms] = useState(false);


    // 1. THÊM STATE NÀY: Để quản lý trạng thái đang đăng xuất
    const [isLoggingOut, setIsLoggingOut] = useState(false);

    const user = getUserFromStorage();

    useEffect(() => {
        const fetchFarms = async () => {
            setLoadingFarms(true);
            try {
                const response = await getFarms();
                const farmList = response.data.data || response.data;
                setFarms(Array.isArray(farmList) ? farmList : []);
            } catch (error) {
                console.error(' Failed to fetch farms:', error);
            } finally {
                setLoadingFarms(false);
            }
        };
        fetchFarms();
    }, []);

    const handleLogout = () => {
        Modal.confirm({
            title: 'Xác nhận đăng xuất',
            content: 'Bạn có chắc muốn đăng xuất khỏi hệ thống?',
            okText: 'Đăng xuất',
            cancelText: 'Hủy',
            okButtonProps: { danger: true },
            onOk: () => {
                // 2. SỬA LẠI LOGIC Ở ĐÂY

                // Bước A: Bật màn hình loading ngay lập tức để che giao diện cũ
                setIsLoggingOut(true);

                // Bước B: Đợi một chút cho hiệu ứng mượt mà, sau đó mới xóa dữ liệu
                setTimeout(() => {
                    // Xóa dữ liệu Farm Context
                    setFarmId(null);

                    // Xóa Cache React Query (để lần sau login không hiện dữ liệu cũ)
                    queryClient.clear();

                    // Xóa Token và LocalStorage
                    clearAuthData();

                    antdMessage.success('Đăng xuất thành công!');

                    // Chuyển hướng
                    window.location.href = '/login';
                }, 800); // Tăng delay lên 800ms hoặc 1s để người dùng thấy loading
            }
        });
    };

    const userMenuItems: MenuProps['items'] = [
        { key: 'profile', icon: <User size={14} />, label: 'Thông tin cá nhân', onClick: () => navigate('/profile') },
        { key: 'change-password', icon: <User size={14} />, label: 'Đổi mật khẩu', onClick: () => navigate('/change-password') },
        { type: 'divider' },
        { key: 'logout', icon: <LogOut size={14} />, label: 'Đăng xuất', danger: true, onClick: handleLogout }
    ];

    return (
        <>
            <Header
                style={{
                    padding: isMobile ? '0 12px' : '0 24px', // Giảm padding trên mobile
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    position: 'sticky', top: 0, zIndex: 99, width: '100%',
                    background: isDark ? 'var(--card-dark)' : '#ffffff'
                }}
            >
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    {/* 1. Nút Menu cho Mobile */}
                    {isMobile && (
                        <Button
                            type="text"
                            icon={<MenuIcon size={24} />}
                            onClick={onToggleMenu}
                            style={{ marginRight: 4 }}
                        />
                    )}

                    {/* 2. Logo: Ẩn chữ trên Mobile, chỉ hiện icon */}
                    <div
                        style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer' }}
                        onClick={() => navigate('/dashboard')}
                    >
                        <div style={{
                            backgroundColor: 'var(--primary-light)',
                            borderRadius: '8px',
                            padding: '6px',
                            display: 'flex', alignItems: 'center', justifyContent: 'center'
                        }}>
                            <Leaf color="white" size={20} />
                        </div>
                        {!isMobile && (
                            <span className="gradient-text" style={{ fontSize: '20px', fontWeight: '700', letterSpacing: '0.5px' }}>
                                SmartFarm
                            </span>
                        )}
                    </div>
                </div>

                <Space size={isMobile ? "small" : "middle"} align="center">
                    {/* 3. Search: Thu gọn trên mobile */}
                    {!isMobile ? <GlobalSearch /> : (
                        <Button type="text" icon={<Search size={18} />} onClick={() => {/* Trigger global search modal logic here if possible, or simple hide */ }} />
                        /* Note: Để GlobalSearch hoạt động trên mobile cần CSS modal, tạm thời để component gốc nhưng style width */
                    )}
                    {isMobile && <div style={{ display: 'none' }}><GlobalSearch /></div>} {/* Hack để modal vẫn mount */}

                    <Space size={4}>
                        {!isMobile && <Home size={18} color={isDark ? "var(--primary-dark)" : "var(--primary-light)"} />}
                        <Select
                            style={{ width: isMobile ? 120 : 220 }} // Thu nhỏ trên mobile
                            placeholder={isMobile ? "Farm..." : "Chọn nông trại..."}
                            value={farmId}
                            onChange={(value) => {
                                const selectedFarm = farms.find(f => f.id === value);
                                setFarmId(value);
                                antdMessage.success(`Đã chuyển: ${selectedFarm?.name}`, 2);
                            }}
                            loading={loadingFarms}
                            showSearch
                            optionFilterProp="children"
                            // Ẩn icon trên mobile
                            suffixIcon={loadingFarms ? <Spin size="small" /> : (!isMobile && <ChevronsUpDown size={16} />)}
                        >
                            {farms.map(farm => (
                                <Option key={farm.id} value={farm.id}>{farm.name}</Option>
                            ))}
                        </Select>
                    </Space>

                    <NotificationBell />

                    {/* 4. Theme Toggle: Ẩn trên mobile nếu quá chật */}
                    {!isMobile && (
                        <Tooltip title={isDark ? 'Chế độ sáng' : 'Chế độ tối'}>
                            <Button
                                type="text"
                                shape="circle"
                                icon={isDark ? <Sun size={18} /> : <Moon size={18} />}
                                onClick={toggleTheme}
                            />
                        </Tooltip>
                    )}

                    <Dropdown menu={{ items: userMenuItems }} placement="bottomRight" arrow>
                        <a onClick={(e) => e.preventDefault()} style={{ cursor: 'pointer' }}>
                            <Space>
                                <Avatar style={{ backgroundColor: '#818cf8' }} icon={<User size={18} />} />
                                {/* 5. Ẩn tên User trên mobile */}
                                {!isMobile && (
                                    <span style={{ fontWeight: 500, maxWidth: 100, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                        {user?.fullName || user?.email || 'User'}
                                    </span>
                                )}
                            </Space>
                        </a>
                    </Dropdown>
                </Space>
            </Header>




            {/* 3. THÊM PHẦN NÀY: Màn hình Loading Fullscreen */}
            {isLoggingOut && (
                <div style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    zIndex: 99999, // Đảm bảo nằm trên cùng, cao hơn cả Modal và Header
                    backgroundColor: isDark ? 'rgba(0, 0, 0, 0.8)' : 'rgba(255, 255, 255, 0.9)',
                    backdropFilter: 'blur(5px)',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'center',
                    alignItems: 'center',
                    transition: 'all 0.3s ease'
                }}>
                    <Spin size="large" />
                    <div style={{
                        marginTop: 20,
                        fontSize: 18,
                        fontWeight: 500,
                        color: isDark ? '#fff' : '#333'
                    }}>
                        Đang đăng xuất an toàn...
                    </div>
                </div>
            )}
        </>

    );
};

export default AppHeader;