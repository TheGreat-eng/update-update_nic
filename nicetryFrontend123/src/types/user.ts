// src/types/user.ts
export interface UserProfile {
    id: number;
    email: string;
    // username: string;
    fullName: string;
    phoneNumber: string;
    role: 'ADMIN' | 'FARMER' | 'VIEWER';
}