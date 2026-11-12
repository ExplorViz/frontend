import ChatBox from 'explorviz-frontend/src/components/visualization/page-setup/sidebar/customizationbar/chat/chat-box';
import {
  SettingsSidebarContext,
  SettingsSidebarTab,
} from 'explorviz-frontend/src/components/visualization/page-setup/sidebar/customizationbar/settings-sidebar-context';
import { useAuthStore } from 'explorviz-frontend/src/stores/auth';
import { isLoginSkipped } from 'explorviz-frontend/src/utils/auth-config';
// Every capability's collaboration module registers its hand-over before a Room is entered from here.
import 'explorviz-frontend/src/utils/collaboration/capabilities';
import { setParticipantMuted, useChat } from 'explorviz-frontend/src/utils/collaboration/chat';
import { isCollaborationServiceReachable } from 'explorviz-frontend/src/utils/collaboration/collaboration-service';
import { setDistrictSharing, useDistrictSharing } from 'explorviz-frontend/src/utils/collaboration/districts';
import { useRoomConnectionStore, useRoomState } from 'explorviz-frontend/src/utils/collaboration/room-connection';
import { SpectateButton, SpectatingStatus } from './spectating-status';
import { use, useEffect, useState } from 'react';
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
  const [askingToJoin, setAskingToJoin] = useState(false);

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
        if (canEnter && roomCode.trim()) setAskingToJoin(true);
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
        <Button
          type="submit"
          size="sm"
          variant="outline-primary"
          disabled={!canEnter || !roomCode.trim() || askingToJoin}
        >
          Join
        </Button>
      </Form.Group>
      {askingToJoin && (
        <JoinNotice
          onBack={() => setAskingToJoin(false)}
          onJoin={() => {
            setAskingToJoin(false);
            enter((name) => joinRoom(roomCode, name));
          }}
        />
      )}
    </Form>
  );
}

/** Joining drops all local exploration state, so it is never done without asking. */
function JoinNotice({ onBack, onJoin }: { onBack: () => void; onJoin: () => void }) {
  const { openSettingsSidebarTab } = use(SettingsSidebarContext);

  return (
    <div role="alert" className="alert alert-warning small mt-3 mb-0 p-2">
      <p className="mb-2">
        Joining replaces your exploration with the room&apos;s: your closed Districts, highlights, annotations and open
        popups are dropped.
      </p>
      <div className="d-flex flex-column gap-1">
        <Button size="sm" variant="outline-secondary" onClick={onBack}>
          Go back
        </Button>
        <Button
          size="sm"
          variant="outline-primary"
          onClick={() => {
            onBack();
            openSettingsSidebarTab(SettingsSidebarTab.Snapshot);
          }}
        >
          Take a Snapshot first
        </Button>
        <Button size="sm" variant="warning" onClick={onJoin}>
          Drop my exploration and join
        </Button>
      </div>
    </div>
  );
}

function RoomPanel() {
  const { room, reconnecting, leaveRoom, kick, handOverHost } = useRoomConnectionStore();
  const state = useRoomState();
  const districtSharing = useDistrictSharing();
  if (!room) return null;
  const isHost = state?.hostId === room.sessionId;

  return (
    <div>
      {reconnecting && (
        <div role="status" aria-label="Reconnecting" className="alert alert-warning small mb-3 p-2">
          Reconnecting… The room is shown as you last saw it; your changes are not shared until the connection is back.
        </div>
      )}
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
            {sessionId === room.sessionId && (
              <input
                type="color"
                aria-label="Your color"
                title="Change your color"
                className="form-control form-control-color p-0 border-0"
                style={{ width: '1.25rem', height: '1.25rem' }}
                value={participant.color}
                onChange={(event) => room.send('setColor', { color: event.target.value })}
              />
            )}
            <span>{participant.name}</span>
            {sessionId === room.sessionId && <span className="small text-muted">(you)</span>}
            {sessionId === state?.hostId && <span className="badge bg-secondary">Host</span>}
            <SpectatingStatus participant={participant} participants={state?.participants ?? {}} />
            {participant.muted && <span className="small text-muted">muted</span>}
            {sessionId !== room.sessionId && (
              <span className="ms-auto d-flex gap-1">
                <SpectateButton sessionId={sessionId} name={participant.name} />
                {isHost && (
                  <>
                    <Button
                      variant="outline-secondary"
                      size="sm"
                      className="py-0"
                      aria-label={`${participant.muted ? 'Unmute' : 'Mute'} ${participant.name}`}
                      onClick={() => setParticipantMuted(sessionId, !participant.muted)}
                    >
                      {participant.muted ? 'Unmute' : 'Mute'}
                    </Button>
                    <Button
                      variant="outline-secondary"
                      size="sm"
                      className="py-0"
                      aria-label={`Make ${participant.name} Host`}
                      title="Make Host"
                      onClick={() => handOverHost(sessionId)}
                    >
                      Make Host
                    </Button>
                    <Button
                      variant="outline-danger"
                      size="sm"
                      className="py-0"
                      aria-label={`Kick ${participant.name}`}
                      title="Kick"
                      onClick={() => kick(sessionId)}
                    >
                      Kick
                    </Button>
                  </>
                )}
              </span>
            )}
          </li>
        ))}
      </ul>
      <Form.Check
        type="switch"
        id="collaboration-district-sharing"
        className="mb-3"
        label="Share Districts"
        title={
          isHost
            ? 'When off, everyone opens and closes Districts for themselves'
            : 'Only the Host can change whether Districts are shared'
        }
        checked={districtSharing ?? true}
        disabled={!isHost}
        onChange={(event) => setDistrictSharing(event.target.checked)}
      />
      <Button variant="outline-danger" size="sm" className="w-100" onClick={() => leaveRoom()}>
        Leave room
      </Button>
      <div className="mt-3">
        <ChatBox />
      </div>
    </div>
  );
}
