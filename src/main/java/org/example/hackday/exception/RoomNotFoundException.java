package org.example.hackday.exception;

public class RoomNotFoundException extends SignalingException {
    public RoomNotFoundException(String roomId) {
        super("Room not found: " + roomId);
    }
}
