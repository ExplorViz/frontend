import React, { useState, useRef } from 'react';
import { LandscapeToken } from 'react-lib/src/stores/landscape-token';
import { useToastHandlerStore } from 'react-lib/src/stores/toast-handler';
import { useAuthStore } from 'react-lib/src/stores/auth';
import { OverlayTrigger, Tooltip, Popover } from 'react-bootstrap';
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

const userService = import.meta.env.VITE_USER_SERV_URL;

export default function ShareLandscape(args: ShareLandscapeArgs) {
  const user = useAuthStore((state) => state.user);
  const focusedClicks = useRef<number>(0);

  const [username, setUserName] = useState<string>('');

  const grantAccess = async (event: React.FormEvent) => {
    event.stopPropagation();
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

  const revokeAccess = async (userId: string, event: React.FormEvent) => {
    event.stopPropagation();
    try {
      await sendModifyAccess(args.token.value, userId, 'revoke');
      args.token.sharedUsersIds.filter(value => value !== userId);
      useToastHandlerStore
        .getState()
        .showSuccessToastMessage(
          `Access of ${userId} revoked for token ${args.token.value}`
        );
    } catch (e) {
      useToastHandlerStore.getState().showErrorToastMessage(e.message);
    }
  };

  const cloneToken = async (userId: string, event: React.FormEvent) => {
    event.stopPropagation();
    try {
      await sendModifyAccess(args.token.value, userId, 'clone');
      args.reload();
      useToastHandlerStore
        .getState()
        .showSuccessToastMessage(`Cloned token ${args.token.value}`);
    } catch (e) {
      useToastHandlerStore.getState().showErrorToastMessage(e.message);
    }
  };

  const hidePopover = (event: React.FormEvent) => {
    // Clicks enable us to differentiate between opened and closed popovers
    if (focusedClicks.current % 2 === 1) {
      event.target?.dispatchEvent(new Event('click'));
    }
    focusedClicks.current = 0;
  };

  const onClick = (event: React.FormEvent) => {
    focusedClicks.current = focusedClicks.current + 1;
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

  const popover = (
    <Popover title="Manage Access">
      <Popover.Header>Manage Access</Popover.Header>
      <Popover.Body>
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
                          <Tooltip id="tooltip-bottom">Revoke access</Tooltip>
                        }
                      >
                        <button
                          className="button-svg-with-hover"
                          type="button"
                          onClick={(event) =>
                            revokeAccess(userWithAccess, event)
                          }
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
                        onClick={(event) => grantAccess(event)}
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
                        <Tooltip id="tooltip-bottom">Revoke own access</Tooltip>
                      }
                    >
                      <button
                        className="button-svg-with-hover"
                        type="button"
                        onClick={(event) => revokeAccess(user!.sub, event)}
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
                        onClick={(event) => cloneToken(user!.sub, event)}
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
      </Popover.Body>
    </Popover>
  );

  return (
    <div id="colorPresets" className="dropdown">
      <OverlayTrigger
        trigger={['hover', 'focus']}
        placement="bottom"
        overlay={<Tooltip id="tooltip-bottom">Manage access to token</Tooltip>}
      >
        <div>
          <OverlayTrigger
            trigger="click"
            placement="right"
            overlay={popover}
            rootClose
          >
            <button
              className="button-svg-with-hover"
              type="button"
              onBlur={(event) => hidePopover(event)}
              onClick={(event) => onClick(event)}
            >
              <ShareAndroidIcon size="small" className="octicon align-middle" />
            </button>
          </OverlayTrigger>
        </div>
      </OverlayTrigger>
    </div>
  );
}
