import { useState } from 'react';
import type { RoomState } from '../types/room';
import { StatusBanner } from '../components/StatusBanner';
import './HomePage.css';

interface HomePageProps {
  roomState: RoomState;
  signalingUrl: string;
  onCreateRoom: (displayName: string) => Promise<void>;
  onJoinRoom: (roomId: string, displayName: string) => Promise<void>;
}

export function HomePage({ roomState, signalingUrl, onCreateRoom, onJoinRoom }: HomePageProps) {
  const [displayName, setDisplayName] = useState('');
  const [roomId, setRoomId] = useState('');

  const canSubmit = displayName.trim().length > 1;

  return (
    <div className="home-page">
      <div className="home-card">
        <p className="eyebrow">Host-based decentralized text chat</p>
        <h1>Room Relay Chat</h1>
        <p className="subtext">
          Signaling uses WebSocket. Chat traffic uses WebRTC DataChannel through the room host.
        </p>

        <label>
          Display name
          <input
            value={displayName}
            onChange={(event) => setDisplayName(event.target.value)}
            placeholder="Enter your display name"
          />
        </label>

        <div className="home-actions">
          <button
            type="button"
            disabled={!canSubmit || roomState.connectionState === 'creating-room'}
            onClick={() => onCreateRoom(displayName.trim())}
          >
            Create room
          </button>
        </div>

        <div className="separator">or</div>

        <label>
          Room ID
          <input
            value={roomId}
            onChange={(event) => setRoomId(event.target.value)}
            placeholder="Paste room ID"
          />
        </label>

        <div className="home-actions">
          <button
            type="button"
            disabled={!canSubmit || !roomId.trim() || roomState.connectionState === 'joining-room'}
            onClick={() => onJoinRoom(roomId.trim(), displayName.trim())}
          >
            Join room
          </button>
        </div>

        <div className="home-meta">
          <span>
            Signaling status: <strong>{roomState.signalingState}</strong>
          </span>
          <span>
            Server: <code>{signalingUrl}</code>
          </span>
        </div>

        {roomState.connectionState === 'creating-room' && (
          <StatusBanner kind="info" text="Creating room and registering host with signaling server." />
        )}
        {roomState.connectionState === 'joining-room' && (
          <StatusBanner kind="info" text="Joining room and waiting for host negotiation." />
        )}
        {roomState.error && <StatusBanner kind="error" text={roomState.error} />}
      </div>
    </div>
  );
}
