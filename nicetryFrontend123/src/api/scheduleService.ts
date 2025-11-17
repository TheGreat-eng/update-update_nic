import api from './axiosConfig';
import type { Schedule } from '../types/schedule';
import type { ApiResponse } from '../types/api';

export const getSchedulesByFarm = (farmId: number) => {
    return api.get<ApiResponse<Schedule[]>>(`/schedules?farmId=${farmId}`).then(res => res.data.data);
};

export const createSchedule = (farmId: number, data: Omit<Schedule, 'id' | 'deviceName'>) => {
    return api.post<ApiResponse<Schedule>>(`/schedules?farmId=${farmId}`, data);
};

export const updateSchedule = (id: number, data: Schedule) => {
    return api.put<ApiResponse<Schedule>>(`/schedules/${id}`, data);
};

export const deleteSchedule = (id: number) => {
    return api.delete<ApiResponse<void>>(`/schedules/${id}`);
};