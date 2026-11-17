import {
  AlertIcon,
  CheckIcon,
  CopyIcon,
  DeviceDesktopIcon,
  GearIcon,
  GlobeIcon,
  KeyIcon,
  LinkIcon,
  LockIcon,
  MuteIcon,
  PencilIcon,
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
import { roomLink } from 'explorviz-frontend/src/utils/collaboration/room-link';
import { saveSnapshotOfView } from 'explorviz-frontend/src/utils/snapshot/snapshot-helpers';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import Form from 'react-bootstrap/Form';
import OverlayTrigger from 'react-bootstrap/OverlayTrigger';
import Tooltip from 'react-bootstrap/Tooltip';
import { ScreenWallEditor } from './screen-wall-editor';
import { SpectateButton, SpectatingStatus } from './spectating-status';

type Reachability = 'checking' | 'reachable' | 'unreachable';
type Panel = 'settings' | 'screenWall';

// The Collaboration section of the sidebar.
export default function CollaborationControls() {
  const [reachability, setReachability] = useState<Reachability>('checking');
  const room = useRoomConnectionStore((state) => state.room);
  const keptChat = useChat().entries.length > 0;
  // The room settings and the Screen Wall editor are hidden until opened from the header.
  const [openPanel, setOpenPanel] = useState<Panel | undefined>();
  const toggle = (panel: Panel) => setOpenPanel((open) => (open === panel ? undefined : panel));

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
        <div className="collab-header">
          <h6 className="bold mb-0">Collaboration</h6>
          {room && <PanelToggles open={openPanel} onToggle={toggle} />}
        </div>
        {room ? (
          <RoomPanel openPanel={openPanel} />
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

/** The header buttons that open the room settings and, for the Host, the Screen Wall editor. */
function PanelToggles({ open, onToggle }: { open: Panel | undefined; onToggle: (panel: Panel) => void }) {
  const isHost = useIsHost();
  const toggles: { panel: Panel; label: string; icon: ReactNode }[] = [
    ...(isHost ? [{ panel: 'screenWall' as const, label: 'Screen Wall', icon: <DeviceDesktopIcon size={14} /> }] : []),
    { panel: 'settings', label: 'Room settings', icon: <GearIcon size={14} /> },
  ];
  return (
    <span className="collab-header-actions">
      {toggles.map(({ panel, label, icon }) => (
        <button
          key={panel}
          type="button"
          className={`collab-icon-button${open === panel ? ' active' : ''}`}
          aria-label={label}
          aria-pressed={open === panel}
          title={label}
          onClick={() => onToggle(panel)}
        >
          {icon}
        </button>
      ))}
    </span>
  );
}

function useIsHost() {
  const room = useRoomConnectionStore((state) => state.room);
  const state = useRoomState();
  return !!room && state?.hostId === room.sessionId;
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

function RoomPanel({ openPanel }: { openPanel: Panel | undefined }) {
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
          <CopyButton text={room.roomId} what="room code" />
          <CopyButton text={roomLink(room.roomId)} what="room link" icon={<LinkIcon size={14} />} />
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
                  {own && isLoginSkipped() ? (
                    <OwnName name={participant.name} onRename={(name) => room.send('setName', { name })} />
                  ) : (
                    <span className="collab-name">{participant.name}</span>
                  )}
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

      {openPanel === 'settings' && (
        <section className="collab-group" aria-labelledby="collaboration-room-settings">
          <h6 className="collab-group-title" id="collaboration-room-settings">
            Room settings
          </h6>
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
        </section>
      )}

      {isHost && openPanel === 'screenWall' && <ScreenWallEditor />}

      <button type="button" className="collab-button danger-outline" onClick={() => leaveRoom()}>
        <SignOutIcon size={14} />
        Leave room
      </button>
    </div>
  );
}

/**
 * The own display name, with a button that turns it into a field to change it
 * (login off only: with login on, the name comes from the login). Enter or
 * leaving the field saves, Escape cancels; an empty name keeps the old one.
 */
function OwnName({ name, onRename }: { name: string; onRename: (name: string) => void }) {
  const [draft, setDraft] = useState<string | undefined>();
  // Removing the field may blur it; a blur after Escape or Enter must not save again.
  const editing = useRef(false);

  if (draft === undefined) {
    return (
      <>
        <span className="collab-name">{name}</span>
        <button
          type="button"
          className="collab-icon-button small"
          aria-label="Change your name"
          title="Change your name"
          onClick={() => {
            editing.current = true;
            setDraft(name);
          }}
        >
          <PencilIcon size={12} />
        </button>
      </>
    );
  }

  const save = () => {
    if (!editing.current) return;
    editing.current = false;
    setDraft(undefined);
    const typed = draft.trim();
    if (!typed || typed === name) return;
    rememberDisplayName(typed);
    onRename(typed);
  };

  return (
    <input
      autoFocus
      className="collab-input collab-name-input"
      aria-label="Your name"
      maxLength={MAX_DISPLAY_NAME_LENGTH}
      value={draft}
      onChange={(event) => setDraft(event.target.value)}
      onBlur={save}
      onKeyDown={(event) => {
        if (event.key === 'Enter') {
          event.preventDefault();
          save();
        } else if (event.key === 'Escape') {
          event.preventDefault();
          editing.current = false;
          setDraft(undefined);
        }
      }}
    />
  );
}

function initial(name: string) {
  return name.trim().charAt(0).toUpperCase() || '?';
}

/** Copies the text, confirming it briefly with a check mark. */
function CopyButton({ text, what, icon = <CopyIcon size={14} /> }: { text: string; what: string; icon?: ReactNode }) {
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
      title={copied ? 'Copied' : `Copy ${what}`}
      aria-label={copied ? `Copied ${what}` : `Copy ${what}`}
      onClick={() =>
        navigator.clipboard?.writeText(text).then(
          () => setCopied(true),
          () => undefined
        )
      }
    >
      {copied ? <CheckIcon size={14} /> : icon}
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
