import { jwtDecode } from 'jwt-decode';

interface DecodedToken {
    exp: number;
    sub: string; // Email từ JWT
    userId?: number; // ✅ THÊM: userId riêng biệt
    fullName?: string;
    name?: string;
    roles?: string[];
}

/**
 * Kiểm tra token có hết hạn chưa
 */
export const isTokenExpired = (token: string): boolean => {
    try {
        const decoded = jwtDecode<DecodedToken>(token);
        // Thêm buffer 30 giây để tránh edge case
        return decoded.exp * 1000 < Date.now() + 30000;
    } catch (error) {
        console.error('Failed to decode token:', error);
        return true;
    }
};

/**
 * Lấy token từ localStorage và validate
 */
export const getAuthToken = (): string | null => {
    const token = localStorage.getItem('token');

    if (!token) {
        return null;
    }

    if (isTokenExpired(token)) {
        console.warn('Token expired, clearing auth data');
        clearAuthData();
        return null;
    }

    return token;
};

/**
 * Lấy thông tin user từ token
 */
// src/utils/auth.ts
export const getUserFromToken = (token: string): any | null => {
    try {
        const decoded = jwtDecode<DecodedToken>(token);
        return {
            userId: decoded.userId || decoded.sub, // Lấy userId nếu có
            email: decoded.sub,
            // <<<< SỬA LẠI LOGIC NÀY >>>>
            fullName: decoded.fullName || decoded.name || null, // Lấy fullName hoặc name từ token
            roles: decoded.roles || ['FARMER']
        };
    } catch (error) {
        console.error('Failed to decode user info:', error);
        return null;
    }
};


/**
 * Kiểm tra user có role cụ thể không
 */
export const hasRole = (role: string): boolean => {
    const token = getAuthToken();
    if (!token) return false;

    const user = getUserFromToken(token);
    return user?.roles?.includes(role) || false;
};

/**
 * Xóa tất cả dữ liệu auth
 */
export const clearAuthData = (): void => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('selectedFarmId');
    localStorage.removeItem('refreshToken'); // ✅ THÊM nếu dùng

    // ✅ THÊM: Dispatch event để các component biết auth đã bị clear
    window.dispatchEvent(new Event('storage'));

    sessionStorage.clear();
};

/**
 * Lưu token và user info
 */
export const setAuthData = (token: string, user: any): void => {
    localStorage.setItem('token', token);

    // ✅ CHỈ lưu nếu user không phải undefined/null
    if (user && typeof user === 'object') {
        localStorage.setItem('user', JSON.stringify(user));
    } else {
        console.warn('Invalid user data, not saving to localStorage');
    }
};

/**
 * Lấy user info từ localStorage (safe parse)
 */
export const getUserFromStorage = (): any | null => {
    try {
        const userStr = localStorage.getItem('user');

        if (!userStr || userStr === 'undefined' || userStr === 'null') {
            const token = getAuthToken();
            if (token) {
                return getUserFromToken(token);
            }
            return null;
        }

        const user = JSON.parse(userStr);

        // ✅ THÊM: Validate user object
        if (!user || typeof user !== 'object' || !user.email) {
            console.warn('⚠️ Invalid user data in localStorage');
            localStorage.removeItem('user');

            const token = getAuthToken();
            if (token) {
                return getUserFromToken(token);
            }
            return null;
        }

        return user;
    } catch (error) {
        console.error('Failed to parse user from localStorage:', error);
        localStorage.removeItem('user');

        const token = getAuthToken();
        if (token) {
            return getUserFromToken(token);
        }
        return null;
    }
};

/**
 * Kiểm tra user đã đăng nhập chưa
 */
export const isAuthenticated = (): boolean => {
    return getAuthToken() !== null;
};