package org.example.hackday.handler;

import org.example.hackday.exception.RoomNotFoundException;
import org.example.hackday.exception.SignalingException;
import org.example.hackday.exception.ValidationException;
import org.example.hackday.model.Participant;
import org.example.hackday.model.Room;
import org.example.hackday.model.SessionContext;
import org.example.hackday.model.message.*;
import org.example.hackday.service.RoomService;
import org.example.hackday.service.SessionRegistry;
import org.example.hackday.service.SignalingMessageFactory;
import org.example.hackday.service.SignalingRouter;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.annotation.Nonnull;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.CloseStatus;
import org.springframework.web.socket.TextMessage;
import org.springframework.web.socket.WebSocketSession;
import org.springframework.web.socket.handler.TextWebSocketHandler;

@Component
public class SignalingWebSocketHandler extends TextWebSocketHandler {

    private static final Logger log = LoggerFactory.getLogger(SignalingWebSocketHandler.class);

    private final ObjectMapper objectMapper;
    private final SessionRegistry sessionRegistry;
    private final RoomService roomService;
    private final SignalingRouter signalingRouter;
    private final SignalingMessageFactory messageFactory;

    public SignalingWebSocketHandler(
            ObjectMapper objectMapper,
            SessionRegistry sessionRegistry,
            RoomService roomService,
            SignalingRouter signalingRouter,
            SignalingMessageFactory messageFactory
    ) {
        this.objectMapper = objectMapper;
        this.sessionRegistry = sessionRegistry;
        this.roomService = roomService;
        this.signalingRouter = signalingRouter;
        this.messageFactory = messageFactory;
    }

    @Override
    public void afterConnectionEstablished(@Nonnull WebSocketSession session) {
        sessionRegistry.register(session);
        log.info("WebSocket connected: sessionId={}", session.getId());
    }

    @Override
    protected void handleTextMessage(@Nonnull WebSocketSession session, TextMessage message) {
        try {
            JsonNode root = objectMapper.readTree(message.getPayload());
            String type = requiredText(root, "type");
            JsonNode payloadNode = root.path("payload");

            switch (type) {
                case "create-room" -> handleCreateRoom(session, payloadNode);
                case "join-room" -> handleJoinRoom(session, payloadNode);
                case "offer" -> handleOffer(session, payloadNode);
                case "answer" -> handleAnswer(session, payloadNode);
                case "ice-candidate" -> handleIceCandidate(session, payloadNode);
                case "leave-room" -> handleLeaveRoom(session);
                case "ping" -> handlePing(session, payloadNode);
                default -> throw new ValidationException("Unsupported message type: " + type);
            }
        } catch (SignalingException e) {
            log.warn("Business error for session {}: {}", session.getId(), e.getMessage());
            safeSend(session, messageFactory.error("BAD_REQUEST", e.getMessage()));
        } catch (JsonProcessingException e) {
            log.warn("Malformed JSON from session {}", session.getId(), e);
            safeSend(session, messageFactory.error("INVALID_JSON", "Malformed JSON payload"));
        } catch (Exception e) {
            log.error("Unexpected error in websocket handler for session {}", session.getId(), e);
            safeSend(session, messageFactory.error("INTERNAL_ERROR", "Unexpected server error"));
        }
    }

    @Override
    public void afterConnectionClosed(@Nonnull WebSocketSession session, @Nonnull CloseStatus status) {
        log.info("WebSocket disconnected: sessionId={}, status={}", session.getId(), status);
        handleSessionDisconnect(session.getId());
        sessionRegistry.unregister(session.getId());
    }

    @Override
    public void handleTransportError(@Nonnull WebSocketSession session, @Nonnull Throwable exception) {
        log.warn("Transport error for session {}", session.getId(), exception);
        handleSessionDisconnect(session.getId());
        sessionRegistry.unregister(session.getId());
        try {
            session.close(CloseStatus.SERVER_ERROR);
        } catch (Exception ignored) {
        }
    }

    private void handleCreateRoom(WebSocketSession session, JsonNode payloadNode) {
        CreateRoomPayload payload = fromPayload(payloadNode, CreateRoomPayload.class);

        SessionContext context = sessionRegistry.requireContext(session.getId());
        if (context.isJoined()) {
            throw new ValidationException("Session already belongs to a room");
        }

        Room room = roomService.createRoom(session.getId(), payload.getDisplayName());

        context.setRoomId(room.getRoomId());
        context.setParticipantId(room.getHost().getParticipantId());
        context.setHost(true);

        safeSend(session, messageFactory.roomCreated(room));
        safeSend(session, messageFactory.participantsUpdated(room));
    }

