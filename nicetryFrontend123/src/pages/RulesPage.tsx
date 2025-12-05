// src/pages/RulesPage.tsx

import React, { useEffect, useState, useMemo } from 'react';
import { Switch, Button, Typography, Spin, message, Popconfirm, Alert, Card, Row, Col, Space, Tag, Empty } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, CheckOutlined, CloseOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { getRulesByFarm, deleteRule, toggleRuleStatus } from '../api/ruleService'; //  Import đầy đủ
import type { Rule } from '../types/rule';
import { useFarm } from '../context/FarmContext';


// <<<< THÊM CÁC IMPORT NÀY >>>>
import { useQuery } from '@tanstack/react-query';
import { getFarms } from '../api/farmService';

const { Title, Text } = Typography;

const RulesPage: React.FC = () => {
    const { farmId, isLoadingFarm } = useFarm(); //  THÊM isLoadingFarm
    const [rules, setRules] = useState<Rule[]>([]);
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    // <<<< 1. LẤY THÔNG TIN QUYỀN CỦA USER >>>>
    const { data: farms } = useQuery({
        queryKey: ['farms'], // Tái sử dụng cache từ các trang khác
        queryFn: () => getFarms().then(res => res.data.data),
    });


    const currentUserPermission = useMemo(() => {
        if (!farmId || !farms) return 'VIEWER';
        const currentFarm = farms.find(f => f.id === farmId);
        return currentFarm?.currentUserRole || 'VIEWER';
    }, [farmId, farms]);

    const canManage = currentUserPermission === 'OWNER' || currentUserPermission === 'OPERATOR';

    const fetchRules = async () => {
        if (!farmId) {
            console.warn(' No farmId available');
            return;
        }

        setLoading(true);
        try {
            console.log(' Fetching rules for farmId:', farmId);
            const response = await getRulesByFarm(farmId);
            console.log(' Rules loaded:', response.data.data.length);
            setRules(response.data.data);
        } catch (error) {
            console.error(' Failed to fetch rules:', error);
            message.error('Không thể tải danh sách quy tắc');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (farmId) {
            fetchRules();
        }
    }, [farmId]);

    const handleToggle = async (ruleId: number, enabled: boolean) => {
        try {
            await toggleRuleStatus(ruleId, enabled);
            message.success(`Đã ${enabled ? 'bật' : 'tắt'} quy tắc.`);
            setRules(prevRules =>
                prevRules.map(rule =>
                    rule.id === ruleId ? { ...rule, enabled } : rule
                )
            );
        } catch (error) {
            message.error("Thay đổi trạng thái thất bại.");
        }
    };

    const handleDelete = async (ruleId: number) => {
        try {
            await deleteRule(ruleId);
            message.success("Đã xóa quy tắc.");
            fetchRules();
        } catch (error) {
            message.error("Xóa quy tắc thất bại.");
        }
    };

    //  THÊM: Early return khi đang load farm
    if (isLoadingFarm) {
        return (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '50vh' }}>
                <Spin size="large" tip="Đang tải nông trại..." />
            </div>
        );
    }

    //  THÊM: Early return khi chưa có farmId
    if (!farmId) {
        return (
            <div>
                <Alert
                    message="Chưa chọn nông trại"
                    description="Vui lòng chọn hoặc tạo nông trại để xem quy tắc tự động."
                    type="warning"
                    showIcon
                    action={
                        <Button type="primary" onClick={() => navigate('/farms')}>
                            Đến trang Nông trại
                        </Button>
                    }
                    style={{ marginBottom: 16 }}
                />
            </div>
        );
    }

    return (
        <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
                <div>
                    <Title level={2} style={{ margin: 0 }}>Quy tắc Tự động</Title>
                    <Text type="secondary">Tự động hóa hành động dựa trên dữ liệu cảm biến.</Text>
                </div>

                {/* <<<< 2. THÊM ĐIỀU KIỆN `canManage` CHO NÚT TẠO MỚI >>>> */}
                {canManage && (
                    <Button type="primary" icon={<PlusOutlined />} onClick={() => navigate('/rules/create')}>
                        Tạo quy tắc mới
                    </Button>
                )}
            </div>

            {loading && <div style={{ textAlign: 'center', padding: 50 }}><Spin /></div>}

            {!loading && rules.length > 0 ? (
                <Row gutter={[24, 24]}>
                    {rules.map(rule => (
                        <Col xs={24} lg={12} key={rule.id}>
                            <Card
                                title={rule.name}
                                extra={
                                    <Space>
                                        {/* <<<< 3. THÊM ĐIỀU KIỆN `canManage` CHO CÁC NÚT HÀNH ĐỘNG >>>> */}
                                        <Switch
                                            checkedChildren={<CheckOutlined />}
                                            unCheckedChildren={<CloseOutlined />}
                                            checked={rule.enabled}
                                            onChange={(checked) => handleToggle(rule.id!, checked)}
                                            disabled={!canManage} // Vô hiệu hóa nếu không có quyền
                                        />
                                        {canManage && (
                                            <>
                                                <Button size="small" icon={<EditOutlined />} onClick={() => navigate(`/rules/edit/${rule.id}`)} />
                                                <Popconfirm
                                                    title="Xóa quy tắc này?"
                                                    onConfirm={() => handleDelete(rule.id!)}
                                                >
                                                    <Button size="small" danger icon={<DeleteOutlined />} />
                                                </Popconfirm>
                                            </>
                                        )}
                                    </Space>
                                }
                            >
                                <Typography.Paragraph type="secondary" ellipsis={{ rows: 2 }}>
                                    {rule.description || 'Không có mô tả.'}
                                </Typography.Paragraph>

                                <div style={{ marginBottom: 12 }}>
                                    <Text strong>NẾU</Text>
                                    {rule.conditions.map((cond, index) => (
                                        <Tag key={index} style={{ margin: '4px' }}>
                                            {cond.deviceId} ({cond.field}) {cond.operator === 'GREATER_THAN' ? '>' : '<'} {cond.value}
                                        </Tag>
                                    ))}
                                </div>

                                <div>
                                    <Text strong>THÌ</Text>
                                    {rule.actions.map((action, index) => (
                                        <Tag color="blue" key={index} style={{ margin: '4px' }}>
                                            {action.type === 'TURN_ON_DEVICE' ? 'Bật' : 'Tắt'} {action.deviceId}
                                        </Tag>
                                    ))}
                                </div>
                            </Card>
                        </Col>
                    ))}
                </Row>
            ) : (
                !loading && (
                    <Card>
                        <Empty description="Chưa có quy tắc nào được tạo." />
                    </Card>
                )
            )}
        </div>
    );
};

export default RulesPage;