// TẠO FILE MỚI: src/components/admin/ProfileFormModal.tsx
import React, { useEffect } from 'react';
import { Modal, Form, Input, Button, Card, Space, message } from 'antd';
import { MinusCircleOutlined, PlusOutlined } from '@ant-design/icons';
import type { PlantProfileDTO } from '../../types/admin';

interface Props {
    visible: boolean;
    onClose: () => void;
    onSubmit: (values: PlantProfileDTO) => void;
    initialData?: PlantProfileDTO | null;
    loading: boolean;
}

const ProfileFormModal: React.FC<Props> = ({ visible, onClose, onSubmit, initialData, loading }) => {
    const [form] = Form.useForm();

    useEffect(() => {
        if (visible) {
            if (initialData) {
                // Chuyển đổi map settings thành dạng Form.List
                const settingsList = initialData.settings
                    ? Object.entries(initialData.settings).map(([key, value]) => ({ key, value }))
                    : [];
                form.setFieldsValue({ ...initialData, settings: settingsList });
            } else {
                form.resetFields();
            }
        }
    }, [initialData, visible, form]);

    const handleOk = () => {
        form.validateFields()
            .then(values => {
                // Chuyển đổi lại Form.List thành map settings
                const settingsMap = (values.settings || []).reduce((acc: Record<string, string>, item: { key: string, value: string }) => {
                    if (item && item.key) {
                        acc[item.key] = item.value;
                    }
                    return acc;
                }, {});
                onSubmit({ ...values, settings: settingsMap });
            })
            .catch(info => {
                console.log('Validate Failed:', info);
                message.error("Vui lòng điền đầy đủ thông tin!");
            });
    };

    return (
        <Modal
            title={initialData ? "Sửa Hồ sơ Cây trồng" : "Tạo Hồ sơ Cây trồng mới"}
            open={visible}
            onCancel={onClose}
            width={800}
            footer={[
                <Button key="back" onClick={onClose}>Hủy</Button>,
                <Button key="submit" type="primary" loading={loading} onClick={handleOk}>Lưu</Button>,
            ]}
        >
            <Form form={form} layout="vertical" name="profile_form">
                <Form.Item name="name" label="Tên Hồ sơ" rules={[{ required: true }]}>
                    <Input placeholder="Ví dụ: Cà chua Cherry, Xà lách thủy canh" />
                </Form.Item>
                <Form.Item name="description" label="Mô tả">
                    <Input.TextArea rows={2} />
                </Form.Item>

                <Card title="Các ngưỡng cài đặt" size="small">
                    <Form.List name="settings">
                        {(fields, { add, remove }) => (
                            <>
                                {fields.map(({ key, name, ...restField }) => (
                                    <Space key={key} style={{ display: 'flex', marginBottom: 8 }} align="baseline">
                                        <Form.Item {...restField} name={[name, 'key']} rules={[{ required: true, message: 'Thiếu key' }]}>
                                            <Input placeholder="Key (VD: PLANT_HEALTH_HEAT_STRESS_THRESHOLD)" style={{ width: 350 }} />
                                        </Form.Item>
                                        <Form.Item {...restField} name={[name, 'value']} rules={[{ required: true, message: 'Thiếu value' }]}>
                                            <Input placeholder="Value (VD: 32.0)" style={{ width: 150 }} />
                                        </Form.Item>
                                        <MinusCircleOutlined onClick={() => remove(name)} />
                                    </Space>
                                ))}
                                <Form.Item>
                                    <Button type="dashed" onClick={() => add()} block icon={<PlusOutlined />}>
                                        Thêm Cài đặt
                                    </Button>
                                </Form.Item>
                            </>
                        )}
                    </Form.List>
                </Card>
            </Form>
        </Modal>
    );
};

export default ProfileFormModal;