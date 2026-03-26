package org.example.hackday.service;

import com.example.signaling.exception.RoomNotFoundException;
import com.example.signaling.exception.ValidationException;
import com.example.signaling.model.Participant;
import com.example.signaling.model.Room;
import com.example.signaling.util.RoomIdGenerator;
import org.springframework.stereotype.Service;

import java.util.Collection;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;

@Service
public class RoomService {

    private final RoomIdGenerator roomIdGenerator;

    private final Map<String, Room> roomsById = new ConcurrentHashMap<>();
    private final Map<String, String> roomIdBySessionId = new ConcurrentHashMap<>();

    public RoomService(RoomIdGenerator roomIdGenerator) {
        this.roomIdGenerator = roomIdGenerator;
    }

    public synchronized Room createRoom(String hostSessionId, String displayName) {
        validateDisplayName(displayName);

        if (roomIdBySessionId.containsKey(hostSessionId)) {
            throw new ValidationException("Session already belongs to a room");
        }

        String roomId = nextUniqueRoomId();
        Participant host = new Participant(
                newParticipantId(),
                hostSessionId,
                displayName.trim(),
                true
        );

        Room room = new Room(roomId, host);
        roomsById.put(roomId, room);
        roomIdBySessionId.put(hostSessionId, roomId);

        return room;
    }

    public synchronized Participant joinRoom(String roomId, String sessionId, String displayName) {
        validateDisplayName(displayName);

        Room room = roomsById.get(roomId);
        if (room == null) {
            throw new RoomNotFoundException(roomId);
        }

        if (roomIdBySessionId.containsKey(sessionId)) {
            throw new ValidationException("Session already belongs to a room");
        }

        Participant participant = new Participant(
                newParticipantId(),
                sessionId,
                displayName.trim(),
                false
        );

        room.addParticipant(participant);
        roomIdBySessionId.put(sessionId, roomId);

        return participant;
    }

    public Room getRoom(String roomId) {
        Room room = roomsById.get(roomId);
        if (room == null) {
            throw new RoomNotFoundException(roomId);
        }
        return room;
    }

    public Room findRoomBySessionId(String sessionId) {
        String roomId = roomIdBySessionId.get(sessionId);
        if (roomId == null) {
            return null;
        }
        return roomsById.get(roomId);
    }

    public synchronized Participant removeParticipant(String sessionId) {
        String roomId = roomIdBySessionId.remove(sessionId);
        if (roomId == null) {
            return null;
        }

        Room room = roomsById.get(roomId);
        if (room == null) {
            return null;
        }

        return room.removeParticipantBySessionId(sessionId);
    }

    public synchronized Room closeRoomByHostSession(String hostSessionId) {
        String roomId = roomIdBySessionId.remove(hostSessionId);
        if (roomId == null) {
            return null;
        }

        Room room = roomsById.get(roomId);
        if (room == null) {
            return null;
        }

        if (!room.isHostSession(hostSessionId)) {
            return null;
        }

        for (Participant participant : room.getParticipants()) {
            roomIdBySessionId.remove(participant.getSessionId());
        }

        roomsById.remove(roomId);
        return room;
    }

    public Collection<Participant> getParticipants(String roomId) {
        return getRoom(roomId).getParticipants();
    }

    private String nextUniqueRoomId() {
        String roomId;
        do {
            roomId = roomIdGenerator.generate();
        } while (roomsById.containsKey(roomId));
        return roomId;
    }

    private String newParticipantId() {
        return UUID.randomUUID().toString();
    }

    private void validateDisplayName(String displayName) {
        if (displayName == null || displayName.isBlank()) {
            throw new ValidationException("displayName is required");
        }
        if (displayName.length() > 50) {
            throw new ValidationException("displayName is too long");
        }
    }
}
