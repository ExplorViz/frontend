import { useMemo } from 'react';

import AnnotationData from 'explorviz-frontend/src/components/visualization/rendering/annotations/annotation-data';
import { useAnnotationHandlerStore } from 'explorviz-frontend/src/stores/annotation-handler';
import { useModelStore } from 'explorviz-frontend/src/stores/repos/model-repository';
import { useToastHandlerStore } from 'explorviz-frontend/src/stores/toast-handler';
import {
  registerHandOver,
  useRoomConnectionStore,
  useRoomStatePart,
} from 'explorviz-frontend/src/utils/collaboration/room-connection';
import {
  MAX_ANNOTATION_TEXT_LENGTH,
  MAX_ANNOTATION_TITLE_LENGTH,
  type Annotation as RoomAnnotation,
  type AnnotationAdded,
  type ClientMessages,
  type StartingAnnotation,
} from 'explorviz-frontend/src/utils/collaboration/room-contract.generated';
import { useShallow } from 'zustand/react/shallow';

/*
 * The collaboration module for annotations.
 *
 * An annotation has two parts: what was written (entity, title, text,
 * creator, last editor) and where this person shows it (position, minimized,
 * hidden, hovered, in edit mode). The second part is always the person's own,
 * kept in the annotation handler store, and changed there directly.
 *
 * What was written lives in one place: alone it is the person's own state
 * (the same store); in a Room it is the Room's state, read directly from the
 * service. Every annotation made in a Room is shared, and any Participant may
 * edit or remove any of them; adding, saving and removing are sent to the
 * service, and the view follows once the service has handled them. In a
 * Room, the written part of the store's entries is not read: the store only
 * says where each Room annotation is shown, by its id. A Room annotation
 * without an entry is shown open at a default place.
 *
 * Hand-overs: creating a Room makes all own annotations the Room's, shown
 * where they were; joining drops them; leaving makes the Room's annotations
 * the own ones, shown where they were.
 */

export type ShownAnnotations = {
  annotationData: AnnotationData[];
  minimizedAnnotations: AnnotationData[];
};

type AddAnnotationArgs = Parameters<ReturnType<typeof useAnnotationHandlerStore.getState>['addAnnotation']>[0];

const TOAST_HEADER = 'Annotations';

const currentRoom = () => useRoomConnectionStore.getState().room;

const ownStore = () => useAnnotationHandlerStore.getState();

/** Where an annotation without an entry of its own is shown: below each other, as the store places new ones. */
function defaultPlace(index: number): AnnotationData {
  return {
    annotationId: 0,
    mouseX: 100,
    mouseY: 200 + index * 50,
    wasMoved: true,
    isAssociated: false,
    menuId: null,
    hovered: false,
    annotationText: '',
    annotationTitle: '',
    hidden: false,
    sharedBy: '',
    owner: '',
    shared: true,
    inEdit: false,
    lastEditor: '',
  };
}

/** A Room annotation, shown where this person's entry says. */
function shownAs(annotation: RoomAnnotation, place: AnnotationData): AnnotationData {
  const entityId = annotation.entityId || undefined;
  return {
    ...place,
    annotationId: annotation.id,
    entityId,
    entity: entityId
      ? (place.entityId === entityId && place.entity) || useModelStore.getState().getModel(entityId)
      : undefined,
    isAssociated: !!entityId,
    annotationTitle: annotation.title,
    annotationText: annotation.text,
    owner: annotation.creatorName,
    sharedBy: annotation.creatorName,
    lastEditor: annotation.lastEditorName,
    shared: true,
  };
}

/** The Room's annotations, placed by the own entries; entries of annotations the Room no longer has are left out. */
function placed(
  annotations: Iterable<RoomAnnotation>,
  open: readonly AnnotationData[],
  minimized: readonly AnnotationData[]
): ShownAnnotations {
  const byId = new Map<number, RoomAnnotation>();
  for (const annotation of annotations) byId.set(annotation.id, annotation);

  const minimizedIds = new Set(minimized.map((entry) => entry.annotationId));
  const openIds = new Set(open.map((entry) => entry.annotationId));
  const shownOpen = open.flatMap((entry) => {
    const annotation = byId.get(entry.annotationId);
    return annotation && !minimizedIds.has(entry.annotationId) ? [shownAs(annotation, entry)] : [];
  });
  let unplaced = 0;
  for (const annotation of byId.values()) {
    if (!openIds.has(annotation.id) && !minimizedIds.has(annotation.id)) {
      shownOpen.push(shownAs(annotation, defaultPlace(unplaced++)));
    }
  }
  const shownMinimized = minimized.flatMap((entry) => {
    const annotation = byId.get(entry.annotationId);
    return annotation ? [shownAs(annotation, entry)] : [];
  });
  return { annotationData: shownOpen, minimizedAnnotations: shownMinimized };
}

const decodedAnnotations = (room: NonNullable<ReturnType<typeof currentRoom>>): Iterable<RoomAnnotation> =>
  room.state.annotations?.values() ?? [];

/** The shown annotations, for reading outside of rendering. */
export function getAnnotations(): ShownAnnotations {
  const { annotationData, minimizedAnnotations } = ownStore();
  const room = currentRoom();
  if (!room) return { annotationData, minimizedAnnotations };
  return placed(decodedAnnotations(room), annotationData, minimizedAnnotations);
}

