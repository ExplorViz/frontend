import React from 'react';

import { useLandscapeRestructureStore } from 'explorviz-frontend/src/stores/landscape-restructure';
import { useChangelogStore } from 'explorviz-frontend/src/stores/changelog';
import { ReplyIcon } from '@primer/octicons-react';

interface UndoRestructureProps {}

export default function UndoRestructure({}: UndoRestructureProps) {
  const canUndo = useLandscapeRestructureStore(
    (state) => state.restructureMode
  );
  const undoBundledEntries = useLandscapeRestructureStore(
    (state) => state.undoBundledEntries
  );
  const undoEntry = useLandscapeRestructureStore((state) => state.undoEntry);
  const changeLogEntries = useChangelogStore((state) => state.changeLogEntries);
  const isCreateBundle = useChangelogStore((state) => state.isCreateBundle);

  const undoAction = () => {
    if (!changeLogEntries.length) return;
    const lastElementIndex = changeLogEntries.length - 1;
    const lastElement = changeLogEntries[lastElementIndex];
    const bundledCreateEntries = isCreateBundle(lastElement, [])?.reverse();

    if (bundledCreateEntries?.length) {
      undoBundledEntries(bundledCreateEntries);
    } else {
      undoEntry(lastElement);
    }
  };

  return (
    canUndo && (
      <button
        type="button"
        className="btn btn-light btn-outline-dark sidebar-button"
        title="Undo"
        aria-label="Undo"
        onClick={undoAction}
        // disabled={changeLogEntries.length > 0}
      >
        <ReplyIcon size="small" className="align-middle" />
      </button>
    )
  );
}
