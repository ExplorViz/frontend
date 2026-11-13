// @vitest-environment jsdom
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, expect, it, vi } from 'vitest';
import RoomSelection from '../src/components/room-selection';
import { useAuthStore } from '../src/stores/auth';
import { useLandscapeTokenStore } from '../src/stores/landscape-token';
import { useRoomConnectionStore } from '../src/utils/collaboration/room-connection';
import type { RoomListing } from '../src/utils/collaboration/room-contract.generated';
import { fakeCollaborationService as service } from './fake-collaboration-service';
import './setup-dom';

vi.mock('@colyseus/sdk', async () => (await import('./fake-collaboration-service')).fakeColyseusSdk());

const teamReview: RoomListing = {
  roomCode: 'K7XQ2M',
  roomName: 'Team review',
  landscapeName: 'Petclinic',
  hostName: 'Ada Lovelace',
  users: 3,
};
const joinButton = 'Join Team review hosted by Ada Lovelace';

beforeEach(() => {
  service.reset();
  useRoomConnectionStore.setState(useRoomConnectionStore.getInitialState(), true);
  useLandscapeTokenStore.setState({ token: null, retrieveTokens: async () => [] } as any);
  useAuthStore.setState({
    user: { name: 'Grace Hopper', nickname: 'grace', sub: 'grace-1' } as any,
    accessToken: 'token-1',
  });
  localStorage.clear();
  vi.stubEnv('VITE_ENABLE_SKIP_LOGIN', 'true');
  serviceLists([teamReview]);
});

/** The collaboration service answers its health check and lists these Rooms (or answers the listing with an error). */
function serviceLists(rooms: RoomListing[] | number) {
  const fetch = vi.fn(async (url: string) => {
    if (url.endsWith('/__healthcheck')) return new Response('OK');
    if (url.endsWith('/rooms'))
      return typeof rooms === 'number' ? new Response('', { status: rooms }) : Response.json(rooms);
    throw new Error(`unexpected request to ${url}`);
  });
  vi.stubGlobal('fetch', fetch);
  return fetch;
}

/** A Room on the service, exploring this Landscape. */
function openRoom(code: string, landscapeToken: string) {
  const room = service.openRoom(code, 'Ada');
  room.update((state) => {
    state.landscapeToken = landscapeToken;
  });
  return room;
}

function renderTab() {
  const openRoomLandscape = vi.fn();
  render(<RoomSelection openRoomLandscape={openRoomLandscape} />);
  return { openRoomLandscape, user: userEvent.setup() };
}

const rows = () => within(screen.getByRole('table')).getAllByRole('row').slice(1);

it('lists the public rooms with their name, Host, Landscape and number of users, but not their code', async () => {
  serviceLists([
    teamReview,
    { roomCode: 'ABCDEF', roomName: '', landscapeName: '', hostName: 'Anonymous 4821', users: 1 },
  ]);
  renderTab();

  await screen.findByRole('table');
  expect(
    rows().map((row) =>
      within(row)
        .getAllByRole('cell')
        .slice(0, 4)
        .map((cell) => cell.textContent)
    )
  ).toEqual([
    ['Team review', 'Ada Lovelace', 'Petclinic', '3'],
    ['Unnamed room', 'Anonymous 4821', 'Unnamed landscape', '1'],
  ]);
  expect(screen.queryByText('K7XQ2M')).not.toBeInTheDocument();
});

