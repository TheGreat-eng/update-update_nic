// src/types/admin.ts
export interface AdminUser {
    id: number;
    email: string;
    fullName: string;
    role: 'ADMIN' | 'FARMER' | 'VIEWER';
    enabled: boolean;
    deleted: boolean;
    createdAt: string;
    lastLogin: string;
    phoneNumber: string | null; // <<<< THÊM DÒNG NÀY
}

export interface AdminStats {
    totalUsers: number;
    totalFarms: number;
    totalDevices: number;
    onlineDevices: number;
    totalRules: number;
}


// <<<< BỔ SUNG TYPE MỚI DƯỚI ĐÂY >>>>
export interface SystemSetting {
    key: string;
    value: string;
    description: string;
}


// <<<< BỔ SUNG TYPE MỚI DƯỚI ĐÂY >>>>
export interface PlantProfileDTO {
    id?: number;
    name: string;
    scientificName?: string;
    description?: string;
    settings: Record<string, string>; // Dùng Record<string, string> cho linh hoạt
}