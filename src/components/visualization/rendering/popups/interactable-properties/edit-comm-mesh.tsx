import React from 'react';

import ClassCommunication from 'explorviz-frontend/src/utils/landscape-schemes/dynamic/class-communication';
import { useLandscapeRestructureStore } from 'explorviz-frontend/src/stores/landscape-restructure';
import { TrashIcon } from '@primer/octicons-react';
import Button from 'react-bootstrap/Button';
import OverlayTrigger from 'react-bootstrap/OverlayTrigger';
import Tooltip from 'react-bootstrap/Tooltip';

interface EditCommMeshProps {
  classCommunication: ClassCommunication;
}

export default function EditCommMesh({
  classCommunication,
}: EditCommMeshProps) {
  const deletedDataModels = useLandscapeRestructureStore(
    (state) => state.deletedDataModels
  );

  const deleteCommunication = useLandscapeRestructureStore(
    (state) => state.deleteCommunication
  );

  const deleteComm = () => {
    deleteCommunication(classCommunication);
  };

  const isDeleted = !deletedDataModels.some(
    (entity) => entity === classCommunication
  );

  return (
    isDeleted && (
      <tr>
        <td className="text-nowrap align-top"></td>
        <td className="text-right text-break pl-1">
          <OverlayTrigger
            placement="top"
            trigger={['hover', 'focus']}
            overlay={<Tooltip>Delete</Tooltip>}
          >
            <Button variant="danger" onClick={deleteComm}>
              <TrashIcon size="small" className="align-right" />
            </Button>
          </OverlayTrigger>
        </td>
      </tr>
    )
  );
}
