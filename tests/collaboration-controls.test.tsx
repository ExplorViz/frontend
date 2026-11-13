// @vitest-environment jsdom
import { act, fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, expect, it, onTestFinished, vi } from 'vitest';
import { useAuthStore } from '../src/stores/auth';
import { useLandscapeTokenStore } from '../src/stores/landscape-token';
import { useSnapshotTokenStore } from '../src/stores/snapshot-token';
import CollaborationControls from '../src/components/collaboration/visualization/page-setup/sidebar/customizationbar/collaboration/collaboration-controls';
import { useRoomConnectionStore } from '../src/utils/collaboration/room-connection';
import { CONTRACT_VERSION, JoinRefusal } from '../src/utils/collaboration/room-contract.generated';
import eventEmitter from '../src/utils/event-emitter';
import { fakeCollaborationService as service } from './fake-collaboration-service';
import './setup-dom';

vi.mock('@colyseus/sdk', async () => (await import('./fake-collaboration-service')).fakeColyseusSdk());

beforeEach(() => {
  service.reset();
  useRoomConnectionStore.setState(useRoomConnectionStore.getInitialState(), true);
  localStorage.clear();
  vi.stubEnv('VITE_ENABLE_SKIP_LOGIN', 'true');
});

const stubHealthCheck = (response: () => Promise<Response>) => {
  const fetch = vi.fn(response);
  vi.stubGlobal('fetch', fetch);
  return fetch;
};

it('shows the room entry form when the collaboration service answers', async () => {
  const fetch = stubHealthCheck(async () => new Response('OK', { status: 200 }));

  render(<CollaborationControls />);

  expect(await screen.findByRole('button', { name: /create room/i })).toBeInTheDocument();
  expect(screen.getByRole('textbox', { name: /room code/i })).toBeInTheDocument();
  expect(screen.getByRole('button', { name: /join/i })).toBeInTheDocument();
  expect(screen.queryByText(/not reachable/i)).not.toBeInTheDocument();
  expect(fetch).toHaveBeenCalledWith('/collaboration/__healthcheck', expect.anything());
});

it('says collaboration is disabled when the service cannot be reached', async () => {
  stubHealthCheck(async () => {
    throw new TypeError('Failed to fetch');
  });

  render(<CollaborationControls />);

  expect(await screen.findByText(/collaboration is currently disabled.*not reachable/i)).toBeInTheDocument();
  expect(screen.queryByRole('button')).not.toBeInTheDocument();
});

it('says collaboration is disabled when the proxy answers instead of the service', async () => {
  // e.g. the dev proxy's 502, or a web server answering with its index page
  stubHealthCheck(async () => new Response('<!doctype html>', { status: 200 }));

  render(<CollaborationControls />);

  expect(await screen.findByText(/not reachable/i)).toBeInTheDocument();
});

it('says collaboration is disabled when the service answers with an error', async () => {
  stubHealthCheck(async () => new Response('Bad Gateway', { status: 502 }));

  render(<CollaborationControls />);

  expect(await screen.findByText(/not reachable/i)).toBeInTheDocument();
});

const serviceAnswers = () => stubHealthCheck(async () => new Response('OK', { status: 200 }));

async function createRoomAs(name: string) {
  const user = userEvent.setup();
  serviceAnswers();
  render(<CollaborationControls />);
  await user.type(await screen.findByRole('textbox', { name: /display name/i }), name);
  await user.click(screen.getByRole('button', { name: /create room/i }));
  return user;
}

it('creates a Room and shows its code and the creator as Host', async () => {
  await createRoomAs('Ada');

  expect(await screen.findByText('ROOM01')).toBeInTheDocument();
  const participants = screen.getByRole('list', { name: /participants/i });
  const ada = within(participants).getByRole('listitem');
  expect(ada).toHaveTextContent('Ada');
  expect(ada).toHaveTextContent(/host/i);
  expect(service.endpoint).toBe(`${location.origin}/collaboration`);
  expect(service.requests).toEqual([
    {
      method: 'create',
      roomName: 'collaboration',
      options: {
        contractVersion: CONTRACT_VERSION,
        name: 'Ada',
        visibility: 'public',
        // Each capability adds its part; its own tests check it.
        startingState: expect.objectContaining({ districts: { closed: [], hidden: [] } }),
      },
    },
  ]);
});

async function askToJoinAs(name: string, code: string) {
  const user = userEvent.setup();
  serviceAnswers();
  render(<CollaborationControls />);
  await user.type(await screen.findByRole('textbox', { name: /display name/i }), name);
  await user.type(screen.getByRole('textbox', { name: /room code/i }), code);
  await user.click(screen.getByRole('button', { name: /join/i }));
  return user;
}

