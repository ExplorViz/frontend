import { useToastHandlerStore } from 'explorviz-frontend/src/stores/toast-handler';
import { useRoomConnectionStore, useRoomState } from 'explorviz-frontend/src/utils/collaboration/room-connection';
import {
  ChatEntryKind,
  ChatRefusal,
  type ChatEntry,
  type ClientMessages,
} from 'explorviz-frontend/src/utils/collaboration/room-contract.generated';
import { create } from 'zustand';

/*
 * The chat, as one collaboration module. In a Room the history is the Room's
 * state, read directly; posting, deleting and muting are requests the service
 * may refuse. On leaving, the history becomes the person's own copy, which
 * they can clear. Joining a Room drops that copy.
 */

export type { ChatEntry };

export type Chat = {
  /** The history, oldest first. */
  entries: ChatEntry[];
  /** True while in a Room; then entries are the Room's. */
  inRoom: boolean;
  /** True when the Host has muted this Participant. */
  muted: boolean;
  /** Whether this Participant wrote the entry in the current Room. */
  isOwn: (entry: ChatEntry) => boolean;
  /** Whether this Participant may delete the entry for everyone. */
  canDelete: (entry: ChatEntry) => boolean;
  /** Posts a message to the Room. A refusal is shown as a toast. */
  send: (text: string) => Promise<void>;
  /** Deletes an entry for everyone in the Room. A refusal is shown as a toast. */
  deleteEntry: (entryId: string) => Promise<void>;
  /** Clears the own copy kept after leaving. Does nothing in a Room. */
  clear: () => void;
};

/** Whether an entry is a message a Participant posted (others are written by the service). */
export const isMessage = (entry: ChatEntry) => entry.kind === ChatEntryKind.MESSAGE;

/** The history kept as the person's own copy after leaving a Room. */
const useOwnChatStore = create<{ entries: ChatEntry[] }>(() => ({ entries: [] }));

// The hand-overs: leaving keeps the Room's history, joining drops the kept one.
useRoomConnectionStore.subscribe(({ room }, { room: previous }) => {
  if (room === previous) return;
  if (room) {
    useOwnChatStore.setState({ entries: [] });
  } else if (previous) {
    const chat = (previous.state as { chat?: { toJSON(): ChatEntry[] } } | undefined)?.chat;
    useOwnChatStore.setState({ entries: chat?.toJSON() ?? [] });
  }
});

const TOAST_HEADER = 'Chat';

async function request<T extends keyof ClientMessages>(type: T, payload: ClientMessages[T]) {
  const room = useRoomConnectionStore.getState().room;
  if (!room) return;
  try {
    await room.request(type, payload);
  } catch (error) {
    useToastHandlerStore.getState().showErrorToastMessage(refusalMessage(type, error), TOAST_HEADER);
  }
}

function refusalMessage(type: keyof ClientMessages, error: unknown) {
  switch ((error as { reason?: string } | undefined)?.reason) {
    case ChatRefusal.MUTED:
      return 'The Host has muted you, so your message was not sent.';
    case ChatRefusal.NOT_ALLOWED:
      return type === 'chatDelete'
        ? 'Only the author or the Host can delete this message.'
        : 'Only the Host can do this.';
    case ChatRefusal.INVALID:
      return type === 'chatSend' ? 'The message is empty or too long.' : 'This is no longer possible.';
    default:
      return `The chat request failed: ${(error as Error | undefined)?.message ?? error}`;
  }
}

/** The chat as the rest of the frontend sees it, in a Room or not. */
export function useChat(): Chat {
  const room = useRoomConnectionStore((state) => state.room);
  const roomState = useRoomState();
  const ownEntries = useOwnChatStore((state) => state.entries);

  const ownId = room?.sessionId;
  const isHost = !!ownId && roomState?.hostId === ownId;

  return {
    entries: room ? (roomState?.chat ?? []) : ownEntries,
    inRoom: !!room,
    muted: !!ownId && !!roomState?.participants[ownId]?.muted,
    isOwn: (entry) => !!ownId && entry.authorId === ownId,
    canDelete: (entry) => !!room && (isHost || (!!ownId && entry.authorId === ownId)),
    send: (text) => request('chatSend', { text }),
    deleteEntry: (entryId) => request('chatDelete', { entryId }),
    clear: () => {
      if (!useRoomConnectionStore.getState().room) useOwnChatStore.setState({ entries: [] });
    },
  };
}

/** Mutes or unmutes a Participant of the Room (Host only; the service checks). */
export function setParticipantMuted(participantId: string, muted: boolean) {
  return request('chatMute', { participantId, muted });
}
