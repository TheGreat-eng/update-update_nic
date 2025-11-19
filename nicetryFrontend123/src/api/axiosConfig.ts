// src/api/axiosConfig.ts
import axios from 'axios';
import { message } from 'antd';
import { getAuthToken, clearAuthData } from '../utils/auth';

// Tạo instance axios
const api = axios.create({
    baseURL: import.meta.env.VITE_API_URL,
    timeout: 10000,
    headers: {
        'Content-Type': 'application/json',
    },
});

// --- LOGIC QUẢN LÝ REFRESH TOKEN ---
let isRefreshing = false;
let failedQueue: any[] = [];

const processQueue = (error: any, token: string | null = null) => {
    failedQueue.forEach(prom => {
        if (error) {
            prom.reject(error);
        } else {
            prom.resolve(token);
        }
    });
    failedQueue = [];
};

// Request Interceptor
api.interceptors.request.use(
    (config) => {
        const token = getAuthToken();
        if (token) {
            config.headers['Authorization'] = `Bearer ${token}`;
        }
        return config;
    },
    (error) => Promise.reject(error)
);

// Response Interceptor
api.interceptors.response.use(
    (response) => response,
    async (error) => {
        const originalRequest = error.config;

        // Nếu lỗi không phải 401 hoặc không có response, trả về lỗi luôn
        if (!error.response || error.response.status !== 401) {
            const errorMsg = error.response?.data?.message || 'Có lỗi xảy ra';
            // Chỉ hiện lỗi nếu không phải trang login (để tránh spam)
            if (window.location.pathname !== '/login') {
                message.error(errorMsg);
            }
            return Promise.reject(error);
        }

        // Nếu đang ở trang login hoặc request là public thì không refresh
        if (window.location.pathname === '/login' || originalRequest.url.includes('/auth/login')) {
            return Promise.reject(error);
        }

        // --- XỬ LÝ 401: REFRESH TOKEN ---
        if (error.response.status === 401 && !originalRequest._retry) {
            if (isRefreshing) {
                // Nếu đang có tiến trình refresh khác chạy, thì request này xếp hàng đợi
                return new Promise(function (resolve, reject) {
                    failedQueue.push({ resolve, reject });
                }).then(token => {
                    originalRequest.headers['Authorization'] = 'Bearer ' + token;
                    return api(originalRequest);
                }).catch(err => {
                    return Promise.reject(err);
                });
            }

            originalRequest._retry = true;
            isRefreshing = true;

            const refreshToken = localStorage.getItem('refreshToken');

            if (!refreshToken) {
                // Không có refresh token -> Logout
                handleLogout();
                return Promise.reject(error);
            }

            try {
                // Gọi API refresh (dùng instance axios mặc định để tránh loop interceptor)
                const response = await axios.post(`${import.meta.env.VITE_API_URL}/auth/refresh`, {
                    refreshToken: refreshToken
                });

                const { accessToken, refreshToken: newRefreshToken } = response.data;

                // Lưu token mới
                // Lưu ý: setAuthData có thể cần sửa để nhận accessToken riêng nếu hàm đó chỉ nhận full object
                // Ở đây ta set thủ công cho chắc chắn
                localStorage.setItem('token', accessToken);
                if (newRefreshToken) {
                    localStorage.setItem('refreshToken', newRefreshToken);
                }

                // Cập nhật header mặc định cho các request sau
                api.defaults.headers.common['Authorization'] = `Bearer ${accessToken}`;
                originalRequest.headers['Authorization'] = `Bearer ${accessToken}`;

                // Xử lý hàng đợi đang chờ
                processQueue(null, accessToken);

                return api(originalRequest);

            } catch (refreshError) {
                // Refresh thất bại -> Logout
                processQueue(refreshError, null);
                handleLogout();
                return Promise.reject(refreshError);
            } finally {
                isRefreshing = false;
            }
        }

        return Promise.reject(error);
    }
);

const handleLogout = () => {
    clearAuthData();
    message.error('Phiên đăng nhập hết hạn. Vui lòng đăng nhập lại.');
    setTimeout(() => {
        window.location.href = '/login';
    }, 1000);
};

export default api;