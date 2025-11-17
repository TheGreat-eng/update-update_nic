// src/types/farm.ts

export interface Farm {
    id: number;
    name: string;
    description?: string;
    location?: string;
    totalDevices?: number;
    onlineDevices?: number;

    // <<<< BỔ SUNG CÁC TRƯỜNG CÒN THIẾU DƯỚI ĐÂY >>>>
    ownerId: number;
    ownerEmail: string;
    createdAt: string;
    currentUserRole: 'OWNER' | 'OPERATOR' | 'VIEWER'; // <<<< THÊM DÒNG NÀY
}

export interface FarmFormData {
    name: string;
    location?: string;
    description?: string;
}

export interface FarmMemberDTO {
    userId: number;
    fullName: string;
    email: string;
    role: 'VIEWER' | 'OPERATOR';
}