import api from './axiosConfig';
import type { Setting } from '../types/setting';
import type { ApiResponse } from '../types/api';

export const getFarmSettings = (farmId: number) => {
    return api.get<ApiResponse<Setting[]>>(`/farms/${farmId}/settings`).then(res => res.data.data);
};

export const updateFarmSettings = (farmId: number, settings: Record<string, string>) => {
    return api.put<ApiResponse<void>>(`/farms/${farmId}/settings`, settings);
};