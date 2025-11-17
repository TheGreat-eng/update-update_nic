import React, { useState } from 'react';
import { Table, Typography, Tag, Tooltip } from 'antd';
import { useQuery } from '@tanstack/react-query';
import { useFarm } from '../context/FarmContext';
import { getActivityLogs } from '../api/activityLogService';
import { timeAgo } from '../utils/time';
import { TableSkeleton } from '../components/LoadingSkeleton';

const { Title } = Typography;

const ActivityLogPage: React.FC = () => {
    const { farmId } = useFarm();
    const [pagination, setPagination] = useState({ current: 1, pageSize: 20 });

    const { data: logPage, isLoading } = useQuery({
        queryKey: ['activityLogs', farmId, pagination.current, pagination.pageSize],
        queryFn: () => getActivityLogs(farmId!, pagination.current - 1, pagination.pageSize),
        enabled: !!farmId,
        placeholderData: (prev) => prev,
    });

    const columns = [
        {
            title: 'Thời gian',
            dataIndex: 'createdAt',
            render: (text: string) => <Tooltip title={new Date(text).toLocaleString('vi-VN')}>{timeAgo(text)}</Tooltip>
        },
        {
            title: 'Người thực hiện',
            dataIndex: 'actorName',
        },
        {
            title: 'Hành động',
            dataIndex: 'description',
        },
        {
            title: 'Trạng thái',
            dataIndex: 'status',
            render: (status: string) => <Tag color={status === 'SUCCESS' ? 'success' : 'error'}>{status}</Tag>
        },
    ];

    if (isLoading && !logPage) return <TableSkeleton />;

    return (
        <div>
            <Title level={2} style={{ marginBottom: 24 }}>Nhật Ký Vận Hành</Title>
            <Table
                columns={columns}
                dataSource={logPage?.content}
                rowKey="id"
                loading={isLoading}
                pagination={{
                    current: pagination.current,
                    pageSize: pagination.pageSize,
                    total: logPage?.totalElements,
                }}
                onChange={(p) => setPagination({ current: p.current!, pageSize: p.pageSize! })}
            />
        </div>
    );
};

export default ActivityLogPage;