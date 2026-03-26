import { useState } from 'react';

interface Props {
    signalingState: string;
    statusText: string;
    errorText: string | null;
    onCreateRoom: (displayName: string) => Promise<void>;
    onJoinRoom: (roomId: string, displayName: string) => Promise<void>;
}

export function HomePage({
                             signalingState,
                             statusText,
                             errorText,
                             onCreateRoom,
                             onJoinRoom,
                         }: Props) {
    const [displayName, setDisplayName] = useState('');
    const [roomId, setRoomId] = useState('');

    const normalizedDisplayName = displayName.trim();
    const normalizedRoomId = roomId.trim().toUpperCase();

    return (
        <div className="home-layout">
            <div className="card">
                <h1>Host-Based WebRTC Chat</h1>
                <p className="subtitle">
                    Create a room as host, or join an existing room as client.
                </p>

                <div className="status-line">
                    <strong>Connection:</strong> {signalingState} — {statusText}
                </div>

                {errorText && <div className="inline-error">{errorText}</div>}

                <label className="field-label">Display name</label>
                <input
                    className="text-input"
                    value={displayName}
                    onChange={(event) => setDisplayName(event.target.value)}
                    placeholder="Your name"
                />

                <div className="action-row">
                    <button
                        className="primary-button"
                        disabled={!normalizedDisplayName}
                        onClick={() => onCreateRoom(normalizedDisplayName)}
                    >
                        Create room
                    </button>
                </div>

                <hr className="divider" />

                <label className="field-label">Room ID</label>
                <input
                    className="text-input"
                    value={roomId}
                    onChange={(event) => setRoomId(event.target.value)}
                    placeholder="Enter room code"
                />

                <div className="action-row">
                    <button
                        className="secondary-button"
                        disabled={!normalizedDisplayName || !normalizedRoomId}
                        onClick={() => onJoinRoom(normalizedRoomId, normalizedDisplayName)}
                    >
                        Join room
                    </button>
                </div>
            </div>
        </div>
    );
}
