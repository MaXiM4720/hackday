package org.example.hackday.model.message;

public class ParticipantJoinedPayload {

    private ParticipantDto participant;

    public ParticipantJoinedPayload() {
    }

    public ParticipantJoinedPayload(ParticipantDto participant) {
        this.participant = participant;
    }

    public ParticipantDto getParticipant() {
        return participant;
    }

    public void setParticipant(ParticipantDto participant) {
        this.participant = participant;
    }
}