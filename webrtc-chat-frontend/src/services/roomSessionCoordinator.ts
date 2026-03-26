import type { ChatMessage } from '../types/chat';
import type { Participant } from '../types/participant';
import type {
    ErrorPayload,
    IncomingSignalingMessage,
    JoinAcceptedPayload,
    ParticipantDto,
    ParticipantsUpdatedPayload,
    RelayIcePayload,
    RelaySdpPayload,
    RoomCreatedPayload,
    RoomClosedPayload,
} from '../types/signaling';
import { SignalingService } from './signalingService';
import { WebRtcHostService } from './webrtcHostService';
import { WebRtcClientService } from './webrtcClientService';
import { createId } from '../utils/ids';

type StatePatch = {
    roomId?: string | null;
    role?: 'host' | 'client' | null;
    selfParticipant?: Participant | null;
    participants?: Participant[];
    messages?: ChatMessage[];
    signalingState?: 'idle' | 'connecting' | 'connected' | 'disconnected' | 'error';
    roomConnectionState?:
        | 'idle'
        | 'creating-room'
        | 'joining-room'
        | 'waiting-for-peers'
        | 'connecting-peer'
        | 'connected'
        | 'room-closed'
        | 'failed';
    statusText?: string;
    errorText?: string | null;
    screen?: 'home' | 'room';
};

type CoordinatorCallbacks = {
    onStatePatch: (patch: StatePatch | ((prev: any) => StatePatch)) => void;
};

function mapParticipant(dto: ParticipantDto): Participant {
    return {
        participantId: dto.participantId,
        displayName: dto.displayName,
        role: dto.host ? 'host' : 'client',
        connectionStatus: dto.host ? 'connected' : 'connecting',
    };
}

export class RoomSessionCoordinator {
    private signaling: SignalingService;
    private hostService: WebRtcHostService | null = null;
    private clientService: WebRtcClientService | null = null;

    private roomId: string | null = null;
    private role: 'host' | 'client' | null = null;
    private selfParticipant: Participant | null = null;
    private participants: Participant[] = [];
    private hostParticipantId: string | null = null;
    private messages: ChatMessage[] = [];

    constructor(
        signalingUrl: string,
        private readonly callbacks: CoordinatorCallbacks,
    ) {
        this.signaling = new SignalingService(signalingUrl);
        this.bindSignaling();
    }

    async ensureConnected(): Promise<void> {
        this.callbacks.onStatePatch({
            signalingState: 'connecting',
            statusText: 'Connecting to signaling server...',
            errorText: null,
        });

        await this.signaling.connect();
    }

    async createRoom(displayName: string): Promise<void> {
        await this.ensureConnected();

        this.callbacks.onStatePatch({
            roomConnectionState: 'creating-room',
            statusText: 'Creating room...',
            errorText: null,
        });

        this.signaling.send({
            type: 'create-room',
            payload: { displayName },
        });
    }

    async joinRoom(roomId: string, displayName: string): Promise<void> {
        await this.ensureConnected();

        this.callbacks.onStatePatch({
            roomConnectionState: 'joining-room',
            statusText: 'Joining room...',
            errorText: null,
        });

        this.signaling.send({
            type: 'join-room',
            payload: { roomId: roomId.trim().toUpperCase(), displayName },
        });
    }

    sendChatMessage(text: string): void {
        if (!this.selfParticipant || !this.role) {
            return;
        }

        if (this.role === 'host') {
            this.hostService?.sendChatMessage(text);
            return;
        }

        this.clientService?.sendChatMessage(
            this.selfParticipant.participantId,
            this.selfParticipant.displayName,
            text,
        );
    }

    leaveRoom(): void {
        try {
            this.signaling.send({
                type: 'leave-room',
                payload: {},
            });
        } catch {
            // ignore if already disconnected
        }

        this.cleanup();
        this.callbacks.onStatePatch({
            roomId: null,
            role: null,
            selfParticipant: null,
            participants: [],
            messages: [],
            roomConnectionState: 'idle',
            statusText: 'Left room',
            errorText: null,
            screen: 'home',
        });
    }

    destroy(): void {
        this.cleanup();
        this.signaling.disconnect();
    }

    private bindSignaling(): void {
        this.signaling.on({
            open: () => {
                this.callbacks.onStatePatch({
                    signalingState: 'connected',
                    statusText: 'Signaling connected',
                });
            },
            close: () => {
                this.callbacks.onStatePatch((prev: any) => ({
                    signalingState: 'disconnected',
                    statusText: 'Signaling disconnected',
                    roomConnectionState:
                        prev.role || prev.roomId ? 'failed' : prev.roomConnectionState,
                    errorText: prev.role || prev.roomId ? 'Signaling server disconnected' : null,
                }));
            },
            error: () => {
                this.callbacks.onStatePatch({
                    signalingState: 'error',
                    statusText: 'Signaling error',
                    errorText: 'Failed to connect to signaling server',
                });
            },
            message: (message) => {
                void this.handleSignalingMessage(message);
            },
        });
    }

