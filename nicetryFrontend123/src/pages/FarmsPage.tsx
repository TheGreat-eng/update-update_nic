// src/pages/FarmsPage.tsx (Phiên bản hoàn chỉnh sau nâng cấp)
import React, { useEffect, useState, useMemo } from 'react';
import {
    Row, Col, Card, Button, Typography, Spin, message,
    Popconfirm, Empty, Tag, Statistic, Modal, Tabs, Descriptions
} from 'antd';
import {
    PlusOutlined, EditOutlined, DeleteOutlined, CheckCircleOutlined,
    TeamOutlined, InfoCircleOutlined,
    AppstoreOutlined
} from '@ant-design/icons';
import { MapPin } from 'lucide-react';

// API services and types
import { getFarms, createFarm, updateFarm, deleteFarm } from '../api/farmService';
import type { Farm, FarmFormData } from '../types/farm';

// Custom components and hooks
import FarmFormModal from '../components/FarmFormModal';
import { FarmMembers } from '../components/FarmMembers'; // Component quản lý thành viên mới
import { useFarm } from '../context/FarmContext';
import { useApiCall } from '../hooks/useApiCall';
import { getUserFromStorage } from '../utils/auth';
import { SUCCESS_MESSAGES } from '../constants/messages';
import { FarmZones } from '../components/FarmZones'; // VVVV--- THÊM IMPORT NÀY ---VVVV


const { Title, Text, Paragraph } = Typography;
const { TabPane } = Tabs;

