// src/pages/NotFoundPage.tsx
import React from 'react';
import { Button, Result } from 'antd';
import { useNavigate } from 'react-router-dom';

const NotFoundPage: React.FC = () => {
    const navigate = useNavigate();
    return (
        <Result
            status="404"
            title="404"
            subTitle="Xin lỗi, trang bạn truy cập không tồn tại."
            extra={<Button type="primary" onClick={() => navigate('/')}>Quay về Trang chủ</Button>}
        />
    );
};

export default NotFoundPage;