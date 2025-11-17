// src/components/PageBreadcrumb.tsx
import React from 'react';
import { Breadcrumb } from 'antd';
import { HomeOutlined } from '@ant-design/icons';
import { Link, useLocation } from 'react-router-dom';

const breadcrumbNameMap: { [key: string]: string } = {
    '/dashboard': 'Dashboard',
    '/farms': 'Nông trại',
    '/devices': 'Thiết bị',
    '/rules': 'Quy tắc',
    '/rules/create': 'Tạo mới',
    '/rules/edit': 'Chỉnh sửa',
    '/ai': 'Dự đoán AI',
    '/plant-health': 'Sức khỏe Cây trồng',
    '/profile': 'Thông tin cá nhân',
    '/change-password': 'Đổi mật khẩu',
    '/admin': 'Admin',
    '/admin/dashboard': 'Dashboard Admin',
    '/admin/users': 'Quản lý Người dùng',
};

const PageBreadcrumb: React.FC = () => {
    const location = useLocation();
    const pathSnippets = location.pathname.split('/').filter(i => i);

    const extraBreadcrumbItems = pathSnippets.map((_, index) => {
        const url = `/${pathSnippets.slice(0, index + 1).join('/')}`;
        const name = breadcrumbNameMap[url];
        if (!name) return null; // Bỏ qua nếu không có tên

        // Nếu là trang edit rule, hiển thị ID
        if (url.startsWith('/rules/edit/')) {
            const ruleId = pathSnippets[index + 1];
            return {
                key: url,
                title: <Link to={url}>{`${name} #${ruleId}`}</Link>,
            };
        }

        return {
            key: url,
            title: <Link to={url}>{name}</Link>,
        };
    }).filter(Boolean);

    const breadcrumbItems = [
        { title: <Link to="/"><HomeOutlined /></Link>, key: 'home' },
        ...(extraBreadcrumbItems as any),
    ];

    // Chỉ hiển thị khi có nhiều hơn 1 item (Home)
    if (breadcrumbItems.length <= 1) {
        return null;
    }

    return <Breadcrumb items={breadcrumbItems} style={{ marginBottom: 16 }} />;
};

export default PageBreadcrumb;