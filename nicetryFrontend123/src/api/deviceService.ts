// src/api/deviceService.ts
import api from './axiosConfig';
import type { Device } from '../types/device';
import type { ApiResponse } from '../types/api';

// Định nghĩa kiểu dữ liệu cho việc tạo/cập nhật
export interface DeviceFormData {
    name: string;
    deviceId?: string; // Sửa: deviceId là tùy chọn khi tạo
    type: string;
    description?: string;
    zoneId?: number | null;
    farmId?: number; // Thêm farmId để "claim"
}

export const getDevicesByFarm = (farmId: number) => {
    return api.get<{ success: boolean; data: Device[] }>(`/devices?farmId=${farmId}&withData=true`);
};

export const controlDevice = (deviceId: string, action: 'turn_on' | 'turn_off', duration?: number) => {
    const command: { action: string; duration?: number } = { action };
    if (duration) {
        command.duration = duration;
    }
    return api.post(`/devices/${deviceId}/control`, command);
};



// THÊM CÁC HÀM MỚI
export const createDevice = (farmId: number, data: DeviceFormData) => {
    return api.post<Device>(`/devices?farmId=${farmId}`, data);
};



export const deleteDevice = (id: number) => {
    return api.delete(`/devices/${id}`);
};


// VVVV--- THÊM CÁC HÀM MỚI NÀY ---VVVV
export const getUnclaimedDevices = () => {
    return api.get<ApiResponse<Device[]>>('/devices/unclaimed').then(res => res.data.data);
};
// ^^^^---------------------------------^^^^

// Sửa lại hàm updateDevice để nhận cả Device ID kiểu number (ID database)
export const updateDevice = (id: number, data: Partial<DeviceFormData>) => {
    return api.put<Device>(`/devices/${id}`, data);
};