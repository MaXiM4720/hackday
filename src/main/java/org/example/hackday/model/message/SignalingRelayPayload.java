package org.example.hackday.model.message;

import com.fasterxml.jackson.annotation.JsonInclude;
import com.fasterxml.jackson.databind.JsonNode;

@JsonInclude(JsonInclude.Include.NON_NULL)
public class SignalingRelayPayload {

    private String roomId;
    private String fromParticipantId;
    private String targetParticipantId;
    private JsonNode sdp;

    public SignalingRelayPayload() {
    }

    public String getRoomId() {
        return roomId;
    }

    public String getFromParticipantId() {
        return fromParticipantId;
    }

    public String getTargetParticipantId() {
        return targetParticipantId;
    }

    public JsonNode getSdp() {
        return sdp;
    }

    public void setRoomId(String roomId) {
        this.roomId = roomId;
    }

    public void setFromParticipantId(String fromParticipantId) {
        this.fromParticipantId = fromParticipantId;
    }

    public void setTargetParticipantId(String targetParticipantId) {
        this.targetParticipantId = targetParticipantId;
    }

    public void setSdp(JsonNode sdp) {
        this.sdp = sdp;
    }
}
