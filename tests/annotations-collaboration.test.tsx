// @vitest-environment jsdom
import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useAnnotationHandlerStore } from '../src/stores/annotation-handler';
import { useAuthStore } from '../src/stores/auth';
import { useLandscapeTokenStore } from '../src/stores/landscape-token';
import {
  addAnnotation,
  getAnnotations,
  removeAnnotation,
  saveAnnotation,
  useAnnotations,
} from '../src/utils/collaboration/annotations';
import '../src/utils/collaboration/capabilities';
import { useRoomConnectionStore } from '../src/utils/collaboration/room-connection';
import { fakeCollaborationService as service, type FakeServerRoom } from './fake-collaboration-service';
import './setup-dom';

vi.mock('@colyseus/sdk', async () => (await import('./fake-collaboration-service')).fakeColyseusSdk());

beforeEach(() => {
  service.reset();
  useRoomConnectionStore.setState(useRoomConnectionStore.getInitialState(), true);
  useAnnotationHandlerStore.setState(useAnnotationHandlerStore.getInitialState(), true);
  useAuthStore.setState({ user: { name: 'Ada Lovelace', nickname: 'ada', sub: 'ada-1' } as any });
  useLandscapeTokenStore.setState({ token: null, retrieveTokens: async () => [] } as any);
});

/** The user adds an annotation to an entity, as from its popup. */
const annotate = (entityId: string, position = { x: 300, y: 400 }) =>
  act(() =>
    addAnnotation({
      annotationId: undefined,
      entityId,
      position,
      hovered: true,
      annotationTitle: '',
      annotationText: '',
      sharedBy: '',
      owner: 'Ada Lovelace',
      shared: false,
      inEdit: true,
      lastEditor: undefined,
      wasMoved: true,
    })
  );

const shownOpen = () =>
  getAnnotations().annotationData.map((a) => ({
    entityId: a.entityId,
    title: a.annotationTitle,
    text: a.annotationText,
    creator: a.owner,
    lastEditor: a.lastEditor,
  }));

const opened = (entityId: string) => getAnnotations().annotationData.find((a) => a.entityId === entityId)!;

/** Saves the annotation of this entity with a new title and text, as the Update button does. */
const save = (entityId: string, title: string, text: string) =>
  act(() => saveAnnotation({ ...opened(entityId), annotationTitle: title, annotationText: text }));

/** Puts an annotation into the Room as if another Participant had made it. */
const roomAnnotation = (room: FakeServerRoom, id: number, entityId: string, title = '', creatorName = 'Ada') =>
  room.update(() => room.putAnnotation({ id, entityId, title, creatorName }));

async function joinRoom(code = 'K7XQ2M') {
  const room = service.rooms.get(code) ?? service.openRoom(code, 'Ada');
  await act(() => useRoomConnectionStore.getState().joinRoom(code, 'Grace'));
  return room;
}

async function createRoom() {
  await act(() => useRoomConnectionStore.getState().createRoom('Ada'));
  return service.rooms.get('ROOM01')!;
}

const clientOf = (room: FakeServerRoom) => [...room.clients.values()].at(-1)!;

describe('alone', () => {
  it('adds, saves and removes the own annotations, by the logged-in person', async () => {
    await annotate('class-a');
    expect(shownOpen()).toEqual([
      { entityId: 'class-a', title: '', text: '', creator: 'Ada Lovelace', lastEditor: 'Ada Lovelace' },
    ]);
    expect(opened('class-a').inEdit).toBe(true);

    await save('class-a', 'Hot spot', 'Look here');
    expect(shownOpen()[0]).toMatchObject({ title: 'Hot spot', text: 'Look here' });
    expect(opened('class-a').inEdit).toBe(false);

    await act(() => removeAnnotation(opened('class-a').annotationId));
    expect(shownOpen()).toEqual([]);
  });

  it('renders the own annotations', async () => {
    const { result } = renderHook(() => useAnnotations());
    expect(result.current.annotationData).toEqual([]);

    await annotate('class-a');
    expect(result.current.annotationData.map((a) => a.entityId)).toEqual(['class-a']);
  });
});

