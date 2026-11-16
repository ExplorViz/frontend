import { useEffect, useMemo, useRef, useState } from 'react';

import { DownloadIcon, PaperAirplaneIcon, SyncIcon, TrashIcon } from '@primer/octicons-react';
import { useCameraControlsStore } from 'explorviz-frontend/src/stores/camera-controls-store';
import { isMessage, useChat, type ChatEntry } from 'explorviz-frontend/src/utils/collaboration/chat';
import { ChatEntryKind } from 'explorviz-frontend/src/utils/collaboration/room-contract.generated';
import { getEntityName, replayPing } from 'explorviz-frontend/src/view-objects/3d/city/ping-animation';

const EVERYTHING = 'Everything';
const EVENTS = 'Events';

/** Consecutive messages of one author closer together than this share one header. */
const GROUP_WINDOW_MS = 5 * 60 * 1000;

/**
 * The chat of the Collaboration section: the Room's history while in a Room,
 * or the own copy kept after leaving.
 */
export default function ChatBox() {
  const { entries, inRoom, muted, isOwn, canDelete, send, deleteEntry, clear } = useChat();
  const [filter, setFilter] = useState(EVERYTHING);
  const [draft, setDraft] = useState('');
  const threadRef = useRef<HTMLUListElement>(null);

  const authors = useMemo(
    () => Array.from(new Set(entries.filter(isMessage).map((entry) => entry.authorName))),
    [entries]
  );
  const shown = entries.filter((entry) => {
    if (filter === EVERYTHING) return true;
    if (filter === EVENTS) return !isMessage(entry);
    return isMessage(entry) && entry.authorName === filter;
  });

  useEffect(() => {
    if (threadRef.current) threadRef.current.scrollTop = threadRef.current.scrollHeight;
  }, [entries, filter]);

  const submit = () => {
    const text = draft.trim();
    if (!text) return;
    setDraft('');
    send(text);
  };

  return (
    <section className="chat" aria-label="Chat">
      <header className="chat-header">
        <h6 className="chat-title">Chat</h6>
        <select
          className="chat-filter"
          aria-label="Show"
          value={filter}
          onChange={(event) => setFilter(event.target.value)}
        >
          <option value={EVERYTHING}>Everything</option>
          <option value={EVENTS}>Events</option>
          {authors.map((name) => (
            <option key={name} value={name}>
              {name}
            </option>
          ))}
        </select>
        <button
          type="button"
          className="chat-icon-button"
          title="Download chat"
          aria-label="Download chat"
          disabled={entries.length === 0}
          onClick={() => download(entries)}
        >
          <DownloadIcon size={14} />
        </button>
        {!inRoom && (
          <button
            type="button"
            className="chat-icon-button danger"
            title="Clear chat"
            aria-label="Clear chat"
            disabled={entries.length === 0}
            onClick={clear}
          >
            <TrashIcon size={14} />
          </button>
        )}
      </header>

      <div className="chat-body">
        <ul className="chat-thread" ref={threadRef} aria-label="Chat history">
          {shown.map((entry, index) => (
            <ChatLine
              key={entry.id}
              entry={entry}
              own={isOwn(entry)}
              continued={continuesGroup(shown[index - 1], entry)}
              onDelete={canDelete(entry) && isMessage(entry) ? () => deleteEntry(entry.id) : undefined}
            />
          ))}
        </ul>
        {shown.length === 0 && (
          <p className="chat-empty">{entries.length === 0 ? 'No messages yet' : 'Nothing matches this filter'}</p>
        )}
      </div>

      {inRoom && muted && <p className="chat-muted-note">The Host has muted you.</p>}
      {inRoom && (
        <form
          className="chat-composer"
          onSubmit={(event) => {
            event.preventDefault();
            submit();
          }}
        >
          <input
            className="chat-input"
            aria-label="Chat message"
            placeholder="Message"
            maxLength={1000}
            disabled={muted}
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
          />
          <button
            type="submit"
            className="chat-send"
            title="Send"
            aria-label="Send message"
            disabled={muted || !draft.trim()}
          >
            <PaperAirplaneIcon size={14} />
          </button>
        </form>
      )}
    </section>
  );
}

function continuesGroup(previous: ChatEntry | undefined, entry: ChatEntry) {
  return (
    !!previous &&
    isMessage(previous) &&
    isMessage(entry) &&
    previous.authorId === entry.authorId &&
    entry.time - previous.time < GROUP_WINDOW_MS
  );
}

