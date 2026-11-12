// @vitest-environment jsdom
import { act, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, expect, it, vi } from 'vitest';
import CollaborationControls from '../src/components/collaboration/visualization/page-setup/sidebar/customizationbar/collaboration/collaboration-controls';
import StatusIcons from '../src/components/page-setup/status-icons';
import { useRoomConnectionStore } from '../src/utils/collaboration/room-connection';
import {
  fakeCollaborationService as service,
  type FakeClientRoom,
  type FakeServerRoom,
} from './fake-collaboration-service';
import './setup-dom';

vi.mock('@colyseus/sdk', async () => (await import('./fake-collaboration-service')).fakeColyseusSdk());

let room: FakeServerRoom;
let me: FakeClientRoom;
let adaId: string;

beforeEach(async () => {
  service.reset();
  useRoomConnectionStore.setState(useRoomConnectionStore.getInitialState(), true);
  vi.stubGlobal(
    'fetch',
    vi.fn(async () => new Response('OK', { status: 200 }))
  );
  room = service.openRoom('K7XQ2M', 'Ada');
  adaId = [...room.clients.keys()][0];
  await act(() => useRoomConnectionStore.getState().joinRoom('K7XQ2M', 'Grace'));
  me = useRoomConnectionStore.getState().room as unknown as FakeClientRoom;
});

const rowOf = (name: string) =>
  within(screen.getByRole('list', { name: /participants/i }))
    .getAllByRole('listitem')
    .find((row) => row.textContent?.startsWith(name))!;

const setParticipant = (sessionId: string, change: Partial<{ spectating: string; immersiveEntityId: string }>) =>
  room.update((state) => Object.assign(state.participants.get(sessionId)!, change));

it('asks the service to spectate another Participant, but offers no spectating of yourself', async () => {
  const user = userEvent.setup();
  render(<CollaborationControls />);

  await user.click(within(rowOf('Ada')).getByRole('button', { name: /spectate ada/i }));

  expect(me.sent).toEqual([{ type: 'spectate', payload: { target: adaId } }]);
  expect(within(rowOf('Grace')).queryByRole('button', { name: /spectate/i })).not.toBeInTheDocument();
});

it('shows whom you spectate once the service has recorded it and lets you stop', async () => {
  const user = userEvent.setup();
  render(<CollaborationControls />);

  setParticipant(me.sessionId, { spectating: adaId });

  expect(rowOf('Grace')).toHaveTextContent(/spectating Ada/i);
  await user.click(within(rowOf('Ada')).getByRole('button', { name: /stop spectating ada/i }));
  expect(me.sent).toEqual([{ type: 'spectate', payload: { target: null } }]);
});

it('shows who spectates whom and who is in an immersive view', () => {
  render(<CollaborationControls />);

  setParticipant(adaId, { spectating: me.sessionId, immersiveEntityId: 'class-42' });

  expect(rowOf('Ada')).toHaveTextContent(/spectating Grace/i);
  expect(rowOf('Ada')).toHaveTextContent(/immersive view/i);
  expect(rowOf('Grace')).not.toHaveTextContent(/spectating|immersive/i);
});

it('shows in the navbar while you spectate', () => {
  render(<StatusIcons />);
  expect(screen.queryByLabelText(/spectating/i)).not.toBeInTheDocument();

  setParticipant(me.sessionId, { spectating: adaId });
  expect(screen.getByLabelText(/spectating Ada/i)).toBeInTheDocument();

  setParticipant(me.sessionId, { spectating: '' });
  expect(screen.queryByLabelText(/spectating/i)).not.toBeInTheDocument();
});
