package org.example.hackday.exception;

public class ValidationException extends SignalingException {
    public ValidationException(String message) {
        super(message);
    }
}