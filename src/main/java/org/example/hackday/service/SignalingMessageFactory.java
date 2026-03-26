package org.example.hackday.service;


import com.example.signaling.model.Participant;
import com.example.signaling.model.Room;
import com.example.signaling.model.message.*;
import org.springframework.stereotype.Service;

import java.util.Comparator;
import java.util.List;

@Service
public class SignalingMessageFactory {

    public BaseMessage roomCreated(Room room) {
        return new BaseMessage(
                "room-created",
                new RoomCreatedPayload(
                        room.getRoomId(),
                        room.getHost().getParticipantId(),
                        room.getHost().getSessionId()
                )
        );
    }

    public BaseMessage joinAccepted(Room room, Participant joinedParticipant) {
        return new BaseMessage(
                "join-accepted",
                new JoinAcceptedPayload(
                        room.getRoomId(),
                        joinedParticipant.getParticipantId(),
                        room.getHost().getParticipantId(),
                        participants(room)
                )
        );
    }

    public BaseMessage participantJoined(Participant participant) {
        return new BaseMessage(
                "participant-joined",
                new ParticipantJoinedPayload(toDto(participant))
        );
    }

    public BaseMessage participantLeft(String participantId) {
        return new BaseMessage(
                "participant-left",
                new ParticipantLeftPayload(participantId)
        );
    }

    public BaseMessage participantsUpdated(Room room) {
        return new BaseMessage(
                "participants-updated",
                new ParticipantsUpdatedPayload(room.getRoomId(), participants(room))
        );
    }

    public BaseMessage roomClosed(String roomId, String reason) {
        return new BaseMessage(
                "room-closed",
                new RoomClosedPayload(roomId, reason)
        );
    }

    public BaseMessage error(String code, String message) {
        return new BaseMessage(
                "error",
                new ErrorPayload(code, message)
        );
    }

    public BaseMessage pong(Long timestamp) {
        return new BaseMessage(
                "pong",
                new PongPayload(timestamp)
        );
    }

    public ParticipantDto toDto(Participant participant) {
        return new ParticipantDto(
                participant.getParticipantId(),
                participant.getDisplayName(),
                participant.isHost()
        );
    }

    private List<ParticipantDto> participants(Room room) {
        return room.getParticipants().stream()
                .sorted(Comparator.comparing(Participant::isHost).reversed()
                        .thenComparing(Participant::getDisplayName))
                .map(this::toDto)
                .toList();
    }
}