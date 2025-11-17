// src/types/device.ts
import type { SensorDataMessage } from "./websocket";

export interface Device {
    id: number;
    deviceId: string;
    name: string;
    description?: string; // VVVV--- THÊM DÒNG NÀY ---VVVV
    type: string;
    status: 'ONLINE' | 'OFFLINE' | 'ERROR';
    lastSeen: string;
    farmId: number;
    latestSensorData?: SensorDataMessage;
    currentState?: 'ON' | 'OFF' | null;
    zoneId?: number;      // Thuộc tính bạn đã thêm
    zoneName?: string;    // Thuộc tính bạn đã thêm
}