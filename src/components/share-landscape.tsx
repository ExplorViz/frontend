import {
  DashIcon,
  PlusIcon,
  RepoForkedIcon,
  ShareAndroidIcon,
  TrashIcon,
} from '@primer/octicons-react';
import { useAuthStore } from 'explorviz-frontend/src/stores/auth';
import { LandscapeToken } from 'explorviz-frontend/src/stores/landscape-token';
import { useToastHandlerStore } from 'explorviz-frontend/src/stores/toast-handler';
import React, { useState } from 'react';
import { OverlayTrigger, Popover, Tooltip } from 'react-bootstrap';

interface ShareLandscapeArgs {
  token: LandscapeToken;
  reload(): void;
}

const userService = import.meta.env.VITE_USER_SERV_URL;

export default function ShareLandscape(args: ShareLandscapeArgs) {
  const user = useAuthStore((state) => state.user);
  const [username, setUserName] = useState<string>('');

  const grantAccess = async (event: React.MouseEvent) => {
    event.stopPropagation();
    try {
      await sendModifyAccess(args.token.value, username, 'grant');
      args.token.sharedUsersIds.push(username);

      useToastHandlerStore
        .getState()
        .showSuccessToastMessage(
          `Access of ${username} granted for token ${args.token.value}`
        );
    } catch (e: any) {
      useToastHandlerStore.getState().showErrorToastMessage(e.message);
    }
  };

  const revokeAccess = async (userId: string, event: React.MouseEvent) => {
    event.stopPropagation();
    try {
      await sendModifyAccess(args.token.value, userId, 'revoke');
      args.token.sharedUsersIds.filter((value) => value !== userId);
      useToastHandlerStore
        .getState()
        .showSuccessToastMessage(
          `Access of ${userId} revoked for token ${args.token.value}`
        );
    } catch (e: any) {
      useToastHandlerStore.getState().showErrorToastMessage(e.message);
    }
  };

  const cloneToken = async (userId: string, event: React.MouseEvent) => {
    event.stopPropagation();
    try {
      await sendModifyAccess(args.token.value, userId, 'clone');
      args.reload();
      useToastHandlerStore
        .getState()
        .showSuccessToastMessage(`Cloned token ${args.token.value}`);
    } catch (e: any) {
      useToastHandlerStore.getState().showErrorToastMessage(e.message);
    }
  };

  const handleShareClick = (event: React.MouseEvent) => {
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
    <Popover
      id="share-landscape-popover"
      title="Manage Access"
      onClick={(e) => e.stopPropagation()}
    >
      <Popover.Header>Manage Access</Popover.Header>
      <Popover.Body>
        <table className="table table-striped" style={{ width: '100%' }}>
          <tbody>
            {args.token.ownerId === user!.sub ? (
              <>
                {args.token.sharedUsersIds.map((userWithAccess) => (
                  <tr className="d-flex" key={userWithAccess}>
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
                      className="form-control"
                      value={username}
                      placeholder="github|12345"
                      onChange={(e) => setUserName(e.target.value)}
                      onClick={(e) => e.stopPropagation()}
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
    <div id="shareLandscape" onClick={(e) => e.stopPropagation()}>
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
              onClick={(event) => handleShareClick(event)}
            >
              <ShareAndroidIcon size="small" className="octicon align-middle" />
            </button>
          </OverlayTrigger>
        </div>
      </OverlayTrigger>
    </div>
  );
}