it('sorts the rooms by a column on clicking its header, and reverses the order on clicking it again', async () => {
  serviceLists([
    { roomCode: 'AAAAAA', roomName: 'beta', landscapeName: 'Petclinic', hostName: 'Zoe', users: 10 },
    { roomCode: 'BBBBBB', roomName: 'Alpha', landscapeName: '', hostName: 'ada', users: 2 },
    { roomCode: 'CCCCCC', roomName: '', landscapeName: 'Kieker', hostName: 'Max', users: 9 },
  ]);
  const { user } = renderTab();
  await screen.findByRole('table');
  const column = (index: number) => rows().map((row) => within(row).getAllByRole('cell')[index].textContent);
  const header = (name: string) => screen.getByRole('columnheader', { name });

  // Until a column is chosen, the service's order.
  expect(column(0)).toEqual(['beta', 'Alpha', 'Unnamed room']);

  await user.click(header('Room name'));
  expect(column(0)).toEqual(['Alpha', 'beta', 'Unnamed room']);
  expect(header('Room name')).toHaveAttribute('aria-sort', 'ascending');

  await user.click(header('Room name'));
  expect(column(0)).toEqual(['Unnamed room', 'beta', 'Alpha']);
  expect(header('Room name')).toHaveAttribute('aria-sort', 'descending');

  await user.click(header('Host'));
  expect(column(1)).toEqual(['ada', 'Max', 'Zoe']);
  expect(header('Room name')).toHaveAttribute('aria-sort', 'none');

  await user.click(header('Landscape'));
  expect(column(2)).toEqual(['Kieker', 'Petclinic', 'Unnamed landscape']);

  // Users count numerically: 10 comes after 9.
  await user.click(header('Users'));
  expect(column(3)).toEqual(['2', '9', '10']);

  header('Users').focus();
  await user.keyboard('{Enter}');
  expect(column(3)).toEqual(['10', '9', '2']);
});

it('says so when there are no public rooms', async () => {
  serviceLists([]);
  renderTab();

  expect(await screen.findByText('No public rooms.')).toBeInTheDocument();
});

it('says collaboration is disabled when the service cannot be reached', async () => {
  vi.stubGlobal(
    'fetch',
    vi.fn(async () => {
      throw new TypeError('Failed to fetch');
    })
  );
  renderTab();

  expect(await screen.findByText(/collaboration is currently disabled.*not reachable/i)).toBeInTheDocument();
  expect(screen.queryByRole('table')).not.toBeInTheDocument();
});

it('shows a failed listing and loads it again on Refresh', async () => {
  serviceLists(503);
  const { user } = renderTab();
  expect(await screen.findByRole('alert')).toHaveTextContent(/could not load the rooms/i);

  serviceLists([teamReview]);
  await user.click(screen.getByRole('button', { name: 'Refresh' }));

  expect(await screen.findByText('Team review')).toBeInTheDocument();
  expect(screen.queryByRole('alert')).not.toBeInTheDocument();
});

it('asks for the display name with login off, then joins and opens the Room’s Landscape', async () => {
  localStorage.setItem('explorviz.collaboration.displayName', 'Grace');
  openRoom('K7XQ2M', 'landscape-a');
  const { openRoomLandscape, user } = renderTab();

  await user.click(await screen.findByRole('button', { name: joinButton }));
  const dialog = screen.getByRole('dialog', { name: 'Join Team review' });
  const name = within(dialog).getByRole('textbox', { name: /user display name/i });
  expect(name).toHaveValue('Grace');
  await user.clear(name);
  await user.type(name, 'Linus');
  await user.click(within(dialog).getByRole('button', { name: 'Join' }));

  await vi.waitFor(() => expect(openRoomLandscape).toHaveBeenCalledWith('landscape-a'));
  expect(service.requests).toEqual([
    expect.objectContaining({
      method: 'joinById',
      code: 'K7XQ2M',
      options: expect.objectContaining({ name: 'Linus' }),
    }),
  ]);
  expect(localStorage.getItem('explorviz.collaboration.displayName')).toBe('Linus');
});

it('joins by clicking anywhere on the row, for screens too narrow for the Join button', async () => {
  vi.stubEnv('VITE_ENABLE_SKIP_LOGIN', 'false');
  openRoom('K7XQ2M', 'landscape-a');
  const { openRoomLandscape, user } = renderTab();

  await user.click(await screen.findByText('Petclinic'));

  await vi.waitFor(() => expect(openRoomLandscape).toHaveBeenCalledWith('landscape-a'));
  expect(service.requests).toEqual([expect.objectContaining({ method: 'joinById', code: 'K7XQ2M' })]);
});

