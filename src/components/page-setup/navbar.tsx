import {
  GitBranchIcon,
  IdBadgeIcon,
  KeyIcon,
  PersonIcon,
  SignOutIcon,
  UndoIcon,
  VscodeIcon,
} from '@primer/octicons-react';
import StatusIcons from 'explorviz-frontend/src/components/page-setup/status-icons';
import { useIdeWebsocketStore } from 'explorviz-frontend/src/ide/ide-websocket';
import { useAuthStore } from 'explorviz-frontend/src/stores/auth';
import { useIdeWebsocketFacadeStore } from 'explorviz-frontend/src/stores/ide-websocket-facade';
import { useLandscapeTokenStore } from 'explorviz-frontend/src/stores/landscape-token';
import { useRenderingServiceStore } from 'explorviz-frontend/src/stores/rendering-service';
import { useSnapshotTokenStore } from 'explorviz-frontend/src/stores/snapshot-token';
import { Dropdown, DropdownButton } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';

const tokenToShow = import.meta.env.VITE_ONLY_SHOW_TOKEN;

export default function Navbar() {
  const restartAndSetSocket = useIdeWebsocketStore(
    (state) => state.restartAndSetSocket
  );

  const closeConnection = useIdeWebsocketStore(
    (state) => state.closeConnection
  );

  const isIdeConnected = useIdeWebsocketFacadeStore(
    (state) => state.isConnected
  );
  const user = useAuthStore((state) => state.user);
  const landscapeToken = useLandscapeTokenStore((state) => state.token);
  const _analysisMode = useRenderingServiceStore(
    (state) => state._analysisMode
  );
  const setSnapshotToken = useSnapshotTokenStore((state) => state.setToken);
  const setSnapshotSelected = useSnapshotTokenStore(
    (state) => state.setSnapshotSelected
  );
  const setLandscapeToken = useLandscapeTokenStore((state) => state.setToken);

  const navigate = useNavigate();

  const isSingleLandscapeMode = () => {
    return tokenToShow.length > 0 && tokenToShow !== 'change-token';
  };

  const versionTag = () => {
    return import.meta.env.VITE_VERSION_TAG;
  };

  const logout = useAuthStore((state) => state.logout);

  const goToLandscapeSelection = () => {
    setSnapshotSelected(false);
    setLandscapeToken(null);
    setSnapshotToken(null);
    navigate('/landscapes');
  };

  const goToSettings = () => {
    setLandscapeToken(null);
    setSnapshotSelected(false);
    setSnapshotToken(null);
    navigate('/settings');
  };

  return (
    <div
      className="p-3 disable-select pointer-events-none"
      style={{ position: 'absolute', width: '100vw', zIndex: 1000 }}
    >
      <div className="navbar-layout">
        <div className="navbar-left">
          <img
            className="pointer-events-all navbar-logo"
            src="images/explorviz-30px.png"
            alt="ExplorViz"
            draggable="false"
            onClick={goToLandscapeSelection}
          />
        </div>
        <div className="navbar-center d-none d-md-block">
          {!isSingleLandscapeMode() && landscapeToken && (
            <>
              <div className="navbar-token-link pointer-events-all">
                <span
                  className="d-flex-center"
                  role="button"
                  onClick={goToLandscapeSelection}
                >
                  <UndoIcon size="small" />
                  &nbsp;{landscapeToken.alias}
                </span>
              </div>
              <div className="navbar-rendering-mode">{_analysisMode}</div>
            </>
          )}
        </div>
        <div id="navbar-user-options" className="btn-group pointer-events-all">
          <StatusIcons />
          <div className="btn-group" style={{ marginLeft: '1rem' }}>
            <DropdownButton variant="white" title={<PersonIcon size="small" />}>
              <Dropdown.Header>
                <div className="d-flex align-items-center">
                  <PersonIcon size="medium" className="me-1" />
                  <div
                    className="d-flex flex-column"
                    style={{ height: '32px' }}
                  >
                    <strong className="truncate-text">{user?.nickname}</strong>
                    <span className="truncate-text">
                      <IdBadgeIcon size="small" className="me-1" />
                      {user?.sub}
                    </span>
                  </div>
                </div>
              </Dropdown.Header>
              <Dropdown.Divider />
              {landscapeToken && (
                <Dropdown.Item onClick={goToLandscapeSelection}>
                  <KeyIcon size="small" className="me-2" />
                  {landscapeToken.alias}
                </Dropdown.Item>
              )}
              <Dropdown.Item onClick={goToSettings}>
                <GitBranchIcon size="small" className="me-2" />
                Git API Token
              </Dropdown.Item>
              {isIdeConnected ? (
                <Dropdown.Item onClick={() => closeConnection()}>
                  Disconnect from VSCode extension
                </Dropdown.Item>
              ) : (
                <Dropdown.Item
                  onClick={() => restartAndSetSocket(landscapeToken?.value)}
                >
                  <VscodeIcon size="small" className="me-2" />
                  Connect to VSCode extension
                </Dropdown.Item>
              )}
              <Dropdown.Item
                onClick={() => {
                  window.location.href = `${import.meta.env.VITE_KEYCLOAK_URL}/realms/${import.meta.env.VITE_KEYCLOAK_REALM}/account/`;
                }}
              >
                <PersonIcon size="small" className="me-2" />
                Manage Account
              </Dropdown.Item>
              <Dropdown.Item onClick={logout}>
                <SignOutIcon size="small" className="me-2" />
                Logout
              </Dropdown.Item>
              <Dropdown.Divider />
              <Dropdown.Item disabled>Version: {versionTag()}</Dropdown.Item>
            </DropdownButton>
          </div>
        </div>
      </div>
    </div>
  );
}
