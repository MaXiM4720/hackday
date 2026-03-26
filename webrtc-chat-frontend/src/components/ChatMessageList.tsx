import type { ChatMessage } from '../types/chat';
import { formatTime } from '../utils/time';

interface Props {
    messages: ChatMessage[];
    selfParticipantId?: string;
}

export function ChatMessageList({ messages, selfParticipantId }: Props) {
    return (
        <div className="panel messages-panel">
            <h3>Messages</h3>
            <div className="message-list">
                {messages.length === 0 && <div className="empty-state">No messages yet</div>}
                {messages.map((message) => {
                    const isOwn = message.authorId === selfParticipantId;
                    const isSystem = message.type === 'system-message';

                    return (
                        <div
                            key={message.id}
                            className={`message-item ${isSystem ? 'message-system' : isOwn ? 'message-own' : ''}`}
                        >
                            <div className="message-meta">
                                <strong>{message.author}</strong>
                                <span>{formatTime(message.timestamp)}</span>
                            </div>
                            <div>{message.text}</div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}