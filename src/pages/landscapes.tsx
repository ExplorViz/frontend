import RoomList from 'explorviz-frontend/src/components/collaboration/room-list';
import SnapshotSelection from 'explorviz-frontend/src/components/snapshot-selection';
import TokenCreationModal from 'explorviz-frontend/src/components/token-creation-modal';
import TokenSelection from 'explorviz-frontend/src/components/token-selection';
import { useAuthStore } from 'explorviz-frontend/src/stores/auth';
import {
  LandscapeToken,
  useLandscapeTokenStore,
} from 'explorviz-frontend/src/stores/landscape-token';
import {
  SnapshotInfo,
  TinySnapshot,
  useSnapshotTokenStore,
} from 'explorviz-frontend/src/stores/snapshot-token';
import { useToastHandlerStore } from 'explorviz-frontend/src/stores/toast-handler';
import React, { useEffect, useState } from 'react';
import { Tab, Tabs } from 'react-bootstrap';
import { createSearchParams, useNavigate } from 'react-router-dom';
import LandscapeLoader from './landscapes-loading';

export default function Landscapes() {
  const [data, setData] = useState<{
    landscapeTokens: LandscapeToken[];
    snapshotInfo: SnapshotInfo;
  } | null>(null);
  const [refreshKey, setRefreshKey] = useState<number>(0);
  const [tokenCreationModalIsOpen, setTokenCreationModalIsOpen] =
    useState<boolean>(false);
  const [activeKey, setActiveKey] = useState<string>('landscapes');

  const landscapeToken = useLandscapeTokenStore((state) => state.token);
  const removeLandscapeToken = useLandscapeTokenStore(
    (state) => state.removeToken
  );
  const retrieveTokenServiceTokens = useLandscapeTokenStore(
    (state) => state.retrieveTokens
  );
  const retrieveSnapshotServiceTokens = useSnapshotTokenStore(
    (state) => state.retrieveTokens
  );
  const setLandscapeToken = useLandscapeTokenStore((state) => state.setToken);
  const setSnapshotToken = useSnapshotTokenStore((state) => state.setToken);
  const user = useAuthStore((state) => state.user);
  const accessToken = useAuthStore((state) => state.accessToken);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchData = async () => {
      if (
        import.meta.env.VITE_ONLY_SHOW_TOKEN &&
        import.meta.env.VITE_ONLY_SHOW_TOKEN !== 'change-token'
      ) {
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

  const selectToken = (token: LandscapeToken) => {
    setLandscapeToken(token);
    useSnapshotTokenStore.setState({ latestSnapshotToken: null });
    navigate({
      pathname: '/visualization',
      search: `?${createSearchParams({ landscapeToken: token.value })}`,
    });
  };

  const selectPersonalSnapshot = async (token: TinySnapshot) => {
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

  const selectSharedSnapshot = (token: TinySnapshot) => {
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

  const createToken = async (tokenAlias: string) => {
    try {
      const token = await sendTokenCreateRequest(tokenAlias);
      closeTokenCreationModal();
      useToastHandlerStore
        .getState()
        .showSuccessToastMessage(`Token created: ${token.value}`);
      refreshRoute();
    } catch (e) {
      useToastHandlerStore.getState().showErrorToastMessage(e.message);
    }
  };

  const deleteToken = async (tokenId: string, event: React.MouseEvent) => {
    event.stopPropagation();

    try {
      await sendTokenDeleteRequest(tokenId);
      useToastHandlerStore
        .getState()
        .showSuccessToastMessage('Token successfully deleted');
    } catch (e) {
      useToastHandlerStore.getState().showErrorToastMessage(e.message);
    }
    if (landscapeToken?.value === tokenId) {
      removeLandscapeToken();
    }
    refreshRoute();
  };

  const sendTokenCreateRequest = (alias = '') => {
    let uId = user?.sub;

    if (!uId) {
      return Promise.reject(new Error('User profile not set'));
    }

    uId = encodeURI(uId);

    return new Promise<any>((resolve, reject) => {
      fetch(`${import.meta.env.VITE_USER_SERV_URL}/user/${uId}/token`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        method: 'POST',
        body: JSON.stringify({
          alias,
        }),
      })
        .then(async (response: Response) => {
          if (response.ok) {
            const token = await response.json();
            resolve(token);
          } else {
            reject(new Error('Something went wrong'));
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
            reject(new Error('Token not found'));
          } else {
            reject(new Error('Something went wrong'));
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
              className={
                'd-flex flex-row justify-content-center selection-table'
              }
              style={{ maxHeight: '80vh', overflowY: 'auto' }}
            >
              <TokenSelection
                openTokenCreationModal={() => setTokenCreationModalIsOpen(true)}
                selectToken={selectToken}
                tokens={data.landscapeTokens}
                deleteToken={deleteToken}
                reload={reload}
              />
            </div>
          </Tab>
          <Tab eventKey="rooms" title="Rooms" id="room-tab">
            <RoomList
              tokens={data.landscapeTokens!}
              selectToken={selectToken}
            />
          </Tab>
          <Tab eventKey="snapshots" title="Snapshots" id="snapshot-tab">
            <SnapshotSelection
              snapshotInfo={data.snapshotInfo}
              selectPersonalToken={selectPersonalSnapshot}
              selectSharedToken={selectSharedSnapshot}
              reload={reload}
            />
          </Tab>
        </Tabs>
      </div>

      <div>
        <TokenCreationModal
          show={tokenCreationModalIsOpen}
          handleClose={() => setTokenCreationModalIsOpen(false)}
          createToken={createToken}
        />
      </div>
    </>
  );
}
