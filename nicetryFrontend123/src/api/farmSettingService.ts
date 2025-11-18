import api from './axiosConfig';
import type { SettingDTO } from '../types/setting'; // Sửa lại type
import type { ApiResponse } from '../types/api';

export const getFarmSettings = (farmId: number) => {
    // API backend cần trả về cấu trúc SettingDTO mới
    return api.get<ApiResponse<SettingDTO[]>>(`/farms/${farmId}/settings`).then(res => res.data.data);
};

export const updateFarmSettings = (farmId: number, settings: Record<string, string>) => {
    return api.put<ApiResponse<void>>(`/farms/${farmId}/settings`, settings);
};