// src/components/FarmMembers.tsx
import React, { useState } from 'react';
import { List, Avatar, Button, Popconfirm, message, Modal, Form, Input, Select, Empty, Tag } from 'antd';
import { UserOutlined, PlusOutlined } from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getFarmMembers, addFarmMember, removeFarmMember } from '../api/farmService'; // SỬA: từ ../../ thành ../
import type { FarmMemberDTO } from '../types/farm'; // SỬA: từ ../../ thành ../

const { Option } = Select;

interface FarmMembersProps {
    farmId: number;
    isOwner: boolean;
}

export const FarmMembers: React.FC<FarmMembersProps> = ({ farmId, isOwner }) => {
    const queryClient = useQueryClient();
    const [isModalVisible, setIsModalVisible] = useState(false);
    const [form] = Form.useForm();

    const { data: members, isLoading } = useQuery({
        queryKey: ['farmMembers', farmId],
        queryFn: () => getFarmMembers(farmId),
    });

    const mutationOptions = (successMsg: string) => ({
        onSuccess: () => {
            message.success(successMsg);
            queryClient.invalidateQueries({ queryKey: ['farmMembers', farmId] });
            setIsModalVisible(false);
            form.resetFields();
        },
        onError: (err: any) => {
            message.error(err.response?.data?.message || 'Thao tác thất bại!');
        },
    });

    const addMemberMutation = useMutation({
        mutationFn: (values: { email: string; role: 'VIEWER' | 'OPERATOR' }) => addFarmMember(farmId, values.email, values.role),
        ...mutationOptions('Thêm thành viên thành công!'),
    });

    const removeMemberMutation = useMutation({
        mutationFn: (userId: number) => removeFarmMember(farmId, userId),
        ...mutationOptions('Xóa thành viên thành công!'),
    });

    const handleAddMember = () => {
        form.validateFields().then(values => {
            addMemberMutation.mutate(values);
        });
    };

    return (
        <div>
            {isOwner && (
                <Button
                    type="primary"
                    icon={<PlusOutlined />}
                    onClick={() => setIsModalVisible(true)}
                    style={{ marginBottom: 16 }}
                >
                    Mời thành viên
                </Button>
            )}

            {isLoading ? (
                <p>Đang tải danh sách thành viên...</p>
            ) : !members || members.length === 0 ? (
                <Empty description="Chưa có thành viên nào được mời." />
            ) : (
                <List
                    itemLayout="horizontal"
                    dataSource={members}
                    renderItem={(item: FarmMemberDTO) => (
                        <List.Item
                            actions={isOwner ? [
                                <Popconfirm
                                    title="Xóa thành viên này?"
                                    onConfirm={() => removeMemberMutation.mutate(item.userId)}
                                >
                                    <Button type="link" danger>Xóa</Button>
                                </Popconfirm>
                            ] : []}
                        >
                            <List.Item.Meta
                                avatar={<Avatar icon={<UserOutlined />} />}
                                title={item.fullName}
                                description={item.email}
                            />
                            <div><Tag color={item.role === 'OPERATOR' ? 'blue' : 'default'}>{item.role}</Tag></div>
                        </List.Item>
                    )}
                />
            )}

            <Modal
                title="Mời thành viên mới"
                open={isModalVisible}
                onCancel={() => setIsModalVisible(false)}
                onOk={handleAddMember}
                confirmLoading={addMemberMutation.isPending}
            >
                <Form form={form} layout="vertical">
                    <Form.Item name="email" label="Email người dùng" rules={[{ required: true, type: 'email' }]}>
                        <Input placeholder="Nhập email của người bạn muốn mời" />
                    </Form.Item>
                    <Form.Item name="role" label="Vai trò" initialValue="VIEWER" rules={[{ required: true }]}>
                        <Select>
                            <Option value="VIEWER">Viewer (Chỉ xem)</Option>
                            <Option value="OPERATOR">Operator (Xem và điều khiển)</Option>
                        </Select>
                    </Form.Item>
                </Form>
            </Modal>
        </div>
    );
};