// src/api/userService.ts
import api from './axiosConfig';
import type { UserProfile } from '../types/user'; // Sẽ tạo type này
import type { ApiResponse } from '../types/api';

// Kiểu dữ liệu cho form cập nhật
export interface UpdateProfileData {
    fullName: string;
    phoneNumber: string;
}

// Kiểu dữ liệu cho form đổi mật khẩu
export interface ChangePasswordData {
    oldPassword: string;
    newPassword: string;
}

/**
 * Lấy thông tin cá nhân của người dùng hiện tại
 */
export const getMyProfile = () => {
    return api.get<ApiResponse<UserProfile>>('/users/me');
};

/**
 * Cập nhật thông tin cá nhân
 */
export const updateMyProfile = (data: UpdateProfileData) => {
    return api.put<ApiResponse<UserProfile>>('/users/me', data);
};

/**
 * Thay đổi mật khẩu
 */
export const changeMyPassword = (data: ChangePasswordData) => {
    return api.post<ApiResponse<string>>('/users/change-password', data);
};