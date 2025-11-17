import React, { useState, useEffect, useCallback } from 'react';
import { Modal, Input, List, Spin, Empty, Typography, Tag, Button, Space } from 'antd';
import { SearchOutlined, AppstoreOutlined, HddOutlined } from '@ant-design/icons';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import api from '../api/axiosConfig';
import { useDebounce } from '../hooks/useDebounce';
import type { GlobalSearchResult, FarmSearchResult, DeviceSearchResult } from '../types/common';
import { useFarm } from '../context/FarmContext';

const { Text } = Typography;

type SearchItem = (FarmSearchResult & { type: 'farm' }) | (DeviceSearchResult & { type: 'device' });

const GlobalSearch: React.FC = () => {
    const [isOpen, setIsOpen] = useState(false);
    const [query, setQuery] = useState('');
    const debouncedQuery = useDebounce(query, 300);
    const navigate = useNavigate();
    const { setFarmId } = useFarm();

    const { data, isFetching } = useQuery({
        queryKey: ['globalSearch', debouncedQuery],
        queryFn: async () => {
            const res = await api.get<{ data: GlobalSearchResult }>(`/search?q=${debouncedQuery}`);
            return res.data.data;
        },
        enabled: debouncedQuery.length > 1, // Chỉ tìm kiếm khi có ít nhất 2 ký tự
    });

    // Mở modal bằng phím tắt
    useEffect(() => {
        const handleKeyDown = (event: KeyboardEvent) => {
            if ((event.metaKey || event.ctrlKey) && event.key === 'k') {
                event.preventDefault();
                setIsOpen(prev => !prev);
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, []);

    const handleClose = useCallback(() => {
        setIsOpen(false);
        // Reset query sau 1 khoảng trễ ngắn để modal đóng mượt
        setTimeout(() => setQuery(''), 300);
    }, []);

    const handleSelect = (item: SearchItem) => {
        if (item.type === 'farm') {
            setFarmId(item.id);
            navigate('/dashboard'); // Chuyển đến dashboard của farm đó
        } else {
            setFarmId(item.farmId);
            // Cần một chút delay để FarmContext cập nhật trước khi chuyển trang
            setTimeout(() => {
                navigate('/devices');
                // Có thể highlight thiết bị vừa tìm được nếu cần
            }, 100);
        }
        handleClose();
    };

    return (
        <>
            <Button
                type="text"
                onClick={() => setIsOpen(true)}
                style={{ color: 'var(--muted-foreground-light)', border: '1px solid var(--border-light)', height: 36 }}
            >
                <Space>
                    <SearchOutlined />
                    <span style={{ marginRight: 24 }}>Tìm kiếm...</span>
                    <Tag style={{ background: 'var(--accent-light)', border: 'none' }}>⌘K</Tag>
                </Space>
            </Button>

            <Modal
                open={isOpen}
                onCancel={handleClose}
                footer={null}
                closable={false}
                destroyOnClose
                bodyStyle={{ padding: 0 }}
                width={640}
                // Thêm class để dễ dàng style nếu cần
                wrapClassName="global-search-modal"
            >
                <div style={{ padding: 12, borderBottom: '1px solid var(--border-light)' }}>
                    <Input
                        placeholder="Tìm kiếm nông trại, thiết bị theo tên hoặc ID..."
                        size="large"
                        prefix={<SearchOutlined style={{ color: 'var(--muted-foreground-light)' }} />}
                        value={query}
                        onChange={e => setQuery(e.target.value)}
                        autoFocus
                        variant="borderless"
                    />
                </div>
                <div style={{ minHeight: 300, maxHeight: '60vh', overflowY: 'auto' }}>
                    {isFetching ? (
                        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 300 }}><Spin /></div>
                    ) : (
                        <>
                            {(!data || (data.farms.length === 0 && data.devices.length === 0)) ? (
                                <Empty
                                    image={Empty.PRESENTED_IMAGE_SIMPLE}
                                    description={
                                        debouncedQuery.length > 1
                                            ? "Không tìm thấy kết quả phù hợp"
                                            : "Nhập ít nhất 2 ký tự để tìm kiếm"
                                    }
                                    style={{ padding: '60px 0' }}
                                />
                            ) : (
                                <List>
                                    {data.farms.length > 0 && (
                                        <List.Item style={{ padding: '8px 24px' }}>
                                            <Typography.Text type="secondary" style={{ fontWeight: 600 }}>NÔNG TRẠI</Typography.Text>
                                        </List.Item>
                                    )}
                                    {data.farms.map(item => (
                                        <List.Item
                                            key={`farm-${item.id}`}
                                            onClick={() => handleSelect({ ...item, type: 'farm' })}
                                            className="search-result-item"
                                            style={{ cursor: 'pointer', padding: '12px 24px' }}
                                        >
                                            <List.Item.Meta
                                                avatar={<AppstoreOutlined style={{ fontSize: 20, color: 'var(--primary-light)' }} />}
                                                title={<Text>{item.name}</Text>}
                                                description={item.location}
                                            />
                                        </List.Item>
                                    ))}

                                    {data.devices.length > 0 && (
                                        <List.Item style={{ padding: '8px 24px', marginTop: 16 }}>
                                            <Typography.Text type="secondary" style={{ fontWeight: 600 }}>THIẾT BỊ</Typography.Text>
                                        </List.Item>
                                    )}
                                    {data.devices.map(item => (
                                        <List.Item
                                            key={`device-${item.id}`}
                                            onClick={() => handleSelect({ ...item, type: 'device' })}
                                            className="search-result-item"
                                            style={{ cursor: 'pointer', padding: '12px 24px' }}
                                        >
                                            <List.Item.Meta
                                                avatar={<HddOutlined style={{ fontSize: 20, color: 'var(--primary-light)' }} />}
                                                title={<Text>{item.name}</Text>}
                                                description={<>ID: {item.deviceId} <Text type="secondary">| Tại farm: {item.farmName}</Text></>}
                                            />
                                        </List.Item>
                                    ))}
                                </List>
                            )}
                        </>
                    )}
                </div>
            </Modal>
        </>
    );
};

export default GlobalSearch;