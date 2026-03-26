package org.example.hackday.model.message;

import com.fasterxml.jackson.annotation.JsonInclude;

@JsonInclude(JsonInclude.Include.NON_NULL)
public class BaseMessage {

    private String type;
    private Object payload;

    public BaseMessage() {
    }

    public BaseMessage(String type, Object payload) {
        this.type = type;
        this.payload = payload;
    }

    public String getType() {
        return type;
    }

    public Object getPayload() {
        return payload;
    }

    public void setType(String type) {
        this.type = type;
    }

    public void setPayload(Object payload) {
        this.payload = payload;
    }
}
