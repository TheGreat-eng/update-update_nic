// src/api/aiService.ts

import api from './axiosConfig';
import type { AIPredictionResponse } from '../types/ai';

export const getAIPredictions = (farmId: number) => {
    return api.get<{ success: boolean; message: string; data: AIPredictionResponse | null }>(`/ai/predictions?farmId=${farmId}`);
};

// ✅ THÊM: API chẩn đoán bệnh thực vật
export const diagnosePlantDisease = (imageFile: File) => {
    const formData = new FormData();
    formData.append('image', imageFile);

    return api.post<{ success: boolean; message: string; data: any }>('/ai/diagnose', formData, {
        headers: {
            'Content-Type': 'multipart/form-data'
        }
    });
};