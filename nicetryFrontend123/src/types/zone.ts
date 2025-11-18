export interface Zone {
    id: number;
    name: string;
    description?: string;
    farmId: number;
    deviceCount?: number;
    // VVVV--- THÊM 2 TRƯỜNG NÀY ---VVVV
    plantProfileId?: number | null;
    plantProfileName?: string | null;
    // ^^^^-----------------------------^^^^
}