it('joins with Enter on a focused row', async () => {
  openRoom('K7XQ2M', 'landscape-a');
  const { user } = renderTab();

  (await screen.findByRole('row', { name: joinButton })).focus();
  await user.keyboard('{Enter}');

  expect(screen.getByRole('dialog', { name: 'Join Team review' })).toBeInTheDocument();
});

it('joins only once when the Join button inside the row is clicked', async () => {
  vi.stubEnv('VITE_ENABLE_SKIP_LOGIN', 'false');
  openRoom('K7XQ2M', 'landscape-a');
  const { openRoomLandscape, user } = renderTab();

  await user.click(await screen.findByRole('button', { name: joinButton }));

  await vi.waitFor(() => expect(openRoomLandscape).toHaveBeenCalledTimes(1));
  expect(service.requests).toHaveLength(1);
});

it('does not join when the dialog is cancelled', async () => {
  openRoom('K7XQ2M', 'landscape-a');
  const { openRoomLandscape, user } = renderTab();

  await user.click(await screen.findByRole('button', { name: joinButton }));
  await user.click(screen.getByRole('button', { name: 'Cancel' }));

  expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  expect(service.requests).toEqual([]);
  expect(openRoomLandscape).not.toHaveBeenCalled();
});

it('joins at once under the login name with login on', async () => {
  vi.stubEnv('VITE_ENABLE_SKIP_LOGIN', 'false');
  openRoom('K7XQ2M', 'landscape-a');
  const { openRoomLandscape, user } = renderTab();

  await user.click(await screen.findByRole('button', { name: joinButton }));

  await vi.waitFor(() => expect(openRoomLandscape).toHaveBeenCalledWith('landscape-a'));
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  expect(service.requests).toEqual([
    expect.objectContaining({
      method: 'joinById',
      code: 'K7XQ2M',
      options: expect.objectContaining({ name: 'Grace Hopper' }),
    }),
  ]);
});

it('only opens the Landscape of the room the person is already in', async () => {
  vi.stubEnv('VITE_ENABLE_SKIP_LOGIN', 'false');
  openRoom('K7XQ2M', 'landscape-a');
  await useRoomConnectionStore.getState().joinRoom('K7XQ2M', 'Grace');
  service.requests.length = 0;
  const { openRoomLandscape, user } = renderTab();

  await user.click(await screen.findByRole('button', { name: joinButton }));

  await vi.waitFor(() => expect(openRoomLandscape).toHaveBeenCalledWith('landscape-a'));
  expect(screen.getByRole('button', { name: joinButton })).toHaveTextContent('Open');
  expect(service.requests).toEqual([]);
});

it('asks before leaving another room for the listed one', async () => {
  vi.stubEnv('VITE_ENABLE_SKIP_LOGIN', 'false');
  const other = openRoom('OTHER1', 'landscape-b');
  openRoom('K7XQ2M', 'landscape-a');
  await useRoomConnectionStore.getState().joinRoom('OTHER1', 'Grace');
  const { openRoomLandscape, user } = renderTab();

  await user.click(await screen.findByRole('button', { name: joinButton }));
  const dialog = screen.getByRole('dialog');
  expect(dialog).toHaveTextContent(/you are in room OTHER1/i);
  expect(within(dialog).queryByRole('textbox')).not.toBeInTheDocument();
  await user.click(within(dialog).getByRole('button', { name: 'Leave and join' }));

  await vi.waitFor(() => expect(openRoomLandscape).toHaveBeenCalledWith('landscape-a'));
  expect(useRoomConnectionStore.getState().room?.roomId).toBe('K7XQ2M');
  expect(other.clients.size).toBe(1);
});
