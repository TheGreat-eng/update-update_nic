import { useQuery } from '@tanstack/react-query';
import api from '../api/axiosConfig';
import type { FarmSummary } from '../types/dashboard';

// ✅ SỬA LẠI HOOK NÀY
export const useDashboardSummary = (farmId: number | null) => { // Chấp nhận farmId có thể là null
    return useQuery({
        queryKey: ['dashboard-summary', farmId],
        queryFn: async () => {
            // Thêm một lần kiểm tra nữa để TypeScript hài lòng
            if (!farmId) {
                return null;
            }
            const res = await api.get<{ data: FarmSummary }>(`/reports/summary?farmId=${farmId}`);
            return res.data.data;
        },
        // VVVV--- DÒNG QUAN TRỌNG NHẤT ---VVVV
        enabled: !!farmId, // Chỉ kích hoạt query này khi farmId không phải là null/undefined/0
        // ^^^^-----------------------------^^^^
        refetchInterval: 30000,
        staleTime: 10000,
    });
};

export const useChartData = (deviceId: string, field: string, window: string = '10m') => {
    return useQuery({
        queryKey: ['chart-data', deviceId, field, window],
        queryFn: async () => {
            const res = await api.get(`/devices/${deviceId}/data/aggregated?field=${field}&window=${window}`);
            return res.data.data;
        },
        staleTime: 60000,
    });
};