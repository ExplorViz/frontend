// @vitest-environment jsdom
import { act } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useLayoutStore } from '../src/stores/layout-store';
import { useUserSettingsStore } from '../src/stores/user-settings';
import '../src/utils/collaboration/capabilities';
import { requestLayoutRecompute } from '../src/utils/collaboration/layout';
import { useRoomConnectionStore } from '../src/utils/collaboration/room-connection';
import type { Building, City, District, FlatLandscape } from '../src/utils/landscape-schemes/flat-landscape';
import layoutLandscapeWithMaxRects, { resetMaxRectsLayout } from '../src/utils/layout/maxrects-layouter';
import { peekOwnArrangements } from '../src/utils/layout/stable-arrangement';
import { defaultVizSettings } from '../src/utils/settings/default-settings';
import { fakeCollaborationService as service, type FakeServerRoom } from './fake-collaboration-service';
import { building, city, district } from './fixtures/landscape';
import './setup-dom';

vi.mock('@colyseus/sdk', async () => (await import('./fake-collaboration-service')).fakeColyseusSdk());

/** Two Cities with one District each, holding the given numbers of Buildings. */
function createLandscape(shopBuildings: number, billingBuildings = 2): FlatLandscape {
  const landscape: FlatLandscape = { landscapeToken: 'token', cities: {}, districts: {}, buildings: {} };
  for (const [cityId, count] of [
    ['shop', shopBuildings],
    ['billing', billingBuildings],
  ] as const) {
    const districtId = `${cityId}.main`;
    const buildingIds = Array.from({ length: count }, (_, i) => `${districtId}.b${i}`);
    landscape.cities[cityId] = {
      ...city,
      id: cityId,
      name: cityId,
      buildingIds: [],
      districtIds: [districtId],
      allContainedBuildingIds: buildingIds,
      allContainedDistrictIds: [districtId],
    } satisfies City;
    landscape.districts[districtId] = {
      ...district,
      id: districtId,
      parentCityId: cityId,
      buildingIds,
      districtIds: [],
    } satisfies District;
    for (const id of buildingIds) {
      landscape.buildings[id] = {
        ...building,
        id,
        parentCityId: cityId,
        parentDistrictId: districtId,
      } satisfies Building;
    }
  }
  return landscape;
}

const layout = (landscape: FlatLandscape) => layoutLandscapeWithMaxRects(landscape, new Set());
const positions = (layoutMap: Map<string, { positionX: number; positionZ: number }>) =>
  Object.fromEntries([...layoutMap].map(([id, box]) => [id, [box.positionX, box.positionZ]]));
const setting = <T>(id: keyof typeof defaultVizSettings) =>
  useUserSettingsStore.getState().visualizationSettings[id].value as T;
const sent = (room: FakeServerRoom, type: string) =>
  [...room.clients.values()].flatMap((client) => client.sent.filter((message) => message.type === type));

beforeEach(() => {
  service.reset();
  useRoomConnectionStore.setState(useRoomConnectionStore.getInitialState(), true);
  useUserSettingsStore.setState({ visualizationSettings: structuredClone(defaultVizSettings) });
  useUserSettingsStore.getState().updateSetting('layoutEngine', 'maxrects');
  resetMaxRectsLayout();
});

async function createRoom() {
  await act(() => useRoomConnectionStore.getState().createRoom('Ada'));
  return service.rooms.get('ROOM01')!;
}

/** Ada hosts a Room with these layout options; Grace joins it. */
async function joinRoom(hostOptions: Record<string, unknown> = {}) {
  const room = service.openRoom('K7XQ2M', 'Ada');
  room.update((state) => {
    for (const [id, value] of Object.entries({ layoutEngine: 'maxrects', ...hostOptions })) {
      state.layout.options.set(id, JSON.stringify(value));
    }
  });
  await act(() => useRoomConnectionStore.getState().joinRoom('K7XQ2M', 'Grace'));
  return room;
}

/** The places of the own stable layout, encoded as the Host's frontend sends them. */
function encodedOwnPlaces() {
  return Object.fromEntries(
    [...peekOwnArrangements()!].map(([containerId, { width, slots }]) => [
      containerId,
      { width, places: Object.fromEntries([...slots].map(([id, s]) => [id, [s.x, s.z, s.width, s.depth]])) },
    ])
  );
}

/**
 * The Host's layout of the final landscape after it first saw a smaller one,
 * which differs from a fresh layout of the final landscape.
 */
function hostLayoutWithHistory() {
  layout(createLandscape(2, 12));
  const hostLayout = positions(layout(createLandscape(12, 12)));
  const hostPlaces = encodedOwnPlaces();
  resetMaxRectsLayout();
  expect(positions(layout(createLandscape(12, 12)))).not.toEqual(hostLayout);
  resetMaxRectsLayout();
  return { hostLayout, hostPlaces };
}

