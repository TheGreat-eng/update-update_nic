// src/components/ZoneFormModal.tsx
import React, { useEffect } from 'react';
import { Modal, Form, Input, Button } from 'antd';
import type { ZoneFormData } from '../api/zoneService';
import type { Zone } from '../types/zone';

interface Props {
    visible: boolean;
    onClose: () => void;
    onSubmit: (values: ZoneFormData) => void;
    initialData?: Zone | null;
    loading: boolean;
}

const ZoneFormModal: React.FC<Props> = ({ visible, onClose, onSubmit, initialData, loading }) => {
    const [form] = Form.useForm();

    useEffect(() => {
        if (visible) {
            if (initialData) {
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
                <Form.Item name="description" label="Mô tả">
                    <Input.TextArea rows={3} />
                </Form.Item>
            </Form>
        </Modal>
    );
};

export default ZoneFormModal;