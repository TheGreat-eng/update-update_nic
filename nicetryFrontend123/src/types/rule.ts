// src/types/rule.ts
export interface RuleCondition {
    type: 'SENSOR_VALUE';
    field: 'temperature' | 'humidity' | 'soil_moisture';
    operator: 'LESS_THAN' | 'GREATER_THAN';
    value: string;
    deviceId: string;
}

export interface RuleAction {
    type: 'TURN_ON_DEVICE' | 'TURN_OFF_DEVICE';
    deviceId: string;
    durationSeconds?: number;
}

export interface Rule {
    id?: number;
    name: string;
    description?: string;
    enabled: boolean;
    conditions: RuleCondition[];
    actions: RuleAction[];
}