import React from 'react';
import OverlayTrigger from 'react-bootstrap/OverlayTrigger';
import { TrashIcon } from '@primer/octicons-react';
import { Tooltip } from 'react-bootstrap';
// import SnapshotTokenService, {
//   TinySnapshot,
// } from 'explorviz-frontend/services/snapshot-token';
import {
  useSnapshotTokenStore,
  TinySnapshot,
} from 'react-lib/src/stores/snapshot-token';

interface DeleteSnapshotProps {
  token: TinySnapshot;
  isShared: boolean;
  subscribed: boolean;
}

export default function DeleteSnapshot({
  token,
  isShared,
  subscribed,
}: DeleteSnapshotProps) {
  const deleteSnapshotInStore = useSnapshotTokenStore(
    (state) => state.deleteSnapshot
  );

  // async
  const deleteSnapshot = (
    snapShot: TinySnapshot,
    isShared: boolean,
    subscribed: boolean
  ) => {
    deleteSnapshotInStore(snapShot, isShared, subscribed);
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
          tabindex="0"
          href="#"
          onClick={deleteSnapshot(token, isShared, subscribed)}
          // {{on 'click' (fn this.deleteSnapshot @token @isShared @subscribed)}}
        >
          {/* {{svg-jar 'trash-16' className='octicon align-middle'}} */}
          <TrashIcon size="small" verticalAlign="middle" />
        </a>
      </OverlayTrigger>
    </div>
  );
}
