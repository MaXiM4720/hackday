package org.example.hackday.service;

import org.example.hackday.model.SessionContext;
import org.springframework.stereotype.Service;
import org.springframework.web.socket.WebSocketSession;

import java.util.Map;
import java.util.Optional;
import java.util.concurrent.ConcurrentHashMap;

@Service
public class SessionRegistry {

    private final Map<String, WebSocketSession> sessions = new ConcurrentHashMap<>();
    private final Map<String, SessionContext> contexts = new ConcurrentHashMap<>();

    public void register(WebSocketSession session) {
        sessions.put(session.getId(), session);
        contexts.put(session.getId(), new SessionContext(session.getId()));
    }

    public void unregister(String sessionId) {
        sessions.remove(sessionId);
        contexts.remove(sessionId);
    }

    public Optional<WebSocketSession> getSession(String sessionId) {
        return Optional.ofNullable(sessions.get(sessionId));
    }

    public Optional<SessionContext> getContext(String sessionId) {
        return Optional.ofNullable(contexts.get(sessionId));
    }

    public SessionContext requireContext(String sessionId) {
        SessionContext context = contexts.get(sessionId);
        if (context == null) {
            throw new IllegalStateException("Session context not found for sessionId=" + sessionId);
        }
        return context;
    }
}
