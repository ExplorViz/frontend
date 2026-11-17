// @vitest-environment jsdom
import { act, render, screen } from '@testing-library/react';
import { beforeEach, expect, it, vi } from 'vitest';
import StatusIcons from '../src/components/page-setup/status-icons';
import { useRoomConnectionStore } from '../src/utils/collaboration/room-connection';
import { fakeCollaborationService as service, type FakeClientRoom } from './fake-collaboration-service';
import './setup-dom';

vi.mock('@colyseus/sdk', async () => (await import('./fake-collaboration-service')).fakeColyseusSdk());

beforeEach(() => {
  service.reset();
  useRoomConnectionStore.setState(useRoomConnectionStore.getInitialState(), true);
});

const roomIcon = () => screen.queryByLabelText(/connected to room/i);

it('shows a room icon in the top row while connected to a Room', async () => {
  render(<StatusIcons />);
  expect(roomIcon()).not.toBeInTheDocument();

  await act(() => useRoomConnectionStore.getState().createRoom('Ada', { roomName: 'Review' }));
  expect(roomIcon()).toHaveAccessibleName('Connected to room Review (ROOM01)');

  const room = useRoomConnectionStore.getState().room as unknown as FakeClientRoom;
  act(() => room.drop());
  expect(roomIcon()).not.toBeInTheDocument();
  expect(screen.getByLabelText(/reconnecting/i)).toBeInTheDocument();

  act(() => room.reconnect());
  expect(roomIcon()).toBeInTheDocument();

  await act(() => useRoomConnectionStore.getState().leaveRoom());
  expect(roomIcon()).not.toBeInTheDocument();
});
