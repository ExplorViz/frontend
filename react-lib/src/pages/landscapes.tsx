import React, { ReactNode, useState, useEffect } from 'react';
import { useLandscapeTokenStore } from '../stores/landscape-token';
import { useSnapshotTokenStore } from '../stores/snapshot-token';
import { useNavigate, createSearchParams } from 'react-router-dom';
import { useToastHandlerStore } from '../stores/toast-handler';
import { useAuthStore } from '../stores/auth';

// TODO: Just as placeholder
export default function Landscapes() {
  // const [data, setData] = useState({
  //   landscapeTokens: null,
  //   snapshotInfo: null,
  // });
  // const [refreshKey, setRefreshKey] = useState<number>(0);
  // const [tokenCreationModalIsOpen, setTokenCreationModalIsOpen] =
  //   useState<boolean>(false);
  // const [tokenAlias, setTokenAlias] = useState<string>('');

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

  // const createToken = async () => {
  //   try {
  //     const token = await sendTokenCreateRequest(tokenAlias);
  //     closeTokenCreationModal();
  //     useToastHandlerStore
  //       .getState()
  //       .showSuccessToastMessage(`Token created: ${token.value}`);
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
  //   <div id='landscape-container'>
  //     <BsTab id='tabnav' @type='pills' as |tab|>
  //       <tab.pane @id='landscape-tab' @title='Landscapes'>
  //         <div
  //           class='d-flex flex-row justify-content-center overflow-auto'
  //           style='max-height: 80vh; overflow-y: auto;'
  //         >
  //           <TokenSelection
  //             @openTokenCreationModal={{this.openTokenCreationModal}}
  //             @selectToken={{this.selectToken}}
  //             @tokens={{@model.landscapeTokens}}
  //             @deleteToken={{this.deleteToken}}
  //             @reload={{this.reload}}
  //           />
  //         </div>
  //       </tab.pane>
  //       <tab.pane @id='room-tab' @title='Rooms'>
  //         <Collaboration::RoomList
  //           @tokens={{@model.landscapeTokens}}
  //           @selectToken={{this.selectToken}}
  //         />
  //       </tab.pane>
  //       <tab.pane @id='snapshot-tab' @title='Snapshots'>
  //         <SnapshotSelection
  //           @snapshotInfo={{@model.snapshotInfo}}
  //           @selectPersonalToken={{this.selectPersonalSnapshot}}
  //           @selectSharedToken={{this.selectSharedSnapshot}}
  //         />
  //       </tab.pane>
  //     </BsTab>
  //   </div>

  //   <BsModalSimple
  //     @open={{this.tokenCreationModalIsOpen}}
  //     @onHidden={{this.closeTokenCreationModal}}
  //     @title='Create Landscape Token'
  //     @closeTitle='Cancel'
  //     @submitTitle='Create'
  //   >
  //     <BsForm
  //       @model={{this}}
  //       @onSubmit={{this.createToken}}
  //       @submitOnError={{true}}
  //       as |Form|
  //     >
  //       <Form.element
  //         @controlType='text'
  //         @label='Alias (may be left empty)'
  //         @property='tokenAlias'
  //         @autofocus={{true}}
  //       />
  //     </BsForm>
  //   </BsModalSimple>
  // );
}
