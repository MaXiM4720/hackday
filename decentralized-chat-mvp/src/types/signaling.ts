import type { Participant } from './participant';

export type SignalingMessage =
  | CreateRoomRequest
  | RoomCreatedEvent
  | JoinRoomRequest
  | JoinAcceptedEvent
  | ParticipantJoinedEvent
  | ParticipantLeftEvent
  | OfferEvent
  | AnswerEvent
  | IceCandidateEvent
  | RoomClosedEvent
  | ErrorEvent;

export interface BaseMessage<TType extends string, TPayload> {
  type: TType;
  payload: TPayload;
}

export type CreateRoomRequest = BaseMessage<
  'create-room',
  {
    displayName: string;
  }
>;

export type RoomCreatedEvent = BaseMessage<
  'room-created',
  {
    roomId: string;
    self: Participant;
  }
>;

export type JoinRoomRequest = BaseMessage<
  'join-room',
  {
    roomId: string;
    displayName: string;
  }
>;

export type JoinAcceptedEvent = BaseMessage<
  'join-accepted',
  {
    roomId: string;
    self: Participant;
    host: Participant;
  }
>;

export type ParticipantJoinedEvent = BaseMessage<
  'participant-joined',
  {
    roomId: string;
    participant: Participant;
  }
>;

export type ParticipantLeftEvent = BaseMessage<
  'participant-left',
  {
    roomId: string;
    participantId: string;
  }
>;

export type OfferEvent = BaseMessage<
  'offer',
  {
    roomId: string;
    fromParticipantId: string;
    toParticipantId: string;
    sdp: RTCSessionDescriptionInit;
  }
>;

export type AnswerEvent = BaseMessage<
  'answer',
  {
    roomId: string;
    fromParticipantId: string;
    toParticipantId: string;
    sdp: RTCSessionDescriptionInit;
  }
>;

export type IceCandidateEvent = BaseMessage<
  'ice-candidate',
  {
    roomId: string;
    fromParticipantId: string;
    toParticipantId: string;
    candidate: RTCIceCandidateInit;
  }
>;

export type RoomClosedEvent = BaseMessage<
  'room-closed',
  {
    roomId: string;
    reason?: string;
  }
>;

export type ErrorEvent = BaseMessage<
  'error',
  {
    code: string;
    message: string;
  }
>;