describe('in a Room', () => {
  it('shares a new annotation, made by this Participant, where it was made and in edit mode', async () => {
    const room = await joinRoom();

    await annotate('class-a', { x: 300, y: 400 });

    expect(clientOf(room).sent).toContainEqual({
      type: 'annotationAdd',
      payload: { entityId: 'class-a', title: '', text: '' },
    });
    expect(Object.keys(room.state.annotations.toJSON())).toHaveLength(1);
    expect(shownOpen()).toEqual([{ entityId: 'class-a', title: '', text: '', creator: 'Grace', lastEditor: 'Grace' }]);
    expect(opened('class-a')).toMatchObject({ mouseX: 300, mouseY: 400, inEdit: true });
  });

  it('shows the annotations of others, and their changes', async () => {
    const room = await joinRoom();
    const { result } = renderHook(() => useAnnotations());

    roomAnnotation(room, 1, 'class-a', 'Theirs');
    expect(result.current.annotationData.map((a) => [a.entityId, a.annotationTitle, a.owner])).toEqual([
      ['class-a', 'Theirs', 'Ada'],
    ]);

    room.update((state) => {
      state.annotations.get('1')!.title = 'Changed';
      state.annotations.get('1')!.lastEditorName = 'Bob';
    });
    expect(result.current.annotationData[0]).toMatchObject({ annotationTitle: 'Changed', lastEditor: 'Bob' });

    room.update((state) => state.annotations.delete('1'));
    expect(result.current.annotationData).toEqual([]);
  });

  it('lets anyone save any annotation; the view follows the service, which records the last editor', async () => {
    const room = await joinRoom();
    roomAnnotation(room, 1, 'class-a', 'Theirs');

    await save('class-a', 'Mine now', 'Edited');

    expect(clientOf(room).sent).toEqual([
      { type: 'annotationEdit', payload: { id: 1, title: 'Mine now', text: 'Edited' } },
    ]);
    expect(shownOpen()[0]).toMatchObject({ title: 'Theirs' });

    room.handleMessages();
    expect(shownOpen()).toEqual([
      { entityId: 'class-a', title: 'Mine now', text: 'Edited', creator: 'Ada', lastEditor: 'Grace' },
    ]);
    expect(opened('class-a').inEdit).toBe(false);
  });

  it('lets anyone remove any annotation, for everyone', async () => {
    const room = await joinRoom();
    roomAnnotation(room, 1, 'class-a');

    await act(() => removeAnnotation(1));
    expect(clientOf(room).sent).toEqual([{ type: 'annotationRemove', payload: { id: 1 } }]);

    room.handleMessages();
    expect(shownOpen()).toEqual([]);
  });

  it('keeps minimizing to this Participant and reopens a minimized annotation instead of adding one', async () => {
    const room = await joinRoom();
    roomAnnotation(room, 1, 'class-a', 'Theirs');
    const shown = opened('class-a');
    act(() => useAnnotationHandlerStore.setState({ annotationData: [], minimizedAnnotations: [{ ...shown }] }));
    expect(getAnnotations().annotationData).toEqual([]);
    expect(getAnnotations().minimizedAnnotations.map((a) => a.annotationTitle)).toEqual(['Theirs']);

    await annotate('class-a');

    expect(clientOf(room).sent).toEqual([]);
    expect(getAnnotations().minimizedAnnotations).toEqual([]);
    expect(shownOpen().map((a) => a.title)).toEqual(['Theirs']);
  });

  it('does not add an annotation while reconnecting', async () => {
    const room = await joinRoom();
    clientOf(room).drop();

    await annotate('class-a');

    expect(clientOf(room).sent).toEqual([]);
    expect(shownOpen()).toEqual([]);
  });

  it('keeps editing on a save while reconnecting, so nothing typed is lost', async () => {
    const room = await joinRoom();
    roomAnnotation(room, 1, 'class-a');
    act(() => useAnnotationHandlerStore.getState().editAnnotation(opened('class-a')));
    clientOf(room).drop();

    await save('class-a', 'Typed', 'Text');

    expect(opened('class-a').inEdit).toBe(true);
  });

  it('shows no annotation after a Landscape switch', async () => {
    const room = await createRoom();
    roomAnnotation(room, 1, 'class-a');
    expect(shownOpen()).toHaveLength(1);

    room.inbox.push({ from: room.state.hostId, type: 'switchLandscape', payload: { landscapeToken: 'b' } });
    room.handleMessages();

    expect(shownOpen()).toEqual([]);
  });
});

describe('hand-overs', () => {
  it("makes the creator's annotations, open and minimized, the Room's, where they were", async () => {
    await annotate('class-a', { x: 10, y: 20 });
    await save('class-a', 'A', 'a');
    await annotate('class-b');
    const minimized = opened('class-b');
    act(() =>
      useAnnotationHandlerStore.setState({
        annotationData: getAnnotations().annotationData.filter((a) => a.entityId !== 'class-b'),
        minimizedAnnotations: [minimized],
      })
    );

    await act(() => useRoomConnectionStore.getState().createRoom('Ada'));

    const starting = service.requests[0].options.startingState.annotations;
    expect(starting).toEqual([
      expect.objectContaining({ entityId: 'class-a', title: 'A', text: 'a', creatorName: 'Ada Lovelace' }),
      expect.objectContaining({ entityId: 'class-b', title: '', text: '' }),
    ]);
    expect(starting.every((a: { id: number }) => a.id > 0)).toBe(true);
  });

  it('sends no annotations when the creator has none', async () => {
    await createRoom();
    expect(service.requests[0].options.startingState.annotations).toBeUndefined();
  });

  it('drops the own annotations when joining', async () => {
    await annotate('class-a');

    await joinRoom();

    expect(shownOpen()).toEqual([]);
    expect(useAnnotationHandlerStore.getState().annotationData).toEqual([]);
  });

  it("carries on with the Room's annotations as the own ones after leaving", async () => {
    const room = await joinRoom();
    roomAnnotation(room, 7, 'class-a', 'Theirs', 'Ada');
    await annotate('class-b', { x: 50, y: 60 });

    await act(() => useRoomConnectionStore.getState().leaveRoom());

    const byEntity = (a: { entityId?: string }, b: { entityId?: string }) => a.entityId!.localeCompare(b.entityId!);
    expect(shownOpen().sort(byEntity)).toEqual([
      { entityId: 'class-a', title: 'Theirs', text: '', creator: 'Ada', lastEditor: 'Ada' },
      { entityId: 'class-b', title: '', text: '', creator: 'Grace', lastEditor: 'Grace' },
    ]);
    expect(opened('class-b')).toMatchObject({ mouseX: 50, mouseY: 60 });

    await annotate('class-c');
    const ids = getAnnotations().annotationData.map((a) => a.annotationId);
    expect(new Set(ids).size).toBe(3);
  });
});