const FarmsPage: React.FC = () => {
    // ---- STATE MANAGEMENT ----
    const { farmId, setFarmId } = useFarm();
    const [farms, setFarms] = useState<Farm[]>([]);

    // State cho các modal
    const [isFormModalVisible, setIsFormModalVisible] = useState(false);
    const [isDetailModalVisible, setIsDetailModalVisible] = useState(false);

    // State để theo dõi farm đang được thao tác
    const [editingFarm, setEditingFarm] = useState<Farm | null>(null);
    const [selectedFarmDetail, setSelectedFarmDetail] = useState<Farm | null>(null);

    const currentUser = useMemo(() => getUserFromStorage(), []);

    // ---- API CALLS using custom hook ----
    const { loading: isLoadingFarms, execute: fetchFarmsApi } = useApiCall<Farm[]>({
        onSuccess: (data) => setFarms(data),
    });

    const { loading: isSubmittingForm, execute: saveFarmApi } = useApiCall({
        showSuccessMessage: true, // Tự động hiển thị message thành công
    });

    const { execute: deleteFarmApi } = useApiCall({
        successMessage: SUCCESS_MESSAGES.FARM_DELETED,
        showSuccessMessage: true,
    });

    // ---- DATA FETCHING ----
    const fetchFarms = async () => {
        try {
            await fetchFarmsApi(async () => {
                const response = await getFarms();
                const farmData = response.data.data || response.data;
                return Array.isArray(farmData) ? farmData : [];
            });
        } catch (error) {
            console.error('Failed to fetch farms:', error);
            message.error('Không thể tải danh sách nông trại.');
        }
    };

    useEffect(() => {
        fetchFarms();
    }, []);

    // ---- EVENT HANDLERS ----
    const openFormModal = (farm: Farm | null) => {
        setEditingFarm(farm);
        setIsFormModalVisible(true);
    };

    const openDetailModal = (farm: Farm) => {
        setSelectedFarmDetail(farm);
        setIsDetailModalVisible(true);
    };

    const handleFormSubmit = async (values: FarmFormData) => {
        try {
            await saveFarmApi(async () => {
                if (editingFarm) {
                    await updateFarm(editingFarm.id, values);
                } else {
                    await createFarm(values);
                }
            });
            setIsFormModalVisible(false);
            setEditingFarm(null);
            fetchFarms(); // Tải lại danh sách sau khi thao tác thành công
        } catch (error) {
            console.error('Failed to save farm:', error);
            // Lỗi đã được xử lý trong useApiCall, không cần message.error ở đây
        }
    };

    const handleDelete = async (farmToDeleteId: number) => {
        try {
            await deleteFarmApi(() => deleteFarm(farmToDeleteId));
            if (farmId === farmToDeleteId) {
                setFarmId(null); // Reset farmId nếu xóa farm đang chọn
            }
            fetchFarms(); // Tải lại danh sách
        } catch (error) {
            console.error('Failed to delete farm:', error);
        }
    };

    // ---- RENDER LOGIC ----
    if (isLoadingFarms && farms.length === 0) {
        return (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '50vh' }}>
                <Spin size="large" tip="Đang tải nông trại..." />
            </div>
        );
    }

    return (
        <div>
            {/* Page Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
                <div>
                    <Title level={2} style={{ margin: 0 }}>Quản lý Nông trại</Title>
                    <Text type="secondary">Tất cả nông trại của bạn ở cùng một nơi.</Text>
                </div>
                <Button type="primary" icon={<PlusOutlined />} onClick={() => openFormModal(null)}>
                    Thêm nông trại
                </Button>
            </div>

            {/* Farm List or Empty State */}
            {farms.length > 0 ? (
                <Row gutter={[24, 24]}>
                    {farms.map(farm => {
                        const isOwner = currentUser?.userId === farm.ownerId;
                        return (
                            <Col xs={24} sm={12} lg={8} key={farm.id}>
                                <Card
                                    hoverable
                                    onClick={() => openDetailModal(farm)}
                                    style={{
                                        border: farmId === farm.id ? '1px solid var(--primary-light)' : '1px solid var(--border-light)',
                                        boxShadow: farmId === farm.id ? '0 0 0 3px rgba(99, 102, 241, 0.2)' : 'none',
                                        display: 'flex', flexDirection: 'column', height: '100%',
                                    }}
                                    bodyStyle={{ flexGrow: 1, padding: 20 }}
                                    actions={[
                                        isOwner ? <Button type="text" icon={<EditOutlined />} onClick={(e) => { e.stopPropagation(); openFormModal(farm); }}>Sửa</Button> : null,
                                        isOwner ? (
                                            <Popconfirm
                                                title="Xóa nông trại này?"
                                                description="Hành động này không thể hoàn tác."
                                                onConfirm={(e) => { e?.stopPropagation(); handleDelete(farm.id); }}
                                                onCancel={(e) => e?.stopPropagation()}
                                                okText="Xóa" cancelText="Hủy"
                                            >
                                                <Button type="text" danger icon={<DeleteOutlined />} onClick={(e) => e.stopPropagation()}>Xóa</Button>
                                            </Popconfirm>
                                        ) : null,
                                        <Button type="primary" onClick={(e) => { e.stopPropagation(); setFarmId(farm.id); message.success(`Đã chọn nông trại ${farm.name}`); }} disabled={farmId === farm.id}>Chọn</Button>
                                    ].filter(Boolean)}
                                >
                                    <Title level={4} style={{ marginBottom: 8, display: 'flex', alignItems: 'center' }}>
                                        {farm.name}
                                        {farmId === farm.id && (
                                            <Tag icon={<CheckCircleOutlined />} color="processing" style={{ marginLeft: 8 }}>Đang chọn</Tag>
                                        )}
                                    </Title>
                                    <Text type="secondary" style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 16 }}>
                                        <MapPin size={14} /> {farm.location || 'Chưa có vị trí'}
                                    </Text>
                                    <Paragraph type="secondary" ellipsis={{ rows: 2, expandable: true, symbol: 'thêm' }}>
                                        {farm.description || 'Không có mô tả.'}
                                    </Paragraph>
                                    <div style={{ marginTop: 'auto', paddingTop: 16 }}>
                                        <Statistic title="Thiết bị Online" value={farm.onlineDevices ?? 0} suffix={`/ ${farm.totalDevices ?? 0}`} />
                                    </div>
                                </Card>
                            </Col>
                        );
                    })}
                </Row>
            ) : (
                <Empty description="Bạn chưa có nông trại nào" style={{ marginTop: 64 }}>
                    <Button type="primary" icon={<PlusOutlined />} onClick={() => openFormModal(null)}>
                        Tạo nông trại đầu tiên
                    </Button>
                </Empty>
            )}

            {/* Modal for Creating/Editing Farm */}
            <FarmFormModal
                visible={isFormModalVisible}
                onClose={() => setIsFormModalVisible(false)}
                onSubmit={handleFormSubmit}
                initialData={editingFarm}
                loading={isSubmittingForm}
            />

            {/* Modal for Farm Details and Member Management */}
            <Modal
                title={<Title level={4}>{selectedFarmDetail?.name}</Title>}
                open={isDetailModalVisible}
                onCancel={() => setIsDetailModalVisible(false)}
                footer={null}
                width={720}
                destroyOnClose // Reset state của Tabs khi modal đóng
            >
                {selectedFarmDetail && (
                    <Tabs defaultActiveKey="1">
                        <TabPane tab={<span><InfoCircleOutlined />Thông tin chung</span>} key="1">
                            <Descriptions bordered column={1} size="small">
                                <Descriptions.Item label="Mô tả">{selectedFarmDetail.description || 'Chưa có mô tả'}</Descriptions.Item>
                                <Descriptions.Item label="Vị trí">{selectedFarmDetail.location || 'Chưa có vị trí'}</Descriptions.Item>
                                <Descriptions.Item label="Chủ sở hữu">{selectedFarmDetail.ownerEmail}</Descriptions.Item>
                                <Descriptions.Item label="Ngày tạo">{selectedFarmDetail.createdAt ? new Date(selectedFarmDetail.createdAt).toLocaleString('vi-VN') : 'N/A'}</Descriptions.Item>
                            </Descriptions>
                        </TabPane>


                        {/* VVVV--- THÊM TAB MỚI NÀY ---VVVV */}
                        <TabPane tab={<span><AppstoreOutlined />Quản lý Vùng</span>} key="3">
                            <FarmZones
                                farmId={selectedFarmDetail.id}
                                canManage={currentUser?.userId === selectedFarmDetail.ownerId || selectedFarmDetail.currentUserRole === 'OPERATOR'}
                            />
                        </TabPane>
                        {/* ^^^^----------------------------^^^^ */}





                        <TabPane tab={<span><TeamOutlined />Quản lý thành viên</span>} key="2">
                            <FarmMembers
                                farmId={selectedFarmDetail.id}
                                isOwner={currentUser?.userId === selectedFarmDetail.ownerId}
                            />
                        </TabPane>
                    </Tabs>
                )}
            </Modal>
        </div>
    );
};

export default FarmsPage;