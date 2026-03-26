import { ChatInput } from '../components/ChatInput';
import { ChatMessageList } from '../components/ChatMessageList';
import { ParticipantList } from '../components/ParticipantList';
import { RoleBadge } from '../components/RoleBadge';
import { StatusBanner } from '../components/StatusBanner';
import type { RoomState } from '../types/room';
import './ChatRoomPage.css';

interface ChatRoomPageProps {
  roomState: RoomState;
  onSendMessage: (text: string) => void;
  onLeaveRoom: () => void;
}

export function ChatRoomPage({ roomState, onSendMessage, onLeaveRoom }: ChatRoomPageProps) {
  const canSend =
    roomState.connectionState === 'connected' ||
    (roomState.role === 'host' && roomState.connectionState !== 'room-closed');

  return (
    <div className="chat-room-page">
      <header className="chat-room-header">
        <div>
          <h1>Room {roomState.roomId}</h1>
          {roomState.role && <RoleBadge role={roomState.role} />}
        </div>
        <div className="chat-room-header__actions">
          <span>
            Connection: <strong>{roomState.connectionState}</strong>
          </span>
          <button type="button" onClick={onLeaveRoom}>
            Leave room
          </button>
        </div>
      </header>

      {roomState.error && <StatusBanner kind="error" text={roomState.error} />}
      {roomState.connectionState === 'room-closed' && (
        <StatusBanner kind="warning" text="The room has closed because the host disconnected." />
      )}
      {roomState.connectionState === 'connecting-peer' && (
        <StatusBanner kind="info" text="WebRTC connection in progress." />
      )}
      {roomState.connectionState === 'failed' && (
        <StatusBanner kind="error" text="WebRTC connection failed or signaling is unavailable." />
      )}

      <div className="chat-layout">
        <aside>
          <ParticipantList participants={roomState.participants} />
        </aside>
        <main>
          <ChatMessageList messages={roomState.messages} selfId={roomState.self?.participantId} />
          <ChatInput disabled={!canSend} onSend={onSendMessage} />
        </main>
      </div>
    </div>
  );
}
