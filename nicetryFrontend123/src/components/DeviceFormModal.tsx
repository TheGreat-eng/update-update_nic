// src/components/DeviceFormModal.tsx
import React, { useEffect } from 'react';
import { Modal, Form, Input, Select, Button } from 'antd';
import { useQuery } from '@tanstack/react-query'; // DÙNG useQuery

// API Services và Types
import type { DeviceFormData } from '../api/deviceService';
import { getZonesByFarm } from '../api/zoneService';
import type { Zone } from '../types/zone';

// Constants
import { DEVICE_TYPES } from '../constants/device';

// Context
import { useFarm } from '../context/FarmContext';

interface Props {
    visible: boolean;
    onClose: () => void;
    onSubmit: (values: DeviceFormData) => void;
    initialData?: Partial<DeviceFormData> | null;
    loading: boolean;
}

const { Option } = Select;

const DeviceFormModal: React.FC<Props> = ({ visible, onClose, onSubmit, initialData, loading }) => {
    const [form] = Form.useForm();
    const { farmId } = useFarm();

    // SỬ DỤNG useQuery ĐỂ FETCH VÀ CACHE DANH SÁCH ZONES
    const { data: zones, isLoading: isLoadingZones } = useQuery({
        queryKey: ['farmZones', farmId], // Sử dụng queryKey nhất quán
        queryFn: () => {
            if (!farmId) {
                return Promise.resolve([]); // Trả về mảng rỗng nếu không có farmId
            }
            return getZonesByFarm(farmId);
        },
        enabled: visible, // Chỉ fetch khi modal được mở
    });

    // useEffect này chỉ dùng để điền dữ liệu vào form khi modal mở hoặc khi initialData thay đổi
    useEffect(() => {
        if (visible) {
            if (initialData) {
                // Điền dữ liệu cho form khi ở chế độ "Sửa"
                form.setFieldsValue(initialData);
            } else {
                // Reset form khi ở chế độ "Thêm mới"
                form.resetFields();
            }
        }
    }, [initialData, visible, form]);

    const handleOk = () => {
        form.validateFields()
            .then(values => {
                console.log('Submitting values:', values);
                onSubmit(values);
            })
            .catch(info => {
                console.log('Validate Failed:', info);
            });
    };

    return (
        <Modal
            destroyOnClose // GIẢI QUYẾT TRIỆT ĐỂ LỖI VALIDATION
            title={initialData ? "Sửa thông tin thiết bị" : "Thêm thiết bị mới"}
            open={visible}
            onCancel={onClose}
            footer={[
                <Button key="back" onClick={onClose}>Hủy</Button>,
                <Button key="submit" type="primary" loading={loading} onClick={handleOk}>Lưu</Button>,
            ]}
        >
            <Form form={form} layout="vertical" name="device_form">
                <Form.Item name="name" label="Tên thiết bị" rules={[{ required: true, message: 'Vui lòng nhập tên thiết bị!' }]}>
                    <Input />
                </Form.Item>
                {/* VVVV--- SỬA LẠI Form.Item CHO "deviceId" ---VVVV */}
                <Form.Item
                    name="deviceId"
                    label="Device ID (Mã định danh)"
                    // Sửa lại rules: không bắt buộc nữa
                    rules={[
                        { pattern: /^[A-Z0-9:-]+$/i, message: 'Device ID chỉ được chứa chữ, số, : và -' },
                        { min: 3, message: 'Device ID phải có ít nhất 3 ký tự!' }
                    ]}
                    // Thêm help text
                    help="Nhập địa chỉ MAC để đăng ký trước, hoặc để trống để tạo thiết bị ảo/test."
                >
                    {/* Sửa lại: Không disable khi tạo mới */}
                    <Input disabled={!!initialData} placeholder="Để trống để tự động tạo" />
                </Form.Item>
                {/* ^^^^---------------------------------------------^^^^ */}
                <Form.Item name="type" label="Loại thiết bị" rules={[{ required: true, message: 'Vui lòng chọn loại thiết bị!' }]}>
                    <Select placeholder="Chọn loại">
                        {Object.values(DEVICE_TYPES).map(type => (
                            <Option key={type.value} value={type.value}>
                                {type.label}
                            </Option>
                        ))}
                    </Select>
                </Form.Item>

                {/* --- Form Item cho Zone --- */}
                <Form.Item name="zoneId" label="Vùng (Tùy chọn)">
                    <Select
                        placeholder="Chọn vùng cho thiết bị"
                        loading={isLoadingZones}
                        allowClear
                    >
                        {(zones || []).map((zone: Zone) => (
                            <Option key={zone.id} value={zone.id}>
                                {zone.name}
                            </Option>
                        ))}
                    </Select>
                </Form.Item>

                <Form.Item name="description" label="Mô tả">
                    <Input.TextArea rows={2} />
                </Form.Item>
            </Form>
        </Modal>
    );
};

export default DeviceFormModal;