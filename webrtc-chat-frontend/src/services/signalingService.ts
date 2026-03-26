import type {
    IncomingSignalingMessage,
    SignalingEnvelope,
} from '../types/signaling';

type EventHandlers = {
    open?: () => void;
    close?: () => void;
    error?: () => void;
    message?: (message: IncomingSignalingMessage) => void;
};

export class SignalingService {
    private socket: WebSocket | null = null;
    private handlers: EventHandlers = {};
    private readonly url: string;

    constructor(url: string) {
        this.url = url;
    }

    connect(): Promise<void> {
        if (this.socket && this.socket.readyState === WebSocket.OPEN) {
            return Promise.resolve();
        }

        if (this.socket && this.socket.readyState === WebSocket.CONNECTING) {
            return new Promise((resolve, reject) => {
                const check = window.setInterval(() => {
                    if (!this.socket) {
                        window.clearInterval(check);
                        reject(new Error('WebSocket was cleared'));
                        return;
                    }

                    if (this.socket.readyState === WebSocket.OPEN) {
                        window.clearInterval(check);
                        resolve();
                    }

                    if (
                        this.socket.readyState === WebSocket.CLOSING ||
                        this.socket.readyState === WebSocket.CLOSED
                    ) {
                        window.clearInterval(check);
                        reject(new Error('WebSocket closed during connect'));
                    }
                }, 50);
            });
        }

        return new Promise((resolve, reject) => {
            const socket = new WebSocket(this.url);
            this.socket = socket;

            socket.onopen = () => {
                this.handlers.open?.();
                resolve();
            };

            socket.onclose = () => {
                this.handlers.close?.();
            };

            socket.onerror = () => {
                this.handlers.error?.();
                reject(new Error('WebSocket connection error'));
            };

            socket.onmessage = (event: MessageEvent<string>) => {
                try {
                    const parsed = JSON.parse(event.data) as IncomingSignalingMessage;
                    this.handlers.message?.(parsed);
                } catch (error) {
                    console.error('Failed to parse signaling message', error);
                }
            };
        });
    }

    on(handlers: EventHandlers): void {
        this.handlers = handlers;
    }

    send<T>(message: SignalingEnvelope<T>): void {
        if (!this.socket || this.socket.readyState !== WebSocket.OPEN) {
            throw new Error('Signaling socket is not connected');
        }
        this.socket.send(JSON.stringify(message));
    }

    disconnect(): void {
        if (this.socket) {
            this.socket.close();
            this.socket = null;
        }
    }

    isConnected(): boolean {
        return this.socket?.readyState === WebSocket.OPEN;
    }
}