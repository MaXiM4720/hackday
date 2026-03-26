import type { SignalingMessage } from '../types/signaling';

type ConnectionState = 'idle' | 'connecting' | 'connected' | 'disconnected' | 'error';

type MessageHandler = (message: SignalingMessage) => void;
type StateHandler = (state: ConnectionState) => void;

export class SignalingService {
  private socket: WebSocket | null = null;
  private readonly url: string;
  private readonly messageHandlers = new Set<MessageHandler>();
  private readonly stateHandlers = new Set<StateHandler>();
  private connectionPromise: Promise<void> | null = null;
  private state: ConnectionState = 'idle';

  constructor(url: string) {
    this.url = url;
  }

  getState(): ConnectionState {
    return this.state;
  }

  async connect(): Promise<void> {
    if (this.socket?.readyState === WebSocket.OPEN) {
      return;
    }

    if (this.connectionPromise) {
      return this.connectionPromise;
    }

    this.setState('connecting');

    this.connectionPromise = new Promise<void>((resolve, reject) => {
      const socket = new WebSocket(this.url);
      this.socket = socket;

      socket.onopen = () => {
        this.setState('connected');
        resolve();
      };

      socket.onerror = () => {
        this.setState('error');
        reject(new Error('Failed to connect to signaling server.'));
      };

      socket.onclose = () => {
        this.connectionPromise = null;
        this.setState('disconnected');
      };

      socket.onmessage = (event) => {
        const parsed = JSON.parse(event.data) as SignalingMessage;
        this.messageHandlers.forEach((handler) => handler(parsed));
      };
    }).finally(() => {
      this.connectionPromise = null;
    });

    return this.connectionPromise;
  }

  send(message: SignalingMessage): void {
    if (!this.socket || this.socket.readyState !== WebSocket.OPEN) {
      throw new Error('Signaling socket is not connected.');
    }

    this.socket.send(JSON.stringify(message));
  }

  disconnect(): void {
    this.socket?.close();
    this.socket = null;
  }

  onMessage(handler: MessageHandler): () => void {
    this.messageHandlers.add(handler);
    return () => this.messageHandlers.delete(handler);
  }

  onStateChange(handler: StateHandler): () => void {
    this.stateHandlers.add(handler);
    handler(this.state);
    return () => this.stateHandlers.delete(handler);
  }

  private setState(state: ConnectionState): void {
    this.state = state;
    this.stateHandlers.forEach((handler) => handler(state));
  }
}