/** The shown annotations, for rendering. */
export function useAnnotations(): ShownAnnotations {
  const inRoom = useRoomConnectionStore((state) => state.room !== undefined);
  const roomAnnotations = useRoomStatePart('annotations');
  const { annotationData, minimizedAnnotations } = useAnnotationHandlerStore(
    useShallow((state) => ({
      annotationData: state.annotationData,
      minimizedAnnotations: state.minimizedAnnotations,
    }))
  );
  return useMemo(
    () =>
      inRoom
        ? placed(Object.values(roomAnnotations ?? {}), annotationData, minimizedAnnotations)
        : { annotationData, minimizedAnnotations },
    [inRoom, roomAnnotations, annotationData, minimizedAnnotations]
  );
}

/** Shows this annotation open, with the entry's place, in edit mode or not. */
function openEntry(entry: AnnotationData) {
  const { annotationData, minimizedAnnotations } = ownStore();
  useAnnotationHandlerStore.setState({
    annotationData: [...annotationData.filter((an) => an.annotationId !== entry.annotationId), entry],
    minimizedAnnotations: minimizedAnnotations.filter((an) => an.annotationId !== entry.annotationId),
  });
}

/**
 * The user made an annotation (or asked for one of an entity that has one,
 * which is then shown). Alone it is added to the own annotations; in a Room
 * it is made by the service, and shown where it was made once the service
 * has answered.
 */
export async function addAnnotation(args: AddAnnotationArgs) {
  const { room, reconnecting } = useRoomConnectionStore.getState();
  if (!room) {
    ownStore().addAnnotation(args);
    return;
  }
  const entityId = args.entityId ?? args.entity?.id;
  const existing = entityId ? [...decodedAnnotations(room)].find((a) => a.entityId === entityId) : undefined;
  if (existing) {
    const shown = getAnnotations();
    const entry = [...shown.minimizedAnnotations, ...shown.annotationData].find((a) => a.annotationId === existing.id);
    if (entry) openEntry(entry);
    return;
  }
  // While reconnecting, shared actions are ignored.
  if (reconnecting) return;
  try {
    const { id } = (await room.request('annotationAdd', {
      entityId,
      title: args.annotationTitle,
      text: args.annotationText,
    } satisfies ClientMessages['annotationAdd'])) as AnnotationAdded;
    if (currentRoom() !== room) return;
    const position = args.position ?? { x: 100, y: 200 + ownStore().annotationData.length * 50 };
    openEntry({
      ...defaultPlace(0),
      annotationId: id,
      entityId,
      entity: args.entity,
      isAssociated: !!entityId,
      mouseX: position.x,
      mouseY: position.y,
      menuId: args.menuId ?? null,
      hovered: args.hovered ?? false,
      inEdit: args.inEdit ?? true,
    });
  } catch (error) {
    useToastHandlerStore
      .getState()
      .showErrorToastMessage(
        `The annotation could not be made: ${(error as Error | undefined)?.message ?? error}`,
        TOAST_HEADER
      );
  }
}

/**
 * The user saved an annotation's title and text. Alone the own annotation
 * changes; in a Room the save is sent to the service, which records this
 * Participant as last editor, and the view follows once it has handled it.
 */
export function saveAnnotation(annotation: AnnotationData) {
  const { room, reconnecting } = useRoomConnectionStore.getState();
  if (!room) {
    ownStore().updateAnnotation(annotation);
    return;
  }
  // A save while reconnecting would be dropped, so the person stays in edit mode with what they typed.
  if (reconnecting) return;
  room.send('annotationEdit', {
    id: annotation.annotationId,
    title: annotation.annotationTitle,
    text: annotation.annotationText,
  } satisfies ClientMessages['annotationEdit']);
  openEntry({ ...annotation, inEdit: false });
}

/** The user removed an annotation. In a Room it is removed for everyone, once the service has handled it. */
export function removeAnnotation(annotationId: number) {
  const room = currentRoom();
  if (!room) {
    ownStore().removeAnnotation(annotationId);
    return;
  }
  room.send('annotationRemove', { id: annotationId } satisfies ClientMessages['annotationRemove']);
}

function startingAnnotations(): StartingAnnotation[] {
  const { annotationData, minimizedAnnotations } = ownStore();
  return [...annotationData, ...minimizedAnnotations]
    .filter((annotation) => annotation.wasMoved)
    .map((annotation) => ({
      id: annotation.annotationId,
      entityId: annotation.entityId ?? annotation.entity?.id,
      title: annotation.annotationTitle.slice(0, MAX_ANNOTATION_TITLE_LENGTH),
      text: annotation.annotationText.slice(0, MAX_ANNOTATION_TEXT_LENGTH),
      creatorName: annotation.owner,
      lastEditorName: annotation.lastEditor,
    }));
}

registerHandOver({
  startingState: () => {
    const annotations = startingAnnotations();
    return annotations.length > 0 ? { annotations } : {};
  },
  enter: (_room, entry) => {
    // Created: the own entries now place the Room's annotations. Joined: all own annotations are dropped.
    if (entry === 'joined') useAnnotationHandlerStore.setState({ annotationData: [], minimizedAnnotations: [] });
  },
  leave: (lastState) => {
    const { annotationData, minimizedAnnotations } = ownStore();
    const annotations: RoomAnnotation[] = [...(lastState.annotations?.values() ?? [])];
    const shown = placed(annotations, annotationData, minimizedAnnotations);
    useAnnotationHandlerStore.setState({
      annotationData: shown.annotationData.map((annotation) => ({ ...annotation, shared: false })),
      minimizedAnnotations: shown.minimizedAnnotations.map((annotation) => ({ ...annotation, shared: false })),
    });
    // New own annotations get ids above the Room's.
    const maxId = Math.max(0, ...annotations.map((annotation) => annotation.id));
    if (maxId >= AnnotationData.incrementer) AnnotationData.incrementer = maxId + 1;
  },
});