function receiveHostPlaces(room: FakeServerRoom, containers: unknown) {
  room.inbox.push({ from: room.state.hostId, type: 'layoutArrangement', payload: { containers } });
  room.handleMessages();
}

describe('creating a Room', () => {
  it('makes the own layout options and places the Room’s', async () => {
    useUserSettingsStore.getState().updateSetting('buildingMargin', 7);
    layout(createLandscape(4));

    const room = await createRoom();

    expect(JSON.parse(service.requests[0].options.startingState.layoutOptions.buildingMargin)).toBe(7);
    room.handleMessages();
    expect([...room.state.layout.arrangement.keys()].sort()).toEqual([
      'billing',
      'billing.main',
      'landscape',
      'shop',
      'shop.main',
    ]);
  });
});

describe('the Host', () => {
  it('sends a changed layout setting to the Room, but no other setting', async () => {
    const room = await createRoom();
    room.handleMessages();

    act(() => useUserSettingsStore.getState().updateSetting('buildingMargin', 3));
    act(() => useUserSettingsStore.getState().updateSetting('showFpsCounter', true));
    room.handleMessages();

    expect(sent(room, 'layoutOptions')).toHaveLength(1);
    expect(room.state.layout.options.get('buildingMargin')).toBe('3');
  });

  it('shares the places of each layout and packs afresh for everyone on Recompute', async () => {
    const room = await createRoom();
    layout(createLandscape(4));
    room.handleMessages();

    layout(createLandscape(9));
    room.handleMessages();
    expect(room.state.layout.arrangement.get('shop.main')!.places.size).toBe(9);

    const recomputesBefore = sent(room, 'layoutRecompute').length;
    act(() => requestLayoutRecompute());
    layout(createLandscape(9));
    expect(sent(room, 'layoutRecompute')).toHaveLength(recomputesBefore + 1);
    room.handleMessages();
    expect(room.state.layout.arrangement.get('shop.main')!.places.size).toBe(9);
  });
});

describe('a Participant who is not the Host', () => {
  it('takes the Host’s layout options, and cannot change them', async () => {
    await joinRoom({ buildingMargin: 4, districtLabelPlacement: 'top' });

    expect(setting('buildingMargin')).toBe(4);
    expect(setting('districtLabelPlacement')).toBe('top');

    act(() => useUserSettingsStore.getState().updateSetting('buildingMargin', 30));
    act(() => useUserSettingsStore.getState().updateSetting('showFpsCounter', true));

    expect(setting('buildingMargin')).toBe(4);
    expect(setting('showFpsCounter')).toBe(true);
  });

  it('follows when the Host changes a layout option', async () => {
    const room = await joinRoom({ buildingMargin: 4 });

    room.update((state) => state.layout.options.set('buildingMargin', '12'));

    expect(setting('buildingMargin')).toBe(12);
  });

  it('lays out with the Host’s places, whatever it laid out before', async () => {
    const { hostLayout, hostPlaces } = hostLayoutWithHistory();
    const room = await joinRoom();

    receiveHostPlaces(room, hostPlaces);

    expect(positions(layout(createLandscape(12, 12)))).toEqual(hostLayout);
    // Only the Host writes the Room's places
    expect(sent(room, 'layoutArrangement')).toHaveLength(0);
  });

  it('carries on with the Room’s places after leaving', async () => {
    const { hostLayout, hostPlaces } = hostLayoutWithHistory();
    const room = await joinRoom();
    receiveHostPlaces(room, hostPlaces);

    await act(() => useRoomConnectionStore.getState().leaveRoom());

    expect(positions(layout(createLandscape(12, 12)))).toEqual(hostLayout);
  });

  it('carries on from the Room’s places when the Host right passes to them', async () => {
    const { hostLayout, hostPlaces } = hostLayoutWithHistory();
    const room = await joinRoom();
    receiveHostPlaces(room, hostPlaces);

    const ownSessionId = [...room.clients.keys()][1];
    room.update((state) => {
      state.hostId = ownSessionId;
    });

    expect(positions(layout(createLandscape(12, 12)))).toEqual(hostLayout);
    expect(sent(room, 'layoutRecompute')).toHaveLength(0);
  });

  it('does not recompute the layout', async () => {
    const room = await joinRoom();
    const revision = useLayoutStore.getState().layoutRevision;

    act(() => requestLayoutRecompute());

    expect(useLayoutStore.getState().layoutRevision).toBe(revision);
    expect(sent(room, 'layoutRecompute')).toHaveLength(0);
  });
});
