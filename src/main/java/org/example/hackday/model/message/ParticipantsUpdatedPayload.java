package org.example.hackday.model.message;

import java.util.List;

public class ParticipantsUpdatedPayload {

    private String roomId;
    private List<ParticipantDto> participants;

    public ParticipantsUpdatedPayload() {
    }

    public ParticipantsUpdatedPayload(String roomId, List<ParticipantDto> participants) {
        this.roomId = roomId;
        this.participants = participants;
    }

    public String getRoomId() {
        return roomId;
    }

    public List<ParticipantDto> getParticipants() {
        return participants;
    }

    public void setRoomId(String roomId) {
        this.roomId = roomId;
    }

    public void setParticipants(List<ParticipantDto> participants) {
        this.participants = participants;
    }
}
