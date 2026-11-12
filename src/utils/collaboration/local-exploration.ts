import { useAnnotationHandlerStore } from 'explorviz-frontend/src/stores/annotation-handler';
import { registerHandOver } from 'explorviz-frontend/src/utils/collaboration/room-connection';

/*
 * Joining a Room drops all local exploration state. Districts do so in their
 * own module, and so do highlights and popups; annotations have no collaboration
 * module yet, so they are dropped here. When a capability gets its module,
 * that module's hand-over takes the line over and it is removed here.
 */
registerHandOver({
  enter: (_room, entry) => {
    if (entry !== 'joined') return;
    useAnnotationHandlerStore.getState().clearAnnotations();
  },
});
