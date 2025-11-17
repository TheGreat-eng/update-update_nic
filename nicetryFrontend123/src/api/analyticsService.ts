import api from './axiosConfig';
import qs from 'qs'; // VVVV--- THÊM IMPORT NÀY ---VVVV

interface Params {
    deviceIds: string[];
    fields: string[];
    start: string;
    end: string;
    window: string;
}

export const getHistoricalData = (params: Params) => {
    // VVVV--- SỬA LẠI HOÀN TOÀN LỜI GỌI API NÀY ---VVVV
    return api.get('/analytics/history', {
        params,
        paramsSerializer: params => {
            // Sử dụng qs để định dạng mảng đúng cách cho Spring Boot
            return qs.stringify(params, { arrayFormat: 'repeat' })
        }
    })
        .then(res => res.data.data);
    // ^^^^--------------------------------------------^^^^
};