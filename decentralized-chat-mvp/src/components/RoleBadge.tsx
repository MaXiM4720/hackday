import type { ParticipantRole } from '../types/participant';
import './RoleBadge.css';

export function RoleBadge({ role }: { role: ParticipantRole }) {
  return <span className={`role-badge role-badge--${role}`}>{role.toUpperCase()}</span>;
}
