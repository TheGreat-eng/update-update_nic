// src/api/notificationService.ts
import api from './axiosConfig';
import type { Notification } from '../types/notification';
import type { ApiResponse } from '../types/api';
import type { Page } from '../types/common';

interface GetNotificationsParams {
    page: number;
    size: number;
}

// Lấy danh sách thông báo (phân trang)
export const getNotifications = (params: GetNotificationsParams) => {
    return api.get<ApiResponse<Page<Notification>>>('/notifications', { params })
        .then(res => res.data.data);
};

// Lấy số lượng thông báo chưa đọc
export const getUnreadCount = () => {
    return api.get<ApiResponse<{ count: number }>>('/notifications/unread-count')
        .then(res => res.data.data);
};

// Đánh dấu một thông báo là đã đọc
export const markNotificationAsRead = (notificationId: number) => {
    return api.post<ApiResponse<string>>(`/notifications/${notificationId}/read`);
};

// Đánh dấu tất cả là đã đọc
export const markAllNotificationsAsRead = () => {
    return api.post<ApiResponse<string>>('/notifications/read-all');
};