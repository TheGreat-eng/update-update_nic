import React, { useEffect } from 'react';
import { Form, Input, Button, message, Spin, Alert, Tooltip, Space } from 'antd';
import { SaveOutlined, InfoCircleOutlined } from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getZoneSettings, updateZoneSettings } from '../api/zoneSettingService';
import type { SettingDTO } from '../types/setting';

interface Props {
    zoneId: number;
    onClose?: () => void;
}

export const ZoneSettings: React.FC<Props> = ({ zoneId, onClose }) => {
    const queryClient = useQueryClient();
    const [form] = Form.useForm();

    const { data: settings, isLoading, isError } = useQuery({
        queryKey: ['zoneSettings', zoneId],
        queryFn: () => getZoneSettings(zoneId),
        enabled: !!zoneId,
    });

    useEffect(() => {
        if (settings) {
            const formValues = settings.reduce((acc: Record<string, string | null>, setting: SettingDTO) => {
                acc[setting.key] = setting.value;
                return acc;
            }, {});
            form.setFieldsValue(formValues);
        }
    }, [settings, form]);

    const updateMutation = useMutation({
        mutationFn: (values: Record<string, string>) => updateZoneSettings(zoneId, values),
        onSuccess: () => {
            message.success('Cập nhật cài đặt vùng thành công!');
            queryClient.invalidateQueries({ queryKey: ['zoneSettings', zoneId] });
            if (onClose) onClose();
        },
        onError: (err: any) => message.error(err.response?.data?.message || 'Cập nhật thất bại!'),
    });

    if (isLoading) return <Spin tip="Đang tải cài đặt..." />;
    if (isError) return <Alert message="Lỗi tải cài đặt." type="error" />;

    return (
        <div>
            <Alert
                message="Lưu ý quan trọng"
                description="Giá trị nhập tại đây sẽ GHI ĐÈ lên Hồ sơ cây trồng (Priority 1). Hãy ĐỂ TRỐNG nếu bạn muốn dùng ngưỡng mặc định của Hồ sơ."
                type="warning"
                showIcon
                style={{ marginBottom: 16 }}
            />

            <Form form={form} onFinish={updateMutation.mutate} layout="vertical">
                {(settings || []).map(setting => (
                    <Form.Item
                        key={setting.key}
                        name={setting.key}
                        label={
                            <Space>
                                <span>{setting.description || setting.key}</span>
                                <Tooltip title={`Key hệ thống: ${setting.key}`}>
                                    <InfoCircleOutlined style={{ cursor: 'help', color: '#999' }} />
                                </Tooltip>
                            </Space>
                        }
                        help={`Mặc định hệ thống: ${setting.defaultValue}`}
                    >
                        <Input placeholder="Để trống để dùng Hồ sơ cây trồng" />
                    </Form.Item>
                ))}
                <Form.Item>
                    <Button type="primary" htmlType="submit" icon={<SaveOutlined />} loading={updateMutation.isPending} block>
                        Lưu Cấu hình Zone
                    </Button>
                </Form.Item>
            </Form>
        </div>
    );
};