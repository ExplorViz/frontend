import React, { useState } from 'react';
import { LandscapeToken } from '../stores/landscape-token';
import { useAuthStore } from '../stores/auth';
import { useToastHandlerStore } from 'react-lib/src/stores/toast-handler';
import { Button, OverlayTrigger, Tooltip } from 'react-bootstrap';
import {
  DesktopDownloadIcon,
  EyeIcon,
  PlusIcon,
  TrashIcon,
} from '@primer/octicons-react';
import AdditionalTokenInfo from './additional-token-info';
import ShareLandscape from 'react-lib/src/components/share-landscape';
import JSZip from 'jszip';
interface TokenSelectionArgs {
  tokens: LandscapeToken[];
  openTokenCreationModal(): void;
  selectToken(token: LandscapeToken): void;
  deleteToken(tokenId: string, event: React.MouseEvent): Promise<void>;
  reload(): void;
}

export default function TokenSelection({
  tokens,
  openTokenCreationModal,
  selectToken,
  deleteToken,
  reload,
}: TokenSelectionArgs) {
  const [sortProperty, setSortProperty] =
    useState<keyof LandscapeToken>('value');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  const user = useAuthStore((state) => state.user);

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
      `${import.meta.env.VITE_SPAN_SERV_URL}/v2/landscapes/${token.value}/structure`
    );
    const dynamicPromise = getJsonBlob(
      `${import.meta.env.VITE_SPAN_SERV_URL}/v2/landscapes/${token.value}/dynamic`
    );
    const timestampPromise = getJsonBlob(
      `${import.meta.env.VITE_SPAN_SERV_URL}/v2/landscapes/${token.value}/timestamps`
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

  return (
    <table id="token-selection-table" className="table table-striped">
      <thead>
        <tr className="token-header-row">
          <th scope="col" onClick={() => sortBy('alias')}>
            Alias
          </th>
          <th scope="col" onClick={() => sortBy('created')}>
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
              <td data-label="Alias">{token.alias}</td>
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
            <div className="d-flex flex-row justify-content-center">
              <Button
                variant="primary"
                className="align-self-center pt-2 px-3"
                onClick={openTokenCreationModal}
              >
                <PlusIcon size="small" />
              </Button>
            </div>
          </td>
        </tr>
      </tfoot>
    </table>
  );
}
