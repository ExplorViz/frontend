import { FileAddedIcon, ShareAndroidIcon } from '@primer/octicons-react';
import AdditionalSnapshotInfo from 'explorviz-frontend/src/components/additional-snapshot-info';
import DeleteSnapshot from 'explorviz-frontend/src/components/delete-snapshot';
import ShareSnapshot from 'explorviz-frontend/src/components/share-snapshot';
import { useAuthStore } from 'explorviz-frontend/src/stores/auth';
import {
  SnapshotInfo,
  SnapshotToken,
  TinySnapshot,
  useSnapshotTokenStore,
} from 'explorviz-frontend/src/stores/snapshot-token';
import { parseSnapshotJson } from 'explorviz-frontend/src/utils/snapshot/snapshot-json';
import { useToastHandlerStore } from 'explorviz-frontend/src/stores/toast-handler';
import React, { useState } from 'react';
import { Button, Modal, OverlayTrigger, Tooltip } from 'react-bootstrap';

interface SnapshotSelectionArgs {
  snapshotInfo: SnapshotInfo;
  selectPersonalToken(token: TinySnapshot): void;
  selectSharedToken(token: TinySnapshot): void;
  reload(): void;
}

const shareSnapshot = import.meta.env.VITE_SHARE_SNAPSHOT_URL || `${window.location.origin}/`;

