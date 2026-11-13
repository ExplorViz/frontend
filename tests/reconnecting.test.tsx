// @vitest-environment jsdom
import { act, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, expect, it, onTestFinished, vi } from 'vitest';
import CollaborationControls from '../src/components/collaboration/visualization/page-setup/sidebar/customizationbar/collaboration/collaboration-controls';
import StatusIcons from '../src/components/page-setup/status-icons';
import { useVisualizationStore } from '../src/stores/visualization-store';
import { changeDistricts, getDistricts } from '../src/utils/collaboration/districts';
import { useRoomConnectionStore } from '../src/utils/collaboration/room-connection';
import { LeaveCode } from '../src/utils/collaboration/room-contract.generated';
import eventEmitter from '../src/utils/event-emitter';
import { fakeCollaborationService as service, type FakeClientRoom } from './fake-collaboration-service';
import './setup-dom';

vi.mock('@colyseus/sdk', async () => (await import('./fake-collaboration-service')).fakeColyseusSdk());

beforeEach(() => {
  service.reset();
  useRoomConnectionStore.setState(useRoomConnectionStore.getInitialState(), true);
  useVisualizationStore.setState(useVisualizationStore.getInitialState(), true);
  localStorage.clear();
  vi.stubEnv('VITE_ENABLE_SKIP_LOGIN', 'true');
  vi.stubGlobal(
    'fetch',
    vi.fn(async () => new Response('OK', { status: 200 }))
  );
});

function collectToasts() {
  const toasts: { type: string; message: string }[] = [];
  const listener = (type: string, message: string) => toasts.push({ type, message });
  eventEmitter.on('newToastMessage', listener);
  onTestFinished(() => eventEmitter.off('newToastMessage', listener));
  return toasts;
}

/** Grace joins Ada's Room through the Collaboration section; returns her connection. */
async function joinAdasRoom() {
  const room = service.openRoom('K7XQ2M', 'Ada');
  const user = userEvent.setup();
  render(
    <>
      <StatusIcons />
      <CollaborationControls />
    </>
  );
  await user.type(await screen.findByRole('textbox', { name: /display name/i }), 'Grace');
  await user.type(screen.getByRole('textbox', { name: /room code/i }), 'K7XQ2M');
  await user.click(screen.getByRole('button', { name: /join/i }));
  await user.click(screen.getByRole('button', { name: /drop .* and join/i }));
  await screen.findByText('K7XQ2M');
  const [, grace] = room.clients.values();
  return { room, grace: grace as FakeClientRoom, user };
}

const participantNames = () =>
  within(screen.getByRole('list', { name: /participants/i }))
    .getAllByRole('listitem')
    .map((item) => item.textContent);

it('shows a Reconnecting notice and keeps the last seen Room on screen while the connection is down', async () => {
  const { room, grace } = await joinAdasRoom();
  room.update((state) => state.districts.closed.set('a', true));
  const before = participantNames();

  grace.drop();

  expect(screen.getAllByText(/reconnecting/i).length).toBeGreaterThan(0);
  expect(screen.getByRole('status', { name: /reconnecting/i })).toBeInTheDocument();
  expect(screen.getByText('K7XQ2M')).toBeInTheDocument();
  expect(participantNames()).toEqual(before);
  expect([...getDistricts().closedDistrictIds]).toEqual(['a']);

  grace.reconnect();

  expect(screen.queryByText(/reconnecting/i)).not.toBeInTheDocument();
});

it('ignores shared actions while reconnecting', async () => {
  const toasts = collectToasts();
  const { room, grace, user } = await joinAdasRoom();

  grace.drop();
  changeDistricts([{ type: 'close', ids: ['a'] }]);
  await user.type(screen.getByRole('textbox', { name: 'Chat message' }), 'hello{Enter}');
  grace.reconnect();
  room.handleMessages();

  expect(grace.sent).toEqual([]);
  expect([...getDistricts().closedDistrictIds]).toEqual([]);
  expect(toasts).toEqual([]);
});

it('shows the current Room state after reconnecting', async () => {
  const { room, grace } = await joinAdasRoom();

  grace.drop();
  room.update((state) => state.districts.closed.set('b', true));
  room.seat('session-linus', 'Linus');
  expect(screen.queryByText('Linus')).not.toBeInTheDocument();
  grace.reconnect();

  expect(await screen.findByText('Linus')).toBeInTheDocument();
  expect([...getDistricts().closedDistrictIds]).toEqual(['b']);
});

it('carries on alone from the last seen state when reconnecting fails', async () => {
  const toasts = collectToasts();
  const { room, grace } = await joinAdasRoom();
  room.update((state) => state.districts.closed.set('a', true));

  grace.drop();
  // The seat expired or the service restarted: the retry is refused.
  act(() => grace.closed(4003));

  expect(await screen.findByRole('button', { name: /create room/i })).toBeInTheDocument();
  expect(screen.queryByText(/reconnecting/i)).not.toBeInTheDocument();
  expect(useRoomConnectionStore.getState().reconnecting).toBe(false);
  expect([...getDistricts().closedDistrictIds]).toEqual(['a']);
  expect(toasts).toEqual([
    { type: 'info', message: 'The connection to the room was lost. You carry on alone from what you last saw.' },
  ]);
});

it('offers a kicked Participant no reconnection', async () => {
  const toasts = collectToasts();
  const { grace } = await joinAdasRoom();

  act(() => grace.closed(LeaveCode.KICKED));

  expect(await screen.findByRole('button', { name: /create room/i })).toBeInTheDocument();
  expect(screen.queryByText(/reconnecting/i)).not.toBeInTheDocument();
  expect(toasts).toEqual([{ type: 'info', message: 'The Host removed you from the room.' }]);
});
