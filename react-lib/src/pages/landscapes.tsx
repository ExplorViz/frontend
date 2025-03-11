import React, { ReactNode, useState, useEffect } from 'react';
import { useLandscapeTokenStore } from '../stores/landscape-token';
import { useSnapshotTokenStore } from '../stores/snapshot-token';
import { useNavigate, createSearchParams } from 'react-router-dom';
import { useToastHandlerStore } from '../stores/toast-handler';
import { useAuthStore } from '../stores/auth';
import { Tabs, Tab, Button } from 'react-bootstrap';
import TokenSelection from 'react-lib/src/components/token-selection';
import RoomList from 'react-lib/src/components/collaboration/room-list_tmp';
import SnapshotSelection from 'react-lib/src/components/snapshot-selection';
import TokenCreationModal from 'react-lib/src/components/token-creation-modal';

export default function Landscapes() {
  // const [data, setData] = useState({
  //   landscapeTokens: null,
  //   snapshotInfo: null,
  // });
  // const [refreshKey, setRefreshKey] = useState<number>(0);
  // const [tokenCreationModalIsOpen, setTokenCreationModalIsOpen] =
  //   useState<boolean>(false);
  // const [activeKey, setActiveKey] = useState<string>('landscapes');

  // const landscapeToken = useLandscapeTokenStore((state) => state.token);
  // const removeLandscapeToken = useLandscapeTokenStore(
  //   (state) => state.removeToken
  // );
  // const retrieveTokenServiceTokens = useLandscapeTokenStore(
  //   (state) => state.retrieveTokens
  // );
  // const retrieveSnapshotServiceTokens = useSnapshotTokenStore(
  //   (state) => state.retrieveTokens
  // );
  // const setLandscapeToken = useLandscapeTokenStore((state) => state.setToken);
  // const setSnapshotToken = useSnapshotTokenStore((state) => state.setToken);
  // const user = useAuthStore((state) => state.user);
  // const accessToken = useAuthStore((state) => state.accessToken);
  // const navigate = useNavigate();

  // useEffect(() => {
  //   const fetchData = async () => {
  //     if (
  //       import.meta.env.VITE_ONLY_SHOW_TOKEN &&
  //       import.meta.env.VITE_ONLY_SHOW_TOKEN !== 'change-token'
  //     ) {
  //       navigate('/visualization');
  //     }

  //     const [landscapeTokens, snapshotInfo] = await Promise.all([
  //       retrieveTokenServiceTokens(),
  //       retrieveSnapshotServiceTokens(),
  //     ]);

  //     setData({
  //       landscapeTokens,
  //       snapshotInfo,
  //     });
  //   };

  //   fetchData();
  // }, [refreshKey]);

  // const refreshRoute = () => {
  //   setRefreshKey((prev) => prev++);
  // };

  // const loading = (/* transition, originRoute */) => {
  //   return true;
  // };

  // const openTokenCreationModal = () => {
  //   setTokenCreationModalIsOpen(true);
  //   setTokenAlias('');
  // };

  // const closeTokenCreationModal = () => {
  //   setTokenCreationModalIsOpen(false);
  //   setTokenAlias('');
  // };

  // const selectToken = (token: LandscapeToken) => {
  //   setLandscapeToken(token);
  //   useSnapshotTokenStore.setState({ latestSnapshotToken: null });
  //   navigate({
  //     pathname: '/visualization',
  //     search: `?${createSearchParams({ landscapeToken: token.value })}`,
  //   });
  // };

  // const selectPersonalSnapshot = (token: TinySnapshot) => {
  //   setLandscapeToken(null);
  //   useSnapshotTokenStore.setState({ snapshotSelected: true });
  //   setSnapshotToken(null);
  //   navigate({
  //     pathname: '/visualization',
  //     search: `?${createSearchParams({
  //       landscapeToken: token.landscapeToken.value,
  //       sharedSnapshot: 'false',
  //       owner: token.owner,
  //       createdAt: token.createdAt,
  //     })}`,
  //   });
  // };

  // const selectSharedSnapshot = (token: TinySnapshot) => {
  //   // this.snapShotTokenService.setToken(null);
  //   useSnapshotTokenStore.setState({ snapshotSelected: true });
  //   setLandscapeToken(null);
  //   navigate({
  //     pathname: '/visualization',
  //     search: `?${createSearchParams({
  //       landscapeToken: token.landscapeToken.value,
  //       sharedSnapshot: 'true',
  //       owner: token.owner,
  //       createdAt: token.createdAt,
  //     })}`,
  //   });
  // };

  // const createToken = async (tokenAlias: string) => {
  //   try {
  //     // const token = await sendTokenCreateRequest(tokenAlias);
  //     closeTokenCreationModal();
  //     // Just placeholder toast handler call for testing
  //     useToastHandlerStore
  //       .getState()
  //       .showSuccessToastMessage(`Token created: placeholder`);

  //     // useToastHandlerStore
  //     //   .getState()
  //     //   .showSuccessToastMessage(`Token created: ${token.value}`);
  //     refreshRoute();
  //   } catch (e) {
  //     useToastHandlerStore.getState().showErrorToastMessage(e.message);
  //   }
  // };

  // const deleteToken = async (tokenId: string, event: MouseEvent) => {
  //   // Avoid triggering selectToken() on underlying table row
  //   event.stopPropagation(); // TODO: Does this work with React. It should

  //   try {
  //     await sendTokenDeleteRequest(tokenId);
  //     useToastHandlerStore
  //       .getState()
  //       .showSuccessToastMessage('Token successfully deleted');
  //   } catch (e) {
  //     useToastHandlerStore.getState().showErrorToastMessage(e.message);
  //   }
  //   if (landscapeToken?.value === tokenId) {
  //     removeLandscapeToken();
  //   }
  //   refreshRoute();
  // };

  // // TODO: How to solve fetch?
  // const sendTokenCreateRequest = (alias = '') => {
  //   let uId = user?.sub;

  //   if (!uId) {
  //     return Promise.reject(new Error('User profile not set'));
  //   }

  //   uId = encodeURI(uId);

  //   return new Promise<any>((resolve, reject) => {
  //     fetch(`${import.meta.env.VITE_USER_SERV_URL}/user/${uId}/token`, {
  //       headers: {
  //         Authorization: `Bearer ${accessToken}`,
  //         'Content-Type': 'application/json',
  //       },
  //       method: 'POST',
  //       body: JSON.stringify({
  //         alias,
  //       }),
  //     })
  //       .then(async (response: Response) => {
  //         if (response.ok) {
  //           const token = await response.json();
  //           resolve(token);
  //         } else {
  //           reject(new Error('Something went wrong'));
  //         }
  //       })
  //       .catch((e) => reject(e));
  //   });
  // };

  // const reload = () => {
  //   refreshRoute();
  // };

  // const sendTokenDeleteRequest = (tokenId: string) => {
  //   return new Promise<undefined>((resolve, reject) => {
  //     fetch(`${import.meta.env.VITE_USER_SERV_URL}/token/${tokenId}`, {
  //       headers: {
  //         Authorization: `Bearer ${accessToken}`,
  //       },
  //       method: 'DELETE',
  //     })
  //       .then(async (response: Response) => {
  //         if (response.ok) {
  //           resolve(undefined);
  //         } else if (response.status === 404) {
  //           reject(new Error('Token not found'));
  //         } else {
  //           reject(new Error('Something went wrong'));
  //         }
  //       })
  //       .catch((e) => reject(e));
  //   });
  // };

  return (
    <div>
      <p>Hello</p>
    </div>
  );

  // return (
  //   <>
  //     <div id="landscape-container">
  //       <Tabs
  //         activeKey={activeKey}
  //         onSelect={(k) => setActiveKey(k || 'landscapes')}
  //         id="tabnav"
  //       >
  //         <Tab eventKey="landscapes" title="Landscapes" id="landscape-tab">
  //           <div
  //             className={'d-flex flex-row justify-content-center overflow-auto'}
  //             style={{ maxHeight: '80vh', overflowY: 'auto' }}
  //           >
  //             <TokenSelection
  //               openTokenCreationModal={openTokenCreationModal}
  //               selectToken={selectToken}
  //               tokens={data.landscapeTokens}
  //               deleteToken={deleteToken}
  //               reload={reload}
  //             />
  //           </div>
  //         </Tab>
  //         <Tab eventKey="rooms" title="Rooms" id="room-tab">
  //           <RoomList
  //             tokens={data.landscapeTokens!}
  //             selectToken={selectToken}
  //           />
  //         </Tab>
  //         <Tab eventKey="snapshots" title="Snapshots" id="snapshot-tab">
  //           <SnapshotSelection
  //             snapshotInfo={data.snapshotInfo}
  //             selectPersonalToken={selectPersonalSnapshot}
  //             selectSharedToken={selectSharedSnapshot}
  //           />
  //         </Tab>
  //       </Tabs>
  //     </div> */}

  //     {/* <div>
  //       <TokenCreationModal
  //         show={tokenCreationModalIsOpen}
  //         handleClose={() => setTokenCreationModalIsOpen(false)}
  //         createToken={createToken}
  //       />
  //     </div>
  //   </>
  // );
}
