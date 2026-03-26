export type ParticipantRole = 'host' | 'client';
export type ParticipantConnectionStatus =
    | 'connecting'
    | 'connected'
    | 'disconnected'
    | 'failed';

export interface Participant {
    participantId: string;
    displayName: string;
    role: ParticipantRole;
    connectionStatus: ParticipantConnectionStatus;
}