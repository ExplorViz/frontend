import { useAnnotationHandlerStore } from 'explorviz-frontend/src/stores/annotation-handler';
import { getState, myPlayer, setState, useMultiplayerState } from 'playroomkit';
import { useEffect, useRef } from 'react';



// This component syncs the globally shared annpotations with the local annotations list
export function CollaborationAnnotationSync() {
    const [globalAnnotations] = useMultiplayerState('sharedAnnotations', {});
    // The currently shared refs.
    const lastSharedRefs = useRef<number[]>([]);

    // Execute this code when something changes in the global state
    useEffect(() => {
        const currentGlobal = globalAnnotations || {};
        const store = useAnnotationHandlerStore.getState();
        const localAnnotations = store.annotationData;

        // New or changed annotation
        Object.entries(currentGlobal).forEach(([idStr, anno]: [string, any]) => {
            const id = Number(idStr);
            const localAnno = localAnnotations.find(a => a.annotationId === id);

            if (!localAnno) {
                store.addAnnotation({
                    annotationId: id,
                    entityId: anno.entityId,
                    annotationTitle: anno.title,
                    annotationText: anno.text,
                    sharedBy: anno.sharedBy,
                    owner: anno.owner,
                    shared: true,
                    inEdit: false,
                    lastEditor: anno.lastEditor,
                    position: undefined,
                    wasMoved: true,
                });
            } else if (!localAnno.inEdit) {
                if (localAnno.annotationText !== anno.text || localAnno.annotationTitle !== anno.title) {
                    store._updateExistingAnnotation(localAnno, anno.text, anno.title);
                }
            }
        });

        // Anotation has been closed
        localAnnotations.forEach((localAnno) => {
            if (localAnno.shared && currentGlobal[localAnno.annotationId] === undefined) {
                store.removeAnnotation(localAnno.annotationId);
            }
        });
    }, [globalAnnotations]);

    // update the global state, when an annotation is modified locally
    useEffect(() => {
        const me = myPlayer();
        if (!me) return;

        const unsubscribe = useAnnotationHandlerStore.subscribe((state) => {
            const currentGlobal = { ...(getState('sharedAnnotations') || {}) };
            const localShared = state.annotationData.filter(a => a.shared);
            const currentSharedIds = localShared.map(a => a.annotationId);
            let hasChanges = false;

            // 
            localShared.forEach((anno) => {
                // No "live" updates. Only after save button is clicked
                if (anno.inEdit) return;

                const globalAnno = currentGlobal[anno.annotationId];

                if (!globalAnno || globalAnno.text !== anno.annotationText || globalAnno.title !== anno.annotationTitle) {
                    currentGlobal[anno.annotationId] = {
                        entityId: anno.entityId,
                        title: anno.annotationTitle,
                        text: anno.annotationText,
                        sharedBy: anno.sharedBy || me.getState('name') || me.id,
                        owner: anno.owner,
                        lastEditor: anno.lastEditor
                    };
                    hasChanges = true;
                }
            });

            lastSharedRefs.current.forEach(id => {
                if (!currentSharedIds.includes(id) && currentGlobal[id] !== undefined) {
                    delete currentGlobal[id];
                    hasChanges = true;
                }
            });

            if (hasChanges) {
                setState('sharedAnnotations', currentGlobal);
            }

            lastSharedRefs.current = currentSharedIds;
        });

        return () => unsubscribe();
    }, []);

    return null;
}