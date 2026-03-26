package org.example.hackday.model;

import java.util.Collection;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

public class Room {

    private final String roomId;
    private final Participant host;
    private final Map<String, Participant> participantsById = new ConcurrentHashMap<>();
    private final Map<String, String> participantIdBySessionId = new ConcurrentHashMap<>();

    public Room(String roomId, Participant host) {
        this.roomId = roomId;
        this.host = host;
        this.participantsById.put(host.getParticipantId(), host);
        this.participantIdBySessionId.put(host.getSessionId(), host.getParticipantId());
    }

    public String getRoomId() {
        return roomId;
    }

    public Participant getHost() {
        return host;
    }

    public Collection<Participant> getParticipants() {
        return participantsById.values();
    }

    public Participant getParticipantById(String participantId) {
        return participantsById.get(participantId);
    }

    public Participant getParticipantBySessionId(String sessionId) {
        String participantId = participantIdBySessionId.get(sessionId);
        return participantId == null ? null : participantsById.get(participantId);
    }

    public void addParticipant(Participant participant) {
        participantsById.put(participant.getParticipantId(), participant);
        participantIdBySessionId.put(participant.getSessionId(), participant.getParticipantId());
    }

    public Participant removeParticipantBySessionId(String sessionId) {
        String participantId = participantIdBySessionId.remove(sessionId);
        if (participantId == null) {
            return null;
        }
        return participantsById.remove(participantId);
    }

    public boolean containsSession(String sessionId) {
        return participantIdBySessionId.containsKey(sessionId);
    }

    public boolean isHostSession(String sessionId) {
        return host.getSessionId().equals(sessionId);
    }
}