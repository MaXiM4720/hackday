import type { Participant } from '../types/participant';
import './ParticipantList.css';

export function ParticipantList({ participants }: { participants: Participant[] }) {
  return (
    <div className="participant-list">
      <h3>Participants</h3>
      <ul>
        {participants.map((participant) => (
          <li key={participant.participantId}>
            <div>
              <strong>{participant.displayName}</strong>
              <span>{participant.role}</span>
            </div>
            <small>{participant.connectionStatus}</small>
          </li>
        ))}
      </ul>
    </div>
  );
}
