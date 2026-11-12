import { useAnnotationHandlerStore } from 'explorviz-frontend/src/stores/annotation-handler';
import { usePopupHandlerStore } from 'explorviz-frontend/src/stores/popup-handler';
import { removeAllHighlighting } from 'explorviz-frontend/src/utils/city-rendering/highlighting';
import { registerHandOver } from 'explorviz-frontend/src/utils/collaboration/room-connection';

/*
 * Joining a Room drops all local exploration state. Districts do so in their
 * own module; highlights, annotations and open popups have no collaboration
 * module yet, so they are dropped here. When a capability gets its module,
 * that module's hand-over takes the line over and it is removed here.
 */
registerHandOver({
  enter: (_room, entry) => {
    if (entry !== 'joined') return;
    removeAllHighlighting(false);
    useAnnotationHandlerStore.getState().clearAnnotations();
    usePopupHandlerStore.getState().clearPopups();
  },
});