    private void handleJoinRoom(WebSocketSession session, JsonNode payloadNode) {
        JoinRoomPayload payload = fromPayload(payloadNode, JoinRoomPayload.class);

        SessionContext context = sessionRegistry.requireContext(session.getId());
        if (context.isJoined()) {
            throw new ValidationException("Session already belongs to a room");
        }

        Participant participant = roomService.joinRoom(payload.getRoomId(), session.getId(), payload.getDisplayName());
        Room room = roomService.getRoom(payload.getRoomId());

        context.setRoomId(room.getRoomId());
        context.setParticipantId(participant.getParticipantId());
        context.setHost(false);

        safeSend(session, messageFactory.joinAccepted(room, participant));
        signalingRouter.sendToSession(room.getHost().getSessionId(), messageFactory.participantJoined(participant));

        broadcastParticipantsUpdated(room);
    }

    private void handleOffer(WebSocketSession session, JsonNode payloadNode) {
        SignalingRelayPayload payload = fromPayload(payloadNode, SignalingRelayPayload.class);
        signalingRouter.routeOffer(session.getId(), payload);
    }

    private void handleAnswer(WebSocketSession session, JsonNode payloadNode) {
        SignalingRelayPayload payload = fromPayload(payloadNode, SignalingRelayPayload.class);
        signalingRouter.routeAnswer(session.getId(), payload);
    }

    private void handleIceCandidate(WebSocketSession session, JsonNode payloadNode) {
        IceCandidatePayload payload = fromPayload(payloadNode, IceCandidatePayload.class);
        signalingRouter.routeIceCandidate(session.getId(), payload);
    }

    private void handleLeaveRoom(WebSocketSession session) {
        handleExplicitLeave(session.getId());
    }

    private void handlePing(WebSocketSession session, JsonNode payloadNode) {
        PingPayload payload = fromPayload(payloadNode, PingPayload.class);
        safeSend(session, messageFactory.pong(payload == null ? null : payload.getTimestamp()));
    }

    private void handleExplicitLeave(String sessionId) {
        SessionContext context = sessionRegistry.requireContext(sessionId);
        if (!context.isJoined()) {
            return;
        }

        if (context.isHost()) {
            Room closedRoom = roomService.closeRoomByHostSession(sessionId);
            context.clearRoomBinding();

            if (closedRoom != null) {
                closedRoom.getParticipants().stream()
                        .filter(participant -> !participant.isHost())
                        .forEach(participant -> signalingRouter.sendToSession(
                                participant.getSessionId(),
                                messageFactory.roomClosed(closedRoom.getRoomId(), "Host left the room")
                        ));
            }
            return;
        }

        Room room = roomService.findRoomBySessionId(sessionId);
        Participant removed = roomService.removeParticipant(sessionId);
        context.clearRoomBinding();

        if (room != null && removed != null) {
            signalingRouter.sendToSession(room.getHost().getSessionId(), messageFactory.participantLeft(removed.getParticipantId()));
            broadcastParticipantsUpdated(room);
        }
    }

    private void handleSessionDisconnect(String sessionId) {
        SessionContext context = sessionRegistry.getContext(sessionId).orElse(null);
        if (context == null || !context.isJoined()) {
            return;
        }

        if (context.isHost()) {
            Room closedRoom = roomService.closeRoomByHostSession(sessionId);
            if (closedRoom != null) {
                closedRoom.getParticipants().stream()
                        .filter(participant -> !participant.isHost())
                        .forEach(participant -> signalingRouter.sendToSession(
                                participant.getSessionId(),
                                messageFactory.roomClosed(closedRoom.getRoomId(), "Host disconnected")
                        ));
            }
            context.clearRoomBinding();
            return;
        }

        Room room = roomService.findRoomBySessionId(sessionId);
        Participant removed = roomService.removeParticipant(sessionId);
        context.clearRoomBinding();

        if (room != null && removed != null) {
            signalingRouter.sendToSession(room.getHost().getSessionId(), messageFactory.participantLeft(removed.getParticipantId()));
            broadcastParticipantsUpdated(room);
        }
    }

    private void broadcastParticipantsUpdated(Room room) {
        BaseMessage message = messageFactory.participantsUpdated(room);
        room.getParticipants().forEach(participant ->
                signalingRouter.sendToSession(participant.getSessionId(), message)
        );
    }

    private <T> T fromPayload(JsonNode payloadNode, Class<T> type) {
        if (payloadNode == null || payloadNode.isMissingNode() || payloadNode.isNull()) {
            try {
                return type.getDeclaredConstructor().newInstance();
            } catch (Exception e) {
                throw new ValidationException("Payload is required");
            }
        }
        return objectMapper.convertValue(payloadNode, type);
    }

    private String requiredText(JsonNode node, String fieldName) {
        JsonNode value = node.get(fieldName);
        if (value == null || value.isNull() || value.asText().isBlank()) {
            throw new ValidationException(fieldName + " is required");
        }
        return value.asText();
    }

    private void safeSend(WebSocketSession session, BaseMessage message) {
        try {
            if (session.isOpen()) {
                synchronized (session) {
                    session.sendMessage(new TextMessage(objectMapper.writeValueAsString(message)));
                }
            }
        } catch (Exception e) {
            log.warn("Failed to send message to session {}", session.getId(), e);
        }
    }
}
