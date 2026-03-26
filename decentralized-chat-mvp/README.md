# Decentralized Chat MVP Frontend

A Vite + React + TypeScript frontend for a host-based decentralized text chat.

## What it does

- Connects to a Java Spring signaling/discovery server over WebSocket
- Lets a user create a room and become host
- Lets another user join a room as client
- Uses WebRTC DataChannel for chat traffic
- Keeps host as the room relay and coordinator
- Does not route normal chat messages through the backend

## Expected signaling backend behavior

The backend should accept JSON WebSocket envelopes with the message shapes defined in `src/types/signaling.ts`.

The backend should:
- create rooms
- map `roomId -> host`
- forward `offer`, `answer`, and `ice-candidate`
- emit `participant-joined`, `participant-left`, `room-closed`, and `error`

## Run locally

1. Install dependencies:
   ```bash
   npm install
   ```
2. Copy env file:
   ```bash
   cp .env.example .env
   ```
3. Set your signaling server URL in `.env`:
   ```env
   VITE_SIGNALING_URL=ws://localhost:8080/ws
   ```
4. Start the dev server:
   ```bash
   npm run dev
   ```
5. Open the printed Vite URL, usually `http://localhost:5173`.

## Build

```bash
npm run build
npm run preview
```

## Notes

- STUN is configured for MVP via Google's public STUN server.
- TURN is intentionally left as a future improvement.
- Chat history is only in memory on the host.
- No authentication, persistence, host migration, or reconnection state recovery is included.
