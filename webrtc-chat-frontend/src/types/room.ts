import type { ChatMessage } from './chat';
import type { Participant, ParticipantRole } from './participant';

export type AppScreen = 'home' | 'room';

export type SignalingConnectionState =
    | 'idle'
    | 'connecting'
    | 'connected'
    | 'disconnected'
    | 'error';

export type RoomConnectionState =
    | 'idle'
    | 'creating-room'
    | 'joining-room'
    | 'waiting-for-peers'
    | 'connecting-peer'
    | 'connected'
    | 'room-closed'
    | 'failed';

export interface RoomState {
    roomId: string | null;
    role: ParticipantRole | null;
    selfParticipant: Participant | null;
    participants: Participant[];
    messages: ChatMessage[];
    signalingState: SignalingConnectionState;
    roomConnectionState: RoomConnectionState;
    statusText: string;
    errorText: string | null;
    screen: AppScreen;
}