async function joinRoomAs(name: string, code: string) {
  const user = await askToJoinAs(name, code);
  await user.click(screen.getByRole('button', { name: /drop .* and join/i }));
  return user;
}

const participantRows = () => within(screen.getByRole('list', { name: /participants/i })).getAllByRole('listitem');

function collectToasts() {
  const toasts: { type: string; message: string }[] = [];
  const listener = (type: string, message: string) => toasts.push({ type, message });
  eventEmitter.on('newToastMessage', listener);
  onTestFinished(() => eventEmitter.off('newToastMessage', listener));
  return toasts;
}

it('joins a Room by its code, typed in any case', async () => {
  service.openRoom('K7XQ2M', 'Ada');

  await joinRoomAs('Grace', 'k7xq 2m');

  expect(await screen.findByText('K7XQ2M')).toBeInTheDocument();
  expect(service.requests.at(-1)).toEqual({
    method: 'joinById',
    code: 'K7XQ2M',
    options: { contractVersion: CONTRACT_VERSION, name: 'Grace' },
  });
  const [ada, grace] = participantRows();
  expect(ada).toHaveTextContent(/Ada.*Host/);
  expect(grace).toHaveTextContent(/Grace.*you/);
  expect(grace).not.toHaveTextContent(/host/i);
});

it('warns before joining that the own exploration will be replaced', async () => {
  service.openRoom('K7XQ2M', 'Ada');

  await askToJoinAs('Grace', 'K7XQ2M');

  const notice = screen.getByRole('alert');
  expect(notice).toHaveTextContent(/replace/i);
  expect(within(notice).getByRole('button', { name: /go back/i })).toBeInTheDocument();
  expect(within(notice).getByRole('button', { name: /snapshot first/i })).toBeInTheDocument();
  expect(within(notice).getByRole('button', { name: /drop .* and join/i })).toBeInTheDocument();
  expect(service.requests).toEqual([]);
});

it('goes back from the join notice without joining and keeps the typed code', async () => {
  service.openRoom('K7XQ2M', 'Ada');
  const user = await askToJoinAs('Grace', 'K7XQ2M');

  await user.click(screen.getByRole('button', { name: /go back/i }));

  expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  expect(screen.getByRole('textbox', { name: /room code/i })).toHaveValue('K7XQ2M');
  expect(service.requests).toEqual([]);
});

/** Fills in the form and clicks Join, so the join notice shows. */
async function askToJoin(code: string) {
  const user = userEvent.setup();
  serviceAnswers();
  render(<CollaborationControls />);
  await user.type(await screen.findByRole('textbox', { name: /display name/i }), 'Grace');
  await user.type(screen.getByRole('textbox', { name: /room code/i }), code);
  await user.click(screen.getByRole('button', { name: /join/i }));
  return user;
}

function stubSnapshotSaving(saved: boolean) {
  useAuthStore.setState({ user: { name: 'Grace', nickname: 'grace', sub: 'grace-1' } as any });
  useLandscapeTokenStore.setState({ token: { value: 'landscape-a', alias: 'A' } as any });
  const saveSnapshot = vi.fn(async () => saved);
  useSnapshotTokenStore.setState({ saveSnapshot });
  onTestFinished(() => {
    useSnapshotTokenStore.setState(useSnapshotTokenStore.getInitialState(), true);
    useLandscapeTokenStore.setState({ token: null });
  });
  return saveSnapshot;
}

it('saves a normal Snapshot from the join notice, then joins', async () => {
  service.openRoom('K7XQ2M', 'Ada');
  const saveSnapshot = stubSnapshotSaving(true);
  const user = await askToJoin('K7XQ2M');

  await user.click(screen.getByRole('button', { name: /snapshot first/i }));

  expect(await screen.findByText('K7XQ2M')).toBeInTheDocument();
  expect(saveSnapshot).toHaveBeenCalledTimes(1);
  const [snapshot] = saveSnapshot.mock.calls[0] as unknown as [any];
  expect(snapshot).toMatchObject({
    owner: 'grace-1',
    landscapeToken: { value: 'landscape-a' },
    isShared: false,
    name: expect.stringContaining('K7XQ2M'),
  });
  expect(snapshot.serializedRoom).toHaveProperty('closedComponentIds');
  expect(service.requests).toEqual([expect.objectContaining({ code: 'K7XQ2M' })]);
});

