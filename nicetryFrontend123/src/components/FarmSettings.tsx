import React, { useEffect } from 'react';
import { Form, Input, Button, message, Spin, Alert, Typography, Tooltip, Space } from 'antd';
import { SaveOutlined, InfoCircleOutlined } from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getFarmSettings, updateFarmSettings } from '../api/farmSettingService';
import type { SettingDTO } from '../types/setting';

const { Text } = Typography;

interface Props {
    farmId: number;
}

export const FarmSettings: React.FC<Props> = ({ farmId }) => {
    const queryClient = useQueryClient();
    const [form] = Form.useForm();

    const { data: settings, isLoading, isError } = useQuery({
        queryKey: ['farmSettings', farmId],
        queryFn: () => getFarmSettings(farmId),
        enabled: !!farmId,
    });

    useEffect(() => {
        if (settings) {
            const formValues = settings.reduce((acc: Record<string, string | null>, setting: SettingDTO) => {
                acc[setting.key] = setting.value; // `value` có thể là null
                return acc;
            }, {});
            form.setFieldsValue(formValues);
        }
    }, [settings, form]);


    const updateMutation = useMutation({
        mutationFn: (values: Record<string, string>) => updateFarmSettings(farmId, values),
        onSuccess: () => {
            message.success('Cập nhật cài đặt thành công!');
            queryClient.invalidateQueries({ queryKey: ['farmSettings', farmId] });
        },
        onError: (err: any) => message.error(err.response?.data?.message || 'Cập nhật thất bại!'),
    });

    if (isLoading) return <Spin tip="Đang tải cài đặt..." />;
    if (isError) return <Alert message="Không thể tải cài đặt cho nông trại." type="error" />;

    return (
        <Form form={form} onFinish={updateMutation.mutate} layout="vertical">
            {(settings || []).map(setting => (
                <Form.Item
                    key={setting.key}
                    name={setting.key}
                    label={
                        <Space>
                            <Text>{setting.description || setting.key}</Text>
                            <Tooltip title={`Key: ${setting.key}`}>
                                <InfoCircleOutlined style={{ cursor: 'help' }} />
                            </Tooltip>
                        </Space>
                    }
                    //rules={[{ required: true }]}
                    // VVVV--- THÊM HELP TEXT ĐỘNG ---VVVV
                    help={`Mặc định (${setting.source}): ${setting.defaultValue}. Bỏ trống để dùng mặc định.`}
                >
                    <Input placeholder={setting.defaultValue} />
                </Form.Item>
            ))}
            <Form.Item>
                <Button type="primary" htmlType="submit" icon={<SaveOutlined />} loading={updateMutation.isPending}>
                    Lưu Cài đặt
                </Button>
            </Form.Item>
        </Form>
    );
};