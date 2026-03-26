import type { Participant } from './participant';

export type ChatMessageType = 'chat-message' | 'system-message';

export interface ChatMessage {
  id: string;
  type: ChatMessageType;
  author: string;
  authorId: string;
  text: string;
  timestamp: number;
}

export interface HostBroadcastEnvelope {
  kind: 'room-state' | 'chat-message' | 'participant-list' | 'system-message';
  message?: ChatMessage;
  messages?: ChatMessage[];
  participants?: Participant[];
}

export interface PeerChatEnvelope {
  kind: 'chat-message';
  text: string;
}
