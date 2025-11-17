// src/pages/EditRulePage.tsx
import React, { useEffect, useState, useMemo } from 'react';
import { Form, Input, Card, Typography, message, Spin, Alert, Button } from 'antd';
import { MinusCircleOutlined, PlusOutlined } from '@ant-design/icons';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';

// API Services và Types
import { getRuleById, updateRule } from '../api/ruleService';
import { getDevicesByFarm } from '../api/deviceService';
import { getFarms } from '../api/farmService';
import type { Rule } from '../types/rule';

// Custom Components
import { ConditionItem } from '../components/rules/ConditionItem';
import { ActionItem } from '../components/rules/ActionItem';

// Context
import { useFarm } from '../context/FarmContext';

const { Title } = Typography;

const EditRulePage: React.FC = () => {
    const navigate = useNavigate();
    const { ruleId } = useParams<{ ruleId: string }>();
    const { farmId } = useFarm();
    const [form] = Form.useForm();
    const [submitting, setSubmitting] = useState(false);

    // 1. Fetch quyền của user
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

    // 2. Fetch dữ liệu của Rule cần sửa
    const { data: ruleData, isLoading: isLoadingRule, isError: isRuleError } = useQuery({
        queryKey: ['rule', ruleId],
        queryFn: () => getRuleById(Number(ruleId)).then(res => res.data.data),
        enabled: !!ruleId,
    });

    // 3. Fetch danh sách thiết bị của farm
    const { data: devices, isLoading: isLoadingDevices } = useQuery({
        queryKey: ['devices', farmId],
        queryFn: () => getDevicesByFarm(farmId!).then(res => res.data.data),
        enabled: !!farmId,
    });

    // Tách devices thành sensors và actuators
    const sensors = useMemo(() => devices?.filter(d => d.type.startsWith('SENSOR')) || [], [devices]);
    const actuators = useMemo(() => devices?.filter(d => d.type.startsWith('ACTUATOR')) || [], [devices]);

    // 4. Điền dữ liệu vào form khi đã fetch xong
    useEffect(() => {
        if (ruleData) {
            form.setFieldsValue(ruleData);
        }
    }, [ruleData, form]);

    // 5. Xử lý submit
    const onFinish = async (values: any) => {
        if (!ruleId) return;
        setSubmitting(true);

        const updatedRule: Rule = {
            ...values,
            id: Number(ruleId),
            enabled: ruleData?.enabled ?? true, // Giữ lại trạng thái enabled cũ
        };

        try {
            await updateRule(Number(ruleId), updatedRule);
            message.success('Cập nhật quy tắc thành công!');
            navigate('/rules');
        } catch (error) {
            message.error('Cập nhật quy tắc thất bại!');
        } finally {
            setSubmitting(false);
        }
    };

    // ---- Render Logic ----
    if (isLoadingFarms || isLoadingRule || isLoadingDevices) {
        return <div style={{ textAlign: 'center', padding: 50 }}><Spin tip="Đang tải dữ liệu..." size="large" /></div>;
    }

    if (!canManage) {
        return <Alert message="Không có quyền" description="Bạn không có quyền chỉnh sửa quy tắc này." type="error" showIcon />;
    }

    if (isRuleError) {
        return <Alert message="Lỗi" description="Không thể tải thông tin quy tắc." type="error" showIcon />;
    }

    return (
        <div>
            <Title level={2}>Sửa Quy tắc</Title>
            <Form form={form} layout="vertical" onFinish={onFinish}>
                <Card title="Thông tin chung" style={{ marginBottom: 16 }}>
                    <Form.Item name="name" label="Tên quy tắc" rules={[{ required: true }]}>
                        <Input />
                    </Form.Item>
                    <Form.Item name="description" label="Mô tả">
                        <Input.TextArea rows={2} />
                    </Form.Item>
                </Card>

                <Card title="Điều kiện (NẾU)" style={{ marginBottom: 16 }}>
                    <Form.List name="conditions">
                        {(fields, { add, remove }) => (
                            <>
                                {fields.map(({ key, name, ...restField }) => (
                                    <div key={key} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                        <ConditionItem
                                            form={form}
                                            name={name}
                                            restField={restField}
                                            sensors={sensors}
                                        />
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

                <Card title="Hành động (THÌ)" style={{ marginBottom: 16 }}>
                    <Form.List name="actions">
                        {(fields, { add, remove }) => (
                            <>
                                {fields.map(({ key, name, ...restField }) => (
                                    <div key={key} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
                                        <ActionItem
                                            form={form}
                                            name={name}
                                            restField={restField}
                                            actuators={actuators}
                                        />
                                        <MinusCircleOutlined onClick={() => remove(name)} style={{ marginTop: 8 }} />
                                    </div>
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
                    <Button type="primary" htmlType="submit" loading={submitting}>
                        Lưu thay đổi
                    </Button>
                    <Button style={{ marginLeft: 8 }} onClick={() => navigate('/rules')}>
                        Hủy
                    </Button>
                </Form.Item>
            </Form>
        </div>
    );
};

export default EditRulePage;