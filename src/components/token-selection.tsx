import {
  CheckIcon,
  CodeIcon,
  DesktopDownloadIcon,
  EyeIcon,
  PencilIcon,
  PlusIcon,
  TrashIcon,
  XIcon,
} from '@primer/octicons-react';
import AdditionalTokenInfo from 'explorviz-frontend/src/components/additional-token-info';
import ShareLandscape from 'explorviz-frontend/src/components/share-landscape';
import { useAuthStore } from 'explorviz-frontend/src/stores/auth';
import {
  LandscapeToken,
  useLandscapeTokenStore,
} from 'explorviz-frontend/src/stores/landscape-token';
import { useToastHandlerStore } from 'explorviz-frontend/src/stores/toast-handler';
import JSZip from 'jszip';
import React, { useState } from 'react';
import { Button, OverlayTrigger, Tooltip } from 'react-bootstrap';
interface TokenSelectionArgs {
  tokens: LandscapeToken[];
  openTokenCreationModal(): void;
  openRepoAnalysisModal(): void;
  selectToken(token: LandscapeToken): void;
  deleteToken(tokenId: string, event: React.MouseEvent): Promise<void>;
  reload(): void;
}

export default function TokenSelection({
  tokens,
  openTokenCreationModal,
  openRepoAnalysisModal,
  selectToken,
  deleteToken,
  reload,
}: TokenSelectionArgs) {
  const [sortProperty, setSortProperty] =
    useState<keyof LandscapeToken>('value');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [editingTokenValue, setEditingTokenValue] = useState<string | null>(
    null
  );
  const [editAliasValue, setEditAliasValue] = useState<string>('');

  const updateTokenAlias = useLandscapeTokenStore(
    (state) => state.updateTokenAlias
  );
  const showSuccessToastMessage = useToastHandlerStore(
    (state) => state.showSuccessToastMessage
  );
  const showErrorToastMessage = useToastHandlerStore(
    (state) => state.showErrorToastMessage
  );

  const user = useAuthStore((state) => state.user);

  const persistenceService = import.meta.env.VITE_PERSISTENCE_SERV_URL;

  const sortBy = (property: keyof LandscapeToken) => {
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

  const sortedTokens = [...tokens].sort((a, b) => {
    const valA = a[sortProperty]!;
    const valB = b[sortProperty]!;
    return sortOrder === 'asc' ? (valA > valB ? 1 : -1) : valA < valB ? 1 : -1;
  });

  const downloadDemoSupplierFiles = async (
    token: LandscapeToken,
    event: React.MouseEvent
  ) => {
    event?.stopPropagation();
    const structurePromise = getJsonBlob(
      `${persistenceService}/v2/landscapes/${token.value}/structure`
    );
    const dynamicPromise = getJsonBlob(
      `${persistenceService}/v2/landscapes/${token.value}/dynamic`
    );
    const timestampPromise = getJsonBlob(
      `${persistenceService}/v2/landscapes/${token.value}/timestamps`
    );

    // Wait on all downloads
    const [structureBlob, dynamicBlob, timestampBlob] = await Promise.all([
      structurePromise,
      dynamicPromise,
      timestampPromise,
    ]);

    const zip = new JSZip();
    if (structureBlob) {
      zip.file('structure.json', structureBlob);
    }
    if (dynamicBlob) {
      zip.file('dynamic.json', dynamicBlob);
    }
    if (timestampBlob) {
      zip.file('timestamps.json', timestampBlob);
    }

    zip.generateAsync({ type: 'blob' }).then(function (content) {
      // Create a temporary link element
      const tempLink = document.createElement('a');
      tempLink.href = URL.createObjectURL(content);
      tempLink.download = 'landscape-data.zip';

      // Append the link to the body and trigger the download
      document.body.appendChild(tempLink);
      tempLink.click();

      // Clean up: Remove the link and release the object URL
      document.body.removeChild(tempLink);
      URL.revokeObjectURL(tempLink.href);

      useToastHandlerStore
        .getState()
        .showSuccessToastMessage(
          `Zip file with ${Object.keys(zip.files).length} JSON files ready for download.`
        );
    });
  };

  const getJsonBlob = async (url: string) => {
    try {
      // Fetch the JSON data from the backend service
      const response = await fetch(url);

      if (!response.ok) {
        throw new Error(`Error fetching JSON: ${response.statusText}`);
      }

      // Parse the response as JSON
      const data = await response.json();

      // Convert the JSON data to a Blob
      return new Blob([JSON.stringify(data, null, 2)], {
        type: 'application/json',
      });
    } catch (error) {
      console.error('Error downloading JSON file for:', url, error);
    }
  };

  const startEditing = (token: LandscapeToken, event: React.MouseEvent) => {
    event.stopPropagation();
    setEditingTokenValue(token.value);
    setEditAliasValue(token.alias);
  };

  const cancelEditing = (event: React.MouseEvent) => {
    event.stopPropagation();
    setEditingTokenValue(null);
    setEditAliasValue('');
  };

  const saveAlias = async (token: LandscapeToken, event: React.MouseEvent) => {
    event.stopPropagation();
    try {
      await updateTokenAlias(token.value, editAliasValue);
      showSuccessToastMessage('Token alias updated successfully.');
      setEditingTokenValue(null);
      reload();
    } catch (e) {
      showErrorToastMessage('Failed to update token alias.');
    }
  };

  return (
    <table
      id="token-selection-table"
      className="table table-striped explorviz-table"
    >
      <thead>
        <tr className="token-header-row">
          <th
            style={{ cursor: 'ns-resize' }}
            scope="col"
            onClick={() => sortBy('alias')}
          >
            Alias
          </th>
          <th
            style={{ cursor: 'ns-resize' }}
            scope="col"
            onClick={() => sortBy('created')}
          >
            Created
          </th>
          <th scope="col"></th>
        </tr>
      </thead>
      <tbody>
        {sortedTokens.length > 0 ? (
          sortedTokens.map((token) => (
            <tr
              key={token.alias}
              className="token-selection-row"
              onClick={() => selectToken(token)}
            >
              <td data-label="Alias">
                {editingTokenValue === token.value ? (
                  <div className="d-flex gap-1 align-items-center">
                    <input
                      type="text"
                      className="form-control form-control-sm"
                      value={editAliasValue}
                      onChange={(e) => setEditAliasValue(e.target.value)}
                      onClick={(e) => e.stopPropagation()}
                    />
                    <button
                      className="button-svg-with-hover"
                      type="button"
                      onClick={(e) => saveAlias(token, e)}
                    >
                      <CheckIcon size="small" className="align-middle" />
                    </button>
                    <button
                      className="button-svg-with-hover"
                      type="button"
                      onClick={(e) => cancelEditing(e)}
                    >
                      <XIcon size="small" className="align-middle" />
                    </button>
                  </div>
                ) : (
                  token.alias
                )}
              </td>
              <td className="token-timestamp-cell">
                {new Date(token.created).toLocaleString()}
              </td>
              <td className="token-button-cell">
                <ul className="token-selection-icons">
                  <li>
                    <OverlayTrigger
                      placement="bottom"
                      overlay={<Tooltip>Go to Landscape</Tooltip>}
                    >
                      <button
                        className="button-svg-with-hover"
                        type="button"
                        onClick={() => selectToken(token)}
                      >
                        <EyeIcon size="small" className="align-middle" />
                      </button>
                    </OverlayTrigger>
                  </li>
                  <li>
                    <AdditionalTokenInfo token={token} />
                  </li>
                  {user?.sub === token.ownerId && (
                    <>
                      <li>
                        <OverlayTrigger
                          placement="bottom"
                          overlay={<Tooltip>Edit token alias</Tooltip>}
                        >
                          <button
                            className="button-svg-with-hover"
                            type="button"
                            onClick={(e) => startEditing(token, e)}
                          >
                            <PencilIcon size="small" className="align-middle" />
                          </button>
                        </OverlayTrigger>
                      </li>
                      <li>
                        <OverlayTrigger
                          placement="bottom"
                          overlay={<Tooltip>Delete token permanently</Tooltip>}
                        >
                          <button
                            className="button-svg-with-hover"
                            type="button"
                            onClick={(e) => deleteToken(token.value, e)}
                          >
                            <TrashIcon size="small" className="align-middle" />
                          </button>
                        </OverlayTrigger>
                      </li>
                    </>
                  )}
                  <li>
                    <OverlayTrigger
                      placement="bottom"
                      overlay={
                        <Tooltip>Download JSON files for Demo Supplier</Tooltip>
                      }
                    >
                      <button
                        className="button-svg-with-hover"
                        type="button"
                        onClick={(e) => downloadDemoSupplierFiles(token, e)}
                      >
                        <DesktopDownloadIcon
                          size="small"
                          className="align-middle"
                        />
                      </button>
                    </OverlayTrigger>
                  </li>
                  <li>
                    <ShareLandscape token={token} reload={reload} />
                  </li>
                </ul>
              </td>
            </tr>
          ))
        ) : (
          <tr>
            <td colSpan={3} className="text-center">
              There are no tokens linked to your account at the moment.
            </td>
          </tr>
        )}
      </tbody>
      <tfoot>
        <tr>
          <td colSpan={3} className="p-1">
            <div className="d-flex flex-row justify-content-center gap-2">
              <Button
                variant="primary"
                className="align-self-center pt-2 px-3 primary"
                onClick={openTokenCreationModal}
              >
                <PlusIcon size="small" />
              </Button>

              <Button
                variant="success"
                className="align-self-center pt-2 px-3 success"
                onClick={openRepoAnalysisModal}
              >
                <CodeIcon size="small" />
              </Button>
            </div>
          </td>
        </tr>
      </tfoot>
    </table>
  );
}
