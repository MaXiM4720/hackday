package org.example.hackday.model.message;

public class ParticipantDto {

    private String participantId;
    private String displayName;
    private boolean host;

    public ParticipantDto() {
    }

    public ParticipantDto(String participantId, String displayName, boolean host) {
        this.participantId = participantId;
        this.displayName = displayName;
        this.host = host;
    }

    public String getParticipantId() {
        return participantId;
    }

    public String getDisplayName() {
        return displayName;
    }

    public boolean isHost() {
        return host;
    }

    public void setParticipantId(String participantId) {
        this.participantId = participantId;
    }

    public void setDisplayName(String displayName) {
        this.displayName = displayName;
    }

    public void setHost(boolean host) {
        this.host = host;
    }
}