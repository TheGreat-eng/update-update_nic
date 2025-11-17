export interface ActivityLog {
    id: number;
    actorName: string;
    actionType: string;
    description: string;
    status: 'SUCCESS' | 'FAILED';
    createdAt: string; // ISO Date string
}