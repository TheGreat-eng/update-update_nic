export interface FarmSummary {
    totalDevices: number;
    onlineDevices: number;
    averageEnvironment: {
        avgTemperature: number;
        avgHumidity: number;
        avgSoilMoisture: number;
        avgSoilPH: number;
        avgLightIntensity: number;
    };
}

export interface ChartDataPoint {
    time: string;
    temperature?: number;
    humidity?: number;
    soilMoisture?: number;
    soilPH?: number;
}