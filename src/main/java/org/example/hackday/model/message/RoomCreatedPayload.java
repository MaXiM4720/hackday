package org.example.hackday.model.message;

public class RoomCreatedPayload {

    private String roomId;
    private String participantId;
    private String sessionId;

    public RoomCreatedPayload() {
    }

    public RoomCreatedPayload(String roomId, String participantId, String sessionId) {
        this.roomId = roomId;
        this.participantId = participantId;
        this.sessionId = sessionId;
    }

    public String getRoomId() {
        return roomId;
    }

    public String getParticipantId() {
        return participantId;
    }

    public String getSessionId() {
        return sessionId;
    }

    public void setRoomId(String roomId) {
        this.roomId = roomId;
    }

    public void setParticipantId(String participantId) {
        this.participantId = participantId;
    }

    public void setSessionId(String sessionId) {
        this.sessionId = sessionId;
    }
}