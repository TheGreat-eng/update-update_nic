// TẠO FILE MỚI: src/types/plantProfile.ts
export interface PlantProfileSummary { // Đổi tên để phân biệt với DTO của admin
    id: number;
    name: string;
    description?: string;
}