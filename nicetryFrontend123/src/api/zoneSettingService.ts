import api from './axiosConfig';
import type { SettingDTO } from '../types/setting';
import type { ApiResponse } from '../types/api';

export const getZoneSettings = (zoneId: number) => {
    return api.get<ApiResponse<SettingDTO[]>>(`/zones/${zoneId}/settings`).then(res => res.data.data);
};

export const updateZoneSettings = (zoneId: number, settings: Record<string, string>) => {
    return api.put<ApiResponse<void>>(`/zones/${zoneId}/settings`, settings);
};