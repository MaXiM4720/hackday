import { useEffect, useMemo, useState } from 'react';
import type { RoomState } from '../types/room';
import { RoomSessionCoordinator } from '../services/roomSessionCoordinator';

const SIGNALING_URL =
    import.meta.env.VITE_SIGNALING_WS_URL ?? 'ws://localhost:8080/ws/signaling';

const initialState: RoomState = {
    roomId: null,
    role: null,
    selfParticipant: null,
    participants: [],
    messages: [],
    signalingState: 'idle',
    roomConnectionState: 'idle',
    statusText: 'Ready',
    errorText: null,
    screen: 'home',
};

export function useRoomSession() {
    const [state, setState] = useState<RoomState>(initialState);

    const coordinator = useMemo(
        () =>
            new RoomSessionCoordinator(SIGNALING_URL, {
                onStatePatch: (patch) => {
                    if (typeof patch === 'function') {
                        setState((prev) => ({
                            ...prev,
                            ...patch(prev),
                        }));
                        return;
                    }

                    setState((prev) => ({
                        ...prev,
                        ...patch,
                    }));
                },
            }),
        [],
    );

    useEffect(() => {
        return () => {
            coordinator.destroy();
        };
    }, [coordinator]);

    return {
        state,
        actions: {
            createRoom: (displayName: string) => coordinator.createRoom(displayName),
            joinRoom: (roomId: string, displayName: string) => coordinator.joinRoom(roomId, displayName),
            sendChatMessage: (text: string) => coordinator.sendChatMessage(text),
            leaveRoom: () => coordinator.leaveRoom(),
        },
    };
}