package org.example.hackday.model.message;

public class PingPayload {

    private Long timestamp;

    public PingPayload() {
    }

    public Long getTimestamp() {
        return timestamp;
    }

    public void setTimestamp(Long timestamp) {
        this.timestamp = timestamp;
    }
}