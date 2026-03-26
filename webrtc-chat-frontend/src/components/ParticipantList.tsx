import type { Participant } from '../types/participant';

interface Props {
    participants: Participant[];
    selfParticipantId?: string;
}

export function ParticipantList({ participants, selfParticipantId }: Props) {
    return (
        <div className="panel">
            <h3>Participants</h3>
            <ul className="participant-list">
                {participants.map((participant) => (
                    <li key={participant.participantId} className="participant-item">
                        <div>
                            <strong>
                                {participant.displayName}
                                {participant.participantId === selfParticipantId ? ' (You)' : ''}
                            </strong>
                            <span className="participant-role">{participant.role}</span>
                        </div>
                        <span className={`participant-status status-${participant.connectionStatus}`}>
              {participant.connectionStatus}
            </span>
                    </li>
                ))}
            </ul>
        </div>
    );
}