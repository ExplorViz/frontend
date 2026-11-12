// @vitest-environment jsdom
import { act, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, expect, it, onTestFinished, vi } from 'vitest';
import CollaborationControls from '../src/components/collaboration/visualization/page-setup/sidebar/customizationbar/collaboration/collaboration-controls';
import { useRoomConnectionStore } from '../src/utils/collaboration/room-connection';
import { LeaveCode } from '../src/utils/collaboration/room-contract.generated';
import eventEmitter from '../src/utils/event-emitter';
import { fakeCollaborationService as service } from './fake-collaboration-service';
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

/** Someone else joins the Room. */
async function seatGuest(code: string, name: string) {
  const room = service.rooms.get(code)!;
  room.seat(`session-${name.toLowerCase()}`, name);
  room.update(() => {});
  await screen.findByText(name);
}

async function createRoomAs(name: string) {
  const user = userEvent.setup();
  render(<CollaborationControls />);
  await user.type(await screen.findByRole('textbox', { name: /display name/i }), name);
  await user.click(screen.getByRole('button', { name: /create room/i }));
  await screen.findByText('ROOM01');
  return user;
}

async function joinRoomAs(name: string, code: string) {
  const user = userEvent.setup();
  render(<CollaborationControls />);
  await user.type(await screen.findByRole('textbox', { name: /display name/i }), name);
  await user.type(screen.getByRole('textbox', { name: /room code/i }), code);
  await user.click(screen.getByRole('button', { name: /join/i }));
  await screen.findByText(code);
  return user;
}

const row = (name: string) =>
  within(screen.getByRole('list', { name: /participants/i }))
    .getAllByRole('listitem')
    .find((item) => item.textContent?.includes(name))!;

it('offers the Host kick and handover for every other Participant', async () => {
  await createRoomAs('Ada');
  await seatGuest('ROOM01', 'Grace');

  expect(within(row('Grace')).getByRole('button', { name: 'Kick Grace' })).toBeInTheDocument();
  expect(within(row('Grace')).getByRole('button', { name: 'Make Grace Host' })).toBeInTheDocument();
  expect(within(row('Ada')).queryByRole('button')).not.toBeInTheDocument();
});

it('shows no kick or handover controls to anyone but the Host', async () => {
  service.openRoom('K7XQ2M', 'Ada');
  await joinRoomAs('Grace', 'K7XQ2M');

  expect(screen.queryByRole('button', { name: /kick/i })).not.toBeInTheDocument();
  expect(screen.queryByRole('button', { name: /make .* host/i })).not.toBeInTheDocument();
});

it('asks the service to kick a Participant or hand them the Host right', async () => {
  const user = await createRoomAs('Ada');
  await seatGuest('ROOM01', 'Grace');
  const [me] = service.rooms.get('ROOM01')!.clients.values();

  await user.click(screen.getByRole('button', { name: 'Make Grace Host' }));
  await user.click(screen.getByRole('button', { name: 'Kick Grace' }));

  expect(me.sent).toEqual([
    { type: 'handOverHost', payload: { sessionId: 'session-grace' } },
    { type: 'kick', payload: { sessionId: 'session-grace' } },
  ]);
});

it('follows the Host right as it is handed over', async () => {
  await createRoomAs('Ada');
  await seatGuest('ROOM01', 'Grace');
  const room = service.rooms.get('ROOM01')!;

  room.update((state) => (state.hostId = 'session-grace'));
  expect(within(row('Grace')).getByText('Host')).toBeInTheDocument();
  expect(screen.queryByRole('button', { name: /kick/i })).not.toBeInTheDocument();

  room.update((state) => (state.hostId = room.clients.keys().next().value!));
  expect(await screen.findByRole('button', { name: 'Kick Grace' })).toBeInTheDocument();
});

it('tells a kicked Participant so and lets them rejoin with the code', async () => {
  const toasts: { type: string; message: string }[] = [];
  const listener = (type: string, message: string) => toasts.push({ type, message });
  eventEmitter.on('newToastMessage', listener);
  onTestFinished(() => eventEmitter.off('newToastMessage', listener));
  service.openRoom('K7XQ2M', 'Ada');
  const user = await joinRoomAs('Grace', 'K7XQ2M');
  const [, me] = service.rooms.get('K7XQ2M')!.clients.values();

  act(() => {
    service.rooms.get('K7XQ2M')!.remove(me.sessionId);
    me.closed(LeaveCode.KICKED);
  });

  expect(await screen.findByRole('button', { name: /create room/i })).toBeInTheDocument();
  expect(toasts).toEqual([{ type: 'info', message: 'The Host removed you from the room.' }]);
  await user.type(screen.getByRole('textbox', { name: /room code/i }), 'K7XQ2M');
  await user.click(screen.getByRole('button', { name: /join/i }));
  expect(await screen.findByText('K7XQ2M')).toBeInTheDocument();
});
