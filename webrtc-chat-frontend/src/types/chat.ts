export type ChatMessageType = 'chat-message' | 'system-message';

export interface ChatMessage {
    id: string;
    type: ChatMessageType;
    author: string;
    authorId: string;
    text: string;
    timestamp: number;
}