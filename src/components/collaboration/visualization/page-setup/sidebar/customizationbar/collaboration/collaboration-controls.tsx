import {
  AlertIcon,
  CheckIcon,
  CopyIcon,
  GlobeIcon,
  KeyIcon,
  LockIcon,
  MuteIcon,
  PlusIcon,
  SignOutIcon,
  SyncIcon,
  UnmuteIcon,
  XIcon,
} from '@primer/octicons-react';
import ChatBox from 'explorviz-frontend/src/components/visualization/page-setup/sidebar/customizationbar/chat/chat-box';
import { useAuthStore } from 'explorviz-frontend/src/stores/auth';
import { isLoginSkipped } from 'explorviz-frontend/src/utils/auth-config';
// Every capability's collaboration module registers its hand-over before a Room is entered from here.
import 'explorviz-frontend/src/utils/collaboration/capabilities';
import { setParticipantMuted, useChat } from 'explorviz-frontend/src/utils/collaboration/chat';
import { isCollaborationServiceReachable } from 'explorviz-frontend/src/utils/collaboration/collaboration-service';
import {
  MAX_DISPLAY_NAME_LENGTH,
  readDisplayName,
  rememberDisplayName,
} from 'explorviz-frontend/src/utils/collaboration/display-name';
import { setDistrictSharing, useDistrictSharing } from 'explorviz-frontend/src/utils/collaboration/districts';
import {
  normalizeRoomCode,
  useRoomConnectionStore,
  useRoomState,
} from 'explorviz-frontend/src/utils/collaboration/room-connection';
import type { RoomVisibility } from 'explorviz-frontend/src/utils/collaboration/room-contract.generated';
import { saveSnapshotOfView } from 'explorviz-frontend/src/utils/snapshot/snapshot-helpers';
import { SpectateButton, SpectatingStatus } from './spectating-status';
import { useEffect, useState } from 'react';
import Form from 'react-bootstrap/Form';
import OverlayTrigger from 'react-bootstrap/OverlayTrigger';
import Tooltip from 'react-bootstrap/Tooltip';

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

  // The chat sits below the controls at the bottom of the screen; only the controls scroll.
  return (
    <div className="collaboration-controls">
      <div className="collaboration-controls-scroll">
        <h6 className="bold mb-3">Collaboration</h6>
        {room ? (
          <RoomPanel />
        ) : (
          <>
            {reachability === 'checking' && <p className="collab-hint mb-0">Looking for the collaboration service…</p>}
            {reachability === 'unreachable' && (
              <p className="collab-hint mb-0">
                Collaboration is currently disabled because the collaboration service is not reachable.
              </p>
            )}
            {reachability === 'reachable' && <RoomEntryForm />}
          </>
        )}
      </div>
      {(room || keptChat) && <ChatBox />}
    </div>
  );
}

