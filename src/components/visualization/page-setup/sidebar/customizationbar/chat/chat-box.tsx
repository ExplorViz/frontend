import { useEffect, useMemo, useRef, useState } from 'react';

import { DownloadIcon, TrashIcon } from '@primer/octicons-react';
import { useCameraControlsStore } from 'explorviz-frontend/src/stores/camera-controls-store';
import { isMessage, useChat, type ChatEntry } from 'explorviz-frontend/src/utils/collaboration/chat';
import { ChatEntryKind } from 'explorviz-frontend/src/utils/collaboration/room-contract.generated';
import { getEntityName, replayPing } from 'explorviz-frontend/src/view-objects/3d/city/ping-animation';
import Button from 'react-bootstrap/Button';
import Form from 'react-bootstrap/Form';

const EVERYTHING = 'Everything';
const EVENTS = 'Events';

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
  }, [entries]);

  const submit = () => {
    const text = draft.trim();
    if (!text) return;
    setDraft('');
    send(text);
  };

  return (
    <div className="chat">
      <h6 className="bold mb-2">Chat</h6>
      <div className="chat-button-area d-flex gap-2 align-items-center">
        <Form.Select
          size="sm"
          aria-label="Show"
          className="w-auto"
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
        </Form.Select>
        {!inRoom && (
          <Button variant="outline-danger" size="sm" className="btn-chat-action" onClick={clear}>
            <TrashIcon size="small" />
            <span className="ms-1">Clear chat</span>
          </Button>
        )}
        <Button
          variant="outline-secondary"
          size="sm"
          title="Download chat"
          aria-label="Download chat"
          className="btn-chat-action ms-auto"
          onClick={() => download(entries)}
        >
          <DownloadIcon size="small" />
        </Button>
      </div>

      <ul className="chat-thread" ref={threadRef} aria-label="Chat history">
        {shown.map((entry) => (
          <ChatLine
            key={entry.id}
            entry={entry}
            own={isOwn(entry)}
            onDelete={canDelete(entry) && isMessage(entry) ? () => deleteEntry(entry.id) : undefined}
          />
        ))}
      </ul>

      {inRoom && (
        <div className="message-box">
          {muted && <p className="small text-muted mb-1">The Host has muted you.</p>}
          <input
            className="message-input"
            aria-label="Chat message"
            placeholder="Type a message..."
            maxLength={1000}
            disabled={muted}
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') submit();
            }}
          />
        </div>
      )}
    </div>
  );
}

function ChatLine({ entry, own, onDelete }: { entry: ChatEntry; own: boolean; onDelete?: () => void }) {
  if (!isMessage(entry)) {
    return (
      <li className="message-container event">
        <span className="event-message">
          <span style={{ color: entry.authorColor }}>{entry.authorName}</span> {eventDescription(entry)}
        </span>
        <EventAction entry={entry} />
      </li>
    );
  }
  return (
    <li className={`message-container ${own ? 'self' : 'other'}`}>
      <div className="User" style={{ color: entry.authorColor }}>
        {entry.authorName}
      </div>
      <div className="Message">{entry.text}</div>
      <div className="d-flex align-items-center gap-2">
        <span className="chat-timestamp">{clockTime(entry.time)}</span>
        {onDelete && (
          <Button variant="link" size="sm" className="p-0" aria-label="Delete message" onClick={onDelete}>
            <TrashIcon size="small" />
          </Button>
        )}
      </div>
    </li>
  );
}

/** What the service logged, with entity names as this browser knows them. */
function eventDescription(entry: ChatEntry) {
  switch (entry.kind) {
    case ChatEntryKind.PING:
      return entry.entityId
        ? `pinged ${getEntityName(entry.entityId)}`
        : `pinged position (${entry.position.map((n) => n.toFixed(2)).join(', ')})`;
    case ChatEntryKind.HIGHLIGHT:
      return `highlighted ${getEntityName(entry.entityId)}`;
    default:
      return entry.text;
  }
}

/** Shows a logged ping again, or moves the camera to a logged highlight. */
function EventAction({ entry }: { entry: ChatEntry }) {
  if (entry.kind === ChatEntryKind.PING) {
    return (
      <Button
        variant="outline-secondary"
        size="sm"
        className="ms-2"
        onClick={() => replayPing(entry.entityId, entry.position, entry.authorColor)}
      >
        Replay
      </Button>
    );
  }
  if (entry.kind === ChatEntryKind.HIGHLIGHT && entry.entityId) {
    return (
      <Button
        variant="outline-secondary"
        size="sm"
        className="ms-2"
        onClick={() => useCameraControlsStore.getState().lookAtEntity(entry.entityId)}
      >
        Look At
      </Button>
    );
  }
  return null;
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
