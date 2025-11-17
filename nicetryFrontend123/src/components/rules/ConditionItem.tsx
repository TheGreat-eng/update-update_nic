// src/components/rules/ConditionItem.tsx
import React from 'react';
import { Form, Select, Input, TimePicker, Space } from 'antd';
import type { Device } from '../../types/device';
import dayjs from 'dayjs'; // THÊM dayjs


const { Option } = Select;

interface ConditionItemProps {
    form: any; // Ant Form instance
    name: number; // Index of the condition in the Form.List
    restField: any;
    sensors: Device[];
}

export const ConditionItem: React.FC<ConditionItemProps> = ({ form, name, restField, sensors }) => {
    const conditionType = Form.useWatch(['conditions', name, 'type'], form);
    const conditionValue = Form.useWatch(['conditions', name, 'value'], form); // Lấy giá trị 'value'

    // VVVV--- SỬA LẠI HOÀN TOÀN PHẦN RENDER CHO TIME_RANGE ---VVVV
    const getTimeRangeValue = () => {
        if (conditionType === 'TIME_RANGE' && typeof conditionValue === 'string' && conditionValue.includes('-')) {
            const [start, end] = conditionValue.split('-');
            if (start && end) {
                return [dayjs(start, 'HH:mm'), dayjs(end, 'HH:mm')];
            }
        }
        return null;
    };
    return (
        <Space style={{ display: 'flex', alignItems: 'flex-end', gap: 8, marginBottom: 16 }} align="baseline">
            <Form.Item {...restField} name={[name, 'type']} label="Loại điều kiện" rules={[{ required: true }]}>
                <Select style={{ width: 180 }}>
                    <Option value="SENSOR_VALUE">Giá trị Cảm biến</Option>
                    <Option value="TIME_RANGE">Khung giờ</Option>
                    <Option value="WEATHER">Điều kiện Thời tiết</Option>
                    <Option value="DEVICE_STATUS">Trạng thái Thiết bị</Option>
                </Select>
            </Form.Item>

            {conditionType === 'SENSOR_VALUE' && (
                <>
                    <Form.Item {...restField} name={[name, 'deviceId']} label="Cảm biến" rules={[{ required: true }]}>
                        <Select showSearch placeholder="Chọn cảm biến" style={{ width: 180 }}>
                            {sensors.map(s => <Option key={s.deviceId} value={s.deviceId}>{s.name} ({s.deviceId})</Option>)}
                        </Select>
                    </Form.Item>
                    <Form.Item {...restField} name={[name, 'field']} label="Chỉ số" rules={[{ required: true }]}>
                        <Select style={{ width: 140 }}>
                            <Option value="temperature">Nhiệt độ</Option>
                            <Option value="humidity">Độ ẩm KK</Option>
                            <Option value="soil_moisture">Độ ẩm đất</Option>
                            <Option value="light_intensity">Ánh sáng</Option>
                            <Option value="soilPH">pH đất</Option>
                        </Select>
                    </Form.Item>
                    <Form.Item {...restField} name={[name, 'operator']} label="Toán tử" rules={[{ required: true }]}>
                        <Select style={{ width: 130 }}>
                            <Option value="GREATER_THAN">{'>'}</Option>
                            <Option value="LESS_THAN">{'<'}</Option>
                            <Option value="EQUALS">{'='}</Option>
                        </Select>
                    </Form.Item>
                    <Form.Item {...restField} name={[name, 'value']} label="Giá trị" rules={[{ required: true }]}>
                        <Input placeholder="VD: 30" style={{ width: 100 }} />
                    </Form.Item>
                </>
            )}

            {conditionType === 'TIME_RANGE' && (
                <>
                    {/* Trường 'value' ẩn đi để lưu dữ liệu chuỗi */}
                    <Form.Item {...restField} name={[name, 'value']} noStyle>
                        <Input type="hidden" />
                    </Form.Item>

                    {/* Component Time.RangePicker chỉ dùng để nhập liệu */}
                    <Form.Item
                        label="Khung giờ (HH:mm)"
                        rules={[{ required: true, message: 'Vui lòng chọn khung giờ!' }]}
                    >
                        <TimePicker.RangePicker
                            format="HH:mm"
                            value={getTimeRangeValue() as any} // Set giá trị hiển thị cho picker
                            onChange={(_, formatString) => {
                                // Khi thay đổi, cập nhật trường 'value' ẩn
                                form.setFieldsValue({
                                    conditions: {
                                        [name]: {
                                            value: `${formatString[0]}-${formatString[1]}`
                                        }
                                    }
                                });
                            }}
                        />
                    </Form.Item>
                </>
            )}

            {(conditionType === 'WEATHER' || conditionType === 'DEVICE_STATUS') && (
                <>
                    <Form.Item {...restField} name={[name, 'field']} label="Chỉ số" rules={[{ required: true }]}>
                        <Select style={{ width: 180 }}>
                            {conditionType === 'WEATHER' ? (
                                <>
                                    <Option value="temperature">Nhiệt độ thời tiết</Option>
                                    <Option value="rain_amount">Lượng mưa</Option>
                                    <Option value="humidity">Độ ẩm thời tiết</Option>
                                </>
                            ) : (
                                <Option value="status">Trạng thái kết nối</Option>
                            )}
                        </Select>
                    </Form.Item>
                    <Form.Item {...restField} name={[name, 'operator']} label="Toán tử" rules={[{ required: true }]}>
                        <Select style={{ width: 130 }}>
                            <Option value="EQUALS">Bằng</Option>
                            <Option value="NOT_EQUALS">Khác</Option>
                            {conditionType === 'WEATHER' && <Option value="GREATER_THAN">{'>'}</Option>}
                            {conditionType === 'WEATHER' && <Option value="LESS_THAN">{'<'}</Option>}
                        </Select>
                    </Form.Item>
                    <Form.Item {...restField} name={[name, 'value']} label="Giá trị" rules={[{ required: true }]}>
                        {conditionType === 'DEVICE_STATUS' ? (
                            <Select style={{ width: 120 }}>
                                <Option value="ONLINE">ONLINE</Option>
                                <Option value="OFFLINE">OFFLINE</Option>
                            </Select>
                        ) : (
                            <Input placeholder="VD: 25" style={{ width: 100 }} />
                        )}
                    </Form.Item>
                </>
            )}
        </Space>
    );
};