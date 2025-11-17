// src/components/rules/ActionItem.tsx
import React from 'react';
import { Form, Select, Input, Space } from 'antd';
import type { Device } from '../../types/device';

const { Option } = Select;

interface ActionItemProps {
    form: any;
    name: number;
    restField: any;
    actuators: Device[];
}

export const ActionItem: React.FC<ActionItemProps> = ({ form, name, restField, actuators }) => {
    // BÂY GIỜ VIỆC GỌI useWatch Ở ĐÂY LÀ HỢP LỆ
    const actionType = Form.useWatch(['actions', name, 'type'], form);

    return (
        <Space style={{ display: 'flex', alignItems: 'flex-end', gap: 8 }} align="baseline">
            <Form.Item {...restField} name={[name, 'type']} label="Hành động" rules={[{ required: true }]}>
                <Select style={{ width: 200 }}>
                    <Option value="TURN_ON_DEVICE">Bật thiết bị</Option>
                    <Option value="TURN_OFF_DEVICE">Tắt thiết bị</Option>
                    <Option value="SEND_NOTIFICATION">Gửi thông báo (Web)</Option>
                    <Option value="SEND_EMAIL">Gửi Email & Thông báo</Option>
                </Select>
            </Form.Item>

            {(actionType === 'TURN_ON_DEVICE' || actionType === 'TURN_OFF_DEVICE') && (
                <>
                    <Form.Item {...restField} name={[name, 'deviceId']} label="Thiết bị" rules={[{ required: true }]}>
                        <Select showSearch placeholder="Chọn thiết bị" style={{ width: 180 }}>
                            {actuators.map(a => <Option key={a.deviceId} value={a.deviceId}>{a.name} ({a.deviceId})</Option>)}
                        </Select>
                    </Form.Item>
                    {actionType === 'TURN_ON_DEVICE' && (
                        <Form.Item {...restField} name={[name, 'durationSeconds']} label="Thời gian (giây)">
                            <Input placeholder="VD: 300" style={{ width: 120 }} />
                        </Form.Item>
                    )}
                </>
            )}

            {(actionType === 'SEND_NOTIFICATION' || actionType === 'SEND_EMAIL') && (
                <Form.Item {...restField} name={[name, 'message']} label="Nội dung" rules={[{ required: true }]}>
                    <Input.TextArea
                        rows={1}
                        placeholder="Nội dung thông báo sẽ được gửi đi"
                        style={{ width: 350 }}
                    />
                </Form.Item>
            )}
        </Space>
    );
};