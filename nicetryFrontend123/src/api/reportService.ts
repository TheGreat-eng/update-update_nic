// src/api/reportService.ts
import api from './axiosConfig';
import type { ApiResponse, SensorDataDTO } from '../types/api'; // Import thêm SensorDataDTO
const downloadFile = (response: any, fileName: string) => {
    const url = window.URL.createObjectURL(new Blob([response.data]));
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', fileName);
    document.body.appendChild(link);
    link.click();
    link.remove();
};

export const exportDeviceDataAsCsv = (deviceId: string, start: string, end: string) => {
    return api.get(`/reports/export/csv`, {
        params: { deviceId, start, end },
        responseType: 'blob', // Quan trọng: nhận dữ liệu dạng file
    }).then(response => {
        downloadFile(response, `report_${deviceId}.csv`);
    });
};

export const exportDeviceDataAsPdf = (deviceId: string, start: string, end: string) => {
    return api.get(`/reports/export/pdf`, {
        params: { deviceId, start, end },
        responseType: 'blob',
    }).then(response => {
        downloadFile(response, `report_${deviceId}.pdf`);
    });
};


// VVVV--- THÊM HÀM MỚI NÀY ---VVVV
export const getAggregatedData = (deviceId: string, field: string, aggregation: string, window: string) => {
    return api.get<ApiResponse<SensorDataDTO[]>>(`/devices/${deviceId}/data/aggregated`, {
        params: { field, aggregation, window }
    }).then(res => res.data.data); // Trả về mảng data trực tiếp
};