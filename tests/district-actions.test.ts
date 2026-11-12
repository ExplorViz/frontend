// @vitest-environment jsdom
import { act } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useModelStore } from '../src/stores/repos/model-repository';
import { useVisualizationStore } from '../src/stores/visualization-store';
import {
  closeAllDistrictsInLandscape,
  closeDistrict,
  openAllDistrictsInLandscape,
  openDistrict,
} from '../src/utils/city-rendering/entity-manipulation';
import '../src/utils/collaboration/capabilities';
import { getDistricts } from '../src/utils/collaboration/districts';
import { useRoomConnectionStore } from '../src/utils/collaboration/room-connection';
import type { City, District } from '../src/utils/landscape-schemes/flat-landscape';
import { fakeCollaborationService as service } from './fake-collaboration-service';

vi.mock('@colyseus/sdk', async () => (await import('./fake-collaboration-service')).fakeColyseusSdk());

// shop ─ checkout ─ payment
//      └ catalog
const district = (id: string, parentDistrictId: string | undefined, districtIds: string[]): District => ({
  id,
  name: id,
  type: 'code',
  telemetryKey: id,
  parentCityId: 'shop',
  parentDistrictId,
  buildingIds: [],
  districtIds,
});
const shop: City = {
  id: 'shop',
  name: 'Shop',
  type: 'code',
  telemetryKey: 'shop',
  buildingIds: [],
  districtIds: ['checkout', 'catalog'],
  allContainedBuildingIds: [],
  allContainedDistrictIds: ['checkout', 'payment', 'catalog'],
};

beforeEach(() => {
  service.reset();
  useRoomConnectionStore.setState(useRoomConnectionStore.getInitialState(), true);
  useVisualizationStore.setState(useVisualizationStore.getInitialState(), true);
  useModelStore.getState().setCities([shop]);
  useModelStore
    .getState()
    .setDistricts([
      district('checkout', undefined, ['payment']),
      district('payment', 'checkout', []),
      district('catalog', undefined, []),
    ]);
});

const shown = () => {
  const { closedDistrictIds, hiddenDistrictIds } = getDistricts();
  return { closed: [...closedDistrictIds].sort(), hidden: [...hiddenDistrictIds].sort() };
};

describe('alone, as before', () => {
  it('closing a District closes and hides its open descendants; opening shows its children', () => {
    closeDistrict('checkout');
    expect(shown()).toEqual({ closed: ['checkout', 'payment'], hidden: ['payment'] });

    openDistrict('checkout');
    expect(shown()).toEqual({ closed: ['payment'], hidden: [] });
  });

  it('closes all Districts, hiding the nested ones, and opens them all again', () => {
    closeAllDistrictsInLandscape();
    expect(shown()).toEqual({ closed: ['catalog', 'checkout', 'payment'], hidden: ['payment'] });

    openAllDistrictsInLandscape();
    expect(shown()).toEqual({ closed: [], hidden: [] });
  });
});

describe('in a Room', () => {
  async function joinRoom() {
    const room = service.openRoom('K7XQ2M', 'Ada');
    await act(() => useRoomConnectionStore.getState().joinRoom('K7XQ2M', 'Grace'));
    return { room, client: room.clients.get(useRoomConnectionStore.getState().room!.sessionId)! };
  }

  it('sends a click as one District message, worked out from the Room’s Districts', async () => {
    const { room, client } = await joinRoom();

    closeDistrict('checkout');

    expect(client.sent).toEqual([
      {
        type: 'districts',
        payload: [
          { type: 'close', ids: ['checkout'] },
          { type: 'hide', ids: ['payment'] },
          { type: 'close', ids: ['payment'] },
        ],
      },
    ]);
    expect(shown()).toEqual({ closed: [], hidden: [] });

    room.handleMessages();
    expect(shown()).toEqual({ closed: ['checkout', 'payment'], hidden: ['payment'] });

    openDistrict('checkout');
    expect(client.sent.at(-1)).toEqual({
      type: 'districts',
      payload: [
        { type: 'open', ids: ['checkout'] },
        { type: 'show', ids: ['payment'] },
      ],
    });
  });

  it('sends close all as one action naming only the top-level Districts', async () => {
    const { room, client } = await joinRoom();

    closeAllDistrictsInLandscape();

    expect(client.sent).toEqual([
      { type: 'districts', payload: [{ type: 'closeAll', topLevelIds: ['checkout', 'catalog'] }] },
    ]);
    room.handleMessages();
    expect(shown()).toEqual({ closed: ['catalog', 'checkout', 'payment'], hidden: ['payment'] });

    openDistrict('checkout');
    room.handleMessages();
    expect(shown()).toEqual({ closed: ['catalog', 'payment'], hidden: [] });
  });

  it('keeps what was shown after close all as the own Districts when leaving', async () => {
    const { room } = await joinRoom();
    closeAllDistrictsInLandscape();
    room.handleMessages();

    await act(() => useRoomConnectionStore.getState().leaveRoom());

    expect(shown()).toEqual({ closed: ['catalog', 'checkout', 'payment'], hidden: ['payment'] });
  });

  it('sends open all as one action without a list of Districts', async () => {
    const { room, client } = await joinRoom();
    closeAllDistrictsInLandscape();
    room.handleMessages();

    openAllDistrictsInLandscape();

    expect(client.sent.at(-1)).toEqual({ type: 'districts', payload: [{ type: 'openAll' }] });
    room.handleMessages();
    expect(shown()).toEqual({ closed: [], hidden: [] });
  });
});
