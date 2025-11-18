// TẠO FILE MỚI: src/api/plantProfileService.ts
import api from './axiosConfig';
import type { PlantProfileSummary } from '../types/plantProfile';
import type { ApiResponse } from '../types/api';

// API này sẽ được gọi bởi user (chủ farm) để chọn profile
export const getPlantProfiles = () => {
    // Giả sử API cho user lấy danh sách là public hoặc có một endpoint riêng
    // Nếu không, có thể cần tạo endpoint mới không nằm dưới /admin
    return api.get<ApiResponse<PlantProfileSummary[]>>('/plant-profiles')
        .then(res => res.data.data);
};