function RoomEntryForm() {
  const { createRoom, joinRoom, connecting } = useRoomConnectionStore();
  const loginName = useAuthStore((state) => state.user?.name);
  // With login on, the name comes from the login.
  const typesName = isLoginSkipped();
  const [displayName, setDisplayName] = useState(readDisplayName);
  const [roomCode, setRoomCode] = useState('');
  const [roomName, setRoomName] = useState('');
  const [visibility, setVisibility] = useState<RoomVisibility>('public');
  const [askingToJoin, setAskingToJoin] = useState(false);

  // An empty name is fine: the service then names the Participant "Anonymous" plus a number.
  const name = typesName ? displayName.trim() : (loginName ?? '');
  const canEnter = !connecting;

  const enter = (action: (name: string) => Promise<void>) => {
    if (typesName) rememberDisplayName(name);
    action(name);
  };

  return (
    <form
      className="collab-entry"
      onSubmit={(event) => {
        event.preventDefault();
        if (canEnter && roomCode.trim()) setAskingToJoin(true);
      }}
    >
      {typesName && (
        <div className="collab-field">
          <label className="collab-label" htmlFor="collaboration-display-name">
            User display name
          </label>
          <input
            id="collaboration-display-name"
            className="collab-input"
            maxLength={MAX_DISPLAY_NAME_LENGTH}
            placeholder="Anonymous if empty"
            value={displayName}
            onChange={(event) => setDisplayName(event.target.value)}
          />
        </div>
      )}

      <section className="collab-group" aria-labelledby="collaboration-new-room">
        <h6 className="collab-group-title" id="collaboration-new-room">
          New room
        </h6>
        <div className="collab-field">
          <label className="collab-label" htmlFor="collaboration-room-name">
            Room name
          </label>
          <input
            id="collaboration-room-name"
            className="collab-input"
            maxLength={80}
            placeholder="Optional"
            value={roomName}
            onChange={(event) => setRoomName(event.target.value)}
          />
        </div>
        <div className="collab-field">
          <label className="collab-label" htmlFor="collaboration-room-visibility">
            Visibility
          </label>
          <select
            id="collaboration-room-visibility"
            className="collab-input collab-select"
            value={visibility}
            onChange={(event) => setVisibility(event.target.value as RoomVisibility)}
          >
            <option value="public">Public</option>
            <option value="code">Join with code</option>
          </select>
          <p className="collab-hint">
            {visibility === 'public'
              ? 'Listed under Rooms on the Landscapes page.'
              : 'Not listed; only people you give the room code can join.'}
          </p>
        </div>
        <button
          type="button"
          className="collab-button primary"
          disabled={!canEnter}
          onClick={() => enter((name) => createRoom(name, { roomName, visibility }))}
        >
          <PlusIcon size={14} />
          Create room
        </button>
      </section>

      <div className="collab-divider">
        <span>or</span>
      </div>

      <div className="collab-join-row">
        <label className="visually-hidden" htmlFor="collaboration-room-code">
          Room code
        </label>
        <input
          id="collaboration-room-code"
          className="collab-input collab-code-input"
          placeholder="Room code"
          autoComplete="off"
          spellCheck={false}
          value={roomCode}
          onChange={(event) => setRoomCode(event.target.value)}
        />
        <button
          type="submit"
          className="collab-button secondary"
          disabled={!canEnter || !roomCode.trim() || askingToJoin}
        >
          Join
        </button>
      </div>
      {askingToJoin && (
        <JoinNotice
          code={roomCode}
          onBack={() => setAskingToJoin(false)}
          onJoin={() => {
            setAskingToJoin(false);
            enter((name) => joinRoom(roomCode, name));
          }}
        />
      )}
    </form>
  );
}

