package org.example.hackday.model.message;

public class ParticipantLeftPayload {

    private String participantId;

    public ParticipantLeftPayload() {
    }

    public ParticipantLeftPayload(String participantId) {
        this.participantId = participantId;
    }

    public String getParticipantId() {
        return participantId;
    }

    public void setParticipantId(String participantId) {
        this.participantId = participantId;
    }
}