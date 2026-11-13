import RoomSelection from 'explorviz-frontend/src/components/room-selection';
import SnapshotSelection from 'explorviz-frontend/src/components/snapshot-selection';
import TokenCreationModal, { LandscapeTokenCreateParams } from 'explorviz-frontend/src/components/token-creation-modal';
import TokenSelection from 'explorviz-frontend/src/components/token-selection';
import LandscapeLoader from 'explorviz-frontend/src/pages/landscapes-loading';
import { useAuthStore } from 'explorviz-frontend/src/stores/auth';
import { LandscapeToken, useLandscapeTokenStore } from 'explorviz-frontend/src/stores/landscape-token';
import { SnapshotInfo, TinySnapshot, useSnapshotTokenStore } from 'explorviz-frontend/src/stores/snapshot-token';
import { useToastHandlerStore } from 'explorviz-frontend/src/stores/toast-handler';
import { requestLandscapeHasData } from 'explorviz-frontend/src/utils/landscape-http-request-util';
import { leaveRoomToOpenSnapshot } from 'explorviz-frontend/src/utils/collaboration/snapshots';
import { getResponseErrorMessage } from 'explorviz-frontend/src/utils/response-error';
import { useEffect, useRef, useState } from 'react';
import { Button, Modal, Tab, Tabs } from 'react-bootstrap';
import { createSearchParams, useNavigate } from 'react-router-dom';
import { RepoAnalysisModal } from '../components/repo-analysis-modal';

