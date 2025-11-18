// src/components/ZoneFormModal.tsx
import React, { useEffect } from 'react';
import { Modal, Form, Input, Button, Select } from 'antd';
import { useQuery } from '@tanstack/react-query'; // Thêm useQuery
import type { ZoneFormData } from '../api/zoneService';
import type { Zone } from '../types/zone';
import { getPlantProfiles } from '../api/plantProfileService'; // Import service mới




const { Option } = Select;


interface Props {
    visible: boolean;
    onClose: () => void;
    onSubmit: (values: ZoneFormData) => void;
    initialData?: Zone | null;
    loading: boolean;
}


const ZoneFormModal: React.FC<Props> = ({ visible, onClose, onSubmit, initialData, loading }) => {
    const [form] = Form.useForm();

    // VVVV--- FETCH DANH SÁCH PLANT PROFILES ---VVVV
    const { data: profiles, isLoading: isLoadingProfiles } = useQuery({
        queryKey: ['plantProfiles'],
        queryFn: getPlantProfiles,
        enabled: visible, // Chỉ fetch khi modal mở
    });
    // ^^^^---------------------------------------^^^^

    useEffect(() => {
        if (visible) {
            if (initialData) {
                // Sửa DTO ở backend để trả về plantProfileId
                form.setFieldsValue(initialData);
            } else {
                form.resetFields();
            }
        }
    }, [initialData, visible, form]);

    const handleOk = () => {
        form.validateFields()
            .then(values => {
                onSubmit(values);
            })
            .catch(info => {
                console.log('Validate Failed:', info);
            });
    };

    return (
        <Modal
            title={initialData ? "Sửa thông tin Vùng" : "Tạo Vùng mới"}
            open={visible}
            onCancel={onClose}
            footer={[
                <Button key="back" onClick={onClose}>Hủy</Button>,
                <Button key="submit" type="primary" loading={loading} onClick={handleOk}>Lưu</Button>,
            ]}
        >
            <Form form={form} layout="vertical" name="zone_form">
                <Form.Item name="name" label="Tên Vùng" rules={[{ required: true, message: 'Vui lòng nhập tên vùng!' }]}>
                    <Input placeholder="Ví dụ: Nhà kính A, Vườn ươm..." />
                </Form.Item>


                {/* VVVV--- THÊM DROPDOWN CHỌN PROFILE ---VVVV */}
                <Form.Item name="plantProfileId" label="Loại cây trồng (Hồ sơ chăm sóc)">
                    <Select
                        placeholder="Chọn hồ sơ chăm sóc cho vùng này"
                        loading={isLoadingProfiles}
                        allowClear
                    >
                        {(profiles || []).map(profile => (
                            <Option key={profile.id} value={profile.id}>
                                {profile.name}
                            </Option>
                        ))}
                    </Select>
                </Form.Item>
                {/* ^^^^------------------------------------^^^^ */}

                <Form.Item name="description" label="Mô tả">
                    <Input.TextArea rows={3} />
                </Form.Item>
            </Form>
        </Modal>
    );
};

export default ZoneFormModal;