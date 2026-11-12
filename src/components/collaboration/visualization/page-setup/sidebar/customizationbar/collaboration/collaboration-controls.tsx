import ChatBox from 'explorviz-frontend/src/components/visualization/page-setup/sidebar/customizationbar/chat/chat-box';
import { useAuthStore } from 'explorviz-frontend/src/stores/auth';
import { isLoginSkipped } from 'explorviz-frontend/src/utils/auth-config';
import { setParticipantMuted, useChat } from 'explorviz-frontend/src/utils/collaboration/chat';
import { isCollaborationServiceReachable } from 'explorviz-frontend/src/utils/collaboration/collaboration-service';
import { useRoomConnectionStore, useRoomState } from 'explorviz-frontend/src/utils/collaboration/room-connection';
import { useEffect, useState } from 'react';
import Button from 'react-bootstrap/Button';
import Form from 'react-bootstrap/Form';

type Reachability = 'checking' | 'reachable' | 'unreachable';

// The Collaboration section of the sidebar.
export default function CollaborationControls() {
  const [reachability, setReachability] = useState<Reachability>('checking');
  const room = useRoomConnectionStore((state) => state.room);
  const keptChat = useChat().entries.length > 0;

  useEffect(() => {
    let active = true;
    isCollaborationServiceReachable().then((reachable) => {
      if (active) setReachability(reachable ? 'reachable' : 'unreachable');
    });
    return () => {
      active = false;
    };
  }, []);

  return (
    <div className="collaboration-controls">
      <h6 className="bold mb-3">Collaboration</h6>
      {room ? (
        <RoomPanel />
      ) : (
        <>
          {reachability === 'checking' && (
            <p className="small text-muted mb-0">Looking for the collaboration service…</p>
          )}
          {reachability === 'unreachable' && (
            <p className="small text-muted mb-0">
              Collaboration is currently disabled because the collaboration service is not reachable.
            </p>
          )}
          {reachability === 'reachable' && <RoomEntryForm />}
          {keptChat && (
            <div className="mt-3">
              <ChatBox />
            </div>
          )}
        </>
      )}
    </div>
  );
}

const DISPLAY_NAME_KEY = 'explorviz.collaboration.displayName';

function readDisplayName() {
  try {
    return localStorage.getItem(DISPLAY_NAME_KEY) ?? '';
  } catch {
    return '';
  }
}

function rememberDisplayName(name: string) {
  try {
    localStorage.setItem(DISPLAY_NAME_KEY, name);
  } catch {
    // The name is only a convenience.
  }
}

function RoomEntryForm() {
  const { createRoom, joinRoom, connecting } = useRoomConnectionStore();
  const loginName = useAuthStore((state) => state.user?.name);
  // With login on, the name comes from the login.
  const typesName = isLoginSkipped();
  const [displayName, setDisplayName] = useState(readDisplayName);
  const [roomCode, setRoomCode] = useState('');

  const name = typesName ? displayName.trim() : (loginName ?? '');
  const canEnter = !connecting && name !== '';

  const enter = (action: (name: string) => Promise<void>) => {
    if (typesName) rememberDisplayName(name);
    action(name);
  };

  return (
    <Form
      onSubmit={(event) => {
        event.preventDefault();
        if (canEnter && roomCode.trim()) enter((name) => joinRoom(roomCode, name));
      }}
    >
      {typesName && (
        <Form.Group controlId="collaboration-display-name" className="mb-3">
          <Form.Label className="small mb-1">Display name</Form.Label>
          <Form.Control
            size="sm"
            maxLength={40}
            value={displayName}
            onChange={(event) => setDisplayName(event.target.value)}
          />
        </Form.Group>
      )}
      <Button
        variant="success"
        className="w-100 mb-3"
        disabled={!canEnter}
        onClick={() => enter((name) => createRoom(name))}
      >
        Create room
      </Button>
      <Form.Group controlId="collaboration-room-code" className="d-flex gap-2">
        <Form.Label visuallyHidden>Room code</Form.Label>
        <Form.Control
          size="sm"
          placeholder="Room code"
          autoComplete="off"
          value={roomCode}
          onChange={(event) => setRoomCode(event.target.value)}
        />
        <Button type="submit" size="sm" variant="outline-primary" disabled={!canEnter || !roomCode.trim()}>
          Join
        </Button>
      </Form.Group>
    </Form>
  );
}

function RoomPanel() {
  const { room, leaveRoom } = useRoomConnectionStore();
  const state = useRoomState();
  if (!room) return null;
  const isHost = state?.hostId === room.sessionId;

  return (
    <div>
      <p className="small mb-1">Room code</p>
      <p className="h5 mb-3 font-monospace" aria-label="Room code">
        {room.roomId}
      </p>
      <ul className="list-unstyled mb-3" aria-label="Participants">
        {Object.entries(state?.participants ?? {}).map(([sessionId, participant]) => (
          <li key={sessionId} className="d-flex align-items-center gap-2 mb-1">
            <span
              aria-hidden
              className="d-inline-block rounded-circle"
              style={{ width: '0.75rem', height: '0.75rem', backgroundColor: participant.color }}
            />
            <span>{participant.name}</span>
            {sessionId === room.sessionId && <span className="small text-muted">(you)</span>}
            {sessionId === state?.hostId && <span className="badge bg-secondary">Host</span>}
            {participant.muted && <span className="small text-muted">muted</span>}
            {isHost && sessionId !== room.sessionId && (
              <Button
                variant="link"
                size="sm"
                className="p-0 ms-auto"
                aria-label={`${participant.muted ? 'Unmute' : 'Mute'} ${participant.name}`}
                onClick={() => setParticipantMuted(sessionId, !participant.muted)}
              >
                {participant.muted ? 'Unmute' : 'Mute'}
              </Button>
            )}
          </li>
        ))}
      </ul>
      <Button variant="outline-danger" size="sm" className="w-100" onClick={() => leaveRoom()}>
        Leave room
      </Button>
      <div className="mt-3">
        <ChatBox />
      </div>
    </div>
  );
}