export default function SnapshotSelection({
  snapshotInfo,
  selectPersonalToken,
  selectSharedToken,
  reload,
}: SnapshotSelectionArgs) {
  const [sortPropertyPersonal, setSortPropertyPersonal] = useState<keyof TinySnapshot>('createdAt');
  const [sortPropertyShared, setSortPropertyShared] = useState<keyof TinySnapshot>('createdAt');
  const [sortOrderPersonal, setSortOrderPersonal] = useState<'asc' | 'desc'>('desc');
  const [sortOrderShared, setSortOrderShared] = useState<'asc' | 'desc'>('desc');
  const [uploadSnapshotMenu, setUploadSnapshotMenu] = useState<boolean>(false);
  const [displayName, setDisplayName] = useState<boolean>(false);
  const [snapshotData, setSnapshotData] = useState<SnapshotToken | null>(null);
  const [name, setName] = useState<string>('');

  const sortSnapshots = (snapshots: TinySnapshot[], property: keyof TinySnapshot, order: 'asc' | 'desc') => {
    return [...snapshots].sort((a, b) => {
      const aValue = a[property];
      const bValue = b[property];
      return order === 'asc' ? (aValue > bValue ? 1 : -1) : aValue < bValue ? 1 : -1;
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

  const updateName = (event: React.InputEvent<HTMLInputElement>) => {
    const target: HTMLInputElement = event.currentTarget;
    setName(target.value);
  };

  const updateFile = (event: React.InputEvent<HTMLInputElement>) => {
    const target = event.currentTarget;
    if (target.files !== null) {
      const fileReader = new FileReader();

      fileReader.onload = () => {
        const fileContent = fileReader.result as string;
        try {
          const jsonData = parseSnapshotJson<SnapshotToken>(fileContent);
          setSnapshotData(jsonData);
          setName(jsonData.name || 'unnamed');
          setDisplayName(true);
        } catch {
          setSnapshotData(null);
          setDisplayName(false);
          useToastHandlerStore.getState().showErrorToastMessage('The selected file is not a valid snapshot.');
        }
      };

      if (target.files.length > 0) {
        fileReader.readAsText(target.files[0]);
      }
    }
  };

  const uploadSnapshotBtnDisabled = name === '' || snapshotData === null;

  const uploadSnapshot = async () => {
    const owner = useAuthStore.getState().user?.sub;
    if (!owner) return;
    // Re-own the imported snapshot: a fresh identity avoids collisions and foreign owners.
    const imported: SnapshotToken = {
      ...snapshotData!,
      owner,
      createdAt: Date.now(),
      isShared: false,
      subscribedUsers: { subscriberList: [] },
      deleteAt: 0,
    };
    if (await useSnapshotTokenStore.getState().saveSnapshot(imported, name)) {
      reset();
      reload();
    }
  };

  const createLink = async (snapshot: TinySnapshot) => {
    try {
      await navigator.clipboard.writeText(
        `${shareSnapshot}visualization?landscapeToken=${snapshot.landscapeToken.value}&owner=${snapshot.owner}&createdAt=${snapshot.createdAt}&sharedSnapshot=${true}`
      );
      useToastHandlerStore.getState().showSuccessToastMessage('Snapshot URL copied to clipboard.');
    } catch (e) {
      useToastHandlerStore.getState().showErrorToastMessage('Failed to generate URL for snapshot.');
    }
  };

  return (
    <>
      <div className="pb-5">
        <h5 className="text-left mb-3">Personal Snapshots</h5>
        <div className="flex-row justify-content-center selection-table">
          <table className="table table-striped explorviz-table" id="personal-token-selection-table">
            <thead>
              <tr>
                <th style={{ width: '70%' }} scope="col" onClick={() => sortByPersonal('name')}>
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
                sortSnapshots(snapshotInfo.personalSnapshots, sortPropertyPersonal, sortOrderPersonal).map(
                  (personalToken) => (
                    <tr key={personalToken.createdAt} className="token-selection-row">
                      <th scope="row" onClick={() => selectPersonalToken(personalToken)}>
                        {personalToken.name}{' '}
                      </th>
                      <th scope="row" onClick={() => selectPersonalToken(personalToken)}>
                        {new Date(personalToken.createdAt).toLocaleString()}
                      </th>
                      <th scope="row">
                        <ul className="token-selection-icons">
                          <li>
                            <AdditionalSnapshotInfo token={personalToken} />
                          </li>
                          <li>
                            <ShareSnapshot token={personalToken} reload={reload} />
                          </li>
                          <li>
                            <DeleteSnapshot token={personalToken} isShared={false} subscribed={false} reload={reload} />
                          </li>
                        </ul>
                      </th>
                    </tr>
                  )
                )
              ) : (
                <tr>
                  <td colSpan={3} className="text-center">
                    There are no saved snapshots.
                  </td>
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
                  <input id="name" className="form-control mr-2" onInput={updateName} value={name} />
                </div>
              </>
            )}
            <div className="d-flex justify-content-between">
              <input id="fileUpload" type="file" name="file" accept=".explorviz" onInput={updateFile} />
            </div>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="outline-danger" onClick={closeMenu}>
              Cancel
            </Button>
            <Button variant="outline-secondary" onClick={uploadSnapshot} disabled={uploadSnapshotBtnDisabled}>
              Upload
            </Button>
          </Modal.Footer>
        </Modal>
      </div>
      <div className="pb-5">
        <h5 className="text-left">Shared Snapshots</h5>
        <div className="d-flex flex-row justify-content-center selection-table">
          <table className="table table-striped explorviz-table" id="shared-token-selection-table">
            <thead>
              <tr>
                <th style={{ width: '70%' }} scope="col" onClick={() => sortByShared('name')}>
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
                sortSnapshots(snapshotInfo.sharedSnapshots, sortPropertyShared, sortOrderShared).map((sharedToken) => (
                  <tr key={sharedToken.createdAt} className="token-selection-row">
                    <th scope="row" onClick={() => selectSharedToken(sharedToken)}>
                      {sharedToken.name}
                    </th>
                    <th scope="row" onClick={() => selectSharedToken(sharedToken)}>
                      {new Date(sharedToken.createdAt).toLocaleString()}
                    </th>
                    <th scope="row">
                      <ul className="token-selection-icons">
                        <li>
                          <AdditionalSnapshotInfo token={sharedToken} />
                        </li>
                        <li>
                          <div id="colorPresets" className="dropdown">
                            <OverlayTrigger placement="bottom" overlay={<Tooltip>Share Snapshot</Tooltip>}>
                              <button
                                className="button-svg-with-hover"
                                type="button"
                                onClick={() => createLink(sharedToken)}
                              >
                                <ShareAndroidIcon size="small" className="align-middle" />
                              </button>
                            </OverlayTrigger>
                          </div>
                        </li>
                        <li>
                          <DeleteSnapshot token={sharedToken} isShared={true} subscribed={false} reload={reload} />
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
          <table className="table table-striped explorviz-table" id="subscribed-token-selection-table">
            <thead>
              <tr>
                <th style={{ width: '70%' }} scope="col" onClick={() => sortByShared('name')}>
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
                sortSnapshots(snapshotInfo.subscribedSnapshots, sortPropertyShared, sortOrderShared).map(
                  (subscribedToken) => (
                    <tr key={`${subscribedToken.owner}-${subscribedToken.createdAt}`} className="token-selection-row">
                      <th scope="row" onClick={() => selectSharedToken(subscribedToken)}>
                        {subscribedToken.name}
                      </th>
                      <th scope="row" onClick={() => selectSharedToken(subscribedToken)}>
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
                  )
                )
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
