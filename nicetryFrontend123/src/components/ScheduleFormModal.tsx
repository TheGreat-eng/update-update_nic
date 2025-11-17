import React, { useEffect, useState } from 'react';
import { Modal, Form, Input, Select, InputNumber, Radio, Checkbox, TimePicker } from 'antd';
import type { Schedule } from '../types/schedule';
import type { Device } from '../types/device';

interface Props {
    visible: boolean;
    onClose: () => void;
    onSubmit: (values: any) => void;
    initialData?: Partial<Schedule> | null;
    loading: boolean;
    actuators: Device[];
}

const ScheduleFormModal: React.FC<Props> = ({ visible, onClose, onSubmit, initialData, loading, actuators }) => {
    const [form] = Form.useForm();
    const action = Form.useWatch('action', form);
    const [scheduleType, setScheduleType] = useState('daily'); // daily, weekly

    // Hàm sinh CRON expression
    const generateCron = () => {
        const type = form.getFieldValue('scheduleType');
        const time = form.getFieldValue('time');
        const weekDays = form.getFieldValue('weekDays');

        if (!time) return;

        const minute = time.minute();
        const hour = time.hour();

        // Format: Giây Phút Giờ Ngày Tháng NgàyTrongTuần
        if (type === 'daily') {
            form.setFieldsValue({ cronExpression: `0 ${minute} ${hour} * * ?` });
        } else if (type === 'weekly' && weekDays && weekDays.length > 0) {
            // Quartz: 1=SUN, 2=MON, ..., 7=SAT
            // Antd Checkbox: SUN, MON, ...
            form.setFieldsValue({ cronExpression: `0 ${minute} ${hour} ? * ${weekDays.join(',')}` });
        }
    };

    useEffect(() => {
        if (visible) {
            if (initialData) {
                form.setFieldsValue(initialData);
                // TODO: Parse cron to set UI fields if needed
            } else {
                form.resetFields();
                form.setFieldsValue({ scheduleType: 'daily', enabled: true });
            }
        }
    }, [initialData, visible, form]);

    const handleFormSubmit = (values: any) => {
        // Lọc ra chỉ những trường mà ScheduleDTO ở backend cần
        const payload = {
            name: values.name,
            description: values.description,
            deviceId: values.deviceId,
            action: values.action,
            cronExpression: values.cronExpression,
            durationSeconds: values.durationSeconds,
            enabled: values.enabled,
        };
        // Gọi hàm onSubmit của component cha với payload đã được làm sạch
        onSubmit(payload);
    };

    return (
        <Modal
            title={initialData ? "Sửa Lịch trình" : "Tạo Lịch trình mới"}
            open={visible}
            onCancel={onClose}
            // Sửa lại onOk để gọi submit của form, nó sẽ trigger onFinish
            onOk={() => form.submit()}
            confirmLoading={loading}
            destroyOnClose
        >
            <Form form={form} layout="vertical" onFinish={handleFormSubmit}>
                <Form.Item name="name" label="Tên Lịch trình" rules={[{ required: true }]}>
                    <Input placeholder="Ví dụ: Bật đèn buổi tối" />
                </Form.Item>
                <Form.Item name="deviceId" label="Thiết bị Điều khiển" rules={[{ required: true }]}>
                    <Select placeholder="Chọn thiết bị">
                        {actuators.map(d => <Select.Option key={d.deviceId} value={d.deviceId}>{d.name}</Select.Option>)}
                    </Select>
                </Form.Item>
                <Form.Item name="action" label="Hành động" rules={[{ required: true }]}>
                    <Select>
                        <Select.Option value="TURN_ON">Bật</Select.Option>
                        <Select.Option value="TURN_OFF">Tắt</Select.Option>
                    </Select>
                </Form.Item>
                {action === 'TURN_ON' && (
                    <Form.Item name="durationSeconds" label="Thời gian Bật (giây)">
                        <InputNumber style={{ width: '100%' }} placeholder="Để trống nếu muốn bật cho đến khi có lệnh tắt" />
                    </Form.Item>
                )}
                <Form.Item name="scheduleType" label="Lặp lại">
                    <Radio.Group onChange={(e) => setScheduleType(e.target.value)}>
                        <Radio.Button value="daily">Hàng ngày</Radio.Button>
                        <Radio.Button value="weekly">Hàng tuần</Radio.Button>
                    </Radio.Group>
                </Form.Item>

                {scheduleType === 'weekly' && (
                    <Form.Item name="weekDays" label="Chọn các ngày trong tuần">
                        <Checkbox.Group onChange={generateCron}>
                            <Checkbox value="SUN">Chủ Nhật</Checkbox>
                            <Checkbox value="MON">Thứ 2</Checkbox>
                            <Checkbox value="TUE">Thứ 3</Checkbox>
                            <Checkbox value="WED">Thứ 4</Checkbox>
                            <Checkbox value="THU">Thứ 5</Checkbox>
                            <Checkbox value="FRI">Thứ 6</Checkbox>
                            <Checkbox value="SAT">Thứ 7</Checkbox>
                        </Checkbox.Group>
                    </Form.Item>
                )}

                <Form.Item name="time" label="Vào lúc" rules={[{ required: true, message: "Vui lòng chọn thời gian!" }]}>
                    <TimePicker format="HH:mm" onChange={generateCron} style={{ width: '100%' }} />
                </Form.Item>

                {/* Ô CRON bây giờ sẽ được tự động điền và có thể ẩn đi */}
                <Form.Item
                    name="cronExpression"
                    label="Lịch trình (CRON Expression)"
                    rules={[{ required: true }]}
                // Bạn có thể ẩn trường này nếu muốn
                // style={{ display: 'none' }} 
                >
                    <Input placeholder="Sẽ được tự động tạo" readOnly />
                </Form.Item>

                <Form.Item name="enabled" label="Trạng thái" initialValue={true} valuePropName="checked">
                    <Select>
                        <Select.Option value={true}>Bật</Select.Option>
                        <Select.Option value={false}>Tắt</Select.Option>
                    </Select>
                </Form.Item>
            </Form>
        </Modal>
    );
};

export default ScheduleFormModal;