export default function Landscapes() {
  const [data, setData] = useState<{
    landscapeTokens: LandscapeToken[];
    snapshotInfo: SnapshotInfo;
  } | null>(null);
  const [refreshKey, setRefreshKey] = useState<number>(0);
  const [tokenCreationModalIsOpen, setTokenCreationModalIsOpen] = useState<boolean>(false);
  const [repoAnalysisModalIsOpen, setRepoAnalysisModalIsOpen] = useState<boolean>(false);
  const [selectedAnalysisToken, setSelectedAnalysisToken] = useState<LandscapeToken | undefined>(undefined);
  const [emptyLandscape, setEmptyLandscape] = useState<LandscapeToken | null>(null);
  const [landscapeToDelete, setLandscapeToDelete] = useState<LandscapeToken | null>(null);
  const availabilityCheck = useRef<AbortController | null>(null);

  const [activeKey, setActiveKey] = useState<string>('landscapes');

  const landscapeToken = useLandscapeTokenStore((state) => state.token);
  const removeLandscapeToken = useLandscapeTokenStore((state) => state.removeToken);
  const retrieveTokenServiceTokens = useLandscapeTokenStore((state) => state.retrieveTokens);
  const retrieveSnapshotServiceTokens = useSnapshotTokenStore((state) => state.retrieveTokens);
  const setLandscapeToken = useLandscapeTokenStore((state) => state.setToken);
  const setSnapshotToken = useSnapshotTokenStore((state) => state.setToken);
  const user = useAuthStore((state) => state.user);
  const accessToken = useAuthStore((state) => state.accessToken);
  const navigate = useNavigate();

  useEffect(() => () => availabilityCheck.current?.abort(), []);

  useEffect(() => {
    const fetchData = async () => {
      if (import.meta.env.VITE_ONLY_SHOW_TOKEN && import.meta.env.VITE_ONLY_SHOW_TOKEN !== 'change-token') {
        navigate('/visualization');
      }

      const [landscapeTokens, snapshotInfo] = await Promise.all([
        retrieveTokenServiceTokens(),
        retrieveSnapshotServiceTokens(),
      ]);

      setData({
        landscapeTokens,
        snapshotInfo,
      });
    };

    fetchData();
  }, [refreshKey]);

  const refreshRoute = () => {
    setRefreshKey((prev) => prev + 1);
  };

  const closeTokenCreationModal = () => {
    setTokenCreationModalIsOpen(false);
  };

  const openRepoAnalysisModal = (token?: LandscapeToken) => {
    availabilityCheck.current?.abort();
    setSelectedAnalysisToken(token);
    setRepoAnalysisModalIsOpen(true);
  };

  const closeRepoAnalysisModal = () => {
    setRepoAnalysisModalIsOpen(false);
    setSelectedAnalysisToken(undefined);
  };

  const openLandscape = (token: LandscapeToken) => {
    setLandscapeToken(token);
    useSnapshotTokenStore.setState({ latestSnapshotToken: null });
    navigate({
      pathname: '/visualization',
      search: `?${createSearchParams({ landscapeToken: token.value })}`,
    });
  };

  /** Joining a Room from the Rooms tab already set the Room's Landscape; this only shows it. */
  const openRoomLandscape = (landscapeToken: string) => {
    availabilityCheck.current?.abort();
    useSnapshotTokenStore.setState({ latestSnapshotToken: null });
    navigate({
      pathname: '/visualization',
      search: `?${createSearchParams({ landscapeToken })}`,
    });
  };

  const selectToken = async (token: LandscapeToken) => {
    availabilityCheck.current?.abort();
    const check = new AbortController();
    availabilityCheck.current = check;

    try {
      const hasData = await requestLandscapeHasData(token.value, check.signal);
      if (check.signal.aborted) return;

      if (hasData) {
        openLandscape(token);
      } else {
        setEmptyLandscape(token);
      }
    } catch {
      if (check.signal.aborted) return;

      useToastHandlerStore.getState().showErrorToastMessage('Could not check whether the landscape has data.');
      openLandscape(token);
    } finally {
      if (availabilityCheck.current === check) availabilityCheck.current = null;
    }
  };

  const selectPersonalSnapshot = async (token: TinySnapshot) => {
    availabilityCheck.current?.abort();
    if (!(await leaveRoomToOpenSnapshot())) return;
    setSnapshotToken(null);
    useSnapshotTokenStore.setState({ snapshotSelected: true });
    setLandscapeToken(null);
    navigate({
      pathname: '/visualization',
      search: `?${createSearchParams({
        landscapeToken: token.landscapeToken.value,
        sharedSnapshot: 'false',
        owner: token.owner,
        createdAt: token.createdAt.toString(),
      })}`,
    });
  };

  const selectSharedSnapshot = async (token: TinySnapshot) => {
    availabilityCheck.current?.abort();
    if (!(await leaveRoomToOpenSnapshot())) return;
    useSnapshotTokenStore.setState({ snapshotSelected: true });
    setLandscapeToken(null);
    navigate({
      pathname: '/visualization',
      search: `?${createSearchParams({
        landscapeToken: token.landscapeToken.value,
        sharedSnapshot: 'true',
        owner: token.owner,
        createdAt: token.createdAt.toString(),
      })}`,
    });
  };

  const createToken = async (params: LandscapeTokenCreateParams) => {
    try {
      const token = await sendTokenCreateRequest(params);
      closeTokenCreationModal();
      useToastHandlerStore.getState().showSuccessToastMessage(`Token created: ${token.value}`);
      refreshRoute();
    } catch (e: unknown) {
      if (e instanceof Error) {
        useToastHandlerStore.getState().showErrorToastMessage(e.message);
      }
    }
  };

  const deleteToken = async (tokenId: string) => {
    try {
      await sendTokenDeleteRequest(tokenId);
      useToastHandlerStore.getState().showSuccessToastMessage('Token successfully deleted');
    } catch (e: unknown) {
      if (e instanceof Error) {
        useToastHandlerStore.getState().showErrorToastMessage(e.message);
      }
    }
    if (landscapeToken?.value === tokenId) {
      removeLandscapeToken();
    }
    refreshRoute();
  };

  const sendTokenCreateRequest = (params: LandscapeTokenCreateParams) => {
    let uId = user?.sub;

    if (!uId) {
      return Promise.reject(new Error('User profile not set'));
    }

    uId = encodeURI(uId);

    const body: Record<string, string | boolean> = {
      alias: params.alias,
      isRequestedFromVSCodeExtension: false,
      projectName: '',
      commitId: '',
    };
    if (params.value) {
      body.value = params.value;
    }
    if (params.secret) {
      body.secret = params.secret;
    }

    return new Promise<any>((resolve, reject) => {
      fetch(`${import.meta.env.VITE_USER_SERV_URL}/user/${uId}/token`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        method: 'POST',
        body: JSON.stringify(body),
      })
        .then(async (response: Response) => {
          if (response.ok) {
            const token = await response.json();
            resolve(token);
          } else {
            reject(new Error(await getResponseErrorMessage(response)));
          }
        })
        .catch((e) => reject(e));
    });
  };

  const reload = () => {
    refreshRoute();
  };

  const sendTokenDeleteRequest = (tokenId: string) => {
    return new Promise<undefined>((resolve, reject) => {
      fetch(`${import.meta.env.VITE_USER_SERV_URL}/token/${tokenId}`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
        method: 'DELETE',
      })
        .then(async (response: Response) => {
          if (response.ok) {
            resolve(undefined);
          } else if (response.status === 404) {
            reject(new Error(await getResponseErrorMessage(response, 'Token not found')));
          } else {
            reject(new Error(await getResponseErrorMessage(response)));
          }
        })
        .catch((e) => reject(e));
    });
  };

  if (!data || !data.landscapeTokens || !data.snapshotInfo) {
    return <LandscapeLoader />;
  }

  return (
    <>
      <div id="landscape-container">
        <Tabs
          activeKey={activeKey}
          onSelect={(k) => setActiveKey(k || 'landscapes')}
          id="tabnav"
          className="mb-3"
          justify
        >
          <Tab eventKey="landscapes" title="Landscapes" id="landscape-tab">
            <div
              className={'d-flex flex-row justify-content-center selection-table'}
              style={{ maxHeight: '80vh', overflowY: 'auto' }}
            >
              <TokenSelection
                openTokenCreationModal={() => {
                  availabilityCheck.current?.abort();
                  setTokenCreationModalIsOpen(true);
                }}
                openRepoAnalysisModal={openRepoAnalysisModal}
                selectToken={selectToken}
                tokens={data.landscapeTokens}
                confirmDeleteToken={(token) => {
                  availabilityCheck.current?.abort();
                  setLandscapeToDelete(token);
                }}
                reload={reload}
              />
            </div>
          </Tab>
          <Tab eventKey="snapshots" title="Visual Snapshots" id="snapshot-tab">
            <SnapshotSelection
              snapshotInfo={data.snapshotInfo}
              selectPersonalToken={selectPersonalSnapshot}
              selectSharedToken={selectSharedSnapshot}
              reload={reload}
            />
          </Tab>
          {/* Mounted only while open, so the rooms are loaded each time the tab is opened. */}
          <Tab eventKey="rooms" title="Rooms" id="rooms-tab" mountOnEnter unmountOnExit>
            <RoomSelection openRoomLandscape={openRoomLandscape} />
          </Tab>
        </Tabs>
      </div>

      <div>
        <Modal
          show={landscapeToDelete !== null}
          onHide={() => setLandscapeToDelete(null)}
          aria-labelledby="delete-landscape-title"
          centered
        >
          <Modal.Header closeButton>
            <Modal.Title id="delete-landscape-title">Delete Landscape Data</Modal.Title>
          </Modal.Header>
          <Modal.Body>
            Permanently delete <strong>{landscapeToDelete?.alias}</strong>?
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={() => setLandscapeToDelete(null)} autoFocus>
              Cancel
            </Button>
            <Button
              variant="danger"
              onClick={() => {
                if (!landscapeToDelete) return;
                setLandscapeToDelete(null);
                void deleteToken(landscapeToDelete.value);
              }}
            >
              Delete landscape
            </Button>
          </Modal.Footer>
        </Modal>

        <Modal show={emptyLandscape !== null} onHide={() => setEmptyLandscape(null)} centered>
          <Modal.Header closeButton>
            <Modal.Title>No landscape data available</Modal.Title>
          </Modal.Header>
          <Modal.Footer>
            <Button
              variant="secondary"
              onClick={() => {
                if (!emptyLandscape) return;
                setEmptyLandscape(null);
                openLandscape(emptyLandscape);
              }}
            >
              Wait for trace data
            </Button>
            <Button
              onClick={() => {
                if (!emptyLandscape) return;
                setEmptyLandscape(null);
                openRepoAnalysisModal(emptyLandscape);
              }}
            >
              Analyze a Git repository
            </Button>
          </Modal.Footer>
        </Modal>

        <TokenCreationModal
          show={tokenCreationModalIsOpen}
          handleClose={() => setTokenCreationModalIsOpen(false)}
          createToken={createToken}
        />

        <RepoAnalysisModal
          show={repoAnalysisModalIsOpen}
          landscapeToken={selectedAnalysisToken?.value}
          onClose={closeRepoAnalysisModal}
        />
      </div>
    </>
  );
}
