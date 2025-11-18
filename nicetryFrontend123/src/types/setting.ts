// SỬA FILE: src/types/setting.ts
export interface SettingDTO { // Đổi tên để khớp với backend
    key: string;
    value: string | null; // Có thể null nếu người dùng chưa đặt
    defaultValue: string;
    source: string; // "Hồ sơ: Cà chua" hoặc "Hệ thống"
    description: string;
}