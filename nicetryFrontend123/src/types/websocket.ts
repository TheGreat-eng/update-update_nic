export interface SensorDataMessage {
    deviceId: string;
    timestamp: string;
    temperature?: number;
    humidity?: number;
    soilMoisture?: number;
    soilPH?: number;
    lightIntensity?: number;
}

// VVVV--- SỬA LẠI TYPE NÀY ---VVVV
export interface DeviceStatusMessage {
    deviceId: string;
    status: 'ONLINE' | 'OFFLINE' | 'ERROR'; // Mở rộng để khớp với backend
    currentState?: 'ON' | 'OFF' | null; // Thêm currentState, là optional
    timestamp: string;
}
// ^^^^--------------------------^^^^