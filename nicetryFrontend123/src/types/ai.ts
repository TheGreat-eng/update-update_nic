// src/types/ai.ts

export interface AIPredictionPoint {
    timestamp: string | null; // Backend có thể trả về null
    predicted_temperature?: number | null;
    predicted_humidity?: number | null;
    predicted_soil_moisture?: number | null;
}

export interface AISuggestion {
    action: string;
    message: string;
    confidence: number | null; // Backend có thể trả về null
    details: any | null;
}

export interface AIPredictionResponse {
    predictions: AIPredictionPoint[];
    suggestion: AISuggestion;
    model_info: {
        model_type: string;      // ✅ SỬA: Đổi từ model_name
        version: string;         // ✅ THÊM
        features_used: string;   // ✅ THÊM
        r2_score: string;       // ✅ THÊM
        trained_on: string;     // ✅ SỬA: Đổi từ training_date
    } | null;
}