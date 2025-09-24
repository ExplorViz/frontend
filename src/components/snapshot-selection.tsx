import { FileAddedIcon, ShareAndroidIcon } from '@primer/octicons-react';
import {
  SnapshotInfo,
  SnapshotToken,
  TinySnapshot,
  useSnapshotTokenStore,
} from 'explorviz-frontend/src/stores/snapshot-token';
import { useToastHandlerStore } from 'explorviz-frontend/src/stores/toast-handler';
import React, { useState } from 'react';
import { Button, Modal, OverlayTrigger, Tooltip } from 'react-bootstrap';
import AdditionalSnapshotInfo from './additional-snapshot-info';
import DeleteSnapshot from './delete-snapshot';
import ShareSnapshot from './share-snapshot';

interface SnapshotSelectionArgs {
  snapshotInfo: SnapshotInfo;
  selectPersonalToken(token: TinySnapshot): void;
  selectSharedToken(token: TinySnapshot): void;
  reload(): void;
}

const shareSnapshot = import.meta.env.VITE_SHARE_SNAPSHOT_URL;

export default function SnapshotSelection({
  snapshotInfo,
  selectPersonalToken,
  selectSharedToken,
  reload,
}: SnapshotSelectionArgs) {
  const [sortPropertyPersonal, setSortPropertyPersonal] =
    useState<keyof TinySnapshot>('createdAt');
  const [sortPropertyShared, setSortPropertyShared] =
    useState<keyof TinySnapshot>('createdAt');
  const [sortOrderPersonal, setSortOrderPersonal] = useState<'asc' | 'desc'>(
    'desc'
  );
  const [sortOrderShared, setSortOrderShared] = useState<'asc' | 'desc'>(
    'desc'
  );
  const [uploadSnapshotMenu, setUploadSnapshotMenu] = useState<boolean>(false);
  const [uploadSnapshotBtnDisabled, setUploadSnapshotBtnDisabled] =
    useState<boolean>(true);
  const [displayName, setDisplayName] = useState<boolean>(false);
  const [snapshotData, setSnapshotData] = useState<SnapshotToken | null>(null);
  const [name, setName] = useState<string>('');

  const sortSnapshots = (
    snapshots: TinySnapshot[],
    property: keyof TinySnapshot,
    order: 'asc' | 'desc'
  ) => {
    return [...snapshots].sort((a, b) => {
      const aValue = a[property];
      const bValue = b[property];
      return order === 'asc'
        ? aValue > bValue
          ? 1
          : -1
        : aValue < bValue
          ? 1
          : -1;
    });
  };

  const sortByPersonal = (property: keyof TinySnapshot) => {
    if (property === sortPropertyPersonal) {
      if (sortOrderPersonal === 'asc') {
        setSortOrderPersonal('desc');
      } else {
        setSortOrderPersonal('asc');
      }
    } else {
      setSortOrderPersonal('asc');
      setSortPropertyPersonal(property);
    }
  };

  const sortByShared = (property: keyof TinySnapshot) => {
    if (property === sortPropertyShared) {
      if (sortOrderShared === 'asc') {
        setSortOrderShared('desc');
      } else {
        setSortOrderShared('asc');
      }
    } else {
      setSortOrderShared('asc');
      setSortPropertyShared(property);
    }
  };

  const filter = (snapShotTokens: SnapshotToken[], property: boolean) => {
    return snapShotTokens.filter((token) => token.isShared === property);
  };

  const openMenu = () => {
    setUploadSnapshotMenu(true);
  };

  const closeMenu = () => {
    setUploadSnapshotMenu(false);
    reset();
  };

  const reset = () => {
    setUploadSnapshotMenu(false);
    setName('');
    setSnapshotData(null);
    setDisplayName(false);
  };

  const updateName = (event: React.FormEvent) => {
    const target: HTMLInputElement = event.target as HTMLInputElement;
    setName(target.value);
    canSaveSnapshot();
  };

  const updateFile = (event: React.FormEvent) => {
    const target = event.target as HTMLInputElement;
    if (target.files !== null) {
      const fileReader = new FileReader();

      fileReader.onload = () => {
        const fileContent = fileReader.result as string;
        const jsonData = JSON.parse(fileContent);
        setSnapshotData(jsonData as SnapshotToken);
        if (snapshotData === null) {
          setName('unnamed');
        } else {
          setName(snapshotData!.name);
        }
        setDisplayName(true);
        canSaveSnapshot();
      };

      fileReader.readAsText(target.files[0]);
    }
  };

  const canSaveSnapshot = () => {
    if (name !== '' && snapshotData !== null) {
      setUploadSnapshotBtnDisabled(false);
    } else {
      setUploadSnapshotBtnDisabled(true);
    }
  };

  const uploadSnapshot = async () => {
    await useSnapshotTokenStore.getState().saveSnapshot(snapshotData!, name);
    reset();
    reload();
  };

  const createLink = async (snapshot: TinySnapshot) => {
    try {
      await navigator.clipboard.writeText(
        `${shareSnapshot}visualization?landscapeToken=${snapshot.landscapeToken.value}&owner=${snapshot.owner}&createdAt=${snapshot.createdAt}&sharedSnapshot=${true}`
      );
      useToastHandlerStore
        .getState()
        .showSuccessToastMessage('Snapshot URL copied to clipboard.');
    } catch (e) {
      useToastHandlerStore
        .getState()
        .showErrorToastMessage('Failed to generate URL for snapshot.');
    }
  };

  return (
    <>
      <div className="pb-5">
        <h5 className="text-left mb-3">Personal Snapshots</h5>
        <div className="flex-row justify-content-center selection-table">
          <table
            className="table table-striped explorviz-table"
            id="personal-token-selection-table"
          >
            <thead>
              <tr>
                <th
                  style={{ width: '70%' }}
                  scope="col"
                  onClick={() => sortByPersonal('name')}
                >
                  Alias
                </th>
                <th scope="col" onClick={() => sortByPersonal('createdAt')}>
                  Created
                </th>
                <th scope="col"></th>
              </tr>
            </thead>
            <tbody>
              {snapshotInfo.personalSnapshots.length > 0 ? (
                sortSnapshots(
                  snapshotInfo.personalSnapshots,
                  sortPropertyPersonal,
                  sortOrderPersonal
                ).map((personalToken) => (
                  <tr key={personalToken.name} className="token-selection-row">
                    <th
                      scope="row"
                      onClick={() => selectPersonalToken(personalToken)}
                    >
                      {personalToken.name}{' '}
                    </th>
                    <th
                      scope="row"
                      onClick={() => selectPersonalToken(personalToken)}
                    >
                      {new Date(personalToken.createdAt).toLocaleString()}
                    </th>
                    <th scope="row">
                      <ul className="token-selection-icons">
                        <li>
                          <AdditionalSnapshotInfo token={personalToken} />
                        </li>
                        <li>
                          <ShareSnapshot
                            token={personalToken}
                            reload={reload}
                          />
                        </li>
                        <li>
                          <DeleteSnapshot
                            token={personalToken}
                            isShared={false}
                            subscribed={false}
                            reload={reload}
                          />
                        </li>
                      </ul>
                    </th>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={3}>There are no saved snapshots.</td>
                </tr>
              )}
            </tbody>
            <tfoot>
              <tr>
                <td colSpan={3} className="p-1">
                  <div className="d-flex flex-row justify-content-center">
                    <Button
                      variant="primary"
                      className="align-self-center pt-2 px-3"
                      onClick={() => setUploadSnapshotMenu(true)}
                    >
                      <FileAddedIcon size="small" />
                    </Button>
                  </div>
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
        <Modal show={uploadSnapshotMenu} onHide={closeMenu}>
          <Modal.Header closeButton>
            <Modal.Title>Upload Snapshot</Modal.Title>
          </Modal.Header>
          <Modal.Body>
            {displayName && (
              <>
                <label htmlFor="token">Snapshot Name:</label>
                <div className="d-flex justify-content-between mb-4">
                  <input
                    id="name"
                    className="form-control mr-2"
                    onInput={updateName}
                    value={name}
                  />
                </div>
              </>
            )}
            <div className="d-flex justify-content-between">
              <input
                id="fileUpload"
                type="file"
                name="file"
                accept=".explorviz"
                onInput={updateFile}
              />
            </div>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="outline-danger" onClick={closeMenu}>
              Cancel
            </Button>
            <Button
              variant="outline-secondary"
              onClick={uploadSnapshot}
              disabled={uploadSnapshotBtnDisabled}
            >
              Upload
            </Button>
          </Modal.Footer>
        </Modal>
      </div>
      <div className="pb-5">
        <h5 className="text-left">Shared Snapshots</h5>
        <div className="d-flex flex-row justify-content-center selection-table">
          <table
            className="table table-striped explorviz-table"
            id="shared-token-selection-table"
          >
            <thead>
              <tr>
                <th
                  style={{ width: '70%' }}
                  scope="col"
                  onClick={() => sortByShared('name')}
                >
                  Alias
                </th>
                <th scope="col" onClick={() => sortByShared('createdAt')}>
                  Created
                </th>
                <th scope="col"></th>
              </tr>
            </thead>
            <tbody>
              {snapshotInfo.sharedSnapshots.length > 0 ? (
                sortSnapshots(
                  snapshotInfo.sharedSnapshots,
                  sortPropertyShared,
                  sortOrderShared
                ).map((sharedToken) => (
                  <tr key={sharedToken.name} className="token-selection-row">
                    <th
                      scope="row"
                      onClick={() => selectSharedToken(sharedToken)}
                    >
                      {sharedToken.name}
                    </th>
                    <th
                      scope="row"
                      onClick={() => selectSharedToken(sharedToken)}
                    >
                      {new Date(sharedToken.createdAt).toLocaleString()}
                    </th>
                    <th scope="row">
                      <ul className="token-selection-icons">
                        <li>
                          <AdditionalSnapshotInfo token={sharedToken} />
                        </li>
                        <li>
                          <div id="colorPresets" className="dropdown">
                            <OverlayTrigger
                              placement="bottom"
                              overlay={<Tooltip>Share Snapshot</Tooltip>}
                            >
                              <button
                                className="button-svg-with-hover"
                                type="button"
                                onClick={() => createLink(sharedToken)}
                              >
                                <ShareAndroidIcon
                                  size="small"
                                  className="align-middle"
                                />
                              </button>
                            </OverlayTrigger>
                          </div>
                        </li>
                        <li>
                          <DeleteSnapshot
                            token={sharedToken}
                            isShared={true}
                            subscribed={false}
                            reload={reload}
                          />
                        </li>
                      </ul>
                    </th>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={3} className="text-center">
                    There are no shared snapshots.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
      <div className="pb-3">
        <h5 className="text-left">Subscribed Snapshots</h5>
        <div className="d-flex flex-row justify-content-center selection-table">
          <table
            className="table table-striped"
            id="subscribed-token-selection-table"
          >
            <thead>
              <tr>
                <th
                  style={{ width: '70%' }}
                  scope="col"
                  onClick={() => sortByShared('name')}
                >
                  Alias
                </th>
                <th scope="col" onClick={() => sortByShared('createdAt')}>
                  Created
                </th>
                <th scope="col"></th>
              </tr>
            </thead>
            <tbody>
              {snapshotInfo.subscribedSnapshots.length > 0 ? (
                sortSnapshots(
                  snapshotInfo.subscribedSnapshots,
                  sortPropertyShared,
                  sortOrderShared
                ).map((subscribedToken) => (
                  <tr
                    key={subscribedToken.name}
                    className="token-selection-row"
                  >
                    <th
                      scope="row"
                      onClick={() => selectSharedToken(subscribedToken)}
                    >
                      {subscribedToken.name}
                    </th>
                    <th
                      scope="row"
                      onClick={() => selectSharedToken(subscribedToken)}
                    >
                      {new Date(subscribedToken.createdAt).toLocaleString()}
                    </th>
                    <th scope="row">
                      <ul className="token-selection-icons">
                        <li>
                          <AdditionalSnapshotInfo token={subscribedToken} />
                        </li>
                        <li>
                          <DeleteSnapshot
                            token={subscribedToken}
                            isShared={false}
                            subscribed={true}
                            reload={reload}
                          />
                        </li>
                      </ul>
                    </th>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={3} className="text-center">
                    There are no subsrcibed snapshots.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