    private async handleSignalingMessage(message: IncomingSignalingMessage): Promise<void> {
        switch (message.type) {
            case 'room-created':
                this.handleRoomCreated(message.payload as RoomCreatedPayload);
                return;
            case 'join-accepted':
                this.handleJoinAccepted(message.payload as JoinAcceptedPayload);
                return;
            case 'participant-joined':
                await this.handleParticipantJoined(
                    (message.payload as any).participant as ParticipantDto,
                );
                return;
            case 'participant-left':
                this.handleParticipantLeft((message.payload as any).participantId as string);
                return;
            case 'participants-updated':
                this.handleParticipantsUpdated(message.payload as ParticipantsUpdatedPayload);
                return;
            case 'offer':
                await this.handleOffer(message.payload as RelaySdpPayload);
                return;
            case 'answer':
                await this.handleAnswer(message.payload as RelaySdpPayload);
                return;
            case 'ice-candidate':
                await this.handleIceCandidate(message.payload as RelayIcePayload);
                return;
            case 'room-closed':
                this.handleRoomClosed(message.payload as RoomClosedPayload);
                return;
            case 'error':
                this.handleError(message.payload as ErrorPayload);
                return;
            default:
                return;
        }
    }

    private handleRoomCreated(payload: RoomCreatedPayload): void {
        const self: Participant = {
            participantId: payload.participantId,
            displayName: 'You',
            role: 'host',
            connectionStatus: 'connected',
        };

        this.roomId = payload.roomId;
        this.role = 'host';
        this.selfParticipant = self;
        this.participants = [self];
        this.messages = [];

        this.hostService = new WebRtcHostService(
            self,
            {
                sendOffer: (targetParticipantId, sdp) => {
                    this.signaling.send({
                        type: 'offer',
                        payload: {
                            roomId: this.roomId!,
                            targetParticipantId,
                            sdp,
                        },
                    });
                },
                sendIceCandidate: (targetParticipantId, candidate) => {
                    this.signaling.send({
                        type: 'ice-candidate',
                        payload: {
                            roomId: this.roomId!,
                            targetParticipantId,
                            candidate,
                        },
                    });
                },
            },
            {
                onParticipantStatus: (participantId, status) => {
                    this.participants = this.participants.map((participant) =>
                        participant.participantId === participantId
                            ? { ...participant, connectionStatus: status }
                            : participant,
                    );
                    this.pushState();
                },
                onChatMessage: (message) => {
                    this.messages = [...this.messages, message];
                    this.pushState();
                },
                onSystemMessage: (message) => {
                    this.messages = [...this.messages, message];
                    this.pushState();
                },
                onBroadcastParticipants: (participants) => {
                    this.participants = participants;
                    this.pushState();
                },
            },
        );

        this.pushState({
            screen: 'room',
            statusText: 'Room created. Waiting for participants...',
            roomConnectionState: 'waiting-for-peers',
        });
    }

    private handleJoinAccepted(payload: JoinAcceptedPayload): void {
        const mapped = payload.participants.map(mapParticipant);
        const me = mapped.find((participant) => participant.participantId === payload.participantId);

        if (!me) {
            throw new Error('Joined participant missing in participant list');
        }

        this.roomId = payload.roomId;
        this.role = 'client';
        this.selfParticipant = {
            ...me,
            connectionStatus: 'connecting',
        };
        this.hostParticipantId = payload.hostParticipantId;
        this.participants = mapped;
        this.messages = [];

        this.clientService = new WebRtcClientService(
            {
                sendAnswer: (targetParticipantId, sdp) => {
                    this.signaling.send({
                        type: 'answer',
                        payload: {
                            roomId: this.roomId!,
                            targetParticipantId,
                            sdp,
                        },
                    });
                },
                sendIceCandidate: (targetParticipantId, candidate) => {
                    this.signaling.send({
                        type: 'ice-candidate',
                        payload: {
                            roomId: this.roomId!,
                            targetParticipantId,
                            candidate,
                        },
                    });
                },
            },
            {
                onConnectionState: (status) => {
                    if (this.selfParticipant) {
                        this.selfParticipant = { ...this.selfParticipant, connectionStatus: status };
                    }

                    this.callbacks.onStatePatch({
                        roomConnectionState: status === 'connected' ? 'connected' : 'connecting-peer',
                        statusText:
                            status === 'connected'
                                ? 'Connected to host'
                                : status === 'failed'
                                    ? 'WebRTC connection failed'
                                    : 'Connecting to host...',
                        errorText: status === 'failed' ? 'WebRTC connection failed' : null,
                    });

                    this.pushState();
                },
                onChatMessage: (message) => {
                    this.messages = [...this.messages, message];
                    this.pushState();
                },
                onSystemMessage: (message) => {
                    this.messages = [...this.messages, message];
                    this.pushState();
                },
                onParticipantsUpdated: (participants) => {
                    this.participants = participants;
                    this.pushState();
                },
            },
        );

        this.pushState({
            screen: 'room',
            statusText: 'Joined room. Waiting for host offer...',
            roomConnectionState: 'connecting-peer',
        });
    }

