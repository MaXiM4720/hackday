import { useEffect, useMemo, useRef, useState } from 'react';
import { SignalingService } from '../services/signalingService';
import { WebRtcClientService } from '../services/webrtcClientService';
import { WebRtcHostService } from '../services/webrtcHostService';
import type { ChatMessage, HostBroadcastEnvelope } from '../types/chat';
import type { Participant, ParticipantConnectionStatus } from '../types/participant';
import type { RoomState } from '../types/room';
import type { SignalingMessage } from '../types/signaling';
import { createId } from '../utils/ids';

const SIGNALING_URL = import.meta.env.VITE_SIGNALING_URL ?? 'ws://localhost:8080/ws';

const createInitialState = (): RoomState => ({
  roomId: null,
  self: null,
  role: null,
  participants: [],
  messages: [],
  signalingState: 'idle',
  connectionState: 'idle',
  error: null
});

export function useRoomSession() {
  const [roomState, setRoomState] = useState<RoomState>(createInitialState);
  const signalingRef = useRef<SignalingService | null>(null);
  const hostServiceRef = useRef<WebRtcHostService | null>(null);
  const clientServiceRef = useRef<WebRtcClientService | null>(null);

  if (!signalingRef.current) {
    signalingRef.current = new SignalingService(SIGNALING_URL);
  }

  const signalingService = signalingRef.current;

  useEffect(() => {
    const unsubscribeState = signalingService.onStateChange((signalingState) => {
      setRoomState((current) => ({ ...current, signalingState }));
    });

    const unsubscribeMessage = signalingService.onMessage((message) => {
      void handleSignalingMessage(message);
    });

    return () => {
      unsubscribeState();
      unsubscribeMessage();
      hostServiceRef.current?.destroy();
      clientServiceRef.current?.destroy();
      signalingService.disconnect();
    };
  }, [signalingService]);

  const actions = useMemo(
    () => ({
      async createRoom(displayName: string) {
        setRoomState((current) => ({
          ...current,
          connectionState: 'creating-room',
          error: null
        }));

        await signalingService.connect();
        signalingService.send({
          type: 'create-room',
          payload: { displayName }
        });
      },

      async joinRoom(roomId: string, displayName: string) {
        setRoomState((current) => ({
          ...current,
          connectionState: 'joining-room',
          error: null
        }));

        await signalingService.connect();
        signalingService.send({
          type: 'join-room',
          payload: { roomId, displayName }
        });
      },

      sendMessage(text: string) {
        const trimmed = text.trim();
        if (!trimmed || !roomState.self) {
          return;
        }

        if (roomState.role === 'host') {
          const hostMessage = normalizeChatMessage(roomState.self, trimmed);
          appendAndBroadcastHostMessage(hostMessage);
          return;
        }

        try {
          clientServiceRef.current?.sendChat(trimmed);
        } catch (error) {
          setRoomState((current) => ({
            ...current,
            error: error instanceof Error ? error.message : 'Unable to send message.',
            connectionState: 'failed'
          }));
        }
      },

      leaveRoom() {
        hostServiceRef.current?.destroy();
        clientServiceRef.current?.destroy();
        signalingService.disconnect();
        hostServiceRef.current = null;
        clientServiceRef.current = null;
        setRoomState(createInitialState());
      }
    }),
    [roomState.role, roomState.self, signalingService]
  );

  async function handleSignalingMessage(message: SignalingMessage): Promise<void> {
    switch (message.type) {
      case 'room-created': {
        const self = message.payload.self;
        setRoomState((current) => ({
          ...current,
          roomId: message.payload.roomId,
          self,
          role: 'host',
          participants: [self],
          connectionState: 'waiting-for-peers'
        }));

        hostServiceRef.current = new WebRtcHostService({
          roomId: message.payload.roomId,
          selfId: self.participantId,
          signalingService,
          events: {
            onPeerMessage: (fromParticipantId, text) => {
              const participant = getParticipantById(fromParticipantId);
              if (!participant) {
                return;
              }

              const chatMessage = normalizeChatMessage(participant, text);
              appendAndBroadcastHostMessage(chatMessage);
            },
            onPeerConnectionState: (participantId, status) => {
              updateParticipantStatus(participantId, status);
              if (status === 'disconnected' || status === 'failed') {
                removeParticipant(participantId, `${getParticipantName(participantId)} left the room.`);
              }
            }
          }
        });
        break;
      }

      case 'join-accepted': {
        const self = message.payload.self;
        const host = message.payload.host;

        setRoomState((current) => ({
          ...current,
          roomId: message.payload.roomId,
          self,
          role: 'client',
          participants: [host, self],
          connectionState: 'connecting-peer',
          messages: [createSystemMessage('System', 'Waiting for host peer connection.')]
        }));

        clientServiceRef.current = new WebRtcClientService({
          roomId: message.payload.roomId,
          selfId: self.participantId,
          hostId: host.participantId,
          signalingService,
          events: {
            onHostEnvelope: (envelope) => {
              applyHostEnvelope(envelope);
            },
            onConnectionState: (status) => {
              setRoomState((current) => ({
                ...current,
                connectionState:
                  status === 'connected'
                    ? 'connected'
                    : status === 'failed'
                      ? 'failed'
                      : 'connecting-peer'
              }));
            }
          }
        });
        break;
      }

      case 'participant-joined': {
        if (roomState.role !== 'host') {
          return;
        }

        const participant = message.payload.participant;
        upsertParticipant({ ...participant, connectionStatus: 'connecting' });
        appendMessage(createSystemMessage('System', `${participant.displayName} is joining the room.`));
        setRoomState((current) => ({ ...current, connectionState: 'connecting-peer' }));
        await hostServiceRef.current?.startPeerNegotiation(participant);
        break;
      }

      case 'participant-left': {
        if (roomState.role === 'host') {
          hostServiceRef.current?.closePeer(message.payload.participantId);
        }
        removeParticipant(message.payload.participantId, `${getParticipantName(message.payload.participantId)} left the room.`);
        break;
      }

      case 'offer': {
        if (roomState.role !== 'client' || !clientServiceRef.current || !roomState.self) {
          return;
        }

        const answer = await clientServiceRef.current.handleOffer(message.payload.sdp);
        signalingService.send({
          type: 'answer',
          payload: {
            roomId: message.payload.roomId,
            fromParticipantId: roomState.self.participantId,
            toParticipantId: message.payload.fromParticipantId,
            sdp: answer
          }
        });
        break;
      }

      case 'answer': {
        if (roomState.role !== 'host') {
          return;
        }

        await hostServiceRef.current?.applyAnswer(message.payload.fromParticipantId, message.payload.sdp);
        setRoomState((current) => ({ ...current, connectionState: 'connected' }));
        break;
      }

      case 'ice-candidate': {
        if (roomState.role === 'host') {
          await hostServiceRef.current?.addIceCandidate(
            message.payload.fromParticipantId,
            message.payload.candidate
          );
        } else {
          await clientServiceRef.current?.addIceCandidate(message.payload.candidate);
        }
        break;
      }

      case 'room-closed': {
        setRoomState((current) => ({
          ...current,
          connectionState: 'room-closed',
          error: message.payload.reason ?? 'Host disconnected. Room closed.'
        }));
        clientServiceRef.current?.destroy();
        break;
      }

      case 'error': {
        setRoomState((current) => ({
          ...current,
          error: message.payload.message,
          connectionState: 'failed'
        }));
        break;
      }
    }
  }

  function applyHostEnvelope(envelope: HostBroadcastEnvelope): void {
    switch (envelope.kind) {
      case 'room-state': {
        setRoomState((current) => ({
          ...current,
          participants: envelope.participants ?? current.participants,
          messages: envelope.messages ?? current.messages,
          connectionState: 'connected'
        }));
        break;
      }
      case 'participant-list': {
        setRoomState((current) => ({
          ...current,
          participants: envelope.participants ?? current.participants
        }));
        break;
      }
      case 'chat-message':
      case 'system-message': {
        if (envelope.message) {
          appendMessage(envelope.message);
        }
        break;
      }
    }
  }

  function normalizeChatMessage(author: Participant, text: string): ChatMessage {
    return {
      id: createId('msg'),
      type: 'chat-message',
      author: author.displayName,
      authorId: author.participantId,
      text,
      timestamp: Date.now()
    };
  }

  function createSystemMessage(author: string, text: string): ChatMessage {
    return {
      id: createId('system'),
      type: 'system-message',
      author,
      authorId: 'system',
      text,
      timestamp: Date.now()
    };
  }

  function appendAndBroadcastHostMessage(message: ChatMessage): void {
    appendMessage(message);
    hostServiceRef.current?.broadcast({ kind: 'chat-message', message });
  }

  function appendMessage(message: ChatMessage): void {
    setRoomState((current) => ({
      ...current,
      messages: [...current.messages, message].sort((a, b) => a.timestamp - b.timestamp)
    }));
  }

  function upsertParticipant(participant: Participant): void {
    setRoomState((current) => {
      const existingIndex = current.participants.findIndex(
        (item) => item.participantId === participant.participantId
      );

      if (existingIndex === -1) {
        return { ...current, participants: [...current.participants, participant] };
      }

      const next = [...current.participants];
      next[existingIndex] = participant;
      return { ...current, participants: next };
    });
  }

  function updateParticipantStatus(
    participantId: string,
    status: ParticipantConnectionStatus
  ): void {
    setRoomState((current) => ({
      ...current,
      participants: current.participants.map((participant) =>
        participant.participantId === participantId
          ? { ...participant, connectionStatus: status }
          : participant
      )
    }));

    if (roomState.role === 'host') {
      hostServiceRef.current?.broadcast({
        kind: 'participant-list',
        participants: roomState.participants.map((participant) =>
          participant.participantId === participantId
            ? { ...participant, connectionStatus: status }
            : participant
        )
      });
    }
  }

  function removeParticipant(participantId: string, systemText: string): void {
    setRoomState((current) => ({
      ...current,
      participants: current.participants.filter((participant) => participant.participantId !== participantId),
      messages: [...current.messages, createSystemMessage('System', systemText)]
    }));

    if (roomState.role === 'host') {
      const nextParticipants = roomState.participants.filter(
        (participant) => participant.participantId !== participantId
      );
      hostServiceRef.current?.broadcast({ kind: 'participant-list', participants: nextParticipants });
      hostServiceRef.current?.broadcast({
        kind: 'system-message',
        message: createSystemMessage('System', systemText)
      });
    }
  }

  function getParticipantById(participantId: string): Participant | undefined {
    return roomState.participants.find((participant) => participant.participantId === participantId);
  }

  function getParticipantName(participantId: string): string {
    return getParticipantById(participantId)?.displayName ?? 'Participant';
  }

  return {
    roomState,
    actions,
    signalingUrl: SIGNALING_URL
  };
}
