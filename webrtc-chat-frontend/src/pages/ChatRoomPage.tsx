import { ChatInput } from '../components/ChatInput';
import { ChatMessageList } from '../components/ChatMessageList';
import { ParticipantList } from '../components/ParticipantList';
import { RoleBadge } from '../components/RoleBadge';
import { StatusBanner } from '../components/StatusBanner';
import type { RoomState } from '../types/room';

interface Props {
    state: RoomState;
    onSendMessage: (text: string) => void;
    onLeaveRoom: () => void;
}

export function ChatRoomPage({ state, onSendMessage, onLeaveRoom }: Props) {
    const canSend =
        state.roomConnectionState === 'connected' ||
        (state.role === 'host' && state.roomConnectionState !== 'room-closed');

    return (
        <div className="room-layout">
            <div className="topbar">
                <div>
                    <div className="room-title">Room {state.roomId}</div>
                    {state.role && <RoleBadge role={state.role} />}
                </div>
                <button className="danger-button" onClick={onLeaveRoom}>
                    Leave room
                </button>
            </div>

            <StatusBanner status={state.statusText} error={state.errorText} />

            <div className="room-grid">
                <ParticipantList
                    participants={state.participants}
                    selfParticipantId={state.selfParticipant?.participantId}
                />

                <div className="chat-column">
                    <ChatMessageList
                        messages={state.messages}
                        selfParticipantId={state.selfParticipant?.participantId}
                    />
                    <ChatInput onSend={onSendMessage} disabled={!canSend} />
                </div>
            </div>
        </div>
    );
}