function ChatLine({
  entry,
  own,
  continued,
  onDelete,
}: {
  entry: ChatEntry;
  own: boolean;
  continued: boolean;
  onDelete?: () => void;
}) {
  if (!isMessage(entry)) {
    return (
      <li className="chat-event">
        <span className="chat-dot" style={{ backgroundColor: entry.authorColor }} aria-hidden />
        <span className="chat-event-text">
          <strong>{entry.authorName}</strong> <EventDescription entry={entry} />
        </span>
        {entry.kind === ChatEntryKind.PING && (
          <button
            type="button"
            className="chat-icon-button"
            title="Replay ping"
            aria-label="Replay ping"
            onClick={() => replayPing(entry.entityId, entry.position, entry.authorColor)}
          >
            <SyncIcon size={12} />
          </button>
        )}
        <time className="chat-time">{clockTime(entry.time)}</time>
      </li>
    );
  }
  return (
    <li className={`chat-message ${own ? 'own' : 'other'}${continued ? ' continued' : ''}`}>
      {!continued && (
        <div className="chat-meta">
          {!own && <span className="chat-dot" style={{ backgroundColor: entry.authorColor }} aria-hidden />}
          <span className="chat-author">{entry.authorName}</span>
          <time className="chat-time">{clockTime(entry.time)}</time>
        </div>
      )}
      <div className="chat-bubble-row">
        <div className="chat-bubble" title={continued ? clockTime(entry.time) : undefined}>
          {entry.text}
        </div>
        {onDelete && (
          <button
            type="button"
            className="chat-icon-button chat-delete"
            title="Delete message"
            aria-label="Delete message"
            onClick={onDelete}
          >
            <TrashIcon size={12} />
          </button>
        )}
      </div>
    </li>
  );
}

/** What the service logged, with entity names as this browser knows them. */
function eventDescription(entry: ChatEntry) {
  switch (entry.kind) {
    case ChatEntryKind.PING:
      return entry.entityId ? `pinged ${getEntityName(entry.entityId)}` : 'pinged';
    case ChatEntryKind.HIGHLIGHT:
      return `highlighted ${getEntityName(entry.entityId)}${moreSuffix(entry)}`;
    default:
      return entry.text;
  }
}

/** The event as shown in the thread: the entity name moves the camera to it. */
function EventDescription({ entry }: { entry: ChatEntry }) {
  switch (entry.kind) {
    case ChatEntryKind.PING:
      return entry.entityId ? (
        <>
          pinged <EntityLink entityId={entry.entityId} />
        </>
      ) : (
        <PositionLink position={entry.position} />
      );
    case ChatEntryKind.HIGHLIGHT:
      return (
        <>
          highlighted <EntityLink entityId={entry.entityId} />
          {moreSuffix(entry)}
        </>
      );
    default:
      return <>{entry.text}</>;
  }
}

/** "pinged" for a position ping, moving the camera to the pinged position. */
function PositionLink({ position }: { position: number[] }) {
  if (position.length !== 3) return <>pinged</>;
  const [x, y, z] = position;
  return (
    <button
      type="button"
      className="chat-entity-link"
      title="Look at pinged position"
      onClick={() => useCameraControlsStore.getState().moveCameraTo([x + 2, y + 2, z + 2], [x, y, z])}
    >
      pinged
    </button>
  );
}

function EntityLink({ entityId }: { entityId: string }) {
  const name = getEntityName(entityId);
  if (!entityId) return <>{name}</>;
  return (
    <button
      type="button"
      className="chat-entity-link"
      title={`Look at ${name}`}
      onClick={() => useCameraControlsStore.getState().lookAtEntity(entityId)}
    >
      {name}
    </button>
  );
}

function moreSuffix(entry: ChatEntry) {
  return entry.entityCount > 1 ? ` and ${entry.entityCount - 1} more` : '';
}

function clockTime(time: number) {
  const date = new Date(time);
  return `${date.getHours()}:${String(date.getMinutes()).padStart(2, '0')}`;
}

function download(entries: ChatEntry[]) {
  const text = entries
    .map(
      (entry) =>
        `${clockTime(entry.time)} ${isMessage(entry) ? `${entry.authorName}: ${entry.text}` : `${entry.authorName} ${eventDescription(entry)}`}`
    )
    .join('\n');
  const url = URL.createObjectURL(new Blob([text], { type: 'text/plain' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = 'chat.txt';
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}
