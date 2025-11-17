export interface Schedule {
    id?: number;
    name: string;
    description?: string;
    farmId: number;
    deviceId: string;
    deviceName?: string;
    action: 'TURN_ON' | 'TURN_OFF';
    cronExpression: string;
    durationSeconds?: number;
    enabled: boolean;
}