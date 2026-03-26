import type { ChatMessage } from '../types/chat';
import type { Participant } from '../types/participant';
import type { DataChannelEnvelope } from '../types/transport';
import { createId } from '../utils/ids';

export interface HostSignalingBridge {
    sendOffer: (targetParticipantId: string, sdp: RTCSessionDescriptionInit) => void;
    sendIceCandidate: (targetParticipantId: string, candidate: RTCIceCandidateInit) => void;
}

type HostCallbacks = {
    onParticipantStatus: (participantId: string, status: Participant['connectionStatus']) => void;
    onChatMessage: (message: ChatMessage) => void;
    onSystemMessage: (message: ChatMessage) => void;
    onBroadcastParticipants: (participants: Participant[]) => void;
};

const RTC_CONFIG: RTCConfiguration = {
    iceServers: [{ urls: 'stun:stun.l.google.com:19302' }],
};

export class WebRtcHostService {
    private peers = new Map<string, RTCPeerConnection>();
    private channels = new Map<string, RTCDataChannel>();
    private participants = new Map<string, Participant>();

    constructor(
        private readonly selfParticipant: Participant,
        private readonly bridge: HostSignalingBridge,
        private readonly callbacks: HostCallbacks,
    ) {
        this.participants.set(selfParticipant.participantId, selfParticipant);
    }

    upsertParticipants(participants: Participant[]): void {
        this.participants.clear();
        participants.forEach((p) => this.participants.set(p.participantId, p));
        this.callbacks.onBroadcastParticipants(this.snapshotParticipants());
    }

    async createPeerForClient(participant: Participant): Promise<void> {
        this.participants.set(participant.participantId, participant);

        const peer = new RTCPeerConnection(RTC_CONFIG);
        this.peers.set(participant.participantId, peer);

        this.bindPeerEvents(peer, participant.participantId);

        const channel = peer.createDataChannel(`chat-${participant.participantId}`, {
            ordered: true,
        });
        this.bindDataChannel(participant.participantId, channel);

        const offer = await peer.createOffer();
        await peer.setLocalDescription(offer);

        if (!peer.localDescription) {
            throw new Error('Host localDescription missing after offer');
        }

        this.bridge.sendOffer(participant.participantId, peer.localDescription);
        this.callbacks.onParticipantStatus(participant.participantId, 'connecting');
    }

    async handleAnswer(
        sourceParticipantId: string,
        sdp: RTCSessionDescriptionInit,
    ): Promise<void> {
        const peer = this.peers.get(sourceParticipantId);
        if (!peer) {
            throw new Error(`Missing peer for participant ${sourceParticipantId}`);
        }

        await peer.setRemoteDescription(new RTCSessionDescription(sdp));
    }

    async addIceCandidate(
        sourceParticipantId: string,
        candidate: RTCIceCandidateInit,
    ): Promise<void> {
        const peer = this.peers.get(sourceParticipantId);
        if (!peer) {
            throw new Error(`Missing peer for participant ${sourceParticipantId}`);
        }

        await peer.addIceCandidate(new RTCIceCandidate(candidate));
    }

    sendChatMessage(text: string): void {
        const message: ChatMessage = {
            id: createId('msg'),
            type: 'chat-message',
            author: this.selfParticipant.displayName,
            authorId: this.selfParticipant.participantId,
            text,
            timestamp: Date.now(),
        };

        this.callbacks.onChatMessage(message);
        this.broadcastEnvelope({
            type: 'chat-message',
            payload: {
                id: message.id,
                author: message.author,
                authorId: message.authorId,
                text: message.text,
                timestamp: message.timestamp,
            },
        });
    }

    broadcastParticipants(): void {
        const participants = this.snapshotParticipants();
        this.callbacks.onBroadcastParticipants(participants);
        this.broadcastEnvelope({
            type: 'participant-list',
            payload: {
                participants,
            },
        });
    }

    broadcastSystemMessage(text: string): void {
        const message: ChatMessage = {
            id: createId('sys'),
            type: 'system-message',
            author: 'System',
            authorId: 'system',
            text,
            timestamp: Date.now(),
        };

        this.callbacks.onSystemMessage(message);
        this.broadcastEnvelope({
            type: 'system-message',
            payload: message,
        });
    }

    removeParticipant(participantId: string): void {
        this.channels.get(participantId)?.close();
        this.peers.get(participantId)?.close();
        this.channels.delete(participantId);
        this.peers.delete(participantId);
        this.participants.delete(participantId);
        this.callbacks.onParticipantStatus(participantId, 'disconnected');
        this.broadcastParticipants();
    }

    destroy(): void {
        this.channels.forEach((channel) => channel.close());
        this.peers.forEach((peer) => peer.close());
        this.channels.clear();
        this.peers.clear();
        this.participants.clear();
    }

    private bindPeerEvents(peer: RTCPeerConnection, participantId: string): void {
        peer.onicecandidate = (event) => {
            if (event.candidate) {
                this.bridge.sendIceCandidate(participantId, event.candidate.toJSON());
            }
        };

        peer.onconnectionstatechange = () => {
            const state = peer.connectionState;
            if (state === 'connected') {
                this.callbacks.onParticipantStatus(participantId, 'connected');
            } else if (state === 'failed') {
                this.callbacks.onParticipantStatus(participantId, 'failed');
            } else if (state === 'disconnected' || state === 'closed') {
                this.callbacks.onParticipantStatus(participantId, 'disconnected');
            }
        };
    }

    private bindDataChannel(participantId: string, channel: RTCDataChannel): void {
        this.channels.set(participantId, channel);

        channel.onopen = () => {
            this.callbacks.onParticipantStatus(participantId, 'connected');
            this.broadcastParticipants();
            const joined = this.participants.get(participantId);
            if (joined) {
                this.broadcastSystemMessage(`${joined.displayName} joined the room`);
            }
        };

        channel.onclose = () => {
            this.callbacks.onParticipantStatus(participantId, 'disconnected');
        };

        channel.onerror = () => {
            this.callbacks.onParticipantStatus(participantId, 'failed');
        };

        channel.onmessage = (event) => {
            try {
                const parsed = JSON.parse(event.data) as DataChannelEnvelope;
                if (parsed.type !== 'chat-message') {
                    return;
                }

                const author = this.participants.get(participantId);
                if (!author) {
                    return;
                }

                const normalized: ChatMessage = {
                    id: createId('msg'),
                    type: 'chat-message',
                    author: author.displayName,
                    authorId: author.participantId,
                    text: parsed.payload.text,
                    timestamp: Date.now(),
                };

                this.callbacks.onChatMessage(normalized);

                this.broadcastEnvelope({
                    type: 'chat-message',
                    payload: {
                        id: normalized.id,
                        author: normalized.author,
                        authorId: normalized.authorId,
                        text: normalized.text,
                        timestamp: normalized.timestamp,
                    },
                });
            } catch (error) {
                console.error('Host failed to parse data channel message', error);
            }
        };
    }

    private broadcastEnvelope(envelope: DataChannelEnvelope): void {
        const raw = JSON.stringify(envelope);
        this.channels.forEach((channel) => {
            if (channel.readyState === 'open') {
                channel.send(raw);
            }
        });
    }

    private snapshotParticipants(): Participant[] {
        return Array.from(this.participants.values());
    }
}