/** Joining drops all local exploration state, so it is never done without asking. */
function JoinNotice({ code, onBack, onJoin }: { code: string; onBack: () => void; onJoin: () => void }) {
  const [saving, setSaving] = useState(false);

  // A normal Snapshot of the exploration as it is now; the join goes ahead only once it is saved.
  const saveSnapshotAndJoin = async () => {
    setSaving(true);
    const saved = await saveSnapshotOfView(
      `Before joining room ${normalizeRoomCode(code)}, ${new Date().toLocaleString()}`
    );
    setSaving(false);
    if (saved) onJoin();
  };

  return (
    <div role="alert" className="collab-notice warning">
      <p className="collab-notice-text">
        <AlertIcon size={14} />
        <span>
          Joining replaces your exploration with the room&apos;s: your closed Districts, highlights, annotations and
          open popups are dropped.
        </span>
      </p>
      <div className="collab-notice-actions">
        <button type="button" className="collab-button secondary" disabled={saving} onClick={saveSnapshotAndJoin}>
          {saving ? 'Saving the Snapshot…' : 'Take a Snapshot first'}
        </button>
        <button type="button" className="collab-button warning" onClick={onJoin}>
          Drop my exploration and join
        </button>
        <button type="button" className="collab-button ghost" onClick={onBack}>
          Go back
        </button>
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
  const participants = Object.entries(state?.participants ?? {});

  return (
    <div className="collab-room">
      {reconnecting && (
        <div role="status" aria-label="Reconnecting" className="collab-notice warning">
          <p className="collab-notice-text">
            <SyncIcon size={14} className="collab-spin" />
            <span>
              Reconnecting… The room is shown as you last saw it; your changes are not shared until the connection is
              back.
            </span>
          </p>
        </div>
      )}

      <div className="collab-room-card">
        {state?.roomName ? (
          <p className="collab-room-name">{state.roomName}</p>
        ) : (
          <p className="collab-label mb-0">Room code</p>
        )}
        <div className="collab-room-code-row">
          <span className="collab-room-code" aria-label="Room code">
            {room.roomId}
          </span>
          <CopyButton text={room.roomId} />
          <RoomVisibilityBadge visibility={state?.visibility} />
        </div>
      </div>

      <div className="collab-group-header">
        <h6 className="collab-group-title">Participants</h6>
        {participants.length > 0 && <span className="collab-count">{participants.length}</span>}
      </div>
      <ul className="collab-participants" aria-label="Participants">
        {participants.map(([sessionId, participant]) => {
          const own = sessionId === room.sessionId;
          return (
            <li key={sessionId} className={`collab-participant${own ? ' own' : ''}`}>
              {own ? (
                <label
                  className="collab-avatar editable"
                  data-initial={initial(participant.name)}
                  style={{ backgroundColor: participant.color }}
                >
                  <input
                    type="color"
                    aria-label="Your color"
                    title="Change your color"
                    value={participant.color}
                    onChange={(event) => room.send('setColor', { color: event.target.value })}
                  />
                </label>
              ) : (
                <span
                  aria-hidden
                  className="collab-avatar"
                  data-initial={initial(participant.name)}
                  style={{ backgroundColor: participant.color }}
                />
              )}
              <div className="collab-participant-main">
                <div className="collab-participant-name">
                  <span className="collab-name">{participant.name}</span>
                  {own && <span className="collab-you">(you)</span>}
                  {sessionId === state?.hostId && <span className="collab-chip">Host</span>}
                </div>
                <div className="collab-participant-status">
                  <SpectatingStatus participant={participant} participants={state?.participants ?? {}} />
                  {participant.muted && (
                    <span>
                      <MuteIcon size={10} /> muted
                    </span>
                  )}
                </div>
              </div>
              {!own && (
                <span className="collab-participant-actions">
                  <SpectateButton sessionId={sessionId} name={participant.name} />
                  {isHost && (
                    <>
                      <button
                        type="button"
                        className="collab-icon-button"
                        aria-label={`${participant.muted ? 'Unmute' : 'Mute'} ${participant.name}`}
                        title={participant.muted ? 'Unmute' : 'Mute'}
                        onClick={() => setParticipantMuted(sessionId, !participant.muted)}
                      >
                        {participant.muted ? <UnmuteIcon size={14} /> : <MuteIcon size={14} />}
                      </button>
                      <button
                        type="button"
                        className="collab-icon-button"
                        aria-label={`Make ${participant.name} Host`}
                        title="Make Host"
                        onClick={() => handOverHost(sessionId)}
                      >
                        <KeyIcon size={14} />
                      </button>
                      <button
                        type="button"
                        className="collab-icon-button danger"
                        aria-label={`Kick ${participant.name}`}
                        title="Kick"
                        onClick={() => kick(sessionId)}
                      >
                        <XIcon size={14} />
                      </button>
                    </>
                  )}
                </span>
              )}
            </li>
          );
        })}
      </ul>

      <Form.Check
        type="switch"
        id="collaboration-district-sharing"
        className="collab-setting"
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

      <button type="button" className="collab-button danger-outline" onClick={() => leaveRoom()}>
        <SignOutIcon size={14} />
        Leave room
      </button>
    </div>
  );
}

function initial(name: string) {
  return name.trim().charAt(0).toUpperCase() || '?';
}

/** Copies the room code, confirming it briefly with a check mark. */
function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!copied) return;
    const timeout = setTimeout(() => setCopied(false), 1500);
    return () => clearTimeout(timeout);
  }, [copied]);

  return (
    <button
      type="button"
      className={`collab-icon-button${copied ? ' success' : ''}`}
      title={copied ? 'Copied' : 'Copy room code'}
      aria-label={copied ? 'Copied room code' : 'Copy room code'}
      onClick={() =>
        navigator.clipboard?.writeText(text).then(
          () => setCopied(true),
          () => undefined
        )
      }
    >
      {copied ? <CheckIcon size={14} /> : <CopyIcon size={14} />}
    </button>
  );
}

const VISIBILITY_EXPLANATIONS = {
  public:
    'Public: the room is listed under Rooms on the Landscapes page, where anyone who can collaborate sees its name, ' +
    'code, Landscape and number of users and can join it. It can also be joined with the room code.',
  code:
    'Code only: the room is not listed under Rooms on the Landscapes page. Only people you give the room code can ' +
    'join it, by typing the code in the collaboration tab.',
};

/** Whether the Room is listed for everyone or found only through its code; hovering or focusing explains it. */
function RoomVisibilityBadge({ visibility }: { visibility: string | undefined }) {
  // Before the first state arrives, the Room's visibility is not known yet.
  if (!visibility) return null;
  const isPublic = visibility === 'public';
  const explanation = VISIBILITY_EXPLANATIONS[isPublic ? 'public' : 'code'];
  return (
    <OverlayTrigger placement="bottom" overlay={<Tooltip id="room-visibility-explanation">{explanation}</Tooltip>}>
      <span
        className={`collab-visibility ${isPublic ? 'public' : 'code'}`}
        tabIndex={0}
        aria-describedby="room-visibility-explanation"
      >
        {isPublic ? <GlobeIcon size={12} /> : <LockIcon size={12} />}
        <span>{isPublic ? 'Public' : 'Code only'}</span>
      </span>
    </OverlayTrigger>
  );
}
