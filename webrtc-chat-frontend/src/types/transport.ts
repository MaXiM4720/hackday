import type { ChatMessage } from './chat';
import type { Participant } from './participant';

export type DataChannelEnvelope =
    | {
    type: 'chat-message';
    payload: {
        id: string;
        author: string;
        authorId: string;
        text: string;
        timestamp: number;
    };
}
    | {
    type: 'participant-list';
    payload: {
        participants: Participant[];
    };
}
    | {
    type: 'system-message';
    payload: ChatMessage;
};