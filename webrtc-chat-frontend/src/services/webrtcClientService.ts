import type { ChatMessage } from '../types/chat';
import type { Participant } from '../types/participant';
import type { DataChannelEnvelope } from '../types/transport';

export interface ClientSignalingBridge {
    sendAnswer: (targetParticipantId: string, sdp: RTCSessionDescriptionInit) => void;
    sendIceCandidate: (targetParticipantId: string, candidate: RTCIceCandidateInit) => void;
}

type ClientCallbacks = {
    onConnectionState: (status: Participant['connectionStatus']) => void;
    onChatMessage: (message: ChatMessage) => void;
    onSystemMessage: (message: ChatMessage) => void;
    onParticipantsUpdated: (participants: Participant[]) => void;
};

const RTC_CONFIG: RTCConfiguration = {
    iceServers: [{ urls: 'stun:stun.l.google.com:19302' }],
};

export class WebRtcClientService {
    private peer: RTCPeerConnection | null = null;
    private channel: RTCDataChannel | null = null;
    private hostParticipantId: string | null = null;

    constructor(
        private readonly bridge: ClientSignalingBridge,
        private readonly callbacks: ClientCallbacks,
    ) {}

    async handleOffer(
        sourceParticipantId: string,
        sdp: RTCSessionDescriptionInit,
    ): Promise<void> {
        this.hostParticipantId = sourceParticipantId;
        this.peer = new RTCPeerConnection(RTC_CONFIG);
        this.bindPeerEvents(this.peer);

        this.peer.ondatachannel = (event) => {
            this.channel = event.channel;
            this.bindChannel(this.channel);
        };

        await this.peer.setRemoteDescription(new RTCSessionDescription(sdp));

        const answer = await this.peer.createAnswer();
        await this.peer.setLocalDescription(answer);

        if (!this.peer.localDescription) {
            throw new Error('Client localDescription missing after answer');
        }

        this.bridge.sendAnswer(sourceParticipantId, this.peer.localDescription);
    }

    async addIceCandidate(candidate: RTCIceCandidateInit): Promise<void> {
        if (!this.peer) {
            throw new Error('Client peer is not initialized');
        }

        await this.peer.addIceCandidate(new RTCIceCandidate(candidate));
    }

    sendChatMessage(
        authorId: string,
        author: string,
        text: string,
    ): void {
        if (!this.channel || this.channel.readyState !== 'open') {
            throw new Error('Data channel is not open');
        }

        this.channel.send(
            JSON.stringify({
                type: 'chat-message',
                payload: {
                    id: `client-local-${Date.now()}`,
                    authorId,
                    author,
                    text,
                    timestamp: Date.now(),
                },
            }),
        );
    }

    destroy(): void {
        this.channel?.close();
        this.peer?.close();
        this.channel = null;
        this.peer = null;
        this.hostParticipantId = null;
    }

    private bindPeerEvents(peer: RTCPeerConnection): void {
        peer.onicecandidate = (event) => {
            if (event.candidate && this.hostParticipantId) {
                this.bridge.sendIceCandidate(this.hostParticipantId, event.candidate.toJSON());
            }
        };

        peer.onconnectionstatechange = () => {
            const state = peer.connectionState;
            if (state === 'connected') {
                this.callbacks.onConnectionState('connected');
            } else if (state === 'failed') {
                this.callbacks.onConnectionState('failed');
            } else if (state === 'disconnected' || state === 'closed') {
                this.callbacks.onConnectionState('disconnected');
            } else {
                this.callbacks.onConnectionState('connecting');
            }
        };
    }

    private bindChannel(channel: RTCDataChannel): void {
        channel.onopen = () => {
            this.callbacks.onConnectionState('connected');
        };

        channel.onclose = () => {
            this.callbacks.onConnectionState('disconnected');
        };

        channel.onerror = () => {
            this.callbacks.onConnectionState('failed');
        };

        channel.onmessage = (event) => {
            try {
                const parsed = JSON.parse(event.data) as DataChannelEnvelope;

                if (parsed.type === 'chat-message') {
                    this.callbacks.onChatMessage({
                        id: parsed.payload.id,
                        type: 'chat-message',
                        author: parsed.payload.author,
                        authorId: parsed.payload.authorId,
                        text: parsed.payload.text,
                        timestamp: parsed.payload.timestamp,
                    });
                } else if (parsed.type === 'system-message') {
                    this.callbacks.onSystemMessage(parsed.payload);
                } else if (parsed.type === 'participant-list') {
                    this.callbacks.onParticipantsUpdated(parsed.payload.participants);
                }
            } catch (error) {
                console.error('Client failed to parse data channel payload', error);
            }
        };
    }
}