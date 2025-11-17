import { useState } from 'react';
import { message } from 'antd';

interface UseApiCallOptions<T> {
    onSuccess?: (data: T) => void;
    onError?: (error: Error) => void;
    successMessage?: string;
    errorMessage?: string;
    showSuccessMessage?: boolean; // ✅ THÊM: Có hiển thị message thành công không
}

export const useApiCall = <T = any>(options?: UseApiCallOptions<T>) => {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<Error | null>(null);
    const [data, setData] = useState<T | null>(null);

    const execute = async (apiCall: () => Promise<T>) => {
        setLoading(true);
        setError(null);
        try {
            const result = await apiCall();
            setData(result);
            
            // ✅ Chỉ hiển thị message thành công nếu được config
            if (options?.showSuccessMessage && options?.successMessage) {
                message.success(options.successMessage);
            }
            
            options?.onSuccess?.(result);
            return result;
        } catch (err) {
            const error = err as Error;
            setError(error);
            
            // ✅ Không hiển thị lỗi ở đây vì axios interceptor đã xử lý
            // Chỉ log để debug
            console.error('API call failed:', error);
            
            options?.onError?.(error);
            throw error;
        } finally {
            setLoading(false);
        }
    };

    const reset = () => {
        setLoading(false);
        setError(null);
        setData(null);
    };

    return { loading, error, data, execute, reset };
};