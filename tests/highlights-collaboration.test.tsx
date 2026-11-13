// @vitest-environment jsdom
import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useUserSettingsStore } from '../src/stores/user-settings';
import { useVisualizationStore } from '../src/stores/visualization-store';
import {
  getHighlightingColorForEntity,
  highlightById,
  highlightOnly,
  removeAllHighlighting,
  setHighlightingByIds,
  toggleHighlightById,
  unhighlightById,
} from '../src/utils/city-rendering/highlighting';
import '../src/utils/collaboration/capabilities';
import { getHighlightedEntityIds, isOwnHighlight, useHighlights } from '../src/utils/collaboration/highlights';
import { useRoomConnectionStore } from '../src/utils/collaboration/room-connection';
import { fakeCollaborationService as service, type FakeServerRoom } from './fake-collaboration-service';
import './setup-dom';

vi.mock('@colyseus/sdk', async () => (await import('./fake-collaboration-service')).fakeColyseusSdk());

beforeEach(() => {
  service.reset();
  useRoomConnectionStore.setState(useRoomConnectionStore.getInitialState(), true);
  useVisualizationStore.setState(useVisualizationStore.getInitialState(), true);
});

const shown = () => [...getHighlightedEntityIds()].sort();
const colorOf = (entityId: string) => `#${getHighlightingColorForEntity(entityId).getHexString()}`;
const ownColor = () => useUserSettingsStore.getState().visualizationSettings.highlightedEntityColor.value;

/** Ada (session-1) opened the Room; Grace (session-2) is this browser. */
async function joinRoom(code = 'K7XQ2M') {
  const room = service.rooms.get(code) ?? service.openRoom(code, 'Ada');
  await act(() => useRoomConnectionStore.getState().joinRoom(code, 'Grace'));
  return room;
}
const ADA = 'session-1';
const GRACE = 'session-2';

const roomHighlights = (highlights: Record<string, string>) => (state: any) => {
  state.highlights.clear();
  for (const [entityId, sessionId] of Object.entries(highlights)) state.highlights.set(entityId, sessionId);
};

const sentHighlights = (room: FakeServerRoom) =>
  [...room.clients.values()].flatMap((client) => client.sent.filter((message) => message.type === 'highlights'));

describe('alone', () => {
  it('changes the own highlights directly', () => {
    highlightById('a');
    highlightById('b');
    expect(shown()).toEqual(['a', 'b']);

    unhighlightById('a');
    expect(shown()).toEqual(['b']);

    toggleHighlightById('b');
    toggleHighlightById('c');
    expect(shown()).toEqual(['c']);

    removeAllHighlighting();
    expect(shown()).toEqual([]);
  });

  it('highlights and unhighlights many entities, or only these', () => {
    setHighlightingByIds(['a', 'b', 'c'], true);
    expect(shown()).toEqual(['a', 'b', 'c']);

    setHighlightingByIds(['a', 'b'], false);
    expect(shown()).toEqual(['c']);

    highlightOnly(['x', 'y']);
    expect(shown()).toEqual(['x', 'y']);
  });

  it('renders the own highlights', () => {
    const { result } = renderHook(() => useHighlights((ids) => ids.has('a')));
    expect(result.current).toBe(false);

    act(() => highlightById('a'));
    expect(result.current).toBe(true);
  });

  it('shows every highlight as the own one, in the color of the settings', () => {
    highlightById('a');

    expect(isOwnHighlight('a')).toBe(true);
    expect(isOwnHighlight('b')).toBe(false);
    expect(colorOf('a')).toBe(ownColor());
  });
});

