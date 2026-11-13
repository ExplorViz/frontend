// @vitest-environment jsdom
import { act, render, screen, within } from '@testing-library/react';
import { beforeEach, expect, it, vi } from 'vitest';
import CollaborationControls from '../src/components/collaboration/visualization/page-setup/sidebar/customizationbar/collaboration/collaboration-controls';
import StatusIcons from '../src/components/page-setup/status-icons';
import { useRoomConnectionStore } from '../src/utils/collaboration/room-connection';
import { fakeCollaborationService as service, type FakeClientRoom } from './fake-collaboration-service';
import './setup-dom';

vi.mock('@colyseus/sdk', async () => (await import('./fake-collaboration-service')).fakeColyseusSdk());

/*
 * The SDK resolves `create` and `joinById` before the Room's first full state
 * arrives; until then the decoded state has no fields at all.
 */

beforeEach(() => {
  service.reset();
  useRoomConnectionStore.setState(useRoomConnectionStore.getInitialState(), true);
  vi.stubGlobal(
    'fetch',
    vi.fn(async () => new Response('OK', { status: 200 }))
  );
});

it('shows the Room once its first state arrives, without failing before', async () => {
  service.openRoom('K7XQ2M', 'Ada');
  service.holdFirstStateOfNextEntry();
  render(
    <>
      <StatusIcons />
      <CollaborationControls />
    </>
  );
  await act(() => useRoomConnectionStore.getState().joinRoom('K7XQ2M', 'Grace'));

  expect(screen.getByLabelText('Room code')).toHaveTextContent('K7XQ2M');
  expect(within(screen.getByRole('list', { name: /participants/i })).queryAllByRole('listitem')).toHaveLength(0);

  (useRoomConnectionStore.getState().room as unknown as FakeClientRoom).deliverFirstState();

  const rows = within(screen.getByRole('list', { name: /participants/i })).getAllByRole('listitem');
  expect(rows.map((row) => row.textContent)).toEqual([
    expect.stringContaining('Ada'),
    expect.stringContaining('Grace'),
  ]);
});

it('creates a Room whose first state comes after the creation', async () => {
  service.holdFirstStateOfNextEntry();
  render(
    <>
      <StatusIcons />
      <CollaborationControls />
    </>
  );
  await act(() => useRoomConnectionStore.getState().createRoom('Ada'));

  (useRoomConnectionStore.getState().room as unknown as FakeClientRoom).deliverFirstState();

  expect(within(screen.getByRole('list', { name: /participants/i })).getByText('Ada')).toBeInTheDocument();
});
