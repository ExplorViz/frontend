import { useState } from 'react';

import {
  CopyIcon,
  DiffRenamedIcon,
  DuplicateIcon,
  PackageIcon,
  RepoPullIcon,
  RepoPushIcon,
  StackIcon,
  TrashIcon,
} from '@primer/octicons-react';
import { useLandscapeRestructureStore } from 'explorviz-frontend/src/stores/landscape-restructure';
import { useUserSettingsStore } from 'explorviz-frontend/src/stores/user-settings';
import {
  isApplication,
  isClass,
  isPackage,
} from 'explorviz-frontend/src/utils/landscape-schemes/structure-data';
import Button from 'react-bootstrap/Button';
import OverlayTrigger from 'react-bootstrap/OverlayTrigger';
import Tooltip from 'react-bootstrap/Tooltip';

interface EditMeshProps {
  entity: any;
}

export default function EditMesh({ entity }: EditMeshProps) {
  const deletedDataModels = useLandscapeRestructureStore(
    (state) => state.deletedDataModels
  );

  const clippedMesh = useLandscapeRestructureStore(
    (state) => state.clippedMesh
  );

  const [districtColor] = useState<string>(
    useUserSettingsStore.getState().visualizationSettings.districtRootLevelColor
      .value
  );

  const [buildingColor] = useState<string>(
    useUserSettingsStore.getState().visualizationSettings.otherBuildingColor.value
  );

  const isEntityApplication = isApplication(entity);
  const isEntityPackage = isPackage(entity);
  const isEntityClass = isClass(entity);
  const isDeleted = !(
    (isEntityApplication &&
      deletedDataModels.some((deletedEntity) => deletedEntity === entity)) ||
    (isEntityPackage &&
      deletedDataModels.some((deletedEntity) => deletedEntity === entity)) ||
    (isEntityClass &&
      deletedDataModels.some((deletedEntity) => deletedEntity === entity))
  );

  const isInsertable: boolean = (() => {
    if (!clippedMesh) return false;

    const isClippedMeshPackage = isPackage(clippedMesh);
    const isEntityApplicationOrPackage =
      isApplication(entity) || isPackage(entity);

    const isClippedMeshClass = isClass(clippedMesh);
    const isEntityPackage = isPackage(entity);

    return (
      (isClippedMeshPackage && isEntityApplicationOrPackage) ||
      (isClippedMeshClass && isEntityPackage)
    );
  })();

  const duplicateApp = () => {
    useLandscapeRestructureStore.getState().duplicateApp(entity);
  };

  const addPackage = () => {
    if (isEntityApplication)
      useLandscapeRestructureStore.getState().addPackage(entity);
    else if (isEntityPackage)
      useLandscapeRestructureStore.getState().addSubPackage(entity);
  };

  const addClass = () => {
    if (isEntityPackage) {
      useLandscapeRestructureStore.getState().addClass(entity);
    }
  };

  const deleteMesh = () => {
    if (isEntityApplication)
      useLandscapeRestructureStore.getState().deleteApp(entity);
    else if (isEntityPackage)
      useLandscapeRestructureStore.getState().deletePackage(entity);
    else if (isEntityClass)
      useLandscapeRestructureStore.getState().deleteClass(entity);
  };

  const cutMesh = () => {
    if (isEntityPackage)
      useLandscapeRestructureStore.getState().cutPackage(entity);
    else if (isEntityClass)
      useLandscapeRestructureStore.getState().cutClass(entity);
  };

  const setCommunicationSource = () => {
    useLandscapeRestructureStore.getState().setCommunicationSourceClass(entity);
  };

  const setCommunicationTarget = () => {
    useLandscapeRestructureStore.getState().setCommunicationTargetClass(entity);
  };

  const insertMesh = () => {
    useLandscapeRestructureStore.getState().movePackageOrClass(entity);
  };

  const pasteMesh = () => {
    if (isPackage(clippedMesh))
      useLandscapeRestructureStore.getState().pastePackage(entity);
    else if (isClass(clippedMesh))
      useLandscapeRestructureStore.getState().pasteClass(entity);
  };

  if (isDeleted) {
    return (
      <>
        <hr />
        {isEntityPackage ? (
          <>
            <OverlayTrigger
              placement="top"
              trigger={['hover', 'focus']}
              overlay={<Tooltip>Add Package</Tooltip>}
            >
              <Button
                style={{
                  backgroundColor: districtColor,
                  borderColor: districtColor,
                }}
                onClick={addPackage}
              >
                <PackageIcon size="small" />
              </Button>
            </OverlayTrigger>

            <OverlayTrigger
              placement="top"
              trigger={['hover', 'focus']}
              overlay={<Tooltip>Add Building</Tooltip>}
            >
              <Button
                style={{
                  backgroundColor: buildingColor,
                  borderColor: buildingColor,
                }}
                onClick={addClass}
              >
                <PackageIcon size="small" />
              </Button>
            </OverlayTrigger>

            <OverlayTrigger
              placement="top"
              trigger={['hover', 'focus']}
              overlay={<Tooltip>Delete</Tooltip>}
            >
              <Button variant="danger" onClick={deleteMesh}>
                <TrashIcon size="small" className="align-right" />
              </Button>
            </OverlayTrigger>

            <OverlayTrigger
              placement="top"
              trigger={['hover', 'focus']}
              overlay={<Tooltip>Copy</Tooltip>}
            >
              <Button variant="dark" onClick={cutMesh}>
                <CopyIcon size="small" className="align-right" />
              </Button>
            </OverlayTrigger>

            {isInsertable && (
              <>
                <OverlayTrigger
                  placement="top"
                  trigger={['hover', 'focus']}
                  overlay={<Tooltip>Paste</Tooltip>}
                >
                  <Button variant="light" onClick={pasteMesh}>
                    <DuplicateIcon size="small" className="align-right" />
                  </Button>
                </OverlayTrigger>

                <OverlayTrigger
                  placement="top"
                  trigger={['hover', 'focus']}
                  overlay={<Tooltip>Paste</Tooltip>}
                >
                  <Button variant="warning" onClick={insertMesh}>
                    <DiffRenamedIcon size="small" className="align-right" />
                  </Button>
                </OverlayTrigger>
              </>
            )}
          </>
        ) : isEntityApplication ? (
          <>
            <OverlayTrigger
              placement="top"
              trigger={['hover', 'focus']}
              overlay={<Tooltip>Duplicate</Tooltip>}
            >
              <Button variant="info" onClick={duplicateApp}>
                <StackIcon size="small" className="align-right" />
              </Button>
            </OverlayTrigger>

            <OverlayTrigger
              placement="top"
              trigger={['hover', 'focus']}
              overlay={<Tooltip>Add Package</Tooltip>}
            >
              <Button
                style={{
                  backgroundColor: districtColor,
                  borderColor: districtColor,
                }}
                onClick={addPackage}
              >
                <PackageIcon size="small" />
              </Button>
            </OverlayTrigger>

            <OverlayTrigger
              placement="top"
              trigger={['hover', 'focus']}
              overlay={<Tooltip>Delete</Tooltip>}
            >
              <Button variant="danger" onClick={deleteMesh}>
                <TrashIcon size="small" className="align-right" />
              </Button>
            </OverlayTrigger>

            {isInsertable && (
              <>
                <OverlayTrigger
                  placement="top"
                  trigger={['hover', 'focus']}
                  overlay={<Tooltip>Paste</Tooltip>}
                >
                  <Button variant="light" onClick={pasteMesh}>
                    <DuplicateIcon size="small" className="align-right" />
                  </Button>
                </OverlayTrigger>

                <OverlayTrigger
                  placement="top"
                  trigger={['hover', 'focus']}
                  overlay={<Tooltip>Paste</Tooltip>}
                >
                  <Button variant="warning" onClick={insertMesh}>
                    <DiffRenamedIcon size="small" className="align-right" />
                  </Button>
                </OverlayTrigger>
              </>
            )}
          </>
        ) : isEntityClass ? (
          <>
            <OverlayTrigger
              placement="top"
              trigger={['hover', 'focus']}
              overlay={<Tooltip>Delete</Tooltip>}
            >
              <Button variant="danger" onClick={deleteMesh}>
                <TrashIcon size="small" className="align-right" />
              </Button>
            </OverlayTrigger>

            <OverlayTrigger
              placement="top"
              trigger={['hover', 'focus']}
              overlay={<Tooltip>Copy</Tooltip>}
            >
              <Button variant="dark" onClick={cutMesh}>
                <CopyIcon size="small" className="align-right" />
              </Button>
            </OverlayTrigger>

            <OverlayTrigger
              placement="top"
              trigger={['hover', 'focus']}
              overlay={<Tooltip>Communication Source</Tooltip>}
            >
              <Button variant="secondary" onClick={setCommunicationSource}>
                <RepoPullIcon size="small" className="align-right" />
              </Button>
            </OverlayTrigger>

            <OverlayTrigger
              placement="top"
              trigger={['hover', 'focus']}
              overlay={<Tooltip>Communication Target</Tooltip>}
            >
              <Button variant="secondary" onClick={setCommunicationTarget}>
                <RepoPushIcon size="small" className="align-right" />
              </Button>
            </OverlayTrigger>
          </>
        ) : (
          <></>
        )}
      </>
    );
  }
}
