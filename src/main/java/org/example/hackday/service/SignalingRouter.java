package org.example.hackday.service;

import org.example.hackday.exception.ValidationException;
import org.example.hackday.model.Participant;
import org.example.hackday.model.Room;
import org.example.hackday.model.message.BaseMessage;
import org.example.hackday.model.message.IceCandidatePayload;
import org.example.hackday.model.message.SignalingRelayPayload;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.web.socket.TextMessage;
import org.springframework.web.socket.WebSocketSession;

import java.io.IOException;

@Service
public class SignalingRouter {

    private static final Logger log = LoggerFactory.getLogger(SignalingRouter.class);

    private final RoomService roomService;
    private final SessionRegistry sessionRegistry;
    private final ObjectMapper objectMapper;

    public SignalingRouter(RoomService roomService, SessionRegistry sessionRegistry, ObjectMapper objectMapper) {
        this.roomService = roomService;
        this.sessionRegistry = sessionRegistry;
        this.objectMapper = objectMapper;
    }

    public void routeOffer(String sourceSessionId, SignalingRelayPayload payload) {
        routeSdp("offer", sourceSessionId, payload);
    }

    public void routeAnswer(String sourceSessionId, SignalingRelayPayload payload) {
        routeSdp("answer", sourceSessionId, payload);
    }

    public void routeIceCandidate(String sourceSessionId, IceCandidatePayload payload) {
        Room room = roomService.getRoom(payload.getRoomId());
        Participant source = room.getParticipantBySessionId(sourceSessionId);
        if (source == null) {
            throw new ValidationException("Source participant is not in room");
        }

        Participant target = room.getParticipantById(payload.getTargetParticipantId());
        if (target == null) {
            throw new ValidationException("Target participant not found in room");
        }

        validateStarTopology(room, source, target);

        IceCandidatePayload outbound = new IceCandidatePayload();
        outbound.setRoomId(room.getRoomId());
        outbound.setFromParticipantId(source.getParticipantId());
        outbound.setTargetParticipantId(target.getParticipantId());
        outbound.setCandidate(payload.getCandidate());

        sendToSession(target.getSessionId(), new BaseMessage("ice-candidate", outbound));
    }

    private void routeSdp(String type, String sourceSessionId, SignalingRelayPayload payload) {
        Room room = roomService.getRoom(payload.getRoomId());
        Participant source = room.getParticipantBySessionId(sourceSessionId);
        if (source == null) {
            throw new ValidationException("Source participant is not in room");
        }

        Participant target = room.getParticipantById(payload.getTargetParticipantId());
        if (target == null) {
            throw new ValidationException("Target participant not found in room");
        }

        validateStarTopology(room, source, target);

        SignalingRelayPayload outbound = new SignalingRelayPayload();
        outbound.setRoomId(room.getRoomId());
        outbound.setFromParticipantId(source.getParticipantId());
        outbound.setTargetParticipantId(target.getParticipantId());
        outbound.setSdp(payload.getSdp());

        sendToSession(target.getSessionId(), new BaseMessage(type, outbound));
    }

    private void validateStarTopology(Room room, Participant source, Participant target) {
        boolean sourceIsHost = source.getParticipantId().equals(room.getHost().getParticipantId());
        boolean targetIsHost = target.getParticipantId().equals(room.getHost().getParticipantId());

        if (sourceIsHost == targetIsHost) {
            throw new ValidationException("Signaling must be routed only between host and a single client");
        }
    }

    public void sendToSession(String sessionId, BaseMessage message) {
        WebSocketSession session = sessionRegistry.getSession(sessionId)
                .orElseThrow(() -> new ValidationException("Target session not connected"));

        if (!session.isOpen()) {
            throw new ValidationException("Target session is closed");
        }

        try {
            synchronized (session) {
                session.sendMessage(new TextMessage(objectMapper.writeValueAsString(message)));
            }
        } catch (IOException e) {
            log.warn("Failed to send WebSocket message to session {}", sessionId, e);
            throw new ValidationException("Failed to send message to target session");
        }
    }
}
