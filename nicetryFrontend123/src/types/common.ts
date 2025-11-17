// src/types/common.ts
export interface Page<T> {
    content: T[];
    totalPages: number;
    totalElements: number;
    number: number; // Current page number
    size: number;
}

export interface FarmSearchResult {
    id: number;
    name: string;
    location?: string;
}

export interface DeviceSearchResult {
    id: number;
    deviceId: string;
    name: string;
    farmId: number;
    farmName: string;
}

export interface GlobalSearchResult {
    farms: FarmSearchResult[];
    devices: DeviceSearchResult[];
}