package org.example.hackday.model.message;

public class JoinRoomPayload {

    private String roomId;
    private String displayName;

    public JoinRoomPayload() {
    }

    public String getRoomId() {
        return roomId;
    }

    public String getDisplayName() {
        return displayName;
    }

    public void setRoomId(String roomId) {
        this.roomId = roomId;
    }

    public void setDisplayName(String displayName) {
        this.displayName = displayName;
    }
}