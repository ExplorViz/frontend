// @vitest-environment jsdom
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, expect, it, onTestFinished, vi } from 'vitest';
import CollaborationControls from '../src/components/collaboration/visualization/page-setup/sidebar/customizationbar/collaboration/collaboration-controls';
import { useRoomConnectionStore } from '../src/utils/collaboration/room-connection';
import { ChatRefusal } from '../src/utils/collaboration/room-contract.generated';
import eventEmitter from '../src/utils/event-emitter';
import { fakeCollaborationService as service, type FakeServerRoom } from './fake-collaboration-service';
import './setup-dom';

vi.mock('@colyseus/sdk', async () => (await import('./fake-collaboration-service')).fakeColyseusSdk());

beforeEach(() => {
  service.reset();
  useRoomConnectionStore.setState(useRoomConnectionStore.getInitialState(), true);
  localStorage.clear();
  vi.stubEnv('VITE_ENABLE_SKIP_LOGIN', 'true');
  vi.stubGlobal(
    'fetch',
    vi.fn(async () => new Response('OK', { status: 200 }))
  );
});

async function joinRoomAs(name: string, code: string) {
  const user = userEvent.setup();
  render(<CollaborationControls />);
  await user.type(await screen.findByRole('textbox', { name: /display name/i }), name);
  await user.type(screen.getByRole('textbox', { name: /room code/i }), code);
  await user.click(screen.getByRole('button', { name: /^join$/i }));
  await screen.findByText(code);
  return user;
}

async function createRoomAs(name: string) {
  const user = userEvent.setup();
  render(<CollaborationControls />);
  await user.type(await screen.findByRole('textbox', { name: /display name/i }), name);
  await user.click(screen.getByRole('button', { name: /create room/i }));
  await screen.findByText('ROOM01');
  return user;
}

const chatEntries = () => within(screen.getByRole('list', { name: /chat history/i })).queryAllByRole('listitem');
const messageInput = () => screen.getByRole('textbox', { name: /chat message/i });

/** Lets the fake Room keep chat entries the way the service does, without its rules. */
function postAsService(room: FakeServerRoom, authorId: string, text: string) {
  room.update((state) => {
    const author = state.participants.get(authorId);
    room.appendChatEntry({
      authorId,
      authorName: author?.name ?? 'Gone',
      authorColor: author?.color ?? '#000000',
      text,
    });
  });
}

function collectToasts() {
  const toasts: { type: string; message: string }[] = [];
  const listener = (type: string, message: string) => toasts.push({ type, message });
  eventEmitter.on('newToastMessage', listener);
  onTestFinished(() => eventEmitter.off('newToastMessage', listener));
  return toasts;
}

it('shows the earlier messages to someone who joins late', async () => {
  const room = service.openRoom('K7XQ2M', 'Ada');
  postAsService(room, 'session-1', 'Welcome!');

  await joinRoomAs('Grace', 'K7XQ2M');

  const [entry] = chatEntries();
  expect(entry).toHaveTextContent('Ada');
  expect(entry).toHaveTextContent('Welcome!');
});

it('sends a typed message to the Room and shows it once the service has added it', async () => {
  const room = service.openRoom('K7XQ2M', 'Ada');
  room.answer('chatSend', (sessionId, payload) => postAsService(room, sessionId, payload.text));
  const user = await joinRoomAs('Grace', 'K7XQ2M');

  await user.type(messageInput(), 'Hello there{Enter}');

  const grace = [...room.clients.values()][1];
  expect(grace.sent).toEqual([{ type: 'chatSend', payload: { text: 'Hello there' } }]);
  await vi.waitFor(() => expect(chatEntries()).toHaveLength(1));
  expect(chatEntries()[0]).toHaveTextContent(/Grace.*Hello there/);
  expect(messageInput()).toHaveValue('');
});

