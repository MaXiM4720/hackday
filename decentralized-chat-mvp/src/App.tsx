import { ChatRoomPage } from './pages/ChatRoomPage';
import { HomePage } from './pages/HomePage';
import { useRoomSession } from './hooks/useRoomSession';

export default function App() {
  const { roomState, actions, signalingUrl } = useRoomSession();

  const isInRoom = Boolean(roomState.roomId && roomState.self);

  return isInRoom ? (
    <ChatRoomPage
      roomState={roomState}
      onSendMessage={actions.sendMessage}
      onLeaveRoom={actions.leaveRoom}
    />
  ) : (
    <HomePage
      roomState={roomState}
      signalingUrl={signalingUrl}
      onCreateRoom={actions.createRoom}
      onJoinRoom={actions.joinRoom}
    />
  );
}
