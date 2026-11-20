import React, { useCallback, useEffect, useState } from 'react';

import { DownloadIcon, PlusIcon, SyncIcon, TrashIcon } from '@primer/octicons-react';
import AnnotationData from 'explorviz-frontend/src/components/visualization/rendering/annotations/annotation-data';
import { useAuthStore } from 'explorviz-frontend/src/stores/auth';
import { LandscapeToken } from 'explorviz-frontend/src/stores/landscape-token';
import { TinySnapshot, useSnapshotTokenStore } from 'explorviz-frontend/src/stores/snapshot-token';
import { useToastHandlerStore } from 'explorviz-frontend/src/stores/toast-handler';
import { LandscapeData } from 'explorviz-frontend/src/utils/landscape-schemes/landscape-data';
import { buildSnapshotToken } from 'explorviz-frontend/src/utils/snapshot/snapshot-helpers';
import { switchSnapshot } from 'explorviz-frontend/src/utils/snapshot/switch-snapshot';
import { useShallow } from 'zustand/react/shallow';

interface SnapshotProps {
  landscapeData: LandscapeData | null;
  landscapeToken: LandscapeToken | null;
  annotationData: AnnotationData[];
  minimizedAnnotations: AnnotationData[];
}

type SnapshotKind = 'personal' | 'shared' | 'subscribed';

type ListedSnapshot = { snapshot: TinySnapshot; kind: SnapshotKind };

const KIND_LABELS: Record<SnapshotKind, string | null> = {
  personal: null,
  shared: 'Shared',
  subscribed: 'Subscribed',
};

const snapshotKey = ({ snapshot, kind }: ListedSnapshot) => `${kind}-${snapshot.owner}-${snapshot.createdAt}`;

