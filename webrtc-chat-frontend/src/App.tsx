import { HomePage } from './pages/HomePage';
import { ChatRoomPage } from './pages/ChatRoomPage';
import { useRoomSession } from './hooks/useRoomSession';

export default function App() {
    const { state, actions } = useRoomSession();

    if (state.screen === 'room') {
        return (
            <ChatRoomPage
                state={state}
                onSendMessage={actions.sendChatMessage}
                onLeaveRoom={actions.leaveRoom}
            />
        );
    }

    return (
        <HomePage
            signalingState={state.signalingState}
            statusText={state.statusText}
            errorText={state.errorText}
            onCreateRoom={actions.createRoom}
            onJoinRoom={actions.joinRoom}
        />
    );
}