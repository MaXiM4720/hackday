import type { HostBroadcastEnvelope, PeerChatEnvelope } from '../types/chat';
import type { ParticipantConnectionStatus } from '../types/participant';
import type { SignalingService } from './signalingService';

const RTC_CONFIG: RTCConfiguration = {
  iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
  // TODO: add TURN relay fallback for production connectivity.
};

interface ClientServiceEvents {
  onHostEnvelope: (envelope: HostBroadcastEnvelope) => void;
  onConnectionState: (status: ParticipantConnectionStatus) => void;
}

export class WebRtcClientService {
  private readonly roomId: string;
  private readonly selfId: string;
  private readonly hostId: string;
  private readonly signalingService: SignalingService;
  private readonly events: ClientServiceEvents;
  private peer: RTCPeerConnection | null = null;
  private channel: RTCDataChannel | null = null;

  constructor(args: {
    roomId: string;
    selfId: string;
    hostId: string;
    signalingService: SignalingService;
    events: ClientServiceEvents;
  }) {
    this.roomId = args.roomId;
    this.selfId = args.selfId;
    this.hostId = args.hostId;
    this.signalingService = args.signalingService;
    this.events = args.events;
  }

  async handleOffer(sdp: RTCSessionDescriptionInit): Promise<RTCSessionDescriptionInit> {
    const peer = this.ensurePeer();
    await peer.setRemoteDescription(new RTCSessionDescription(sdp));

    const answer = await peer.createAnswer();
    await peer.setLocalDescription(answer);
    return answer;
  }

  async addIceCandidate(candidate: RTCIceCandidateInit): Promise<void> {
    const peer = this.ensurePeer();
    await peer.addIceCandidate(new RTCIceCandidate(candidate));
  }

  sendChat(text: string): void {
    if (!this.channel || this.channel.readyState !== 'open') {
      throw new Error('Data channel is not open yet.');
    }

    const payload: PeerChatEnvelope = {
      kind: 'chat-message',
      text
    };

    this.channel.send(JSON.stringify(payload));
  }

  isOpen(): boolean {
    return this.channel?.readyState === 'open';
  }

  destroy(): void {
    this.channel?.close();
    this.peer?.close();
    this.channel = null;
    this.peer = null;
  }

  private ensurePeer(): RTCPeerConnection {
    if (this.peer) {
      return this.peer;
    }

    const peer = new RTCPeerConnection(RTC_CONFIG);

    peer.onicecandidate = (event) => {
      if (!event.candidate) {
        return;
      }

      this.signalingService.send({
        type: 'ice-candidate',
        payload: {
          roomId: this.roomId,
          fromParticipantId: this.selfId,
          toParticipantId: this.hostId,
          candidate: event.candidate.toJSON()
        }
      });
    };

    peer.ondatachannel = (event) => {
      this.attachDataChannel(event.channel);
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

      this.events.onConnectionState(status);
    };

    this.peer = peer;
    return peer;
  }

  private attachDataChannel(channel: RTCDataChannel): void {
    this.channel = channel;

    channel.onopen = () => {
      this.events.onConnectionState('connected');
    };

    channel.onclose = () => {
      this.events.onConnectionState('disconnected');
    };

    channel.onerror = () => {
      this.events.onConnectionState('failed');
    };

    channel.onmessage = (event) => {
      const parsed = JSON.parse(event.data) as HostBroadcastEnvelope;
      this.events.onHostEnvelope(parsed);
    };
  }
}
