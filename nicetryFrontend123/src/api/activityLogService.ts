import api from './axiosConfig';
import type { ActivityLog } from '../types/activityLog';
import type { ApiResponse } from '../types/api';
import type { Page } from '../types/common';

export const getActivityLogs = (farmId: number, page = 0, size = 20) => {
    return api.get<ApiResponse<Page<ActivityLog>>>(`/logs?farmId=${farmId}&page=${page}&size=${size}`)
        .then(res => res.data.data);
};