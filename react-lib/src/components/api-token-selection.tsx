import React, { useState } from 'react';
import { format } from 'date-fns';
import { ApiToken, useUserApiTokenStore } from '../stores/user-api-token';
import convertDate from '../utils/helpers/time-convter';
import { Button, Modal, OverlayTrigger, Tooltip } from 'react-bootstrap';
import { PlusIcon, TrashIcon } from '@primer/octicons-react';

const today: string = format(new Date().getTime() + 86400 * 1000, 'yyyy-MM-dd');

interface ApiTokenSelectionArgs {
  apiTokens: ApiToken[];
  refreshRoute(): void;
}

export default function ApiTokenSelection({
  apiTokens,
  refreshRoute,
}: ApiTokenSelectionArgs) {
  const [sortProperty, setSortProperty] = useState<string>('createdAt');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [createToken, setCreateToken] = useState<boolean>(false);
  const [name, setName] = useState<string>('');
  const [expDate, setExpDate] = useState<number | null>(null);
  const [token, setToken] = useState<string>('');
  const [hostUrl, setHostUrl] = useState<string>('');
  const [saveBtnDisabled, setSaveBtnDisabled] = useState<boolean>(true);

  const sortedApiTokens = [...apiTokens].sort((a, b) => {
    const aValue = a[sortProperty];
    const bValue = b[sortProperty];

    return sortOrder === 'asc'
      ? aValue > bValue
        ? 1
        : -1
      : aValue < bValue
        ? 1
        : -1;
  });

  const sortBy = (property: keyof ApiToken) => {
    if (property === sortProperty) {
      if (sortOrder === 'asc') {
        setSortOrder('desc');
      } else {
        setSortOrder('asc');
      }
    } else {
      setSortOrder('asc');
      setSortProperty(property);
    }
  };

  const deleteApiToken = async (apiToken: ApiToken) => {
    await useUserApiTokenStore
      .getState()
      .deleteApiToken(apiToken.token, apiToken.uid);
    if (localStorage.getItem('gitAPIToken') !== null) {
      if (localStorage.getItem('gitAPIToken') === JSON.stringify(apiToken)) {
        localStorage.removeItem('gitAPIToken');
        localStorage.removeItem('gitProject');
      }
    }
  };

  const openMenu = () => {
    setCreateToken(true);
  };

  const closeMenu = () => {
    reset();
    setCreateToken(false);
  };

  const createApiToken = async () => {
    useUserApiTokenStore
      .getState()
      .createApiToken(name, token, hostUrl, expDate);
    reset();
  };

  const reset = () => {
    setName('');
    setExpDate(null);
    setToken('');
    setCreateToken(false);
    setHostUrl('');
  };

  const updateName = (event: React.FormEvent) => {
    const target: HTMLInputElement = event.target as HTMLInputElement;
    setName(target.value);
    canSaveToken();
  };

  const updateToken = (event: React.FormEvent) => {
    const target: HTMLInputElement = event.target as HTMLInputElement;
    setToken(target.value);
    canSaveToken();
  };

  const updateHostUrl = (event: React.FormEvent) => {
    const target: HTMLInputElement = event.target as HTMLInputElement;
    setHostUrl(target.value);
    canSaveToken();
  };

  const updateExpDate = (event: React.FormEvent) => {
    const target: HTMLInputElement = event.target as HTMLInputElement;
    const date = convertDate(target.value);
    setExpDate(date);
  };

  const canSaveToken = () => {
    if (token !== '' && name !== '' && hostUrl !== '') {
      setSaveBtnDisabled(false);
    } else {
      setSaveBtnDisabled(true);
    }
  };

  const formatDate = (date: number, showMin: boolean): string => {
    if (date === 0) {
      return '-';
    } else if (showMin) {
      return format(new Date(date), 'dd/MM/yyyy, HH:mm');
    } else return format(new Date(date), 'dd/MM/yyyy');
  };

  return (
    <>
      <div className="pb-5 px-5 w-100">
        <h5 className="text-left mb-3">API-Tokens</h5>
        <div className="flex-row justify-content-center overflow-scroll">
          <table className="table table-striped">
            <thead>
              <tr>
                <th scope="col" onClick={() => sortBy('name')}>
                  Name
                </th>
                <th scope="col">API Token</th>
                <th scope="col" onClick={() => sortBy('createdAt')}>
                  Created
                </th>
                <th scope="col" onClick={() => sortBy('expires')}>
                  Expires
                </th>
                <th scope="col"></th>
              </tr>
            </thead>
            <tbody>
              {sortedApiTokens.length > 0 ? (
                sortedApiTokens.map((apiToken) => (
                  <tr key={apiToken.token} className="snapshot-selection-row">
                    <th style={{ width: '40%' }} scope="row">
                      {apiToken.name}{' '}
                    </th>
                    <th style={{ width: '25%' }} scope="row">
                      {apiToken.token}{' '}
                    </th>
                    <th scope="row">{formatDate(apiToken.createdAt, true)}</th>
                    <th scope="row">{formatDate(apiToken.expires!, false)}</th>
                    <th scope="row">
                      <ul className="token-selection-icons">
                        <li>
                          <div id="colorPresets" className="dropdown">
                            <OverlayTrigger
                              placement="bottom"
                              overlay={<Tooltip>Delete Snapshot</Tooltip>}
                            >
                              <button
                                className="button-svg-with-hover"
                                type="button"
                                onClick={() => deleteApiToken(apiToken)}
                              >
                                <TrashIcon
                                  size="small"
                                  className="align-middle"
                                />
                              </button>
                            </OverlayTrigger>
                          </div>
                        </li>
                      </ul>
                    </th>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5}>There are no saved API-Tokens.</td>
                </tr>
              )}
              <tr>
                <td colSpan={5} className="p-1">
                  <div className="d-flex flex-row justify-content-center">
                    <Button
                      variant="primary"
                      className="align-self-center pt-2 px-3"
                      onClick={() => setCreateToken(true)}
                    >
                      <PlusIcon size="small" />
                    </Button>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
      <div>
        <Modal show={createToken} onHide={closeMenu}>
          <Modal.Header closeButton>
            <Modal.Title>Create API Token</Modal.Title>
          </Modal.Header>
          <Modal.Body>
            <label className="mt-2" htmlFor="token">
              Name:
            </label>
            <div className="d-flex justify-content-between">
              <input
                id="name"
                className="form-control mr-2"
                onInput={(e) => updateName(e)}
                value={name}
              />
            </div>
            <label htmlFor="token">API Token:</label>
            <div className="d-flex justify-content-between">
              <input
                id="token"
                className="form-control mr-2"
                onInput={(e) => updateToken(e)}
                value={token}
              />
            </div>
            <label htmlFor="token">Host URL:</label>
            <div className="d-flex justify-content-between">
              <input
                id="url"
                className="form-control mr-2"
                placeholder="e.g.: https://git.<hostname>.<de/com...>"
                onInput={(e) => updateHostUrl(e)}
                value={hostUrl}
              />
            </div>
            <label className="mt-2" htmlFor="token">
              Expires <i>- Optional:</i>{' '}
            </label>
            <div className="d-flex justify-content-between">
              <input
                id="date"
                className="form-control mr-2"
                type="date"
                min={today}
                onInput={(e) => updateExpDate(e)}
              />
            </div>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="outline-danger" onClick={() => reset}>
              Cancel
            </Button>
            <Button
              variant="outline-secondary"
              onClick={() => {
                createApiToken();
                refreshRoute();
              }}
              disabled={saveBtnDisabled}
            >
              Save
            </Button>
          </Modal.Footer>
        </Modal>
      </div>
    </>
  );
}
