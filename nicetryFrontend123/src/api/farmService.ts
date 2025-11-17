// src/api/farmService.ts

import api from './axiosConfig';
// ✅ ĐÚNG - Chỉ import type
import type { Farm, FarmFormData, FarmMemberDTO } from '../types/farm';
import type { ApiResponse } from '../types/api';

export const getFarms = () => {
    return api.get<{ data: Farm[] }>('/farms');
};

export const createFarm = (data: FarmFormData) => {
    return api.post<Farm>('/farms', data);
};

export const updateFarm = (id: number, data: FarmFormData) => {
    return api.put<Farm>(`/farms/${id}`, data);
};

export const deleteFarm = (id: number) => {
    return api.delete(`/farms/${id}`);
};


// <<<< BỔ SUNG CÁC HÀM MỚI DƯỚI ĐÂY >>>>
export const getFarmMembers = (farmId: number) => {
    // SỬA DÒNG NÀY: Bỏ .data ở cuối
    return api.get<ApiResponse<FarmMemberDTO[]>>(`/farms/${farmId}/members`).then(res => res.data.data);
};


export const addFarmMember = (farmId: number, email: string, role: 'VIEWER' | 'OPERATOR') => {
    return api.post(`/farms/${farmId}/members`, { email, role });
};

export const removeFarmMember = (farmId: number, userId: number) => {
    return api.delete(`/farms/${farmId}/members/${userId}`);
};