describe('in a Room', () => {
  it("makes the creator's highlights the Room's", async () => {
    highlightById('a');
    highlightById('b');

    await act(() => useRoomConnectionStore.getState().createRoom('Ada'));

    expect(service.requests[0].options.startingState.highlights).toEqual(['a', 'b']);
    expect(useVisualizationStore.getState().highlightedEntityIds.size).toBe(0);
    expect(shown()).toEqual(['a', 'b']);
    expect(isOwnHighlight('a')).toBe(true);
  });

  it('drops the own highlights when joining and shows the Room’s', async () => {
    highlightById('mine');
    const room = service.openRoom('K7XQ2M', 'Ada');
    room.update(roomHighlights({ a: ADA }));

    await joinRoom();

    expect(shown()).toEqual(['a']);
    expect(useVisualizationStore.getState().highlightedEntityIds.size).toBe(0);
  });

  it('shows each highlight in the color of the Participant who made it', async () => {
    const room = await joinRoom();
    room.update(roomHighlights({ a: ADA, b: GRACE }));

    expect(colorOf('a')).toBe(room.state.participants.get(ADA)!.color);
    expect(colorOf('b')).toBe(room.state.participants.get(GRACE)!.color);
    expect(isOwnHighlight('a')).toBe(false);
    expect(isOwnHighlight('b')).toBe(true);
  });

  it('sends each change as one small action and shows it once the service has handled it', async () => {
    const room = await joinRoom();

    highlightById('org.example.shop.checkout.PaymentService');
    expect(shown()).toEqual([]);

    room.handleMessages();
    expect(shown()).toEqual(['org.example.shop.checkout.PaymentService']);
    const [message] = sentHighlights(room);
    expect(message.payload).toEqual({ type: 'highlight', entityId: 'org.example.shop.checkout.PaymentService' });
    expect(new TextEncoder().encode(JSON.stringify(message)).length).toBeLessThan(512);
  });

  it('sends a bulk highlight as one action, in chunks far below 4 KB', async () => {
    const room = await joinRoom();
    const ids = Array.from({ length: 300 }, (_, i) => `org.example.shop.package${i}.SomeService${i}`);

    setHighlightingByIds(ids, true);

    const messages = sentHighlights(room);
    expect(messages.length).toBeGreaterThan(1);
    expect(messages.map((message) => (message.payload as any).continued ?? false)).toEqual(
      messages.map((_, i) => i > 0)
    );
    expect(messages.flatMap((message) => (message.payload as any).entityIds)).toEqual(ids);
    for (const message of messages) {
      expect(new TextEncoder().encode(JSON.stringify(message)).length).toBeLessThan(4096);
    }
    room.handleMessages();
    expect(shown()).toEqual([...ids].sort());
  });

  it('replaces the own highlights with one action', async () => {
    const room = await joinRoom();
    room.update(roomHighlights({ a: GRACE, b: ADA }));

    highlightOnly(['c', 'd']);

    expect(sentHighlights(room).map((message) => message.payload)).toEqual([
      { type: 'highlightMany', entityIds: ['c', 'd'], replaceOwn: true },
    ]);
    room.handleMessages();
    expect(shown()).toEqual(['b', 'c', 'd']);
  });

  it("takes over someone else's highlight, in the own color", async () => {
    const room = await joinRoom();
    room.update(roomHighlights({ a: ADA }));

    toggleHighlightById('a');
    room.handleMessages();

    expect(isOwnHighlight('a')).toBe(true);
    expect(colorOf('a')).toBe(room.state.participants.get(GRACE)!.color);

    toggleHighlightById('a');
    room.handleMessages();
    expect(shown()).toEqual([]);
  });

  it('removes only the own highlights', async () => {
    const room = await joinRoom();
    room.update(roomHighlights({ a: ADA, b: GRACE, c: GRACE }));

    removeAllHighlighting();
    room.handleMessages();

    expect(shown()).toEqual(['a']);
  });

  it('sends nothing for a change that would not change the Room', async () => {
    const room = await joinRoom();
    room.update(roomHighlights({ a: ADA, b: GRACE }));

    unhighlightById('a');
    highlightById('b');
    unhighlightById('nothing');

    expect(sentHighlights(room)).toEqual([]);
  });

  it('re-renders when a highlight changes hands', async () => {
    const room = await joinRoom();
    room.update(roomHighlights({ a: ADA }));
    const { result } = renderHook(() => useHighlights((ids) => ids));
    const before = result.current;

    room.update(roomHighlights({ a: GRACE }));

    expect(result.current).not.toBe(before);
    expect([...result.current]).toEqual(['a']);
  });

  it("drops a Participant's highlights when they leave", async () => {
    const room = await joinRoom();
    room.update(roomHighlights({ a: ADA, b: GRACE }));

    act(() => room.remove(ADA));

    expect(shown()).toEqual(['b']);
  });

  it('clears all highlights on a Landscape switch', async () => {
    const room = await joinRoom();
    room.update(roomHighlights({ a: ADA, b: GRACE }));
    room.update((state) => (state.landscapeToken = 'landscape-a'));

    room.clients.get(ADA)!.send('switchLandscape', { landscapeToken: 'landscape-b' });
    room.handleMessages();

    expect(shown()).toEqual([]);
  });

  it('carries on with every highlight seen in the Room as the own one after leaving', async () => {
    const room = await joinRoom();
    room.update(roomHighlights({ a: ADA, b: GRACE }));

    await act(() => useRoomConnectionStore.getState().leaveRoom());

    expect(shown()).toEqual(['a', 'b']);
    expect(isOwnHighlight('a')).toBe(true);
    expect(colorOf('a')).toBe(ownColor());
    unhighlightById('a');
    expect(shown()).toEqual(['b']);
  });

  it('carries on with the highlights seen in the Room when the connection is lost', async () => {
    const room = await joinRoom();
    room.update(roomHighlights({ a: ADA }));

    act(() => (useRoomConnectionStore.getState().room as any).closed(1006));

    expect(useRoomConnectionStore.getState().room).toBeUndefined();
    expect(shown()).toEqual(['a']);
  });
});
