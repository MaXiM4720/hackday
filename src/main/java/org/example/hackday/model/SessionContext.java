package org.example.hackday.model;

public class SessionContext {

    private final String sessionId;
    private volatile String roomId;
    private volatile String participantId;
    private volatile boolean host;

    public SessionContext(String sessionId) {
        this.sessionId = sessionId;
    }

    public String getSessionId() {
        return sessionId;
    }

    public String getRoomId() {
        return roomId;
    }

    public void setRoomId(String roomId) {
        this.roomId = roomId;
    }

    public String getParticipantId() {
        return participantId;
    }

    public void setParticipantId(String participantId) {
        this.participantId = participantId;
    }

    public boolean isHost() {
        return host;
    }

    public void setHost(boolean host) {
        this.host = host;
    }

    public boolean isJoined() {
        return roomId != null && participantId != null;
    }

    public void clearRoomBinding() {
        this.roomId = null;
        this.participantId = null;
        this.host = false;
    }
}
