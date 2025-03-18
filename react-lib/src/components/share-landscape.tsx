import React, { useState } from 'react';
import { LandscapeToken } from 'react-lib/src/stores/landscape-token';
import { useToastHandlerStore } from 'react-lib/src/stores/toast-handler';
import { useAuthStore } from 'react-lib/src/stores/auth';
import {
  Button,
  Modal,
  OverlayTrigger,
  Tooltip,
  Popover,
} from 'react-bootstrap';
import {
  ShareAndroidIcon,
  DashIcon,
  PlusIcon,
  TrashIcon,
  RepoForkedIcon,
} from '@primer/octicons-react';

interface ShareLandscapeArgs {
  token: LandscapeToken;
  reload(): void;
}

const { userService } = import.meta.env.VITE_BACKEND_ADDRESSES;

export default function ShareLandscape(args: ShareLandscapeArgs) {
  const user = useAuthStore((state) => state.user);
  // TODO: normally no tracked variable but didn't know better
  const [focusedClicks, setFocusedClicks] = useState<number>(0);

  const [username, setUserName] = useState<string>('');

  const grantAccess = async () => {
    try {
      await sendModifyAccess(args.token.value, username, 'grant');
      args.token.sharedUsersIds.addObject(username);

      useToastHandlerStore
        .getState()
        .showSuccessToastMessage(
          `Access of ${username} granted for token ${args.token.value}`
        );
    } catch (e) {
      useToastHandlerStore.getState().showErrorToastMessage(e.message);
    }
  };

  const revokeAccess = async (userId: string) => {
    try {
      await sendModifyAccess(args.token.value, userId, 'revoke');
      args.token.sharedUsersIds.removeObject(userId);
      useToastHandlerStore
        .getState()
        .showSuccessToastMessage(
          `Access of ${userId} revoked for token ${args.token.value}`
        );
    } catch (e) {
      useToastHandlerStore.getState().showErrorToastMessage(e.message);
    }
  };

  const cloneToken = async () => {
    try {
      await sendModifyAccess(args.token.value, user!.sub, 'clone');
      args.reload();
      useToastHandlerStore
        .getState()
        .showSuccessToastMessage(`Cloned token ${args.token.value}`);
    } catch (e) {
      useToastHandlerStore.getState().showErrorToastMessage(e.message);
    }
  };
  //TODO: original:
  // const cloneToken=async(userId: string)=> {
  //   try {
  //     await sendModifyAccess(args.token.value, userId, 'clone');
  //     args.reload();
  //     useToastHandlerStore
  //       .getState()
  //       .showSuccessToastMessage(`Cloned token ${args.token.value}`);
  //   } catch (e) {
  //     useToastHandlerStore.getState().showErrorToastMessage(e.message);
  //   }
  // }

  const hidePopover = (event: React.FormEvent) => {
    // Clicks enable us to differentiate between opened and closed popovers
    if (focusedClicks % 2 === 1) {
      //TODO:
      event.target?.dispatchEvent(new Event('click'));
    }
    setFocusedClicks(0);
  };

  const onClick = (event: React.FormEvent) => {
    setFocusedClicks(focusedClicks + 1);
    // Prevent click on table row which would trigger to open the visualization
    event.stopPropagation();
  };

  const sendModifyAccess = (
    tokenId: string,
    userId: string,
    method: string
  ) => {
    return new Promise<undefined>((resolve, reject) => {
      const encodedUserId = encodeURI(userId);

      fetch(
        `${userService}/token/${tokenId}/${encodedUserId}?method=${method}`,
        {
          headers: {
            Authorization: `Bearer ${useAuthStore.getState().accessToken}`,
          },
          method: 'POST',
        }
      )
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

  return (
    <div id="colorPresets" className="dropdown">
      <OverlayTrigger
        placement="bottom"
        trigger={['hover', 'focus']}
        overlay={<Tooltip id="tooltip-bottom">Manage access to token</Tooltip>}
      >
        <>
          <button
            className="button-svg-with-hover"
            type="button"
            // {{on 'focusout' this.hidePopover}}
            onBlur={(event) => hidePopover(event)} // There could be problems with onBlur not working as expected
            onClick={(event) => onClick(event)}
          >
            <ShareAndroidIcon size="small" className="octicon align-middle" />
          </button>
          <Popover title="Manage Access">
            <table className="table table-striped" style={{ width: '100%' }}>
              <tbody>
                {args.token.ownerId === user!.sub ? (
                  <>
                    {args.token.sharedUsersIds.map((userWithAccess) => (
                      <tr className="d-flex">
                        <td className="col-10">{userWithAccess}</td>
                        <td className="col-2">
                          <OverlayTrigger
                            placement={'bottom'}
                            trigger={['hover', 'focus']}
                            overlay={
                              <Tooltip id="tooltip-bottom">
                                Revoke access
                              </Tooltip>
                            }
                          >
                            <button
                              className="button-svg-with-hover"
                              type="button"
                              onClick={() => revokeAccess(userWithAccess)}
                            >
                              <DashIcon
                                size="small"
                                className="octicon align-middle"
                              />
                            </button>
                          </OverlayTrigger>
                        </td>
                      </tr>
                    ))}
                    <tr className="d-flex">
                      <td className="col-10">
                        <label htmlFor="username">Enter username</label>
                        <input
                          id="username"
                          value={username}
                          placeholder="github|12345"
                        />
                      </td>
                      <td className="col-2">
                        <OverlayTrigger
                          placement={'bottom'}
                          trigger={['hover', 'focus']}
                          overlay={
                            <Tooltip id="tooltip-bottom">Grant access</Tooltip>
                          }
                        >
                          <button
                            className="button-svg-with-hover"
                            type="button"
                            onClick={grantAccess}
                          >
                            <PlusIcon
                              size="small"
                              className="octicon align-middle"
                            />
                          </button>
                        </OverlayTrigger>
                      </td>
                    </tr>
                  </>
                ) : (
                  <>
                    <tr className="d-flex">
                      <td className="col-10">Revoke own access</td>
                      <td className="col-2">
                        <OverlayTrigger
                          placement={'bottom'}
                          trigger={['hover', 'focus']}
                          overlay={
                            <Tooltip id="tooltip-bottom">
                              Revoke own access
                            </Tooltip>
                          }
                        >
                          <button
                            className="button-svg-with-hover"
                            type="button"
                            onClick={() => revokeAccess(user!.sub)}
                          >
                            <TrashIcon
                              size="small"
                              className="octicon align-middle"
                            />
                          </button>
                        </OverlayTrigger>
                      </td>
                    </tr>
                    <tr className="d-flex">
                      <td className="col-10">Clone token</td>
                      <td className="col-2">
                        <OverlayTrigger
                          placement={'bottom'}
                          trigger={['hover', 'focus']}
                          overlay={
                            <Tooltip id="tooltip-bottom">
                              Clone token to gain write access
                            </Tooltip>
                          }
                        >
                          <button
                            className="button-svg-with-hover"
                            type="button"
                            onClick={cloneToken}
                          >
                            <RepoForkedIcon
                              size="small"
                              className="octicon align-middle"
                            />
                          </button>
                        </OverlayTrigger>
                      </td>
                    </tr>
                  </>
                )}
              </tbody>
            </table>
          </Popover>
        </>
      </OverlayTrigger>
    </div>
  );
}
