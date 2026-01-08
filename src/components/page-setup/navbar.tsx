import React, { useState, useRef, useEffect } from 'react';
import { useAuthStore } from '../../stores/auth';
import { useLandscapeTokenStore } from '../../stores/landscape-token';
import { useRenderingServiceStore } from '../../stores/rendering-service';
import { useNavigate } from 'react-router-dom';
import { useSnapshotTokenStore } from '../../stores/snapshot-token';
import { useIdeWebsocketFacadeStore } from 'explorviz-frontend/src/stores/ide-websocket-facade';
import {
  GitBranchIcon,
  IdBadgeIcon,
  KeyIcon,
  PersonIcon,
  SignOutIcon,
  UndoIcon,
} from '@primer/octicons-react';
import StatusIcons from 'explorviz-frontend/src/components/page-setup/status-icons';
import { useIdeWebsocketStore } from 'explorviz-frontend/src/ide/ide-websocket';

const tokenToShow = import.meta.env.VITE_ONLY_SHOW_TOKEN;

export default function Navbar() {
  const [isDropdownOpen, setIsDropdownOpen] = useState<boolean>(false);

  const restartAndSetSocket = useIdeWebsocketStore(
    (state) => state.restartAndSetSocket
  );

  const closeConnection = useIdeWebsocketStore(
    (state) => state.closeConnection
  );

  const dropdownRef = useRef<HTMLUListElement | null>(null);

  const isConnected = useIdeWebsocketFacadeStore((state) => state.isConnected);
  const user = useAuthStore((state) => state.user);
  const landscapeToken = useLandscapeTokenStore((state) => state.token);
  const _analysisMode = useRenderingServiceStore(
    (state) => state._analysisMode
  );
  const latestSnapshotToken = useSnapshotTokenStore(
    (state) => state.latestSnapshotToken
  );
  const setTokenSnapshot = useSnapshotTokenStore((state) => state.setToken);
  const setSnapshotSelected = useSnapshotTokenStore(
    (state) => state.setSnapshotSelected
  );
  const token = useLandscapeTokenStore((state) => state.token);
  const setTokenLandscape = useLandscapeTokenStore((state) => state.setToken);

  const navigate = useNavigate();

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const analysisMode = () => {
    let currentAnalysisMode = _analysisMode;

    currentAnalysisMode =
      'Active mode: ' +
      currentAnalysisMode.charAt(0).toUpperCase() +
      currentAnalysisMode.slice(1);

    return currentAnalysisMode;
  };

  const isSingleLandscapeMode = () => {
    return tokenToShow.length > 0 && tokenToShow !== 'change-token';
  };

  const versionTag = () => {
    return import.meta.env.VITE_VERSION_TAG;
  };

  const logout = useAuthStore((state) => state.logout);

  const goToLandscapeSelection = () => {
    setSnapshotSelected(false);
    setTokenLandscape(null);
    setTokenSnapshot(null);
    setIsDropdownOpen(false);
    navigate('/landscapes');
  };

  const goToVisualization = () => {
    if (latestSnapshotToken !== null) {
      setTokenSnapshot(latestSnapshotToken);
      navigate('/visualization', {
        state: {
          landscapeToken: latestSnapshotToken!.landscapeToken.value,
          sharedSnapshot: latestSnapshotToken!.isShared,
          owner: latestSnapshotToken!.owner,
          createdAt: latestSnapshotToken!.createdAt,
        },
      });
    } else {
      navigate('/visualization', {
        state: {
          landscapeToken: token!.value,
        },
      });
    }
  };

  const goToSettings = () => {
    setTokenLandscape(null);
    setSnapshotSelected(false);
    setTokenSnapshot(null);
    navigate('/settings');
    setIsDropdownOpen(false);
  };

  return (
    <div
      className="p-3 disable-select pointer-events-none"
      style={{ position: 'absolute', width: '100vw', zIndex: 1000 }}
    >
      <img
        className="pointer-events-all"
        style={{ height: '30px', float: 'left', cursor: 'pointer' }}
        src="images/explorviz-30px.png"
        alt="ExplorViz"
        draggable="false"
        onClick={goToLandscapeSelection}
      />
      {!isSingleLandscapeMode() && landscapeToken && (
        <div className="navbar-middle-row d-none d-md-block">
          <div className="navbar-token-link pointer-events-all text-center">
            <span
              className="d-flex-center"
              role="button"
              onClick={goToLandscapeSelection}
            >
              <UndoIcon size="small" />
              &nbsp;{landscapeToken.alias}
            </span>
          </div>
          <div className="navbar-rendering-mode text-center">
            {_analysisMode}
          </div>
        </div>
      )}
      <div id="navbar-user-options" className="btn-group pointer-events-all">
        <StatusIcons />
        <div className="btn-group" style={{ marginLeft: '1rem' }}>
          <button
            type="button"
            className="dropdown-toggle navbar-user-button"
            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
            aria-expanded={isDropdownOpen}
          >
            {/* {user?.picture */}
            {false ? (
              <img
                // src={user?.picture}
                alt="User profile"
                width="16px"
                height="16px"
              />
            ) : (
              <PersonIcon size="small" />
            )}
          </button>
          {isDropdownOpen && (
            <ul
              ref={dropdownRef}
              className={`dropdown-menu dropdown-menu-right ${isDropdownOpen ? 'show' : ''}`}
            >
              <li>
                <div className="dropdown-header">
                  <div>
                    <strong className="truncate-text">
                      <PersonIcon size="small" />
                      {user?.nickname}
                    </strong>
                  </div>
                  <span className="truncate-text">
                    <IdBadgeIcon size="small" />
                    {user?.sub}
                  </span>
                </div>
              </li>
              {landscapeToken && (
                <li>
                  <button
                    className="dropdown-item"
                    type="button"
                    onClick={goToLandscapeSelection}
                  >
                    <KeyIcon size="small" />
                    {landscapeToken.alias}
                  </button>
                </li>
              )}
              <li>
                <button
                  className="dropdown-item"
                  type="button"
                  onClick={goToSettings}
                >
                  <GitBranchIcon size="small" />
                  Git API Token
                </button>
              </li>
              <li>
                {isConnected ? (
                  <button
                    className="dropdown-item"
                    type="button"
                    onClick={() => closeConnection()}
                  >
                    Disconnect from VSCode extension
                  </button>
                ) : (
                  <button
                    className="dropdown-item"
                    type="button"
                    onClick={() => restartAndSetSocket(landscapeToken?.value)}
                  >
                    Connect to VSCode extension
                  </button>
                )}
              </li>
              <li>
                <button
                  className="dropdown-item"
                  type="button"
                  onClick={() => {
                    window.location.href = `${import.meta.env.VITE_KEYCLOAK_URL}/realms/${import.meta.env.VITE_KEYCLOAK_REALM}/account/`;
                  }}
                >
                  <PersonIcon size="small" />
                  Manage Account
                </button>
              </li>
              <li>
                <button
                  className="dropdown-item"
                  type="button"
                  onClick={logout}
                >
                  <SignOutIcon size="small" />
                  Logout
                </button>
              </li>
              <li>
                <hr className="dropdown-divider" />
              </li>
              <li>
                <div className="dropdown-item disabled">
                  Version: {versionTag()}
                </div>
              </li>
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
