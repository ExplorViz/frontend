import React, { useEffect, useState } from 'react';

import { RoomListRecord } from 'react-lib/src/utils/collaboration/room-payload/receivable/room-list';
import { useCollaborationSessionStore } from 'react-lib/src/stores/collaboration/collaboration-session';
import { useLocalUserStore } from 'react-lib/src/stores/collaboration/local-user';
import { useMessageSenderStore } from 'react-lib/src/stores/collaboration/message-sender';
import { useRoomServiceStore } from 'react-lib/src/stores/collaboration/room-service';
import { useSpectateUserStore } from 'react-lib/src/stores/collaboration/spectate-user';
import { useApplicationRendererStore } from 'react-lib/src/stores/application-renderer';
import { useAuthStore } from 'react-lib/src/stores/auth';
import {
  useLandscapeTokenStore,
  LandscapeToken,
} from 'react-lib/src/stores/landscape-token';
import { useLinkRendererStore } from 'react-lib/src/stores/link-renderer';
import { useUserSettingsStore } from 'react-lib/src/stores/user-settings';
import { useChatStore } from 'react-lib/src/stores/chat';
import { useApplicationRepositoryStore } from 'react-lib/src/stores/repos/application-repository';
import {
  useSpectateConfigurationStore,
  SpectateConfig,
} from 'react-lib/src/stores/spectate-configuration';
import { useToastHandlerStore } from 'react-lib/src/stores/toast-handler';

interface CollaborationControlsProps {}

export default function CollaborationControls({}: CollaborationControlsProps) {
  const localUserColor = useLocalUserStore((state) => state.color);
  const localUserName = useLocalUserStore((state) => state.userName);
  const localUserId = useLocalUserStore((state) => state.userId);
  const isLocalUserHost = useLocalUserStore((state) => state.isHost);
  const getAllRemoteUsers = useCollaborationSessionStore(
    (state) => state.getAllRemoteUsers
  );
  const collaborationSessionHost = useCollaborationSessionStore(
    (state) => state.hostRoom
  );
  const collaborationSessionDisconnect = useCollaborationSessionStore(
    (state) => state.disconnect
  );
  const collaborationSessionJoin = useCollaborationSessionStore(
    (state) => state.joinRoom
  );
  const lookupRemoteUserById = useCollaborationSessionStore(
    (state) => state.lookupRemoteUserById
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
  const retrieveLandscapeTokens = useLandscapeTokenStore(
    (state) => retrieveTokens
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
  const getAllLinks = useLinkRendererStore((state) => state.getAllLinks);
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
  const showInfoToastMessage = useToastHandlerStore(
    (state) => state.showInfoToastMessage
  );
  const showErrorToastMessage = useToastHandlerStore(
    (state) => state.showErrorToastMessage
  );

  const [rooms, setRooms] = useState<RoomListRecord[]>([]);
  const [deviceId, setDeviceId] = useState<string | null>(
    new URLSearchParams(window.location.search).get('deviceId')
  );
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

  const users = (() => {
    const users = [];
    if (localUserColor) {
      users.push({
        name: `${localUserName} (you)`,
        style: `color:#${localUserColor.getHexString()}`,
        isLocalUser: true,
        isSpectatable: false,
        isSpectatedByUs: false,
        isMuteable: false,
        isMuted: false,
        isKickable: false,
      });
    }
    const remoteUsers = Array.from(getAllRemoteUsers()).map((user) => {
      const isSpectatedByUs = spectatedUser?.userId === user.userId;
      return {
        remoteUserId: user.userId,
        name: user.userName,
        style: `color:#${user.color.getHexString()}`,
        isLocalUser: false,
        isSpectatedByUs: isSpectatedByUs,
        isSpectatable: true,
        isMuteable: isLocalUserHost,
        isMuted: false,
        isKickable: isLocalUserHost,
      };
    });

    return users.concat(remoteUsers);
  })();

  const hostRoom = () => {
    collaborationSessionHost();
    showSuccessToastMessage('Hosting new Room.');
  };

  const leaveSession = () => {
    showInfoToastMessage('Disconnected from Room');
    collaborationSessionDisconnect();
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
    collaborationSessionJoin(room.roomId);
  };

  const toggleSpectate = (user: {
    remoteUserId: string;
    isSpectatedByUs: boolean;
  }) => {
    const remoteUser = lookupRemoteUserById(user.remoteUserId);
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

    const remoteUserIds = Array.from(getAllRemoteUsers()).map(
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

    // TODO für Philipp
    // this.router.transitionTo('visualization', {
    //   queryParams: {
    //     landscapeToken: selectedToken,
    //     deviceId: 'default',
    //   },
    // });

    setSelectedConfig(config);

    selectedConfig!.devices.forEach((device) => {
      setConfigDevices((prev) => [...prev, device.deviceId]);
    });
  };

  const updateSelectedDevice = (device: string) => {
    setSelectedDevice(device);

    const selectedToken = new URLSearchParams(window.location.search).get(
      'landscapeToken'
    );

    // TODO für Philipp
    // this.router.transitionTo('visualization', {
    //   queryParams: {
    //     landscapeToken: selectedToken,
    //     deviceId: this.selectedDevice,
    //   },
    // });
  };

  const landscapeSelected = (event: any) => {
    setTokenByValue(event.target.value);

    // Cleanup old landscape
    useApplicationRendererStore.getState().cleanup();
    useApplicationRepositoryStore.getState().clearApplication();
    getAllLinks().forEach((externLink) => {
      externLink.removeFromParent();
    });

    // TODO für Philipp
    // this.router.transitionTo('visualization', {
    //   queryParams: {
    //     landscapeToken: event.target.value,
    //     deviceId: deviceId,
    //   },
    // });
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

  const updateName = (event: React.ChangeEvent<HTMLInputElement>) => {
    const target: HTMLInputElement = event.target as HTMLInputElement;
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

  const updateDeviceId = (index: number, event: React.SyntheticEvent) => {
    const target = event.target as HTMLInputElement;
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
    event: React.SyntheticEvent
  ) => {
    const target = event.target as HTMLInputElement;
    const newSpectateConfigDevices = [...spectateConfigDevices];
    const newProjectionMatrix = [
      ...newSpectateConfigDevices[index].projectionMatrix,
    ];
    newProjectionMatrix[matrixIndex] = Number(target.value);
    newSpectateConfigDevices[index] = {
      ...newSpectateConfigDevices[index],
      projectionMatrix: newProjectionMatrix,
    };
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

    // TODO für Philipp
    // this.router.transitionTo('visualization', {
    //   queryParams: {
    //     landscapeToken: selectedToken,
    //     deviceId: 'default',
    //   },
    // });
  };

  useEffect(() => {
    setMutedUsers(userIdMuteList || []);
    loadRooms(false);
  }, []);
}
