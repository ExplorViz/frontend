import {
  CheckIcon,
  CodeIcon,
  DesktopDownloadIcon,
  EyeIcon,
  InfoIcon,
  KebabHorizontalIcon,
  PencilIcon,
  PlusIcon,
  ShareAndroidIcon,
  TrashIcon,
  XIcon,
} from '@primer/octicons-react';
import AdditionalTokenInfo, { TokenDetails } from 'explorviz-frontend/src/components/additional-token-info';
import ShareLandscape, { ManageAccess } from 'explorviz-frontend/src/components/share-landscape';
import { useAuthStore } from 'explorviz-frontend/src/stores/auth';
import { LandscapeToken, useLandscapeTokenStore } from 'explorviz-frontend/src/stores/landscape-token';
import { useToastHandlerStore } from 'explorviz-frontend/src/stores/toast-handler';
import {
  CommitTree,
  collectUniqueCommitHashes,
  normalizeCommitTree,
} from 'explorviz-frontend/src/utils/evolution-schemes/evolution-data';
import JSZip from 'jszip';
import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Button, Dropdown, Modal, OverlayTrigger, Tooltip } from 'react-bootstrap';
interface TokenSelectionArgs {
  tokens: LandscapeToken[];
  openTokenCreationModal(): void;
  openRepoAnalysisModal(token?: LandscapeToken): void;
  selectToken(token: LandscapeToken): void;
  confirmDeleteToken(token: LandscapeToken): void;
  reload(): void;
}

