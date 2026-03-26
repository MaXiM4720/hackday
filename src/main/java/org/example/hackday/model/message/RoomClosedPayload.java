package org.example.hackday.model.message;

public class RoomClosedPayload {

    private String roomId;
    private String reason;

    public RoomClosedPayload() {
    }

    public RoomClosedPayload(String roomId, String reason) {
        this.roomId = roomId;
        this.reason = reason;
    }

    public String getRoomId() {
        return roomId;
    }

    public String getReason() {
        return reason;
    }

    public void setRoomId(String roomId) {
        this.roomId = roomId;
    }

    public void setReason(String reason) {
        this.reason = reason;
    }
}