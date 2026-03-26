import type { ChatMessage } from '../types/chat';
import { formatTimestamp } from '../utils/time';
import './ChatMessageList.css';

interface ChatMessageListProps {
  messages: ChatMessage[];
  selfId?: string;
}

export function ChatMessageList({ messages, selfId }: ChatMessageListProps) {
  return (
    <div className="chat-message-list">
      {messages.map((message) => {
        const isSelf = selfId === message.authorId;
        return (
          <div
            key={message.id}
            className={`chat-message chat-message--${message.type} ${isSelf ? 'chat-message--self' : ''}`}
          >
            <div className="chat-message__meta">
              <strong>{message.author}</strong>
              <span>{formatTimestamp(message.timestamp)}</span>
            </div>
            <p>{message.text}</p>
          </div>
        );
      })}
    </div>
  );
}