export default function TokenSelection({
  tokens,
  openTokenCreationModal,
  openRepoAnalysisModal,
  selectToken,
  confirmDeleteToken,
  reload,
}: TokenSelectionArgs) {
  const [sortProperty, setSortProperty] = useState<keyof LandscapeToken>('value');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [editingTokenValue, setEditingTokenValue] = useState<string | null>(null);
  const [editAliasValue, setEditAliasValue] = useState<string>('');
  // Small screens show details and access management in modals, since the
  // popovers anchored to the row icons are not available there
  const [detailsToken, setDetailsToken] = useState<LandscapeToken | null>(null);
  const [manageAccessToken, setManageAccessToken] = useState<LandscapeToken | null>(null);
  const editAliasInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editingTokenValue === null) return;

    const input = editAliasInputRef.current;
    if (!input) return;

    input.focus();
    const length = input.value.length;
    input.setSelectionRange(length, length);
  }, [editingTokenValue]);

  const updateTokenAlias = useLandscapeTokenStore((state) => state.updateTokenAlias);
  const showSuccessToastMessage = useToastHandlerStore((state) => state.showSuccessToastMessage);
  const showErrorToastMessage = useToastHandlerStore((state) => state.showErrorToastMessage);

  const user = useAuthStore((state) => state.user);

  const landscapeService = import.meta.env.VITE_LANDSCAPE_SERV_URL;
  const traceService = import.meta.env.VITE_TRACE_SERV_URL;

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

  const downloadDemoSupplierFiles = async (token: LandscapeToken, event: React.MouseEvent) => {
    event?.stopPropagation();
    // Fetch repository names first to know what else to download
    const repoNamesResponse = await fetch(`${landscapeService}/v3/landscapes/${token.value}/repositories`, {
      headers: {
        Authorization: `Bearer ${useAuthStore.getState().accessToken}`,
      },
    });

    const repoNames: string[] = repoNamesResponse.ok ? await repoNamesResponse.json() : [];

    const treePromises = repoNames.map(async (repoName) => {
      const response = await fetch(`${landscapeService}/v3/landscapes/${token.value}/commit-tree/${repoName}`, {
        headers: {
          Authorization: `Bearer ${useAuthStore.getState().accessToken}`,
        },
      });
      if (response.ok) {
        const tree = (await response.json()) as CommitTree;
        return { repoName, tree };
      }
      return null;
    });

    const trees = (await Promise.all(treePromises))
      .filter((t): t is { repoName: string; tree: CommitTree } => t !== null)
      .map(({ repoName, tree }) => ({
        repoName,
        tree: normalizeCommitTree(tree, repoName),
      }));

    const commitDataPromises: Promise<{
      repoName: string;
      commitId: string;
      blob: Blob | undefined;
    }>[] = [];

    trees.forEach(({ repoName, tree }) => {
      collectUniqueCommitHashes(tree).forEach((commitId) => {
        commitDataPromises.push(
          getJsonBlob(
            `${landscapeService}/v3/landscapes/${token.value}/structure/evolution/${repoName}/${commitId}`
          ).then((blob) => ({ repoName, commitId, blob }))
        );
      });
    });

    const structurePromise = getJsonBlob(`${landscapeService}/v3/landscapes/${token.value}/structure/runtime`);
    const dynamicPromise = getJsonBlob(`${traceService}/v3/landscapes/${token.value}/communication`);
    const timestampPromise = getJsonBlob(`${traceService}/v3/landscapes/${token.value}/timestamps`);

    // Wait on all downloads
    const [structureBlob, dynamicBlob, timestampBlob, commitDataResults] = await Promise.all([
      structurePromise,
      dynamicPromise,
      timestampPromise,
      Promise.all(commitDataPromises),
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

    // Add repository names
    zip.file(
      'repository-names.json',
      new Blob([JSON.stringify(repoNames, null, 2)], {
        type: 'application/json',
      })
    );

    // Add commit trees
    trees.forEach(({ repoName, tree }) => {
      zip.file(`commit-tree-${repoName}.json`, new Blob([JSON.stringify(tree, null, 2)], { type: 'application/json' }));
    });

    // Add individual commit data
    commitDataResults.forEach(({ repoName, commitId, blob }) => {
      if (blob) {
        zip.file(`commit-${repoName}-${commitId}.json`, blob);
      }
    });

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
        .showSuccessToastMessage(`Zip file with ${Object.keys(zip.files).length} JSON files ready for download.`);
    });
  };

  const getJsonBlob = async (url: string) => {
    try {
      // Fetch the JSON data from the backend service
      const response = await fetch(url, {
        headers: {
          Authorization: `Bearer ${useAuthStore.getState().accessToken}`,
        },
      });

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

  const startEditing = (token: LandscapeToken) => {
    setEditingTokenValue(token.value);
    setEditAliasValue(token.alias);
  };

  const cancelEditing = () => {
    setEditingTokenValue(null);
    setEditAliasValue('');
  };

  const saveAlias = async (token: LandscapeToken, event?: React.SyntheticEvent) => {
    event?.stopPropagation();
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
    <>
      <table id="token-selection-table" className="table table-striped explorviz-table">
        <thead>
          <tr className="token-header-row d-none d-md-table-row">
            <th style={{ cursor: 'ns-resize' }} scope="col" onClick={() => sortBy('alias')}>
              Alias
            </th>
            <th style={{ cursor: 'ns-resize' }} scope="col" onClick={() => sortBy('created')}>
              Created
            </th>
            <th scope="col" colSpan={2}></th>
          </tr>
        </thead>
        <tbody>
          {sortedTokens.length > 0 ? (
            sortedTokens.map((token) => (
              <tr
                key={token.value}
                className="token-selection-row"
                tabIndex={0}
                onClick={(e) => {
                  // Buttons, inputs and popovers handle their own clicks.
                  // Popovers are portalled, so their DOM is outside the row.
                  const target = e.target as Element;
                  if (!e.currentTarget.contains(target) || target.closest('button, input')) {
                    return;
                  }
                  selectToken(token);
                }}
                onKeyDown={(e) => {
                  // Ignore keys from nested buttons and the alias input
                  if (e.target !== e.currentTarget) return;
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    selectToken(token);
                  }
                }}
              >
                <td>
                  {editingTokenValue === token.value ? (
                    <div className="d-flex gap-1 align-items-center">
                      <input
                        ref={editAliasInputRef}
                        type="text"
                        className="form-control form-control-sm"
                        value={editAliasValue}
                        onChange={(e) => setEditAliasValue(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            void saveAlias(token, e);
                          }
                        }}
                      />
                      <button className="button-svg-with-hover" type="button" onClick={(e) => saveAlias(token, e)}>
                        <CheckIcon size="small" className="align-middle" />
                      </button>
                      <button className="button-svg-with-hover" type="button" onClick={cancelEditing}>
                        <XIcon size="small" className="align-middle" />
                      </button>
                    </div>
                  ) : (
                    <>
                      {token.alias}
                      <div className="token-mobile-timestamp d-md-none">{new Date(token.created).toLocaleString()}</div>
                    </>
                  )}
                </td>
                <td className="token-timestamp-cell d-none d-md-table-cell">
                  {new Date(token.created).toLocaleString()}
                </td>
                <td className="token-button-cell d-none d-md-table-cell">
                  <ul className="token-selection-icons">
                    <li>
                      <OverlayTrigger placement="bottom" overlay={<Tooltip>Go to Landscape</Tooltip>}>
                        <button
                          className="button-svg-with-hover"
                          type="button"
                          aria-label={`Go to landscape ${token.alias}`}
                          onClick={() => selectToken(token)}
                        >
                          <EyeIcon size="small" className="align-middle" />
                        </button>
                      </OverlayTrigger>
                    </li>
                    <li>
                      <OverlayTrigger placement="bottom" overlay={<Tooltip>Trigger Analysis for Landscape</Tooltip>}>
                        <button
                          className="button-svg-with-hover"
                          type="button"
                          onClick={() => openRepoAnalysisModal(token)}
                        >
                          <CodeIcon size="small" className="align-middle" />
                        </button>
                      </OverlayTrigger>
                    </li>
                    <li>
                      <AdditionalTokenInfo token={token} />
                    </li>
                    {user?.sub === token.ownerId && (
                      <>
                        <li>
                          <OverlayTrigger placement="bottom" overlay={<Tooltip>Edit token alias</Tooltip>}>
                            <button className="button-svg-with-hover" type="button" onClick={() => startEditing(token)}>
                              <PencilIcon size="small" className="align-middle" />
                            </button>
                          </OverlayTrigger>
                        </li>
                        <li>
                          <OverlayTrigger placement="bottom" overlay={<Tooltip>Delete Landscape Data</Tooltip>}>
                            <button
                              className="button-svg-with-hover"
                              type="button"
                              aria-label={`Delete landscape ${token.alias}`}
                              onClick={() => confirmDeleteToken(token)}
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
                        overlay={<Tooltip>Download JSON files for Demo Supplier</Tooltip>}
                      >
                        <button
                          className="button-svg-with-hover"
                          type="button"
                          onClick={(e) => downloadDemoSupplierFiles(token, e)}
                        >
                          <DesktopDownloadIcon size="small" className="align-middle" />
                        </button>
                      </OverlayTrigger>
                    </li>
                    <li>
                      <ShareLandscape token={token} reload={reload} />
                    </li>
                  </ul>
                </td>
                <td className="token-actions-cell d-md-none">
                  <Dropdown align="end">
                    <Dropdown.Toggle
                      as="button"
                      type="button"
                      className="button-svg-with-hover token-actions-toggle"
                      aria-label="Token actions"
                    >
                      <KebabHorizontalIcon size="small" />
                    </Dropdown.Toggle>
                    {/* Portalled so the table's scroll container neither clips
                        nor flips the menu */}
                    {createPortal(
                      <Dropdown.Menu>
                        <Dropdown.Item as="button" onClick={() => openRepoAnalysisModal(token)}>
                          <CodeIcon size="small" className="me-2" />
                          Trigger analysis
                        </Dropdown.Item>
                        <Dropdown.Item as="button" onClick={() => setDetailsToken(token)}>
                          <InfoIcon size="small" className="me-2" />
                          Show token details
                        </Dropdown.Item>
                        {user?.sub === token.ownerId && (
                          <>
                            <Dropdown.Item as="button" onClick={() => startEditing(token)}>
                              <PencilIcon size="small" className="me-2" />
                              Edit alias
                            </Dropdown.Item>
                            <Dropdown.Item as="button" onClick={() => confirmDeleteToken(token)}>
                              <TrashIcon size="small" className="me-2" />
                              Delete Landscape Data
                            </Dropdown.Item>
                          </>
                        )}
                        <Dropdown.Item as="button" onClick={() => setManageAccessToken(token)}>
                          <ShareAndroidIcon size="small" className="me-2" />
                          Manage access
                        </Dropdown.Item>
                      </Dropdown.Menu>,
                      document.body
                    )}
                  </Dropdown>
                </td>
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan={4} className="text-center">
                There are no tokens linked to your account at the moment.
              </td>
            </tr>
          )}
        </tbody>
        <tfoot>
          <tr>
            <td colSpan={4} className="p-1">
              <div className="d-flex flex-row justify-content-center gap-2">
                <Button
                  variant="primary"
                  className="align-self-center pt-2 px-3 primary"
                  onClick={openTokenCreationModal}
                >
                  <PlusIcon size="small" />
                </Button>
              </div>
            </td>
          </tr>
        </tfoot>
      </table>
      <Modal show={detailsToken !== null} onHide={() => setDetailsToken(null)}>
        <Modal.Header closeButton>
          <Modal.Title>{detailsToken?.alias}</Modal.Title>
        </Modal.Header>
        <Modal.Body>{detailsToken && <TokenDetails token={detailsToken} />}</Modal.Body>
      </Modal>
      <Modal show={manageAccessToken !== null} onHide={() => setManageAccessToken(null)}>
        <Modal.Header closeButton>
          <Modal.Title>Manage Access</Modal.Title>
        </Modal.Header>
        <Modal.Body>{manageAccessToken && <ManageAccess token={manageAccessToken} reload={reload} />}</Modal.Body>
      </Modal>
    </>
  );
}
