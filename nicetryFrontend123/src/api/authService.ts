// src/api/authService.ts
import axios from 'axios';
import type { RegisterRequest } from '../types/auth';

const API_URL = import.meta.env.VITE_API_URL + '/auth';

// ✅ SỬA: Gửi email thay vì username
// export const login = (username: string, password: string) => {
//     return axios.post(`${API_URL}/login`, { 
//         email: username,  // ✅ Backend đang đợi "email"
//         password 
//     });
// };
export const login = (email: string, password: string) => {
    return axios.post(`${API_URL}/login`, {
        email,
        password
    });
};

export const register = (userInfo: RegisterRequest) => {
    return axios.post(`${API_URL}/register`, userInfo);
};