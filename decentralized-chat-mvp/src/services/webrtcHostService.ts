import type { HostBroadcastEnvelope, PeerChatEnvelope } from '../types/chat';
import type { Participant, ParticipantConnectionStatus } from '../types/participant';
import type { SignalingService } from './signalingService';
import { createId } from '../utils/ids';

const RTC_CONFIG: RTCConfiguration = {
  iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
  // TODO: add TURN relay fallback for restrictive NAT environments.
};

interface HostServiceEvents {
  onPeerMessage: (fromParticipantId: string, text: string) => void;
  onPeerConnectionState: (participantId: string, status: ParticipantConnectionStatus) => void;
}

export class WebRtcHostService {
  private readonly roomId: string;
  private readonly selfId: string;
  private readonly signalingService: SignalingService;
  private readonly events: HostServiceEvents;
  private readonly peers = new Map<string, RTCPeerConnection>();
  private readonly channels = new Map<string, RTCDataChannel>();

  constructor(args: {
    roomId: string;
    selfId: string;
    signalingService: SignalingService;
    events: HostServiceEvents;
  }) {
    this.roomId = args.roomId;
    this.selfId = args.selfId;
    this.signalingService = args.signalingService;
    this.events = args.events;
  }

  async startPeerNegotiation(participant: Participant): Promise<void> {
    if (this.peers.has(participant.participantId)) {
      return;
    }

    const peer = this.createPeerConnection(participant.participantId);
    const channel = peer.createDataChannel('chat', {
      ordered: true
    });

    this.attachDataChannel(participant.participantId, channel);

    const offer = await peer.createOffer();
    await peer.setLocalDescription(offer);

    this.signalingService.send({
      type: 'offer',
      payload: {
        roomId: this.roomId,
        fromParticipantId: this.selfId,
        toParticipantId: participant.participantId,
        sdp: offer
      }
    });
  }

  async applyAnswer(fromParticipantId: string, sdp: RTCSessionDescriptionInit): Promise<void> {
    const peer = this.peers.get(fromParticipantId);
    if (!peer) {
      return;
    }

    await peer.setRemoteDescription(new RTCSessionDescription(sdp));
  }

  async addIceCandidate(fromParticipantId: string, candidate: RTCIceCandidateInit): Promise<void> {
    const peer = this.peers.get(fromParticipantId);
    if (!peer) {
      return;
    }

    await peer.addIceCandidate(new RTCIceCandidate(candidate));
  }

  broadcast(envelope: HostBroadcastEnvelope): void {
    const payload = JSON.stringify(envelope);

    for (const [, channel] of this.channels) {
      if (channel.readyState === 'open') {
        channel.send(payload);
      }
    }
  }

  hasOpenDataChannel(participantId: string): boolean {
    return this.channels.get(participantId)?.readyState === 'open';
  }

  closePeer(participantId: string): void {
    this.channels.get(participantId)?.close();
    this.channels.delete(participantId);

    this.peers.get(participantId)?.close();
    this.peers.delete(participantId);
  }

  destroy(): void {
    for (const participantId of this.peers.keys()) {
      this.closePeer(participantId);
    }
  }

  private createPeerConnection(participantId: string): RTCPeerConnection {
    const peer = new RTCPeerConnection(RTC_CONFIG);
    this.peers.set(participantId, peer);

    peer.onicecandidate = (event) => {
      if (!event.candidate) {
        return;
      }

      this.signalingService.send({
        type: 'ice-candidate',
        payload: {
          roomId: this.roomId,
          fromParticipantId: this.selfId,
          toParticipantId: participantId,
          candidate: event.candidate.toJSON()
        }
      });
    };

    peer.onconnectionstatechange = () => {
      const state = peer.connectionState;
      const status: ParticipantConnectionStatus =
        state === 'connected'
          ? 'connected'
          : state === 'failed'
            ? 'failed'
            : state === 'disconnected' || state === 'closed'
              ? 'disconnected'
              : 'connecting';

      this.events.onPeerConnectionState(participantId, status);

      if (status === 'disconnected' || status === 'failed') {
        this.closePeer(participantId);
      }
    };

    return peer;
  }

  private attachDataChannel(participantId: string, channel: RTCDataChannel): void {
    this.channels.set(participantId, channel);

    channel.onopen = () => {
      this.events.onPeerConnectionState(participantId, 'connected');
    };

    channel.onclose = () => {
      this.events.onPeerConnectionState(participantId, 'disconnected');
    };

    channel.onerror = () => {
      this.events.onPeerConnectionState(participantId, 'failed');
    };

    channel.onmessage = (event) => {
      const parsed = JSON.parse(event.data) as PeerChatEnvelope;
      if (parsed.kind === 'chat-message') {
        this.events.onPeerMessage(participantId, parsed.text);
      }
    };
  }

  buildSystemEnvelope(text: string): HostBroadcastEnvelope {
    return {
      kind: 'system-message',
      message: {
        id: createId('system'),
        type: 'system-message',
        author: 'System',
        authorId: 'system',
        text,
        timestamp: Date.now()
      }
    };
  }
}
