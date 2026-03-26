export interface SignalingEnvelope<T = unknown> {
    type: string;
    payload: T;
}

export interface CreateRoomPayload {
    displayName: string;
}

export interface JoinRoomPayload {
    roomId: string;
    displayName: string;
}

export interface LeaveRoomPayload {}

export interface PingPayload {
    timestamp: number;
}

export interface RoomCreatedPayload {
    roomId: string;
    participantId: string;
    sessionId: string;
}

export interface ParticipantDto {
    participantId: string;
    displayName: string;
    host: boolean;
}

export interface JoinAcceptedPayload {
    roomId: string;
    participantId: string;
    hostParticipantId: string;
    participants: ParticipantDto[];
}

export interface ParticipantJoinedPayload {
    participant: ParticipantDto;
}

export interface ParticipantLeftPayload {
    participantId: string;
}

export interface ParticipantsUpdatedPayload {
    roomId: string;
    participants: ParticipantDto[];
}

export interface RoomClosedPayload {
    roomId: string;
    reason: string;
}

export interface ErrorPayload {
    code: string;
    message: string;
}

export interface RelaySdpPayload {
    roomId: string;
    fromParticipantId?: string;
    targetParticipantId: string;
    sdp: RTCSessionDescriptionInit;
}

export interface RelayIcePayload {
    roomId: string;
    fromParticipantId?: string;
    targetParticipantId: string;
    candidate: RTCIceCandidateInit;
}

export type IncomingSignalingMessage =
    | SignalingEnvelope<RoomCreatedPayload>
    | SignalingEnvelope<JoinAcceptedPayload>
    | SignalingEnvelope<ParticipantJoinedPayload>
    | SignalingEnvelope<ParticipantLeftPayload>
    | SignalingEnvelope<ParticipantsUpdatedPayload>
    | SignalingEnvelope<RoomClosedPayload>
    | SignalingEnvelope<RelaySdpPayload>
    | SignalingEnvelope<RelayIcePayload>
    | SignalingEnvelope<ErrorPayload>;