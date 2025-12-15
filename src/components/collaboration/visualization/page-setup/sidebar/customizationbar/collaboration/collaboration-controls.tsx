import React, { useEffect, useState } from 'react';

import Button from 'react-bootstrap/Button';
import Modal from 'react-bootstrap/Modal';
import Select from 'react-select';

import {
  DeviceCameraVideoIcon,
  DiffAddedIcon,
  MuteIcon,
  PencilIcon,
  PersonFillIcon,
  ShareAndroidIcon,
  SyncIcon,
  UnmuteIcon,
  XIcon,
} from '@primer/octicons-react';
import { useAuthStore } from 'explorviz-frontend/src/stores/auth';
import { useChatStore } from 'explorviz-frontend/src/stores/chat';
import { useCollaborationSessionStore } from 'explorviz-frontend/src/stores/collaboration/collaboration-session';
import { useLocalUserStore } from 'explorviz-frontend/src/stores/collaboration/local-user';
import { useMessageSenderStore } from 'explorviz-frontend/src/stores/collaboration/message-sender';
import { useRoomServiceStore } from 'explorviz-frontend/src/stores/collaboration/room-service';
import { useSpectateUserStore } from 'explorviz-frontend/src/stores/collaboration/spectate-user';
import {
  LandscapeToken,
  useLandscapeTokenStore,
} from 'explorviz-frontend/src/stores/landscape-token';
import {
  SpectateConfig,
  useSpectateConfigurationStore,
} from 'explorviz-frontend/src/stores/spectate-configuration';
import { useTimestampStore } from 'explorviz-frontend/src/stores/timestamp';
import { useToastHandlerStore } from 'explorviz-frontend/src/stores/toast-handler';
import { useUserSettingsStore } from 'explorviz-frontend/src/stores/user-settings';
import { RoomListRecord } from 'explorviz-frontend/src/utils/collaboration/room-payload/receivable/room-list';
import {
  createSearchParams,
  useNavigate,
  useSearchParams,
} from 'react-router-dom';
import { useShallow } from 'zustand/react/shallow';
import QRCodeModal from './qr-code-modal';

// interface CollaborationControlsProps {}

