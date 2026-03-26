import type { ChatMessage } from './chat';
import type { Participant, ParticipantRole } from './participant';

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
  | 'failed'
  | 'room-closed'
  | 'leaving';

export interface RoomState {
  roomId: string | null;
  self: Participant | null;
  role: ParticipantRole | null;
  participants: Participant[];
  messages: ChatMessage[];
  signalingState: SignalingConnectionState;
  connectionState: RoomConnectionState;
  error: string | null;
}