export default function Snapshot({ landscapeData, landscapeToken }: SnapshotProps) {
  const authUser = useAuthStore((state) => state.user);
  const { saveSnapshotToStore, exportFile, retrieveTokens, deleteSnapshot, openSnapshot, snapshotSelected } =
    useSnapshotTokenStore(
      useShallow((state) => ({
        saveSnapshotToStore: state.saveSnapshot,
        exportFile: state.exportFile,
        retrieveTokens: state.retrieveTokens,
        deleteSnapshot: state.deleteSnapshot,
        openSnapshot: state.snapshotToken,
        snapshotSelected: state.snapshotSelected,
      }))
    );

  const [snapshotName, setSnapshotName] = useState<string>('');
  const [snapshots, setSnapshots] = useState<ListedSnapshot[] | null>(null);
  const [loading, setLoading] = useState<boolean>(false);

  const landscapeTokenValue = landscapeToken?.value;

  const loadSnapshots = useCallback(async () => {
    if (!authUser) {
      setSnapshots([]);
      return;
    }
    setLoading(true);
    try {
      const info = await retrieveTokens();
      const listed: ListedSnapshot[] = [
        ...info.personalSnapshots.map((snapshot) => ({ snapshot, kind: 'personal' as const })),
        ...info.sharedSnapshots.map((snapshot) => ({ snapshot, kind: 'shared' as const })),
        ...info.subscribedSnapshots.map((snapshot) => ({ snapshot, kind: 'subscribed' as const })),
      ]
        .filter(({ snapshot }) => snapshot.landscapeToken?.value === landscapeTokenValue)
        .sort((a, b) => b.snapshot.createdAt - a.snapshot.createdAt);
      setSnapshots(listed);
    } finally {
      setLoading(false);
    }
  }, [authUser, retrieveTokens, landscapeTokenValue]);

  useEffect(() => {
    void loadSnapshots();
  }, [loadSnapshots]);

  const trimmedName = snapshotName.trim();

  const buildContent = () => {
    if (!authUser) {
      useToastHandlerStore.getState().showErrorToastMessage('You must be logged in to create a snapshot.');
      return null;
    }
    try {
      const content = buildSnapshotToken({
        name: trimmedName,
        owner: authUser.sub,
        landscapeToken,
        landscapeData,
      });
      if (content === null) {
        useToastHandlerStore.getState().showErrorToastMessage('Snapshot could not be created: no landscape selected.');
      }
      return content;
    } catch (error) {
      console.error('Cannot build snapshot token:', error);
      useToastHandlerStore.getState().showErrorToastMessage('Snapshot could not be created.');
      return null;
    }
  };

  const saveSnapshot = async () => {
    if (!trimmedName) return;
    const content = buildContent();
    if (content === null) return;

    // Keep the entered name if saving failed so the user can retry.
    if (await saveSnapshotToStore(content)) {
      setSnapshotName('');
      void loadSnapshots();
    }
  };

  const exportSnapshot = () => {
    if (!trimmedName) return;
    const content = buildContent();
    if (content === null) return;

    exportFile(content);
    useToastHandlerStore.getState().showSuccessToastMessage(`Exported snapshot "${content.name}".`);
    setSnapshotName('');
  };

  const isOpen = ({ snapshot, kind }: ListedSnapshot) =>
    snapshotSelected &&
    openSnapshot !== null &&
    openSnapshot.owner === snapshot.owner &&
    openSnapshot.createdAt === snapshot.createdAt &&
    openSnapshot.isShared === (kind !== 'personal');

  const selectSnapshot = (entry: ListedSnapshot) => {
    if (isOpen(entry)) return;
    void switchSnapshot({ snapshot: entry.snapshot, isShared: entry.kind !== 'personal' });
  };

  const removeSnapshot = async ({ snapshot, kind }: ListedSnapshot) => {
    const question =
      kind === 'subscribed'
        ? `Unsubscribe from snapshot "${snapshot.name}"?`
        : `Delete ${kind === 'shared' ? 'shared ' : ''}snapshot "${snapshot.name}"? This cannot be undone.`;
    if (!confirm(question)) return;

    await deleteSnapshot(snapshot, kind === 'shared', kind === 'subscribed');
    void loadSnapshots();
  };

  return (
    <div className="settings">
      <section className="settings-group" aria-labelledby="snapshot-create-title">
        <header className="settings-group-header">
          <h6 className="settings-group-title" id="snapshot-create-title">
            New Snapshot
          </h6>
        </header>
        <div className="settings-list">
          <div className="setting-row preset-row">
            <input
              className="setting-input grow"
              aria-label="Name of the new snapshot"
              placeholder="Snapshot name…"
              value={snapshotName}
              onChange={(event) => setSnapshotName(event.target.value)}
              onKeyDown={(event: React.KeyboardEvent<HTMLInputElement>) => {
                if (event.key === 'Enter') void saveSnapshot();
              }}
            />
            <button
              type="button"
              className="setting-action primary"
              onClick={saveSnapshot}
              disabled={!trimmedName}
              title="Save the current view as a snapshot"
            >
              <PlusIcon size={14} />
              Save
            </button>
            <button
              type="button"
              className="setting-icon-button"
              onClick={exportSnapshot}
              disabled={!trimmedName}
              title="Export the current view as a snapshot file"
              aria-label="Export snapshot"
            >
              <DownloadIcon size={14} />
            </button>
          </div>
        </div>
      </section>

      <section className="settings-group" aria-labelledby="snapshot-list-title">
        <header className="settings-group-header">
          <h6 className="settings-group-title" id="snapshot-list-title">
            Saved Snapshots
          </h6>
          <button
            type="button"
            className="setting-icon-button"
            onClick={() => void loadSnapshots()}
            disabled={loading}
            title="Reload snapshots"
            aria-label="Reload snapshots"
          >
            <SyncIcon size={14} />
          </button>
        </header>
        <div className="settings-list">
          {snapshotSelected && (
            <div className="setting-row snapshot-live-row">
              <span className="snapshot-hint">Showing a snapshot.</span>
              <button
                type="button"
                className="setting-action secondary"
                onClick={() => void switchSnapshot(null)}
                title="Leave the snapshot and show the landscape's live data"
              >
                Show live data
              </button>
            </div>
          )}
          {snapshots === null ? (
            <div className="setting-row">
              <span className="snapshot-hint">Loading snapshots…</span>
            </div>
          ) : !authUser ? (
            <div className="setting-row">
              <span className="snapshot-hint">Log in to see your snapshots.</span>
            </div>
          ) : snapshots.length === 0 ? (
            <div className="setting-row">
              <span className="snapshot-hint">There are no snapshots for this landscape yet.</span>
            </div>
          ) : (
            <ul className="snapshot-list" aria-label="Snapshots of this landscape">
              {snapshots.map((entry) => {
                const open = isOpen(entry);
                const kindLabel = KIND_LABELS[entry.kind];
                return (
                  <li key={snapshotKey(entry)} className={`setting-row snapshot-row${open ? ' active' : ''}`}>
                    <button
                      type="button"
                      className="snapshot-select"
                      onClick={() => selectSnapshot(entry)}
                      aria-current={open ? 'true' : undefined}
                      title={open ? 'This snapshot is shown' : `Show snapshot "${entry.snapshot.name}"`}
                    >
                      <span className="snapshot-name">
                        <span className="snapshot-name-text">{entry.snapshot.name}</span>
                        {kindLabel && <span className="snapshot-badge">{kindLabel}</span>}
                      </span>
                      <span className="snapshot-date">{new Date(entry.snapshot.createdAt).toLocaleString()}</span>
                    </button>
                    <button
                      type="button"
                      className="setting-icon-button danger"
                      onClick={() => removeSnapshot(entry)}
                      title={entry.kind === 'subscribed' ? 'Unsubscribe from snapshot' : 'Delete snapshot'}
                      aria-label={
                        entry.kind === 'subscribed'
                          ? `Unsubscribe from snapshot ${entry.snapshot.name}`
                          : `Delete snapshot ${entry.snapshot.name}`
                      }
                    >
                      <TrashIcon size={14} />
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </section>
    </div>
  );
}
