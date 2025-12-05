// src/api/plantHealthService.ts
import api from './axiosConfig';
import type { PlantHealthDTO, ZoneHealth } from '../types/plantHealth';
import type { ApiResponse } from '../types/api'; //  Import kiểu dữ liệu chung

export const getCurrentHealth = (farmId: number) => {
    //  Sử dụng ApiResponse để định nghĩa kiểu trả về chính xác
    return api.get<ApiResponse<PlantHealthDTO>>(`/plant-health/current?farmId=${farmId}`);
};

export const resolveAlert = (alertId: number) => {
    return api.post(`/plant-health/resolve/${alertId}`);
};


// Thêm hàm mới
export const getHealthByZone = (farmId: number) => {
    return api.get<ApiResponse<ZoneHealth[]>>(`/plant-health/by-zone?farmId=${farmId}`)
        .then(res => res.data.data);
};