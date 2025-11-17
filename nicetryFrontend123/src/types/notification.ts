// src/types/notification.ts
export interface Notification {
    id: number;
    title: string;
    message: string;
    type: 'PLANT_HEALTH_ALERT' | 'RULE_TRIGGERED' | 'DEVICE_STATUS' | 'SYSTEM_INFO';
    link: string | null;
    isRead: boolean;
    createdAt: string; // ISO string date format
}