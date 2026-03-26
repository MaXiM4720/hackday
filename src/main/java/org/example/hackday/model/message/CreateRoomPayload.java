package org.example.hackday.model.message;

public class CreateRoomPayload {

    private String displayName;

    public CreateRoomPayload() {
    }

    public String getDisplayName() {
        return displayName;
    }

    public void setDisplayName(String displayName) {
        this.displayName = displayName;
    }
}