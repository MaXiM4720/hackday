package org.example.hackday.model.message;

import java.util.List;

public class JoinAcceptedPayload {

    private String roomId;
    private String participantId;
    private String hostParticipantId;
    private List<ParticipantDto> participants;

    public JoinAcceptedPayload() {
    }

    public JoinAcceptedPayload(String roomId, String participantId, String hostParticipantId, List<ParticipantDto> participants) {
        this.roomId = roomId;
        this.participantId = participantId;
        this.hostParticipantId = hostParticipantId;
        this.participants = participants;
    }

    public String getRoomId() {
        return roomId;
    }

    public String getParticipantId() {
        return participantId;
    }

    public String getHostParticipantId() {
        return hostParticipantId;
    }

    public List<ParticipantDto> getParticipants() {
        return participants;
    }

    public void setRoomId(String roomId) {
        this.roomId = roomId;
    }

    public void setParticipantId(String participantId) {
        this.participantId = participantId;
    }

    public void setHostParticipantId(String hostParticipantId) {
        this.hostParticipantId = hostParticipantId;
    }

    public void setParticipants(List<ParticipantDto> participants) {
        this.participants = participants;
    }
}