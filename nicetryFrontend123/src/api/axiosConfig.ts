// src/api/axiosConfig.ts
import axios from 'axios';
import { message } from 'antd';
import { getAuthToken, clearAuthData } from '../utils/auth';

// Tạo một instance axios với cấu hình cơ bản
const api = axios.create({
    baseURL: import.meta.env.VITE_API_URL,
    timeout: 10000, // ✅ THÊM: Timeout 10s
    headers: {
        'Content-Type': 'application/json',
    },
});

// ✅ Request Interceptor - Tự động thêm token
api.interceptors.request.use(
    (config) => {
        const token = getAuthToken(); // ✅ Dùng helper thay vì lấy trực tiếp

        if (token) {
            config.headers['Authorization'] = `Bearer ${token}`;
        } else {
            // ✅ CHỈ redirect nếu KHÔNG phải trang public
            const publicUrls = ['/auth/login', '/auth/register'];
            const isPublicUrl = publicUrls.some(url => config.url?.includes(url));

            // ✅ THÊM: Kiểm tra xem có đang ở login page không
            const isLoginPage = window.location.pathname === '/login';

            // ✅ CHỈ reject nếu không phải public URL VÀ không phải login page
            if (!isPublicUrl && !isLoginPage) {
                console.warn('⚠️ No token, canceling request to:', config.url);
                return Promise.reject(new Error('No authentication token'));
            }
        }

        return config;
    },
    (error) => Promise.reject(error)
);

// ✅ Response Interceptor - Xử lý lỗi 401/403
api.interceptors.response.use(
    (response) => response,
    (error) => {
        if (!error.response) {
            message.error('Không thể kết nối đến máy chủ');
            return Promise.reject(error);
        }

        const { status, data } = error.response;
        const isLoginPage = window.location.pathname === '/login';

        switch (status) {
            case 401:
                if (!isLoginPage) {
                    clearAuthData(); // ✅ Sẽ trigger storage event
                    message.error('Phiên đăng nhập đã hết hạn');
                    setTimeout(() => {
                        window.location.href = '/login';
                    }, 1500);
                }
                break;

            case 403:
                // ✅ Không hiển thị message nếu đang ở login page
                if (!isLoginPage) {
                    message.error('Bạn không có quyền truy cập');
                }
                break;

            case 404:
                message.error(data?.message || 'Không tìm thấy tài nguyên');
                break;

            case 500:
                message.error('Lỗi máy chủ. Vui lòng thử lại sau');
                break;

            default:
                if (!isLoginPage) {
                    message.error(data?.message || 'Có lỗi xảy ra');
                }
        }

        return Promise.reject(error);
    }
);

export default api;