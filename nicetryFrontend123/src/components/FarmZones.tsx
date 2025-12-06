// src/components/FarmZones.tsx
import React, { useState } from 'react';
import { List, Button, Popconfirm, message, Empty, Tag, Modal } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, AppstoreOutlined } from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getZonesByFarm, createZone, updateZone, deleteZone } from '../api/zoneService';
import ZoneFormModal from './ZoneFormModal';
import type { Zone } from '../types/zone';
import type { ZoneFormData } from '../api/zoneService';
// Thêm import
import { SettingOutlined } from '@ant-design/icons';
import { ZoneSettings } from './ZoneSettings';

interface FarmZonesProps {
    farmId: number;
    canManage: boolean; // Nhận quyền quản lý từ component cha
}

export const FarmZones: React.FC<FarmZonesProps> = ({ farmId, canManage }) => {
    const queryClient = useQueryClient();
    const [isModalVisible, setIsModalVisible] = useState(false);
    const [editingZone, setEditingZone] = useState<Zone | null>(null);
    // State quản lý modal settings
    const [isSettingsModalVisible, setIsSettingsModalVisible] = useState(false);
    const [settingZoneId, setSettingZoneId] = useState<number | null>(null);

    const { data: zones, isLoading } = useQuery({
        queryKey: ['farmZones', farmId],
        queryFn: () => getZonesByFarm(farmId),
    });

    const mutationOptions = (successMsg: string) => ({
        onSuccess: () => {
            message.success(successMsg);
            queryClient.invalidateQueries({ queryKey: ['farmZones', farmId] });
            setIsModalVisible(false);
            setEditingZone(null);
        },
        onError: (err: any) => {
            message.error(err.response?.data?.message || 'Thao tác thất bại!');
        },
    });

    const createMutation = useMutation({
        mutationFn: (values: ZoneFormData) => createZone(farmId, values),
        ...mutationOptions('Tạo vùng thành công!'),
    });

    const updateMutation = useMutation({
        mutationFn: (values: ZoneFormData) => {
            if (!editingZone) throw new Error("Zone not found");
            return updateZone(editingZone.id, values);
        },
        ...mutationOptions('Cập nhật vùng thành công!'),
    });

    const deleteMutation = useMutation({
        mutationFn: (zoneId: number) => deleteZone(zoneId),
        ...mutationOptions('Xóa vùng thành công!'),
    });

    const handleModalSubmit = (values: ZoneFormData) => {
        if (editingZone) {
            updateMutation.mutate(values);
        } else {
            createMutation.mutate(values);
        }
    };

    const openModal = (zone: Zone | null) => {
        setEditingZone(zone);
        setIsModalVisible(true);
    };

    // Hàm mở modal
    const openSettings = (zone: Zone) => {
        setSettingZoneId(zone.id);
        setIsSettingsModalVisible(true);
    };

    return (
        <div>
            {canManage && (
                <Button
                    type="primary"
                    icon={<PlusOutlined />}
                    onClick={() => openModal(null)}
                    style={{ marginBottom: 16 }}
                >
                    Tạo Vùng mới
                </Button>
            )}

            {isLoading ? (
                <p>Đang tải danh sách vùng...</p>
            ) : !zones || zones.length === 0 ? (
                <Empty description="Nông trại này chưa có vùng nào." />
            ) : (
                <List
                    itemLayout="horizontal"
                    dataSource={zones}
                    renderItem={(item: Zone) => (
                        <List.Item
                            actions={canManage ? [
                                <Button type="text" icon={<EditOutlined />} onClick={() => openModal(item)}>Sửa</Button>,
                                // --> THÊM NÚT NÀY <--
                                <Button type="text" icon={<SettingOutlined />} onClick={() => openSettings(item)}>Cài đặt</Button>,
                                <Popconfirm
                                    title="Xóa vùng này?"
                                    description="Các thiết bị trong vùng sẽ không bị xóa."
                                    onConfirm={() => deleteMutation.mutate(item.id)}
                                >
                                    <Button type="text" danger icon={<DeleteOutlined />}>Xóa</Button>
                                </Popconfirm>


                            ] : []}
                        >
                            <List.Item.Meta
                                avatar={<AppstoreOutlined style={{ fontSize: 24, color: '#667eea' }} />}
                                title={item.name}
                                // VVVV--- THÊM HIỂN THỊ PROFILE ---VVVV
                                description={
                                    <>
                                        <div>{item.description || 'Không có mô tả.'}</div>
                                        {item.plantProfileName && (
                                            <Tag color="green" style={{ marginTop: 4 }}>
                                                Hồ sơ: {item.plantProfileName}
                                            </Tag>
                                        )}
                                    </>
                                }
                            // ^^^^------------------------------^^^^
                            />
                            <Tag>{item.deviceCount || 0} thiết bị</Tag>
                        </List.Item>
                    )}
                />
            )}

            <ZoneFormModal
                visible={isModalVisible}
                onClose={() => setIsModalVisible(false)}
                onSubmit={handleModalSubmit}
                initialData={editingZone}
                loading={createMutation.isPending || updateMutation.isPending}
            />


            <Modal
                title="Cài đặt nâng cao cho Vùng"
                open={isSettingsModalVisible}
                onCancel={() => setIsSettingsModalVisible(false)}
                footer={null} // ZoneSettings tự có nút Save
                destroyOnClose
            >
                {settingZoneId && (
                    <ZoneSettings
                        zoneId={settingZoneId}
                        onClose={() => setIsSettingsModalVisible(false)}
                    />
                )}
            </Modal>



        </div>
    );
};