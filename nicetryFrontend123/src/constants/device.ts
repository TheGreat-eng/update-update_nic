export const DEVICE_TYPES = {
    SENSOR_DHT22: { value: 'SENSOR_DHT22', label: 'Cảm biến DHT22' },
    SENSOR_SOIL_MOISTURE: { value: 'SENSOR_SOIL_MOISTURE', label: 'Cảm biến Độ ẩm đất' },
    SENSOR_LIGHT: { value: 'SENSOR_LIGHT', label: 'Cảm biến Ánh sáng' },
    SENSOR_PH: { value: 'SENSOR_PH', label: 'Cảm biến pH' },
    ACTUATOR_PUMP: { value: 'ACTUATOR_PUMP', label: 'Máy bơm' },
    ACTUATOR_FAN: { value: 'ACTUATOR_FAN', label: 'Quạt' },
} as const;

export const DEVICE_STATUS = {
    ONLINE: 'ONLINE',
    OFFLINE: 'OFFLINE',
    ERROR: 'ERROR',
} as const;

export const DEVICE_STATE = {
    ON: 'ON',
    OFF: 'OFF',
} as const;

export const getDeviceTypeLabel = (type: string): string => {
    return Object.values(DEVICE_TYPES).find(dt => dt.value === type)?.label || type;
};