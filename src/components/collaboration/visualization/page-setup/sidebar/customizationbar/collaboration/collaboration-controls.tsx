import {
  DeviceCameraVideoIcon,
  PersonFillIcon,
  SignInIcon,
  SignOutIcon,
  XCircleIcon
} from '@primer/octicons-react';
import Button from 'react-bootstrap/Button';

import { usePlayroomConnectionStore } from 'explorviz-frontend/src/stores/collaboration/playroom-connection-store';
import { useSpectateUserStore } from 'explorviz-frontend/src/stores/collaboration/spectate-user';
import { getRoomCode, isHost, myPlayer, RPC, usePlayersList } from 'playroomkit';

import { LandscapeToken, useLandscapeTokenStore } from 'explorviz-frontend/src/stores/landscape-token';
import { useMultiplayerState } from 'playroomkit';
import { useEffect, useState } from 'react';

// This compnent yields the collaboration controls for the settings

export default function CollaborationControls() {

  const { isConnected, openLobby, disconnect } = usePlayroomConnectionStore();
  const players = usePlayersList(true);
  const me = myPlayer();

  // Functions for starting and stopping spectation
  const spectatedPlayerId = useSpectateUserStore(
    (state) => state.spectatedPlayerId
  );
  const activateSpectation = useSpectateUserStore((state) => state.activate);
  const deactivateSpectation = useSpectateUserStore(
    (state) => state.deactivate
  );

  const toggleSpectate = (playerId: string) => {
    if (spectatedPlayerId === playerId) {
      deactivateSpectation();
    } else {
      activateSpectation(playerId);
    }
  };

  // This function kicks a certain player
  const handleKick = (playerId: string) => {
    if (isHost()) {
      RPC.call('kick_player', playerId, RPC.Mode.ALL);
    }
  };

  const [globalMutedUsers, setGlobalMutedUsers] = useMultiplayerState('globalMutedUsers', [] as string[]);

  // This function is used to prevent errors while loading a not fully connected user 
  const getSafeProfile = (player: any) => {
    const profile = player.getProfile();
    return {
      name: profile?.name || 'Loading...',
      color: profile?.color?.hex || '#888888',
    };
  };


  // functionality for the admin to switch between landscapes in the colaboration tab
  const [landscapeTokens, setLandscapeTokens] = useState<LandscapeToken[]>([]);
  const setTokenByValue = useLandscapeTokenStore((state) => state.setTokenByValue);
  const currentToken = useLandscapeTokenStore((state) => state.token);
  useEffect(() => {
    if (isHost()) {
      useLandscapeTokenStore.getState().retrieveTokens()
        .then((tokens) => {
          setLandscapeTokens(tokens);
        })
        .catch((e) => {
          console.error("Error while loading landscapes: ", e);
        });
    }
  }, [isHost]);

  const changeLandscape = (newToken: LandscapeToken) => {
    setTokenByValue(newToken.value);
  };

  // If not connected to a playroomkit room, show the corresponding screen
  // with the button to connect
  if (!isConnected) {
    return (
      <div className="collaboration-controls">
        <h6 className="bold mb-3">Multiplayer (Playroom)</h6>
        <p className="small text-muted mb-3">
          Connect to work together with others!
        </p>
        <Button variant="success" className="w-100" onClick={openLobby}>
          <SignInIcon size="small" className="me-2" />
          Connect / Create Room
        </Button>
      </div>
    );
  }

  // If connected but the local player isn't loaded yet, show loading screen
  if (!me) {
    return <div className="p-3 text-center">Loading profile...</div>;
  }

  // If connected, show the player list and options
  return (
    <div className="collaboration-controls">
      <div className="d-flex justify-content-between align-items-center mb-3">
        <div>
          <label className="bold me-2">Room-Code:</label>
          <strong style={{ color: '#4ade80', letterSpacing: '1px' }}>
            {getRoomCode()}
          </strong>
        </div>
      </div>

      <label className="bold mb-2">Users:</label>
      <ul className="list-unstyled">
        {players.map((player) => {
          const isMe = player.id === me.id;
          const isSpectatedByUs = spectatedPlayerId === player.id;

          const { name, color } = getSafeProfile(player);

          return (
            <div
              className="d-flex justify-content-between align-items-center mb-2 p-2 border rounded"
              key={player.id}
              style={{ backgroundColor: 'rgba(255,255,255,0.05)' }}
            >
              <div className="d-flex align-items-center">
                <PersonFillIcon
                  size="small"
                  style={{ color: color, marginRight: '10px' }}
                />
                <span style={{ fontWeight: isMe ? 'bold' : 'normal' }}>
                  {name} {isMe ? '(You)' : ''}
                </span>
              </div>

              {!isMe && (
                <Button
                  title={isSpectatedByUs ? 'End Spectating' : 'Spectate'}
                  variant={isSpectatedByUs ? 'danger' : 'outline-success'}
                  size="sm"
                  onClick={() => toggleSpectate(player.id)}
                >
                  <DeviceCameraVideoIcon size="small" />
                </Button>
              )}

              {isHost() && !isMe && (
                <Button
                  className="ml-2"
                  variant={globalMutedUsers.includes(player.id) ? "success" : "outline-warning"}
                  size="sm"
                  title={globalMutedUsers.includes(player.id) ? "Unmute in Chat" : "Mute in Chat"}
                  onClick={() => {
                    const isMuted = globalMutedUsers.includes(player.id);
                    if (isMuted) {
                      setGlobalMutedUsers(globalMutedUsers.filter((id: string) => id !== player.id));
                    } else {
                      setGlobalMutedUsers([...globalMutedUsers, player.id]);
                    }
                  }}
                >
                  {globalMutedUsers.includes(player.id) ? "Unmute" : "Mute"}
                </Button>
              )}

              {!isMe && isHost() && (
                <Button
                  title="Kick Player"
                  variant="outline-danger"
                  size="sm"
                  onClick={() => handleKick(player.id)}
                >
                  <XCircleIcon size="small" /> Kick
                </Button>
              )}
            </div>
          );
        })}
      </ul>

      {isHost() && (
        <div className="mt-4 border-top pt-3">
          <h6>Switch Landscape</h6>
          <div className="landscape-list-sync" style={{ maxHeight: '200px', overflowY: 'auto' }}>
            {landscapeTokens.filter(t => t.value !== currentToken?.value).length === 0 ? (
              <p style={{ fontSize: '0.8rem' }}>No more landscapes found...</p>
            ) : (
              landscapeTokens
                .filter(t => t.value !== currentToken?.value)
                .map((t) => (
                  <div
                    key={t.value}
                    className="d-flex justify-content-between align-items-center mb-2 p-2 border rounded"
                    style={{ cursor: 'pointer', background: 'var(--bs-tertiary-bg)' }}
                    onClick={() => changeLandscape(t)}
                  >
                    <div style={{ fontSize: '0.85rem', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      <strong>{t.alias || t.projectName || 'unnamed'}</strong>
                      <br />
                      <small className="text-muted">{t.value.substring(0, 8)}...</small>
                    </div>
                    <Button size="sm" variant="outline-primary">Load</Button>
                  </div>
                ))
            )}
          </div>
        </div>
      )}

      <hr />

      <Button
        title="Leave Room"
        variant="outline-danger"
        className="w-100 mt-2"
        onClick={disconnect}
      >
        <SignOutIcon size="small" className="me-2" />
        Disconnect
      </Button>
    </div>
  );
}