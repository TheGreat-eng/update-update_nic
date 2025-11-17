// src/pages/CreateRulePage.tsx
import React, { useEffect, useState, useMemo } from 'react';
import { Form, Input, Card, Typography, message, Spin } from 'antd';
import { MinusCircleOutlined, PlusOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { createRule } from '../api/ruleService';
import type { Rule } from '../types/rule';
import { useFarm } from '../context/FarmContext';
import type { Device } from '../types/device';
import { getDevicesByFarm } from '../api/deviceService';

import { Result, Button } from 'antd'; // <<<< THÊM IMPORT
import { getFarms } from '../api/farmService';
import { useQuery } from '@tanstack/react-query';
import { ConditionItem } from '../components/rules/ConditionItem'; // VVVV--- IMPORT COMPONENT MỚI ---VVVV
import { ActionItem } from '../components/rules/ActionItem'; // VVVV--- IMPORT COMPONENT MỚI ---VVVV

const { Title } = Typography;

const CreateRulePage: React.FC = () => {
    const { farmId } = useFarm();
    const [form] = Form.useForm();
    const navigate = useNavigate();
    //const [devices, setDevices] = useState<Device[]>([]);
    const [sensors, setSensors] = useState<Device[]>([]);
    const [actuators, setActuators] = useState<Device[]>([]);
    const [loading, setLoading] = useState(false);

    // <<<< THÊM LOGIC KIỂM TRA QUYỀN >>>>
    const { data: farms, isLoading: isLoadingFarms } = useQuery({
        queryKey: ['farms'],
        queryFn: () => getFarms().then(res => res.data.data),
    });




    const currentUserPermission = useMemo(() => {
        if (!farmId || !farms) return 'VIEWER';
        const currentFarm = farms.find(f => f.id === farmId);
        return currentFarm?.currentUserRole || 'VIEWER';
    }, [farmId, farms]);

    const canManage = currentUserPermission === 'OWNER' || currentUserPermission === 'OPERATOR';

    useEffect(() => {
        if (canManage && farmId) {
            const fetchDevices = async () => {
                if (!farmId) return;
                try {
                    const response = await getDevicesByFarm(farmId);
                    const allDevices: Device[] = response.data.data; // Lấy dữ liệu và gán vào biến cục bộ

                    // setDevices(allDevices); // <-- XÓA DÒNG NÀY

                    // Dùng trực tiếp biến 'allDevices' để set sensors và actuators
                    setSensors(allDevices.filter(d => d.type.startsWith('SENSOR')));
                    setActuators(allDevices.filter(d => d.type.startsWith('ACTUATOR')));
                } catch (error) {
                    console.error('Failed to fetch devices:', error);
                    message.error('Không thể tải danh sách thiết bị');
                }
            };

            fetchDevices();
        }
    }, [farmId, canManage]);


    if (isLoadingFarms) {
        return <Spin tip="Đang kiểm tra quyền..." />;
    }


    if (!canManage) {
        return (
            <Result
                status="403"
                title="403 - Không có quyền truy cập"
                subTitle="Xin lỗi, bạn không có quyền thực hiện hành động này."
                extra={<Button type="primary" onClick={() => navigate('/rules')}>Quay về danh sách</Button>}
            />
        );
    }



    const onFinish = async (values: any) => {
        setLoading(true);
        if (!farmId) { // <-- THÊM KIỂM TRA Ở ĐÂY
            message.error("Vui lòng chọn một nông trại!");
            return;
        }
        const newRule: Rule = {
            ...values,
            enabled: true,
        };
        try {
            await createRule(farmId, newRule); // ✅ SỬA: Dùng farmId từ Context
            message.success('Tạo quy tắc thành công!');
            navigate('/rules');
        } catch (error) {
            console.error('Failed to create rule:', error);
            message.error('Tạo quy tắc thất bại!');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div>
            <Title level={2}>Tạo Quy tắc Mới</Title>
            <Form form={form} layout="vertical" onFinish={onFinish}>
                <Card title="Thông tin chung">
                    <Form.Item name="name" label="Tên quy tắc" rules={[{ required: true, message: 'Vui lòng nhập tên quy tắc!' }]}>
                        <Input />
                    </Form.Item>
                    <Form.Item name="description" label="Mô tả">
                        <Input.TextArea />
                    </Form.Item>
                </Card>

                <Card title="Điều kiện (NẾU)" style={{ marginTop: 16 }}>
                    <Form.List name="conditions">
                        {(fields, { add, remove }) => (
                            <>
                                {fields.map(({ key, name, ...restField }) => (
                                    <div key={key} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                        {/* VVVV--- SỬ DỤNG COMPONENT MỚI ---VVVV */}
                                        <ConditionItem
                                            form={form}
                                            name={name}
                                            restField={restField}
                                            sensors={sensors}
                                        />
                                        {/* ^^^^----------------------------^^^^ */}
                                        <MinusCircleOutlined onClick={() => remove(name)} />
                                    </div>
                                ))}
                                <Form.Item>
                                    <Button type="dashed" onClick={() => add({ type: 'SENSOR_VALUE' })} block icon={<PlusOutlined />}>
                                        Thêm điều kiện
                                    </Button>
                                </Form.Item>
                            </>
                        )}
                    </Form.List>
                </Card>

                <Card title="Hành động (THÌ)" style={{ marginTop: 16 }}>
                    <Form.List name="actions">
                        {(fields, { add, remove }) => (
                            <>
                                {fields.map(({ key, name, ...restField }) => (
                                    // VVVV--- THAY THẾ TOÀN BỘ LOGIC CŨ BẰNG ĐOẠN NÀY ---VVVV
                                    <div key={key} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
                                        <ActionItem
                                            form={form}
                                            name={name}
                                            restField={restField}
                                            actuators={actuators}
                                        />
                                        <MinusCircleOutlined onClick={() => remove(name)} style={{ marginTop: 8 }} />
                                    </div>
                                    // ^^^^-------------------------------------------------^^^^
                                ))}
                                <Form.Item>
                                    <Button type="dashed" onClick={() => add({ type: 'TURN_ON_DEVICE' })} block icon={<PlusOutlined />}>
                                        Thêm hành động
                                    </Button>
                                </Form.Item>
                            </>

                        )}
                    </Form.List>
                </Card>

                <Form.Item style={{ marginTop: 24 }}>
                    <Button type="primary" htmlType="submit" loading={loading}>
                        Lưu quy tắc
                    </Button>
                    <Button style={{ marginLeft: 8 }} onClick={() => navigate('/rules')}>
                        Hủy
                    </Button>
                </Form.Item>
            </Form>
        </div >
    );
};

export default CreateRulePage;