export default function CollaborationControls() {
  const localUserColor = useLocalUserStore((state) => state.color);
  const localUserName = useLocalUserStore((state) => state.userName);
  const localUserId = useLocalUserStore((state) => state.userId);
  const isLocalUserHost = useLocalUserStore((state) => state.isHost);
  const timestamp = useTimestampStore((state) => state.timestamp);

  const collabStore = useCollaborationSessionStore(
    useShallow((state) => ({
      connectionStatus: state.connectionStatus,
      currentRoomId: state.currentRoomId,
      getAllRemoteUsers: state.getAllRemoteUsers,
      hostRoom: state.hostRoom,
      disconnect: state.disconnect,
      joinRoom: state.joinRoom,
      lookupRemoteUserById: state.lookupRemoteUserById,
    }))
  );

  const spectatedUser = useSpectateUserStore((state) => state.spectatedUser);
  const activateSpectation = useSpectateUserStore((state) => state.activate);
  const deactivateSpectation = useSpectateUserStore(
    (state) => state.deactivate
  );
  const activateSpectateConfig = useSpectateUserStore(
    (state) => state.activateConfig
  );
  const userIdMuteList = useChatStore((state) => state.userIdMuteList);
  const isChatUserMuted = useChatStore((state) => state.isUserMuted);
  const toggleChatMuteStatus = useChatStore((state) => state.toggleMuteStatus);
  const authUser = useAuthStore((state) => state.user);
  const listRooms = useRoomServiceStore((state) => state.listRooms);
  const currentToken = useLandscapeTokenStore((state) => state.token);
  const retrieveLandscapeTokens = useLandscapeTokenStore(
    (state) => state.retrieveTokens
  );
  const setTokenByValue = useLandscapeTokenStore(
    (state) => state.setTokenByValue
  );
  const retrieveSpectateConfigs = useSpectateConfigurationStore(
    (state) => state.retrieveConfigs
  );
  const saveSpectateConfig = useSpectateConfigurationStore(
    (state) => state.saveSpectateConfig
  );
  const changeSpectateConfig = useSpectateConfigurationStore(
    (state) => state.updateSpectateConfig
  );
  const removeSpectateConfig = useSpectateConfigurationStore(
    (state) => state.deleteSpectateConfig
  );
  const sendKickUser = useMessageSenderStore((state) => state.sendKickUser);
  const sendChangeLandscape = useMessageSenderStore(
    (state) => state.sendChangeLandscape
  );
  const sendChatMessage = useMessageSenderStore(
    (state) => state.sendChatMessage
  );
  const shareSettings = useUserSettingsStore(
    (state) => state.shareVisualizationSettings
  );
  const showSuccessToastMessage = useToastHandlerStore(
    (state) => state.showSuccessToastMessage
  );
  const showErrorToastMessage = useToastHandlerStore(
    (state) => state.showErrorToastMessage
  );

  const [searchParams] = useSearchParams();

  const [rooms, setRooms] = useState<RoomListRecord[]>([]);
  const [deviceId, setDeviceId] = useState<string | null>(null);
  const [landscapeTokens, setLandscapeTokens] = useState<LandscapeToken[]>([]);
  const [mutedUsers, setMutedUsers] = useState<string[]>([]);
  const [spectateConfigEnabled, setSpectateConfigEnabled] =
    useState<boolean>(false);
  const [spectateConfigs, setSpectateConfigs] = useState<SpectateConfig[]>([]);
  const [configDevices, setConfigDevices] = useState<string[]>([]);
  const [selectedConfig, setSelectedConfig] = useState<SpectateConfig | null>(
    null
  );
  const [selectedDevice, setSelectedDevice] = useState<string | null>(null);
  const [spectateConfigModal, setSpectateConfigModal] =
    useState<boolean>(false);
  const [editSpectateConfigModal, setEditSpectateConfigModal] =
    useState<boolean>(false);
  const [createSpectateConfigBtnDisabled, setCreateSpectateConfigBtnDisabled] =
    useState<boolean>(true);
  const [spectateConfigName, setSpectateConfigName] = useState<string | null>(
    null
  );
  const [spectateConfigDevices, setSpectateConfigDevices] = useState<
    { deviceId: string; projectionMatrix: number[] }[]
  >([]);
  const [qrCodeModal, setQrCodeModal] = useState<boolean>(false);
  const navigate = useNavigate();

  const users = (() => {
    const users = [];
    if (localUserColor) {
      users.push({
        name: `${localUserName} (you)`,
        style: { color: `#${localUserColor.getHexString()}` },
        isLocalUser: true,
        isSpectatable: false,
        isSpectatedByUs: false,
        isMuteable: false,
        isMuted: false,
        isKickable: false,
      });
    }
    const remoteUsers = Array.from(collabStore.getAllRemoteUsers()).map(
      (user) => {
        const isSpectatedByUs = spectatedUser?.userId === user.userId;
        return {
          remoteUserId: user.userId,
          name: user.userName,
          style: { color: `#${user.color.getHexString()}` },
          isLocalUser: false,
          isSpectatedByUs: isSpectatedByUs,
          isSpectatable: true,
          isMuteable: isLocalUserHost,
          isMuted: false,
          isKickable: isLocalUserHost,
        };
      }
    );

    return users.concat(remoteUsers);
  })();

  const hostRoom = () => {
    collabStore.hostRoom();
    showSuccessToastMessage('Hosting new Room.');
  };

  const leaveSession = () => {
    collabStore.disconnect();
    navigate({
      pathname: '/visualization',
      search: `?${createSearchParams({ landscapeToken: searchParams.get('landscapeToken')!, deviceId: searchParams.get('deviceId')! })}`,
    });
  };

  const loadRooms = async (alert = true) => {
    if (alert) {
      showSuccessToastMessage('Reloading Rooms');
    }
    await listRooms();
    setRooms(await listRooms());
    setLandscapeTokens(await retrieveLandscapeTokens());

    setSpectateConfigs(
      await useSpectateConfigurationStore.getState().retrieveConfigs()
    );
  };

  const joinRoom = async (room: RoomListRecord) => {
    // In case join action fails, the room list should be up-to-date
    loadRooms(false);
    collabStore.joinRoom(room.roomId);
  };

  const toggleSpectate = (user: {
    remoteUserId: string;
    isSpectatedByUs: boolean;
  }) => {
    const remoteUser = collabStore.lookupRemoteUserById(user.remoteUserId);
    if (remoteUser && !user.isSpectatedByUs) {
      activateSpectation(remoteUser);
    } else {
      deactivateSpectation();
    }
  };

  const toggleMuteStatus = (user: { remoteUserId: string }) => {
    if (user) {
      const userId = user.remoteUserId;

      if (isChatUserMuted(userId)) {
        setMutedUsers((prev) => prev.filter((id) => id !== userId));
      } else {
        setMutedUsers((prev) => [...prev, userId]);
      }
      toggleChatMuteStatus(userId);
    }
  };

  const isUserMuted = (user: { remoteUserId: string }) => {
    if (!user) {
      return;
    }
    return mutedUsers.includes(user.remoteUserId);
  };

  const kickUser = (user: { remoteUserId: string }) => {
    if (!user) {
      return;
    }
    sendKickUser(user.remoteUserId);
  };

  const configurationSelected = (selectedConfig: string) => {
    if (!selectedConfig) return;

    const remoteUserIds = Array.from(collabStore.getAllRemoteUsers()).map(
      (user) => user.userId
    );
    activateSpectateConfig(selectedConfig, remoteUserIds);
  };

  const sendSelectedConfiguration = () => {
    if (selectedDevice !== 'main') {
      showErrorToastMessage(
        'Applying spectate configurations only possible as device `main`.'
      );
    } else {
      configurationSelected(selectedConfig!.id);
    }
  };

  const updateSelectedConfig = (config: SpectateConfig) => {
    setConfigDevices([]);
    setSelectedDevice(null);

    const selectedToken = new URLSearchParams(window.location.search).get(
      'landscapeToken'
    );

    navigate({
      pathname: '/visualization',
      search: `?${createSearchParams({ landscapeToken: selectedToken!, deviceId: 'default' })}`,
    });

    setSelectedConfig(config);

    let newDevices: string[] = [];
    config.devices.forEach((device) => {
      newDevices = [...newDevices, device.deviceId];
    });
    setConfigDevices(newDevices);
  };

  const updateSelectedDevice = (device: string) => {
    setSelectedDevice(device);

    const selectedToken = searchParams.get('landscapeToken')!;

    navigate({
      pathname: '/visualization',
      search: `?${createSearchParams({ landscapeToken: selectedToken!, deviceId: device! })}`,
    });
  };

  const landscapeSelected = (event: any) => {
    setTokenByValue(event.target.value);

    // ToDo: Clean up old landscape

    navigate({
      pathname: '/visualization',
      search: `?${createSearchParams({ landscapeToken: event.target.value, deviceId: deviceId! })}`,
    });
    sendChangeLandscape(event.target.value);
    sendChatMessage(
      localUserId,
      `${localUserName}(${localUserId}) changed the landscape`,
      localUserName,
      '',
      true,
      'landscape_change',
      []
    );
  };

  const openSpectateConfigModal = () => {
    setSpectateConfigModal(true);
  };

  const closeSpectateConfigModal = () => {
    setSpectateConfigModal(false);
    setSpectateConfigDevices([]);
    setCreateSpectateConfigBtnDisabled(true);
    setSpectateConfigName(null);
  };

  const canCreateSpectateConfig = () => {
    if (spectateConfigName !== '') {
      let allSet = true;
      spectateConfigDevices.forEach((dv) => {
        if (dv.deviceId === '') {
          allSet = false;
        }
      });

      if (allSet) {
        setCreateSpectateConfigBtnDisabled(false);
      }
    } else {
      setCreateSpectateConfigBtnDisabled(false);
    }
  };

  const updateName = (event: React.FormEvent<HTMLInputElement>) => {
    const target: HTMLInputElement = event.currentTarget as HTMLInputElement;
    setSpectateConfigName(target.value);
    canCreateSpectateConfig();
  };

  const createDevice = () => {
    if (spectateConfigDevices.length === 0) {
      setSpectateConfigDevices((prev) => [
        ...prev,
        {
          deviceId: 'main',
          projectionMatrix: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        },
      ]);
    } else {
      setSpectateConfigDevices((prev) => [
        ...prev,
        {
          deviceId: '',
          projectionMatrix: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        },
      ]);
    }
  };

  const updateDeviceId = (index: number, event: React.FormEvent) => {
    const target = event.currentTarget as HTMLInputElement;
    const newSpectateConfigDevices = [...spectateConfigDevices];
    newSpectateConfigDevices[index] = {
      ...newSpectateConfigDevices[index],
      deviceId: target.value,
    };
    setSpectateConfigDevices(newSpectateConfigDevices);
    canCreateSpectateConfig();
  };

  const updateMatrix = (
    index: number,
    matrixIndex: number,
    event: React.FormEvent
  ) => {
    const target = event.currentTarget as HTMLInputElement;
    const newSpectateConfigDevices = [...spectateConfigDevices];
    const newProjectionMatrix = [
      ...newSpectateConfigDevices[index].projectionMatrix,
    ];
    newProjectionMatrix[matrixIndex] = Number(target.value);
    newSpectateConfigDevices[index] = {
      ...newSpectateConfigDevices[index],
      projectionMatrix: newProjectionMatrix,
    };
    setSpectateConfigDevices(newSpectateConfigDevices);
    canCreateSpectateConfig();
  };

  const getMatrixEntry = (index: number, matrixIndex: number) => {
    return spectateConfigDevices[index].projectionMatrix[matrixIndex];
  };

  const deleteDevice = (index: number) => {
    setSpectateConfigDevices((prev) =>
      prev.slice(0, index).concat(prev.slice(index + 1))
    );
    canCreateSpectateConfig();
  };

  const createSpectateConfig = async () => {
    const spectateConfig = {
      id: spectateConfigName!,
      user: authUser!.sub,
      devices: spectateConfigDevices,
    };

    await saveSpectateConfig(spectateConfig);

    setSpectateConfigs(await retrieveSpectateConfigs());

    closeSpectateConfigModal();
    navigate({
      pathname: '/visualization',
      search: `?${createSearchParams({ landscapeToken: searchParams.get('landscapeToken')!, deviceId: searchParams.get('deviceId')! })}`,
    });
  };

  const openEditSpectateConfigModal = () => {
    if (selectedConfig === null) {
      showErrorToastMessage('Select a configuration to edit.');
      return;
    }

    if (selectedConfig.user !== authUser?.sub) {
      showErrorToastMessage('You are not the creator of the configuration.');
      return;
    }

    setEditSpectateConfigModal(true);

    setSpectateConfigName(selectedConfig!.id);
    setSpectateConfigDevices(selectedConfig!.devices);
  };

  const closeEditSpectateConfigModal = () => {
    setEditSpectateConfigModal(false);
    setSpectateConfigDevices([]);
    setCreateSpectateConfigBtnDisabled(true);
    setSpectateConfigName(null);
  };

  const updateSpectateConfig = async () => {
    const spectateConfig = {
      id: spectateConfigName!,
      user: authUser!.sub,
      devices: spectateConfigDevices,
    };

    await changeSpectateConfig(spectateConfig);

    setSpectateConfigs(await retrieveSpectateConfigs());

    reassignSelectedItems();

    closeEditSpectateConfigModal();
    navigate({
      pathname: '/visualization',
      search: `?${createSearchParams({ landscapeToken: searchParams.get('landscapeToken')!, deviceId: searchParams.get('deviceId')! })}`,
    });
  };

  const deleteSpectateConfig = async () => {
    const spectateConfig = {
      id: spectateConfigName!,
      user: authUser!.sub,
      devices: spectateConfigDevices,
    };

    await removeSpectateConfig(spectateConfig);

    setSpectateConfigs(await retrieveSpectateConfigs());

    reassignSelectedItems();

    closeEditSpectateConfigModal();
  };

  const reassignSelectedItems = () => {
    const oldConfig = selectedConfig;

    setSelectedConfig(null);
    setSelectedDevice(null);
    setConfigDevices([]);

    let configStillExists = false;
    let newConfig = null;

    spectateConfigs.forEach((sc) => {
      if (sc.id === oldConfig!.id) {
        configStillExists = true;
        newConfig = sc;
      }
    });

    if (configStillExists) {
      setSelectedConfig({ ...newConfig! });

      selectedConfig!.devices.forEach((device) => {
        setConfigDevices((prev) => [...prev, device.deviceId]);
      });
    }

    const selectedToken = new URLSearchParams(window.location.search).get(
      'landscapeToken'
    );

    navigate({
      pathname: '/visualization',
      search: `?${createSearchParams({ landscapeToken: selectedToken!, deviceId: 'default' })}`,
    });
  };

  useEffect(() => {
    setMutedUsers(userIdMuteList || []);
    loadRooms(false);

    const deviceIdParam = searchParams.get('deviceId');
    if (deviceIdParam === null) {
      setDeviceId('default');
    } else {
      setDeviceId(deviceIdParam);
    }
  }, []);

  return (
    <>
      {collabStore.connectionStatus === 'online' && (
        <>
          <div className="d-flex justify-content-between align-items-center mb-2">
            <div>
              <label className="bold me-2">Room:</label>
              <label>{collabStore.currentRoomId}</label>
            </div>
            <Button
              title="Show QR Code"
              variant="outline-primary"
              onClick={() => setQrCodeModal(true)}
              size="sm"
            >
              <ShareAndroidIcon size="small" className="align-middle" />
            </Button>
          </div>

          <div>
            <label className="bold">Landscape: </label>
            <select
              className="form-select"
              aria-label="Default select example"
              style={{ maxWidth: 'calc(100% - 100px)' }}
              onChange={landscapeSelected}
              value={currentToken!.value}
            >
              {landscapeTokens.map((token) => (
                <option key={token.alias} value={token.value}>
                  {token.alias}
                </option>
              ))}
            </select>
          </div>

          <h6 className="mb-3 mt-3">
            <strong>Spectate Configuration</strong>
          </h6>
          <div className="ml-3">
            <div className="d-flex justify-content-between">
              <label>Enable Spectate Configuration Settings: </label>
              <input
                type="checkbox"
                style={{ marginBottom: '5px' }}
                checked={spectateConfigEnabled}
                name="spectateConfigEnabled"
                onChange={() => setSpectateConfigEnabled((prev) => !prev)}
              />
            </div>
          </div>
          <div>
            {/* Indicator that device should be in control of spectating configurations */}
            {deviceId && spectateConfigEnabled && (
              <>
                <div className="d-flex">
                  <label className="bold mr-2" style={{ paddingTop: '3px' }}>
                    Spectate Configuration:
                  </label>
                  <Select
                    className="mr-2"
                    styles={{
                      control: (provided) => ({
                        ...provided,
                        minWidth: '314px',
                        height: '20px',
                      }),
                    }}
                    options={spectateConfigs}
                    onChange={(newConfig) => updateSelectedConfig(newConfig!)}
                    value={selectedConfig}
                    getOptionLabel={(config) => config.id}
                    placeholder="Please select a configuration"
                  />
                  <Button
                    title="New Configuration"
                    variant="outline-secondary"
                    className="mr-2"
                    onClick={openSpectateConfigModal}
                  >
                    <DiffAddedIcon size="small" />
                  </Button>
                  <Button
                    title="Edit Configuration"
                    onClick={openEditSpectateConfigModal}
                    variant="outline-secondary"
                  >
                    <PencilIcon size="small" />
                  </Button>
                </div>
                <ul></ul>
                <div className="d-flex">
                  <label className="bold mr-2" style={{ paddingTop: '3px' }}>
                    Select Spectate Device:
                  </label>
                  <Select
                    className="mr-2"
                    styles={{
                      control: (provided) => ({
                        ...provided,
                        minWidth: '314px',
                        height: '20px',
                      }),
                    }}
                    placeholder="Please select a device"
                    options={configDevices.map((device) => ({
                      value: device,
                      label: device,
                    }))}
                    onChange={(newValue) =>
                      updateSelectedDevice(newValue!.value)
                    }
                    value={
                      selectedDevice
                        ? { value: selectedDevice, label: selectedDevice }
                        : null
                    }
                    getOptionLabel={(device) => device.label}
                  ></Select>
                  <Button
                    title="New Configuration"
                    variant="outline-secondary"
                    onClick={sendSelectedConfiguration}
                  >
                    Apply
                  </Button>
                </div>
              </>
            )}
          </div>

          <label className="bold">Users:</label>

          <ul>
            {users.map((user) => (
              <div
                className="chat-right-buttons collaboration-list-item"
                key={user.name}
              >
                <li style={user.style}>
                  <div className="nav-link-with-cursor">{user.name}</div>
                </li>
                {user.isLocalUser && (
                  <Button
                    title="Share settings with other users"
                    variant="outline-primary"
                    onClick={shareSettings}
                  >
                    Share Settings
                  </Button>
                )}
                {user.isMuteable && 'remoteUserId' in user && (
                  <Button
                    title={
                      isUserMuted({ remoteUserId: user.remoteUserId as string })
                        ? 'Unmute User'
                        : 'Mute User'
                    }
                    variant="outline-primary"
                    onClick={() =>
                      toggleMuteStatus({
                        remoteUserId: user.remoteUserId as string,
                      })
                    }
                  >
                    {isUserMuted({
                      remoteUserId: user.remoteUserId as string,
                    }) ? (
                      <UnmuteIcon size="small" className="align-middle" />
                    ) : (
                      <MuteIcon size="small" className="align-middle" />
                    )}
                  </Button>
                )}
                {user.isKickable && 'remoteUserId' in user && (
                  <Button
                    title="Kick User"
                    variant="outline-danger"
                    onClick={() =>
                      kickUser({ remoteUserId: user.remoteUserId as string })
                    }
                  >
                    <PersonFillIcon size="small" className="align-middle" />
                  </Button>
                )}
                {user.isSpectatable && 'remoteUserId' in user && (
                  <Button
                    title={user.isSpectatedByUs ? 'End Spectating' : 'Spectate'}
                    variant={
                      user.isSpectatedByUs
                        ? 'outline-danger'
                        : 'outline-success'
                    }
                    onClick={() =>
                      toggleSpectate({
                        remoteUserId: user.remoteUserId as string,
                        isSpectatedByUs: user.isSpectatedByUs,
                      })
                    }
                  >
                    <DeviceCameraVideoIcon
                      size="small"
                      className="align-middle"
                    />
                  </Button>
                )}
              </div>
            ))}
          </ul>
        </>
      )}

      {collabStore.connectionStatus === 'offline' && (
        <>
          <div className="flex-space-between">
            <label className="bold">
              {rooms ? 'Rooms:' : 'No rooms available'}
            </label>

            <Button
              title="Reload Rooms"
              variant="outline-secondary"
              onClick={() => loadRooms()}
            >
              <SyncIcon size="small" />
            </Button>
          </div>

          <ul>
            {rooms.map((room) => (
              <div
                className="flex-space-between collaboration-list-item"
                key={room.roomId}
              >
                <li>{room.roomName}</li>
                <Button
                  title="Join Room"
                  variant="outline-success"
                  onClick={() => joinRoom(room)}
                >
                  Join
                </Button>
              </div>
            ))}
          </ul>

          {timestamp ? (
            <Button
              title="Host Room"
              variant="outline-secondary"
              onClick={hostRoom}
            >
              Host Room
            </Button>
          ) : (
            <label className="bold">
              No landscape data available. Cannot host room.
            </label>
          )}
        </>
      )}

      {collabStore.connectionStatus === 'online' && (
        <Button
          title="Disconnect from Room"
          variant="outline-danger"
          onClick={leaveSession}
        >
          Disconnect
        </Button>
      )}

      <div>
        <Modal show={spectateConfigModal} onHide={closeSpectateConfigModal}>
          <Modal.Header>
            <h4 className="modal-title">Create Spectate Configuration</h4>
          </Modal.Header>
          <Modal.Body>
            <label htmlFor="name">Spectate Configuration Name:</label>
            <div className="d-flex justify-content-between">
              <input
                id="name"
                className="form-control mr-2"
                onInput={updateName}
                value={spectateConfigName!}
              />
            </div>

            <label className="mt-2">Devices:</label>
            {spectateConfigDevices.map((device, index) => (
              <div className="ml-3" key={index}>
                <hr />
                <label htmlFor="deviceId">Device ID:</label>
                {index === 0 ? (
                  <div className="d-flex justify-content-between">
                    <input
                      id="main-deviceId"
                      className="form-control mr-2"
                      type="text"
                      placeholder="DeviceId"
                      value={device.deviceId}
                      readOnly
                    />
                  </div>
                ) : (
                  <div className="d-flex justify-content-between">
                    <input
                      id="deviceId"
                      className="form-control mr-2"
                      type="text"
                      placeholder="DeviceId"
                      value={device.deviceId}
                      onInput={(event) => updateDeviceId(index, event)}
                    />
                    <button
                      type="button"
                      className="btn btn-sm"
                      title="Delete Device"
                      onClick={() => deleteDevice(index)}
                    >
                      <XIcon size="small" className="align-right" />
                    </button>
                  </div>
                )}
                <ul></ul>
                <div className="d-flex flex-column justify-content-between">
                  <label htmlFor="projectionMatrix">Projection Matrix:</label>
                  <div className="d-flex justify-content-between">
                    <input
                      id="mn11"
                      className="matrixNumber form-control mr-2"
                      type="number"
                      inputMode="numeric"
                      onInput={(event) => updateMatrix(index, 0, event)}
                      required
                    />
                    <input
                      id="mn12"
                      className="matrixNumber matrixNumber form-control mr-2"
                      type="number"
                      inputMode="numeric"
                      onInput={(event) => updateMatrix(index, 1, event)}
                      required
                    />
                    <input
                      id="mn13"
                      className="matrixNumber form-control mr-2"
                      type="number"
                      inputMode="numeric"
                      onInput={(event) => updateMatrix(index, 2, event)}
                      required
                    />
                    <input
                      id="mn14"
                      className="matrixNumber form-control mr-2"
                      type="number"
                      inputMode="numeric"
                      onInput={(event) => updateMatrix(index, 3, event)}
                      required
                    />
                  </div>
                  <ul></ul>
                  <div className="d-flex justify-content-between">
                    <input
                      id="mn21"
                      className="matrixNumber form-control mr-2"
                      type="number"
                      inputMode="numeric"
                      onInput={(event) => updateMatrix(index, 4, event)}
                      required
                    />
                    <input
                      id="mn22"
                      className="matrixNumber matrixNumber form-control mr-2"
                      type="number"
                      inputMode="numeric"
                      onInput={(event) => updateMatrix(index, 5, event)}
                      required
                    />
                    <input
                      id="mn23"
                      className="matrixNumber form-control mr-2"
                      type="number"
                      inputMode="numeric"
                      onInput={(event) => updateMatrix(index, 6, event)}
                      required
                    />
                    <input
                      id="mn24"
                      className="matrixNumber form-control mr-2"
                      type="number"
                      inputMode="numeric"
                      onInput={(event) => updateMatrix(index, 7, event)}
                      required
                    />
                  </div>
                  <ul></ul>
                  <div className="d-flex justify-content-between">
                    <input
                      id="mn31"
                      className="matrixNumber form-control mr-2"
                      type="number"
                      inputMode="numeric"
                      onInput={(event) => updateMatrix(index, 8, event)}
                      required
                    />
                    <input
                      id="mn32"
                      className="matrixNumber matrixNumber form-control mr-2"
                      type="number"
                      inputMode="numeric"
                      onInput={(event) => updateMatrix(index, 9, event)}
                      required
                    />
                    <input
                      id="mn33"
                      className="matrixNumber form-control mr-2"
                      type="number"
                      inputMode="numeric"
                      onInput={(event) => updateMatrix(index, 10, event)}
                      required
                    />
                    <input
                      id="mn34"
                      className="matrixNumber form-control mr-2"
                      type="number"
                      inputMode="numeric"
                      onInput={(event) => updateMatrix(index, 11, event)}
                      required
                    />
                  </div>
                  <ul></ul>
                  <div className="d-flex justify-content-between">
                    <input
                      id="mn41"
                      className="matrixNumber form-control mr-2"
                      type="number"
                      inputMode="numeric"
                      onInput={(event) => updateMatrix(index, 12, event)}
                      required
                    />
                    <input
                      id="mn42"
                      className="matrixNumber matrixNumber form-control mr-2"
                      type="number"
                      inputMode="numeric"
                      onInput={(event) => updateMatrix(index, 13, event)}
                      required
                    />
                    <input
                      id="mn43"
                      className="matrixNumber form-control mr-2"
                      type="number"
                      inputMode="numeric"
                      onInput={(event) => updateMatrix(index, 14, event)}
                      required
                    />
                    <input
                      id="mn44"
                      className="matrixNumber form-control mr-2"
                      type="number"
                      inputMode="numeric"
                      onInput={(event) => updateMatrix(index, 15, event)}
                      required
                    />
                  </div>
                </div>
                <ul></ul>
              </div>
            ))}
            <div className="ml-3">
              <div className="d-flex justify-content-between">
                <Button
                  title="Create Device"
                  variant="outline-secondary"
                  onClick={createDevice}
                >
                  Add Device
                </Button>
              </div>
            </div>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="outline-danger" onClick={closeSpectateConfigModal}>
              Cancel
            </Button>
            <Button
              title="Create"
              variant="outline-secondary"
              onClick={createSpectateConfig}
              disabled={createSpectateConfigBtnDisabled}
            >
              Create
            </Button>
          </Modal.Footer>
        </Modal>
      </div>

      <div>
        <Modal
          show={editSpectateConfigModal}
          onHide={closeEditSpectateConfigModal}
        >
          <Modal.Header>
            <h4 className="modal-title mr-4">Edit Spectate Configuration</h4>
          </Modal.Header>
          <Modal.Body>
            <label htmlFor="name">Spectate Configuration Name:</label>
            <div className="d-flex justify-content-between">
              <input
                id="configname"
                className="form-control mr-2"
                onInput={updateName}
                value={spectateConfigName!}
              />
            </div>

            <label className="mt-2">Devices:</label>

            {spectateConfigDevices.map((device, index) => (
              <div className="ml-3" key={index}>
                <hr />
                <label htmlFor="deviceId">Device ID:</label>
                {index === 0 ? (
                  <div className="d-flex justify-content-between">
                    <input
                      id="edit-main-deviceId"
                      className="form-control mr-2"
                      type="text"
                      placeholder="DeviceId"
                      value={device.deviceId}
                      readOnly
                    />
                  </div>
                ) : (
                  <div className="d-flex justify-content-between">
                    <input
                      id="edit-deviceId"
                      className="form-control mr-2"
                      type="text"
                      placeholder="DeviceId"
                      value={device.deviceId}
                      onInput={(event) => updateDeviceId(index, event)}
                    />
                    <button
                      type="button"
                      className="btn btn-sm"
                      title="Delete Device"
                      onClick={() => deleteDevice(index)}
                    >
                      <XIcon className="align-right" />
                    </button>
                  </div>
                )}
                <ul></ul>
                <div className="d-flex flex-column justify-content-between">
                  <label htmlFor="projectionMatrix">Projection Matrix:</label>
                  <div className="d-flex justify-content-between">
                    <input
                      id="edit-mn11"
                      className="matrixNumber form-control mr-2"
                      type="number"
                      inputMode="numeric"
                      required
                      value={getMatrixEntry(index, 0)}
                      onInput={(event) => updateMatrix(index, 0, event)}
                    />
                    <input
                      id="edit-mn12"
                      className="matrixNumber form-control mr-2"
                      type="number"
                      inputMode="numeric"
                      required
                      value={getMatrixEntry(index, 1)}
                      onInput={(event) => updateMatrix(index, 1, event)}
                    />
                    <input
                      id="edit-mn13"
                      className="matrixNumber form-control mr-2"
                      type="number"
                      inputMode="numeric"
                      required
                      value={getMatrixEntry(index, 2)}
                      onInput={(event) => updateMatrix(index, 2, event)}
                    />
                    <input
                      id="edit-mn14"
                      className="matrixNumber form-control mr-2"
                      type="number"
                      inputMode="numeric"
                      required
                      value={getMatrixEntry(index, 3)}
                      onInput={(event) => updateMatrix(index, 3, event)}
                    />
                  </div>
                  <ul></ul>
                  <div className="d-flex justify-content-between">
                    <input
                      id="edit-mn21"
                      className="matrixNumber form-control mr-2"
                      type="number"
                      inputMode="numeric"
                      required
                      value={getMatrixEntry(index, 4)}
                      onInput={(event) => updateMatrix(index, 4, event)}
                    />
                    <input
                      id="edit-mn22"
                      className="matrixNumber form-control mr-2"
                      type="number"
                      inputMode="numeric"
                      required
                      value={getMatrixEntry(index, 5)}
                      onInput={(event) => updateMatrix(index, 5, event)}
                    />
                    <input
                      id="edit-mn23"
                      className="matrixNumber form-control mr-2"
                      type="number"
                      inputMode="numeric"
                      required
                      value={getMatrixEntry(index, 6)}
                      onInput={(event) => updateMatrix(index, 6, event)}
                    />
                    <input
                      id="edit-mn24"
                      className="matrixNumber form-control mr-2"
                      type="number"
                      inputMode="numeric"
                      required
                      value={getMatrixEntry(index, 7)}
                      onInput={(event) => updateMatrix(index, 7, event)}
                    />
                  </div>
                  <ul></ul>
                  <div className="d-flex justify-content-between">
                    <input
                      id="edit-mn31"
                      className="matrixNumber form-control mr-2"
                      type="number"
                      inputMode="numeric"
                      required
                      value={getMatrixEntry(index, 8)}
                      onInput={(event) => updateMatrix(index, 8, event)}
                    />
                    <input
                      id="edit-mn32"
                      className="matrixNumber form-control mr-2"
                      type="number"
                      inputMode="numeric"
                      required
                      value={getMatrixEntry(index, 9)}
                      onInput={(event) => updateMatrix(index, 9, event)}
                    />
                    <input
                      id="edit-mn33"
                      className="matrixNumber form-control mr-2"
                      type="number"
                      inputMode="numeric"
                      required
                      value={getMatrixEntry(index, 10)}
                      onInput={(event) => updateMatrix(index, 10, event)}
                    />
                    <input
                      id="edit-mn34"
                      className="matrixNumber form-control mr-2"
                      type="number"
                      inputMode="numeric"
                      required
                      value={getMatrixEntry(index, 11)}
                      onInput={(event) => updateMatrix(index, 11, event)}
                    />
                  </div>
                  <ul></ul>
                  <div className="d-flex justify-content-between">
                    <input
                      id="edit-mn41"
                      className="matrixNumber form-control mr-2"
                      type="number"
                      inputMode="numeric"
                      required
                      value={getMatrixEntry(index, 12)}
                      onInput={(event) => updateMatrix(index, 12, event)}
                    />
                    <input
                      id="edit-mn42"
                      className="matrixNumber form-control mr-2"
                      type="number"
                      inputMode="numeric"
                      required
                      value={getMatrixEntry(index, 13)}
                      onInput={(event) => updateMatrix(index, 13, event)}
                    />
                    <input
                      id="edit-mn43"
                      className="matrixNumber form-control mr-2"
                      type="number"
                      inputMode="numeric"
                      required
                      value={getMatrixEntry(index, 14)}
                      onInput={(event) => updateMatrix(index, 14, event)}
                    />
                    <input
                      id="edit-mn44"
                      className="matrixNumber form-control mr-2"
                      type="number"
                      inputMode="numeric"
                      required
                      value={getMatrixEntry(index, 15)}
                      onInput={(event) => updateMatrix(index, 15, event)}
                    />
                  </div>
                </div>
                <ul></ul>
              </div>
            ))}

            <div className="ml-3">
              <div className="d-flex justify-content-between">
                <Button
                  title="Create Device"
                  variant="outline-secondary"
                  onClick={createDevice}
                >
                  Add Device
                </Button>
              </div>
            </div>
          </Modal.Body>
          <Modal.Footer>
            <Button
              title="Delete"
              style={{ marginRight: '228px' }}
              variant="outline-danger"
              onClick={deleteSpectateConfig}
            >
              Delete
            </Button>
            <Button
              variant="outline-danger"
              onClick={closeEditSpectateConfigModal}
            >
              Cancel
            </Button>
            <Button
              title="Update"
              variant="outline-secondary"
              onClick={updateSpectateConfig}
              disabled={createSpectateConfigBtnDisabled}
            >
              Update
            </Button>
          </Modal.Footer>
        </Modal>
      </div>

      <QRCodeModal show={qrCodeModal} onHide={() => setQrCodeModal(false)} />
    </>
  );
}
