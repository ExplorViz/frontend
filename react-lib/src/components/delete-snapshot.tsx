import React from 'react';
import OverlayTrigger from 'react-bootstrap/OverlayTrigger';
import { TrashIcon } from '@primer/octicons-react';
import { Tooltip } from 'react-bootstrap';
import {
  useSnapshotTokenStore,
  TinySnapshot,
} from 'react-lib/src/stores/snapshot-token';

interface DeleteSnapshotProps {
  token: TinySnapshot;
  isShared: boolean;
  subscribed: boolean;
  reload(): void;
}

export default function DeleteSnapshot({
  token,
  isShared,
  subscribed,
  reload,
}: DeleteSnapshotProps) {

  const deleteSnapshotInStore = useSnapshotTokenStore(
    (state) => state.deleteSnapshot
  );

  const deleteSnapshot = async (
    snapShot: TinySnapshot,
    isShared: boolean,
    subscribed: boolean
  ) => {
    deleteSnapshotInStore(snapShot, isShared, subscribed);
    reload();
  };

  return (
    <div id="colorPresets" className="dropdown">
      <OverlayTrigger
        placement={'bottom'}
        trigger={['hover', 'focus']}
        overlay={<Tooltip> Delete Snapshot</Tooltip>}
      >
        <a
          className="button-svg-with-hover"
          type="button"
          tabIndex={0}
          href="#"
          onClick={() => deleteSnapshot(token, isShared, subscribed)}
        >
          <TrashIcon size="small" verticalAlign="middle" />
        </a>
      </OverlayTrigger>
    </div>
  );
}