it('does not join when the Snapshot could not be saved', async () => {
  service.openRoom('K7XQ2M', 'Ada');
  stubSnapshotSaving(false);
  const user = await askToJoin('K7XQ2M');

  await user.click(screen.getByRole('button', { name: /snapshot first/i }));

  expect(service.requests).toEqual([]);
  expect(useRoomConnectionStore.getState().room).toBeUndefined();
});

it('follows the Participants as they come and go', async () => {
  const room = service.openRoom('K7XQ2M', 'Ada');
  await joinRoomAs('Grace', 'K7XQ2M');
  await screen.findByText('K7XQ2M');

  room.seat('session-linus', 'Linus');
  room.update(() => {});
  expect(await screen.findByText('Linus')).toBeInTheDocument();

  room.update((state) => state.participants.delete('session-linus'));
  expect(screen.queryByText('Linus')).not.toBeInTheDocument();
  expect(participantRows()).toHaveLength(2);
});

it('shows each Participant in the color the service assigned', async () => {
  await createRoomAs('Ada');
  await screen.findByText('ROOM01');

  // The own color is shown by the picker that changes it, not by a second swatch.
  const ownRow = participantRows()[0];
  expect(within(ownRow).getByLabelText('Your color')).toHaveValue('#e6194b');
  expect(ownRow.querySelector('[aria-hidden]')).toBeNull();
});

it('leaves the Room without reloading and offers the entry form again', async () => {
  const user = await createRoomAs('Ada');
  await screen.findByText('ROOM01');

  await user.click(screen.getByRole('button', { name: /leave room/i }));

  expect(await screen.findByRole('button', { name: /create room/i })).toBeInTheDocument();
  expect(service.rooms.get('ROOM01')!.state.participants.size).toBe(0);
  expect(useRoomConnectionStore.getState().room).toBeUndefined();
});

it('returns to the entry form with a notice when the service ends the connection', async () => {
  const toasts = collectToasts();
  await createRoomAs('Ada');
  await screen.findByText('ROOM01');

  const [connection] = service.rooms.get('ROOM01')!.clients.values();
  act(() => connection.closed(4001));

  expect(await screen.findByRole('button', { name: /create room/i })).toBeInTheDocument();
  expect(toasts).toEqual([
    { type: 'info', message: 'The connection to the room was lost. You carry on alone from what you last saw.' },
  ]);
});

it.each([
  ['an unknown code', undefined, 'There is no room with this code.'],
  ['a full Room', JoinRefusal.ROOM_FULL, 'The room is full.'],
  [
    'another contract version',
    JoinRefusal.CONTRACT_MISMATCH,
    'The collaboration service was updated. Please reload the page.',
  ],
  ['a missing or invalid login', JoinRefusal.LOGIN_REQUIRED, 'Please log in again to collaborate.'],
])('refuses %s with a toast and stays alone', async (_case, refusal, message) => {
  const toasts = collectToasts();
  if (refusal) {
    service.openRoom('K7XQ2M');
    service.refuseNext(refusal);
  }

  await joinRoomAs('Grace', 'K7XQ2M');

  await vi.waitFor(() => expect(toasts).toEqual([{ type: 'error', message }]));
  expect(screen.getByRole('button', { name: /create room/i })).toBeInTheDocument();
  expect(useRoomConnectionStore.getState().room).toBeUndefined();
});

it('remembers the typed display name for the next time', async () => {
  const user = await createRoomAs('Ada');
  await screen.findByText('ROOM01');
  await user.click(screen.getByRole('button', { name: /leave room/i }));

  expect(await screen.findByRole('textbox', { name: /display name/i })).toHaveValue('Ada');
});

it('allows creating or joining without a user display name', async () => {
  serviceAnswers();
  render(<CollaborationControls />);
  const user = userEvent.setup();
  await user.type(await screen.findByRole('textbox', { name: /room code/i }), 'K7XQ2M');

  expect(screen.getByRole('button', { name: /create room/i })).toBeEnabled();
  expect(screen.getByRole('button', { name: /join/i })).toBeEnabled();
});

it('takes the name from the login when login is on', async () => {
  vi.stubEnv('VITE_ENABLE_SKIP_LOGIN', 'false');
  useAuthStore.setState({ user: { name: 'Ada Lovelace', nickname: 'ada', sub: '1' } });
  serviceAnswers();
  render(<CollaborationControls />);
  const user = userEvent.setup();

  await user.click(await screen.findByRole('button', { name: /create room/i }));

  expect(screen.queryByRole('textbox', { name: /display name/i })).not.toBeInTheDocument();
  await vi.waitFor(() => expect(service.requests.at(-1)?.options.name).toBe('Ada Lovelace'));
});

