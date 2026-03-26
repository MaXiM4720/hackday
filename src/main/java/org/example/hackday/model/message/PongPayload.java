package org.example.hackday.model.message;

public class PongPayload {

    private Long timestamp;

    public PongPayload() {
    }

    public PongPayload(Long timestamp) {
        this.timestamp = timestamp;
    }

    public Long getTimestamp() {
        return timestamp;
    }

    public void setTimestamp(Long timestamp) {
        this.timestamp = timestamp;
    }
}