// @vitest-environment jsdom
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, expect, it, vi } from 'vitest';
import CollaborationControls from '../src/components/collaboration/visualization/page-setup/sidebar/customizationbar/collaboration/collaboration-controls';
import { useVisualizationStore } from '../src/stores/visualization-store';
import { useRoomConnectionStore } from '../src/utils/collaboration/room-connection';
import { fakeCollaborationService as service } from './fake-collaboration-service';
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

const sharingSwitch = () => screen.getByRole('checkbox', { name: /share districts/i });

it('lets the Host switch District sharing off and on again', async () => {
  const user = userEvent.setup();
  render(<CollaborationControls />);
  await user.type(await screen.findByRole('textbox', { name: /display name/i }), 'Ada');
  await user.click(screen.getByRole('button', { name: /create room/i }));
  await screen.findByText('ROOM01');
  const room = service.rooms.get('ROOM01')!;
  const [me] = room.clients.values();
  expect(sharingSwitch()).toBeChecked();

  await user.click(sharingSwitch());
  expect(me.sent).toEqual([{ type: 'districtSharing', payload: { shared: false } }]);
  room.handleMessages();
  expect(sharingSwitch()).not.toBeChecked();

  await user.click(sharingSwitch());
  room.handleMessages();
  expect(sharingSwitch()).toBeChecked();
});

it('shows the option to everyone but lets only the Host change it', async () => {
  const room = service.openRoom('K7XQ2M', 'Ada');
  const user = userEvent.setup();
  render(<CollaborationControls />);
  await user.type(await screen.findByRole('textbox', { name: /display name/i }), 'Grace');
  await user.type(screen.getByRole('textbox', { name: /room code/i }), 'K7XQ2M');
  await user.click(screen.getByRole('button', { name: /join/i }));
  await user.click(screen.getByRole('button', { name: /drop .* and join/i }));
  await screen.findByText('K7XQ2M');

  expect(sharingSwitch()).toBeChecked();
  expect(sharingSwitch()).toBeDisabled();

  room.update((state) => {
    state.districts.shared = false;
  });
  expect(sharingSwitch()).not.toBeChecked();
});