    private async handleParticipantJoined(dto: ParticipantDto): Promise<void> {
        if (this.role !== 'host' || !this.hostService) {
            return;
        }

        const participant: Participant = {
            participantId: dto.participantId,
            displayName: dto.displayName,
            role: 'client',
            connectionStatus: 'connecting',
        };

        this.participants = [...this.participants.filter((p) => p.participantId !== participant.participantId), participant];
        this.messages = [
            ...this.messages,
            {
                id: createId('sys'),
                type: 'system-message',
                author: 'System',
                authorId: 'system',
                text: `${participant.displayName} is connecting...`,
                timestamp: Date.now(),
            },
        ];
        this.pushState({
            roomConnectionState: 'connecting-peer',
            statusText: `Connecting ${participant.displayName}...`,
        });

        await this.hostService.createPeerForClient(participant);
    }

    private handleParticipantLeft(participantId: string): void {
        const leaving = this.participants.find((p) => p.participantId === participantId);
        this.participants = this.participants.filter((p) => p.participantId !== participantId);

        if (this.role === 'host') {
            this.hostService?.removeParticipant(participantId);
        }

        if (leaving) {
            this.messages = [
                ...this.messages,
                {
                    id: createId('sys'),
                    type: 'system-message',
                    author: 'System',
                    authorId: 'system',
                    text: `${leaving.displayName} left the room`,
                    timestamp: Date.now(),
                },
            ];
        }

        this.pushState({
            statusText: 'Participant left',
        });
    }

    private handleParticipantsUpdated(payload: ParticipantsUpdatedPayload): void {
        const merged = payload.participants.map((dto) => {
            const existing = this.participants.find((p) => p.participantId === dto.participantId);
            return {
                participantId: dto.participantId,
                displayName: dto.displayName,
                role: dto.host ? 'host' : 'client',
                connectionStatus: existing?.connectionStatus ?? (dto.host ? 'connected' : 'connecting'),
            } as Participant;
        });

        this.participants = merged;
        this.hostService?.upsertParticipants(merged);
        this.pushState();
    }

    private async handleOffer(payload: RelaySdpPayload): Promise<void> {
        if (this.role !== 'client' || !this.clientService) {
            return;
        }

        await this.clientService.handleOffer(payload.fromParticipantId!, payload.sdp);
    }

    private async handleAnswer(payload: RelaySdpPayload): Promise<void> {
        if (this.role !== 'host' || !this.hostService) {
            return;
        }

        await this.hostService.handleAnswer(payload.fromParticipantId!, payload.sdp);
        this.pushState({
            roomConnectionState: 'connected',
            statusText: 'Peer connected',
        });
    }

    private async handleIceCandidate(payload: RelayIcePayload): Promise<void> {
        if (this.role === 'host' && this.hostService) {
            await this.hostService.addIceCandidate(payload.fromParticipantId!, payload.candidate);
            return;
        }

        if (this.role === 'client' && this.clientService) {
            await this.clientService.addIceCandidate(payload.candidate);
        }
    }

    private handleRoomClosed(payload: RoomClosedPayload): void {
        this.messages = [
            ...this.messages,
            {
                id: createId('sys'),
                type: 'system-message',
                author: 'System',
                authorId: 'system',
                text: payload.reason || 'Room closed',
                timestamp: Date.now(),
            },
        ];

        this.pushState({
            roomConnectionState: 'room-closed',
            statusText: 'Room closed',
            errorText: payload.reason,
        });
    }

    private handleError(payload: ErrorPayload): void {
        this.pushState({
            errorText: payload.message,
            roomConnectionState: 'failed',
            statusText: 'Operation failed',
        });
    }

    private pushState(patch?: StatePatch): void {
        this.callbacks.onStatePatch({
            roomId: this.roomId,
            role: this.role,
            selfParticipant: this.selfParticipant,
            participants: this.participants,
            messages: this.messages,
            ...patch,
        });
    }

    private cleanup(): void {
        this.hostService?.destroy();
        this.clientService?.destroy();
        this.hostService = null;
        this.clientService = null;
        this.roomId = null;
        this.role = null;
        this.selfParticipant = null;
        this.participants = [];
        this.messages = [];
        this.hostParticipantId = null;
    }
}