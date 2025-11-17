// src/api/zoneService.ts
import api from './axiosConfig';
import type { Zone } from '../types/zone'; // Đảm bảo bạn đã tạo type này
import type { ApiResponse } from '../types/api';

// Hàm đã có
export const getZonesByFarm = (farmId: number) => {
    return api.get<ApiResponse<Zone[]>>(`/farms/${farmId}/zones`).then(res => res.data.data);
};

// VVVV--- BỔ SUNG CÁC HÀM MỚI ---VVVV

// Dữ liệu để tạo hoặc cập nhật Zone
export interface ZoneFormData {
    name: string;
    description?: string;
}

export const createZone = (farmId: number, data: ZoneFormData) => {
    return api.post<ApiResponse<Zone>>(`/farms/${farmId}/zones`, data);
};

// Cần một endpoint riêng cho Zone để update/delete
export const updateZone = (zoneId: number, data: ZoneFormData) => {
    // VVVV--- SỬA DÒNG NÀY ---VVVV
    return api.put<ApiResponse<Zone>>(`/zones/${zoneId}`, data);
    // ^^^^-----------------------^^^^
};

export const deleteZone = (zoneId: number) => {
    // VVVV--- SỬA DÒNG NÀY ---VVVV
    return api.delete(`/zones/${zoneId}`);
    // ^^^^-----------------------^^^^
};
////////////////////////////////