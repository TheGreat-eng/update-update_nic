// src/types/api.ts
export interface ApiResponse<T> {
    success: boolean;
    message: string;
    data: T;
}



// VVVV--- THÊM TYPE NÀY ---VVVV
export interface SensorDataDTO {
    timestamp: string; // ISO string
    avgValue?: number; // Giá trị trung bình từ API aggregated
    // Thêm các trường khác nếu cần
}
// ^^^^--------------------^^^^