it('tells a muted Participant that their message was refused', async () => {
  const toasts = collectToasts();
  const room = service.openRoom('K7XQ2M', 'Ada');
  room.answer('chatSend', () => ChatRefusal.MUTED);
  const user = await joinRoomAs('Grace', 'K7XQ2M');

  await user.type(messageInput(), 'Let me speak{Enter}');

  await vi.waitFor(() =>
    expect(toasts).toEqual([{ type: 'error', message: 'The Host has muted you, so your message was not sent.' }])
  );
  expect(chatEntries()).toHaveLength(0);
});

it('shows a muted Participant that they are muted and keeps them from typing', async () => {
  const room = service.openRoom('K7XQ2M', 'Ada');
  await joinRoomAs('Grace', 'K7XQ2M');

  room.update((state) => (state.participants.get('session-2')!.muted = true));

  expect(messageInput()).toBeDisabled();
  expect(screen.getByText(/the host has muted you/i)).toBeInTheDocument();
  const grace = within(screen.getByRole('list', { name: /participants/i })).getAllByRole('listitem')[1];
  expect(grace).toHaveTextContent(/muted/i);
});

it('lets the Host mute and unmute another Participant', async () => {
  const user = await createRoomAs('Ada');
  const room = service.rooms.get('ROOM01')!;
  room.answer('chatMute', (_sessionId, { participantId, muted }) =>
    room.update((state) => (state.participants.get(participantId)!.muted = muted))
  );
  room.seat('session-grace', 'Grace');
  room.update(() => {});

  expect(screen.queryByRole('button', { name: /mute ada/i })).not.toBeInTheDocument();
  await user.click(await screen.findByRole('button', { name: 'Mute Grace' }));
  await user.click(await screen.findByRole('button', { name: 'Unmute Grace' }));

  const host = [...room.clients.values()][0];
  expect(host.sent).toEqual([
    { type: 'chatMute', payload: { participantId: 'session-grace', muted: true } },
    { type: 'chatMute', payload: { participantId: 'session-grace', muted: false } },
  ]);
  expect(await screen.findByRole('button', { name: 'Mute Grace' })).toBeInTheDocument();
});

it('offers no mute buttons to a Participant who is not the Host', async () => {
  service.openRoom('K7XQ2M', 'Ada');
  await joinRoomAs('Grace', 'K7XQ2M');

  expect(screen.queryByRole('button', { name: /mute/i })).not.toBeInTheDocument();
});

it("lets a Participant delete their own messages but not someone else's", async () => {
  const room = service.openRoom('K7XQ2M', 'Ada');
  room.answer('chatDelete', (_sessionId, { entryId }) =>
    room.update((state) => {
      const index = state.chat.findIndex((entry) => entry.id === entryId);
      state.chat.splice(index, 1);
    })
  );
  const user = await joinRoomAs('Grace', 'K7XQ2M');
  postAsService(room, 'session-1', 'From Ada');
  postAsService(room, 'session-2', 'From Grace');

  const [fromAda, fromGrace] = chatEntries();
  expect(within(fromAda).queryByRole('button', { name: /delete/i })).not.toBeInTheDocument();
  await user.click(within(fromGrace).getByRole('button', { name: /delete/i }));

  await vi.waitFor(() => expect(chatEntries()).toHaveLength(1));
  expect(chatEntries()[0]).toHaveTextContent('From Ada');
});

it("lets the Host delete anyone's message", async () => {
  const user = await createRoomAs('Ada');
  const room = service.rooms.get('ROOM01')!;
  room.seat('session-grace', 'Grace');
  postAsService(room, 'session-grace', 'Spam');

  await user.click(within(chatEntries()[0]).getByRole('button', { name: /delete/i }));

  const host = [...room.clients.values()][0];
  expect(host.sent).toContainEqual({ type: 'chatDelete', payload: { entryId: room.state.chat[0].id } });
});

it('shows entries the service wrote as events, without an author', async () => {
  const room = service.openRoom('K7XQ2M', 'Ada');
  room.update(() => room.appendChatEntry({ kind: 'ping', authorId: '', authorName: '', text: 'Ada pinged a class' }));

  await joinRoomAs('Grace', 'K7XQ2M');

  expect(chatEntries()[0]).toHaveTextContent('Ada pinged a class');
  expect(chatEntries()[0]).toHaveClass('event');
});

