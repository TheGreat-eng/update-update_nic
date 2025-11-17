// src/components/FarmFormModal.tsx

import React, { useEffect } from 'react';
import { Modal, Form, Input, Button } from 'antd';
import type { FarmFormData } from '../types/farm';
import type { Farm } from '../types/farm';

interface Props {
    visible: boolean;
    onClose: () => void;
    onSubmit: (values: FarmFormData) => void;
    initialData?: Farm | null;
    loading: boolean;
}

const FarmFormModal: React.FC<Props> = ({ visible, onClose, onSubmit, initialData, loading }) => {
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
            title={initialData ? "Sửa thông tin nông trại" : "Thêm nông trại mới"}
            open={visible}
            onCancel={onClose}
            footer={[
                <Button key="back" onClick={onClose}>Hủy</Button>,
                <Button key="submit" type="primary" loading={loading} onClick={handleOk}>Lưu</Button>,
            ]}
        >
            <Form form={form} layout="vertical" name="farm_form">
                <Form.Item name="name" label="Tên nông trại" rules={[{ required: true, message: 'Vui lòng nhập tên nông trại!' }]}>
                    <Input />
                </Form.Item>
                <Form.Item name="location" label="Vị trí (VD: Hanoi,VN)">
                    <Input />
                </Form.Item>
                <Form.Item name="description" label="Mô tả">
                    <Input.TextArea rows={3} />
                </Form.Item>
            </Form>
        </Modal>
    );
};

export default FarmFormModal;