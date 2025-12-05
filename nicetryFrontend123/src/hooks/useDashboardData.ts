import { useQuery } from '@tanstack/react-query';
import api from '../api/axiosConfig';
import type { FarmSummary } from '../types/dashboard';

//  SỬA LẠI HOOK NÀY
export const useDashboardSummary = (farmId: number | null, zoneId?: number | null) => { // Thêm zoneId
    return useQuery({
        queryKey: ['dashboard-summary', farmId, zoneId], // Thêm zoneId vào key
        queryFn: async () => {
            if (!farmId) return null;
            // Thêm param zoneId vào URL
            const url = `/reports/summary?farmId=${farmId}${zoneId ? `&zoneId=${zoneId}` : ''}`;
            const res = await api.get<{ data: FarmSummary }>(url);
            return res.data.data;
        },
        enabled: !!farmId,
        refetchInterval: 30000,
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