it('keeps the history as your own copy after leaving, until you clear it', async () => {
  const room = service.openRoom('K7XQ2M', 'Ada');
  postAsService(room, 'session-1', 'Remember this');
  const user = await joinRoomAs('Grace', 'K7XQ2M');

  await user.click(screen.getByRole('button', { name: /leave room/i }));

  expect(await screen.findByRole('button', { name: /create room/i })).toBeInTheDocument();
  expect(chatEntries()[0]).toHaveTextContent('Remember this');
  expect(screen.queryByRole('textbox', { name: /chat message/i })).not.toBeInTheDocument();
  expect(within(chatEntries()[0]).queryByRole('button', { name: /delete/i })).not.toBeInTheDocument();

  await user.click(screen.getByRole('button', { name: /clear chat/i }));

  expect(screen.queryByRole('list', { name: /chat history/i })).not.toBeInTheDocument();
});

it('keeps the history when the service ends the connection', async () => {
  const room = service.openRoom('K7XQ2M', 'Ada');
  postAsService(room, 'session-1', 'Remember this');
  await joinRoomAs('Grace', 'K7XQ2M');

  room.update(() => room.clients.get('session-2')!.closed(4001));

  expect(await screen.findByRole('button', { name: /create room/i })).toBeInTheDocument();
  expect(chatEntries()[0]).toHaveTextContent('Remember this');
});

it('offers no way to clear the chat for everyone while in a Room', async () => {
  const room = service.openRoom('K7XQ2M', 'Ada');
  postAsService(room, 'session-1', 'Hi');
  await joinRoomAs('Grace', 'K7XQ2M');

  expect(screen.queryByRole('button', { name: /clear chat/i })).not.toBeInTheDocument();
});

it('drops the kept history when joining another Room', async () => {
  const first = service.openRoom('K7XQ2M', 'Ada');
  postAsService(first, 'session-1', 'Old room');
  const user = await joinRoomAs('Grace', 'K7XQ2M');
  await user.click(screen.getByRole('button', { name: /leave room/i }));
  service.openRoom('P3RT9W', 'Linus');

  await user.clear(screen.getByRole('textbox', { name: /room code/i }));
  await user.type(screen.getByRole('textbox', { name: /room code/i }), 'P3RT9W');
  await user.click(screen.getByRole('button', { name: /^join$/i }));
  await screen.findByText('P3RT9W');

  expect(chatEntries()).toHaveLength(0);
});

it('filters the history by author and by events', async () => {
  const room = service.openRoom('K7XQ2M', 'Ada');
  const user = await joinRoomAs('Grace', 'K7XQ2M');
  postAsService(room, 'session-1', 'From Ada');
  postAsService(room, 'session-2', 'From Grace');
  room.update(() => room.appendChatEntry({ kind: 'ping', authorId: '', authorName: '', text: 'A ping' }));

  await user.selectOptions(screen.getByRole('combobox', { name: /show/i }), 'Grace');
  expect(chatEntries().map((e) => e.textContent)).toEqual([expect.stringContaining('From Grace')]);

  await user.selectOptions(screen.getByRole('combobox', { name: /show/i }), 'Events');
  expect(chatEntries().map((e) => e.textContent)).toEqual([expect.stringContaining('A ping')]);

  await user.selectOptions(screen.getByRole('combobox', { name: /show/i }), 'Everything');
  expect(chatEntries()).toHaveLength(3);
});

it('downloads the history as text', async () => {
  const room = service.openRoom('K7XQ2M', 'Ada');
  const user = await joinRoomAs('Grace', 'K7XQ2M');
  postAsService(room, 'session-1', 'Hello');
  const createObjectURL = vi.fn((_blob: Blob) => 'blob:chat');
  vi.stubGlobal('URL', Object.assign(URL, { createObjectURL, revokeObjectURL: vi.fn() }));
  const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});

  await user.click(screen.getByRole('button', { name: /download chat/i }));

  expect(click).toHaveBeenCalled();
  const text = await createObjectURL.mock.calls[0][0].text();
  expect(text).toMatch(/^\d{1,2}:\d{2} Ada: Hello$/);
});
