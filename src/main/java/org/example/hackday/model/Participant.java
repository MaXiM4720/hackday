package org.example.hackday.model;

public class Participant {

    private final String participantId;
    private final String sessionId;
    private final String displayName;
    private final boolean host;

    public Participant(String participantId, String sessionId, String displayName, boolean host) {
        this.participantId = participantId;
        this.sessionId = sessionId;
        this.displayName = displayName;
        this.host = host;
    }

    public String getParticipantId() {
        return participantId;
    }

    public String getSessionId() {
        return sessionId;
    }

    public String getDisplayName() {
        return displayName;
    }

    public boolean isHost() {
        return host;
    }
}
