// src/api/adminService.ts
import api from './axiosConfig';
import type { AdminUser, AdminStats } from '../types/admin';
import type { Page } from '../types/common'; // Sẽ tạo type này





import type { SystemSetting } from '../types/admin'; // Sẽ tạo type này
import type { ApiResponse } from '../types/api';


export const getSystemStats = () => {
    return api.get<{ data: AdminStats }>('/admin/stats');
};

// SỬA LẠI HÀM NÀY
export const getAllUsers = (page = 0, size = 10, search = '') => {
    return api.get<{ data: Page<AdminUser> }>(`/admin/users?page=${page}&size=${size}&search=${search}`);
};

export const lockUser = (userId: number) => {
    return api.post(`/admin/users/${userId}/lock`);
};

export const unlockUser = (userId: number) => {
    return api.post(`/admin/users/${userId}/unlock`);
};

export const softDeleteUser = (userId: number) => {
    return api.delete(`/admin/users/${userId}`);
};




// <<<< BỔ SUNG CÁC HÀM MỚI DƯỚI ĐÂY >>>>
export const getSystemSettings = () => {
    return api.get<ApiResponse<SystemSetting[]>>('/admin/settings').then(res => res.data.data);
};

export const updateSystemSettings = (settings: Record<string, string>) => {
    return api.put('/admin/settings', settings);
};



// <<<< BỔ SUNG CÁC HÀM MỚI DƯỚI ĐÂY >>>>
export const updateUserAsAdmin = (userId: number, data: { fullName: string; phoneNumber: string; enabled: boolean }) => {
    return api.put(`/admin/users/${userId}`, data);
};

export const setPasswordAsAdmin = (userId: number, newPassword: string) => {
    return api.post(`/admin/users/${userId}/set-password`, { newPassword });
};