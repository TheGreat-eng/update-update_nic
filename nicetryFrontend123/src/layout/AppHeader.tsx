import React, { useEffect, useState } from 'react';
import { Layout, Avatar, Dropdown, Space, Select, Modal, message as antdMessage, type MenuProps, Spin, Button, Tooltip } from 'antd';
import { User, LogOut, Home, ChevronsUpDown, Sun, Moon, Leaf } from 'lucide-react'; // ✅ THÊM Leaf, SỬA icon
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { useFarm } from '../context/FarmContext';
import { useTheme } from '../context/ThemeContext';
import { getFarms } from '../api/farmService';
import { clearAuthData, getUserFromStorage } from '../utils/auth';
import type { Farm } from '../types/farm';
import GlobalSearch from '../components/GlobalSearch';
import NotificationBell from '../components/NotificationBell'; // VVVV--- THÊM IMPORT NÀY ---VVVV


const { Header } = Layout;
const { Option } = Select;

const AppHeader: React.FC = () => {
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const { farmId, setFarmId } = useFarm();
    const { isDark, toggleTheme } = useTheme();
    const [farms, setFarms] = useState<Farm[]>([]);
    const [loadingFarms, setLoadingFarms] = useState(false);

    const user = getUserFromStorage();

    useEffect(() => {
        const fetchFarms = async () => {
            setLoadingFarms(true);
            try {
                const response = await getFarms();
                const farmList = response.data.data || response.data;
                setFarms(Array.isArray(farmList) ? farmList : []);
            } catch (error) {
                console.error('❌ Failed to fetch farms:', error);
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
                setFarmId(null);
                queryClient.clear();
                clearAuthData();
                antdMessage.success('Đăng xuất thành công!');
                setTimeout(() => { window.location.href = '/login'; }, 300);
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
        <Header
            style={{
                padding: '0 24px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
            }}
        >
            {/* ✅ FIX: Logo container với icon thay thế và style chống vỡ chữ */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer', whiteSpace: 'nowrap' }} onClick={() => navigate('/dashboard')}>
                <div style={{
                    backgroundColor: 'var(--primary-light)',
                    borderRadius: '8px',
                    padding: '6px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                }}>
                    <Leaf color="white" size={20} />
                </div>
                <span className="gradient-text" style={{ fontSize: '20px', fontWeight: '700', letterSpacing: '0.5px' }}>
                    SmartFarm
                </span>
            </div>

            <Space size="middle" align="center">
                <GlobalSearch />

                <Space>
                    <Home size={18} color={isDark ? "var(--primary-dark)" : "var(--primary-light)"} />
                    <Select
                        style={{ minWidth: 220 }}
                        placeholder="Chọn nông trại..."
                        value={farmId}
                        onChange={(value) => {
                            const selectedFarm = farms.find(f => f.id === value);
                            setFarmId(value);
                            antdMessage.success(`Đã chuyển sang nông trại ${selectedFarm?.name}`, 2);
                        }}
                        loading={loadingFarms}
                        showSearch
                        optionFilterProp="children"
                        suffixIcon={loadingFarms ? <Spin size="small" /> : <ChevronsUpDown size={16} />}
                        popupRender={(menu) => (
                            <>
                                {menu}
                                <div style={{ borderTop: '1px solid var(--border-light)', padding: '8px', textAlign: 'center' }}>
                                    <a onClick={() => navigate('/farms')} style={{ fontSize: '12px' }}>
                                        + Quản lý nông trại
                                    </a>
                                </div>
                            </>
                        )}
                    >
                        {farms.map(farm => (
                            <Option key={farm.id} value={farm.id}>{farm.name}</Option>
                        ))}
                    </Select>
                </Space>


                {/* VVVV--- THÊM DÒNG NÀY VÀO TRƯỚC NÚT DARK/LIGHT MODE ---VVVV */}
                <NotificationBell />
                {/* ^^^^-----------------------------------------------------^^^^ */}

                <Tooltip title={isDark ? 'Chế độ sáng' : 'Chế độ tối'}>
                    <Button
                        type="text"
                        shape="circle"
                        icon={isDark ? <Sun size={18} /> : <Moon size={18} />}
                        onClick={toggleTheme}
                    />
                </Tooltip>

                <Dropdown menu={{ items: userMenuItems }} placement="bottomRight" arrow>
                    <a onClick={(e) => e.preventDefault()} style={{ cursor: 'pointer' }}>
                        <Space>
                            <Avatar style={{ backgroundColor: '#818cf8' }} icon={<User size={18} />} />
                            <span style={{ fontWeight: 500 }}>
                                { /* <<<< SỬA LẠI LOGIC HIỂN THỊ TÊN >>>> */}
                                {user?.fullName || user?.email || 'User'}
                            </span>
                        </Space>
                    </a>
                </Dropdown>
            </Space>
        </Header>
    );
};

export default AppHeader;