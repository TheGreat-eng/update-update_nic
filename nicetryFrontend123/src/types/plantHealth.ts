// src/types/plantHealth.ts
export interface HealthAlert {
    id: number;
    typeName: string;
    severityName: string;
    description: string;
    suggestion: string;
    detectedAt: string;
}

export interface PlantHealthDTO {
    healthScore: number;
    status: 'EXCELLENT' | 'GOOD' | 'WARNING' | 'CRITICAL';
    activeAlerts: HealthAlert[];
    overallSuggestion: string;
}

// Thêm Type mới
export interface ZoneHealth {
    zoneId: number;
    zoneName: string;
    plantProfileName: string;
    healthScore: number;
    status: 'EXCELLENT' | 'GOOD' | 'WARNING' | 'CRITICAL';
    activeAlertCount: number;
    criticalAlerts: HealthAlert[]; // Tái sử dụng HealthAlert cũ
}
