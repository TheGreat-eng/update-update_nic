// src/pages/admin/SystemSettingsPage.tsx (Đã sửa lỗi TypeScript)

import React, { useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Form, Input, Button, message, Alert, Typography, Tooltip, Space, Card } from 'antd';
import { SaveOutlined, InfoCircleOutlined, ReloadOutlined } from '@ant-design/icons';
import { getSystemSettings, updateSystemSettings } from '../../api/adminService';
import { TableSkeleton } from '../../components/LoadingSkeleton';
import type { SystemSetting } from '../../types/admin'; // Import type từ file types

const { Title, Text } = Typography;

const SystemSettingsPage: React.FC = () => {
    const queryClient = useQueryClient();
    const [form] = Form.useForm();

    const { data: settings, isLoading, isError, error, isFetching } = useQuery({
        queryKey: ['systemSettings'],
        queryFn: getSystemSettings,
        staleTime: 5 * 60 * 1000,
    });

    useEffect(() => {
        if (settings) {
            // <<<< SỬA LỖI 1: Thêm kiểu dữ liệu cho 'acc' và 'setting' >>>>
            const formValues = settings.reduce((acc: Record<string, string>, setting: SystemSetting) => {
                acc[setting.key] = setting.value;
                return acc;
            }, {});
            form.setFieldsValue(formValues);
        }
    }, [settings, form]);

    const updateMutation = useMutation({
        mutationFn: (values: Record<string, string>) => updateSystemSettings(values),
        onSuccess: () => {
            message.success('Cập nhật cài đặt thành công!');
            queryClient.invalidateQueries({ queryKey: ['systemSettings'] });
        },
        onError: (err: any) => {
            message.error(err.response?.data?.message || 'Cập nhật thất bại!');
        }
    });

    const onFinish = (values: Record<string, string>) => {
        const changedValues: Record<string, string> = {};
        if (settings) {
            for (const key in values) {
                // <<<< SỬA LỖI 2: Thêm kiểu dữ liệu cho 's' >>>>
                const originalSetting = settings.find((s: SystemSetting) => s.key === key);
                if (originalSetting && originalSetting.value !== values[key]) {
                    changedValues[key] = values[key];
                }
            }
        }

        if (Object.keys(changedValues).length > 0) {
            updateMutation.mutate(changedValues);
        } else {
            message.info('Không có thay đổi nào để lưu.');
        }
    };

    const onReset = () => {
        // Reset về giá trị ban đầu đã được fetch
        if (settings) {
            const formValues = settings.reduce((acc: Record<string, string>, setting: SystemSetting) => {
                acc[setting.key] = setting.value;
                return acc;
            }, {});
            form.setFieldsValue(formValues);
            message.info('Đã hủy các thay đổi.');
        }
    };

    if (isLoading) {
        return (
            <div style={{ padding: 24 }}>
                <Title level={2} style={{ marginBottom: 24 }}>Cài đặt Hệ thống</Title>
                <TableSkeleton rows={5} />
            </div>
        );
    }

    if (isError) {
        return <Alert message="Lỗi tải dữ liệu" description={error.message} type="error" showIcon />;
    }

    const plantHealthSettings = settings?.filter((s: SystemSetting) => s.key.startsWith('PLANT_HEALTH')) || [];
    const sensorSettings = settings?.filter((s: SystemSetting) => s.key.startsWith('SENSOR')) || [];
    const otherSettings = settings?.filter((s: SystemSetting) => !s.key.startsWith('PLANT_HEALTH') && !s.key.startsWith('SENSOR')) || [];

    const renderSettingsForm = (title: string, data: SystemSetting[]) => (
        <Card title={title} style={{ marginBottom: 24 }}>
            {data.map(setting => (
                <Form.Item
                    key={setting.key}
                    name={setting.key}
                    label={
                        <Space>
                            <Text>{setting.description || setting.key}</Text>
                            <Tooltip title={`Key: ${setting.key}`}>
                                <InfoCircleOutlined style={{ color: 'rgba(0,0,0,.45)', cursor: 'help' }} />
                            </Tooltip>
                        </Space>
                    }
                    rules={[{ required: true, message: 'Vui lòng nhập giá trị!' }]}
                >
                    <Input placeholder="Nhập giá trị..." />
                </Form.Item>
            ))}
        </Card>
    );

    return (
        <div style={{ padding: 24 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
                <Title level={2} style={{ margin: 0 }}>Cài đặt Hệ thống</Title>
                <Button
                    icon={<ReloadOutlined />}
                    onClick={() => queryClient.invalidateQueries({ queryKey: ['systemSettings'] })}
                    loading={isFetching && !isLoading}
                >
                    Tải lại
                </Button>
            </div>

            <Form form={form} onFinish={onFinish} layout="vertical">
                {plantHealthSettings.length > 0 && renderSettingsForm("Ngưỡng Cảnh báo Sức khỏe Cây", plantHealthSettings)}
                {sensorSettings.length > 0 && renderSettingsForm("Ngưgỡng Cảnh báo Tức thời", sensorSettings)}
                {otherSettings.length > 0 && renderSettingsForm("Cài đặt Khác", otherSettings)}

                <Form.Item>
                    <Space>
                        <Button
                            type="primary"
                            htmlType="submit"
                            icon={<SaveOutlined />}
                            loading={updateMutation.isPending}
                        >
                            Lưu Tất cả Thay đổi
                        </Button>
                        <Button onClick={onReset} disabled={updateMutation.isPending}>
                            Hủy thay đổi
                        </Button>
                    </Space>
                </Form.Item>
            </Form>
        </div>
    );
};

export default SystemSettingsPage;