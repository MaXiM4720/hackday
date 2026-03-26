import type { ParticipantRole } from '../types/participant';

interface Props {
    role: ParticipantRole;
}

export function RoleBadge({ role }: Props) {
    return <span className={`role-badge role-${role}`}>{role.toUpperCase()}</span>;
}