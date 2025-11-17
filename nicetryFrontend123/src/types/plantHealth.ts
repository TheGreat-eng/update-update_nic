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