// @vitest-environment jsdom
import { act } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useAuthStore } from '../src/stores/auth';
import { useLandscapeTokenStore } from '../src/stores/landscape-token';
import { rememberDisplayName } from '../src/utils/collaboration/display-name';
import { useRoomConnectionStore } from '../src/utils/collaboration/room-connection';
import { joinRoomFromLink, roomLink } from '../src/utils/collaboration/room-link';
import { fakeCollaborationService as service } from './fake-collaboration-service';
import './setup-dom';

vi.mock('@colyseus/sdk', async () => (await import('./fake-collaboration-service')).fakeColyseusSdk());

beforeEach(() => {
  service.reset();
  useRoomConnectionStore.setState(useRoomConnectionStore.getInitialState(), true);
  useLandscapeTokenStore.setState({ token: null, retrieveTokens: async () => [] } as any);
  useAuthStore.setState({ user: { name: 'Grace Hopper', sub: 'grace-1' } as any, accessToken: 'token-1' });
  localStorage.clear();
  vi.unstubAllEnvs();
});

function openRoom(code: string, landscapeToken?: string) {
  const room = service.openRoom(code, 'Ada');
  if (landscapeToken !== undefined)
    room.update((state) => {
      state.landscapeToken = landscapeToken;
    });
  return room;
}

describe('a room link', () => {
  it('opens the visualization with the room code', () => {
    expect(roomLink('K7XQ2M')).toBe(`${window.location.origin}/visualization?room=K7XQ2M`);
  });
});

describe('joining from a room link', () => {
  it('joins under the login name and resolves once the Room’s Landscape is loaded', async () => {
    vi.stubEnv('VITE_ENABLE_SKIP_LOGIN', 'false');
    openRoom('K7XQ2M', 'petclinic');

    const landscape = await act(() => joinRoomFromLink('k7xq 2m'));

    expect(landscape).toBe('petclinic');
    expect(useRoomConnectionStore.getState().room?.roomId).toBe('K7XQ2M');
    expect(service.requests.at(-1)?.options.name).toBe('Grace Hopper');
    expect(useLandscapeTokenStore.getState().token?.value).toBe('petclinic');
  });

  it('joins under the remembered display name while login is off', async () => {
    vi.stubEnv('VITE_ENABLE_SKIP_LOGIN', 'true');
    rememberDisplayName('Ada');
    openRoom('K7XQ2M', 'petclinic');

    await act(() => joinRoomFromLink('K7XQ2M'));

    expect(service.requests.at(-1)?.options.name).toBe('Ada');
  });

  it('resolves to "" for a Room without a Landscape', async () => {
    openRoom('K7XQ2M', '');

    expect(await act(() => joinRoomFromLink('K7XQ2M'))).toBe('');
  });

  it('resolves to undefined if there is no such Room', async () => {
    expect(await act(() => joinRoomFromLink('NOROOM'))).toBeUndefined();
    expect(useRoomConnectionStore.getState().room).toBeUndefined();
  });
});
