import api from './axiosConfig';
import type { ApiResponse } from '../types/api';

export const sendChatMessage = (farmId: number, message: string) => {
    return api.post<ApiResponse<string>>('/chat', { farmId, message })
        .then(res => res.data);
};