it('sends the login token when creating and joining with login on', async () => {
  vi.stubEnv('VITE_ENABLE_SKIP_LOGIN', 'false');
  useAuthStore.setState({ user: { name: 'Ada Lovelace', nickname: 'ada', sub: '1' }, accessToken: 'token-1' });
  service.openRoom('K7XQ2M');
  serviceAnswers();
  render(<CollaborationControls />);
  const user = userEvent.setup();

  await user.click(await screen.findByRole('button', { name: /create room/i }));
  await screen.findByText('ROOM01');
  await user.click(screen.getByRole('button', { name: /leave room/i }));
  act(() => useAuthStore.setState({ accessToken: 'token-2' }));
  await user.type(await screen.findByRole('textbox', { name: /room code/i }), 'K7XQ2M');
  await user.click(screen.getByRole('button', { name: /join/i }));
  await user.click(screen.getByRole('button', { name: /drop .* and join/i }));

  await vi.waitFor(() => expect(service.requests.map((r) => r.token)).toEqual(['token-1', 'token-2']));
});

it('sends no login token with login off', async () => {
  useAuthStore.setState({ accessToken: 'dev-token' });
  await createRoomAs('Ada');
  await screen.findByText('ROOM01');

  expect(service.requests.at(-1)?.token).toBeUndefined();
});

it('lets a Participant change their own color, which everyone sees', async () => {
  await createRoomAs('Ada');
  await screen.findByText('ROOM01');
  const room = service.rooms.get('ROOM01')!;
  room.seat('session-other', 'Grace');
  const [own] = room.clients.values();

  const picker = screen.getByLabelText('Your color');
  fireEvent.change(picker, { target: { value: '#00ff7f' } });

  expect(own.sent).toEqual([{ type: 'setColor', payload: { color: '#00ff7f' } }]);
  expect(within(participantRows()[1]).queryByLabelText('Your color')).not.toBeInTheDocument();

  room.update((state) => (state.participants.get('session-other')!.color = '#123456'));
  const swatch = participantRows()[1].querySelector('[aria-hidden]') as HTMLElement;
  expect(swatch.style.backgroundColor).toBe('rgb(18, 52, 86)');
});

it('sends an optional room name when creating without a display name', async () => {
  serviceAnswers();
  render(<CollaborationControls />);
  const user = userEvent.setup();
  await user.type(await screen.findByRole('textbox', { name: /^room name$/i }), '  Team review  ');
  await user.click(screen.getByRole('button', { name: /create room/i }));
  await vi.waitFor(() => expect(service.requests.at(-1)?.options).toMatchObject({ name: '', roomName: 'Team review' }));
});

it('creates a public Room unless the creator chooses to share only its code', async () => {
  serviceAnswers();
  render(<CollaborationControls />);
  const user = userEvent.setup();

  expect(await screen.findByRole('combobox', { name: /visibility/i })).toHaveValue('public');
  await user.click(screen.getByRole('button', { name: /create room/i }));
  await vi.waitFor(() => expect(service.requests.at(-1)?.options.visibility).toBe('public'));
  expect(await screen.findByText('Public')).toBeInTheDocument();
});

it('creates a Room that is joined with its code only and shows it next to the room code', async () => {
  serviceAnswers();
  render(<CollaborationControls />);
  const user = userEvent.setup();

  await user.selectOptions(await screen.findByRole('combobox', { name: /visibility/i }), 'Join with code');
  await user.type(screen.getByRole('textbox', { name: /^room name$/i }), 'Review');
  await user.click(screen.getByRole('button', { name: /create room/i }));

  await vi.waitFor(() => expect(service.requests.at(-1)?.options.visibility).toBe('code'));
  expect(await screen.findByText('Review')).toBeInTheDocument();
  const badge = screen.getByText('Code only');
  expect(badge.closest('div')).toHaveTextContent(/ROOM01\s*Code only/);

  await user.hover(badge);
  expect(await screen.findByRole('tooltip')).toHaveTextContent(
    /not listed under Rooms.*only people you give the room code/i
  );
});

it('offers no list of rooms, only joining by code', async () => {
  serviceAnswers();
  render(<CollaborationControls />);

  expect(await screen.findByRole('textbox', { name: /room code/i })).toBeInTheDocument();
  expect(screen.queryByRole('button', { name: /browse rooms/i })).not.toBeInTheDocument();
});
