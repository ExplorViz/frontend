import { create } from 'zustand';
import * as THREE from 'three';
import { useCollaborationSessionStore } from 'react-lib/src/stores/collaboration/collaboration-session';
import { useLocalUserStore } from 'react-lib/src/stores/collaboration/local-user';
import RemoteUser from 'react-lib/src/utils/collaboration/remote-user';
import { useTimestampStore } from 'react-lib/src/stores/timestamp';
import { useHeatmapConfigurationStore } from 'react-lib/src/stores/heatmap/heatmap-configuration';
import { useGrabbedObjectStore } from 'react-lib/src/stores/extended-reality/grabbed-object';
import { GrabbableObject } from 'react-lib/src/utils/extended-reality/view-objects/interfaces/grabbable-object';
import { EntityMesh } from 'react-lib/src/utils/extended-reality/vr-helpers/detail-info-composer';
import DisableInputMenu from 'react-lib/src/utils/extended-reality/vr-menus/ui-less-menu/disable-input-menu';
import GrabMenu from 'react-lib/src/utils/extended-reality/vr-menus/ui-less-menu/grab-menu';
import PingMenu from 'react-lib/src/utils/extended-reality/vr-menus/ui-less-menu/ping-menu';
import ScaleMenu from 'react-lib/src/utils/extended-reality/vr-menus/ui-less-menu/scale-menu';
import SharedScaleMenuState from 'react-lib/src/utils/extended-reality/vr-menus/ui-less-menu/scale-menu/shared-state';
import CameraMenu from 'react-lib/src/utils/extended-reality/vr-menus/ui-menu/camera-menu';
import ConnectionBaseMenu from 'react-lib/src/utils/extended-reality/vr-menus/ui-menu/connection/base';
import JoinMenu from 'react-lib/src/utils/extended-reality/vr-menus/ui-menu/connection/join-menu';
import SpectateMenu from 'react-lib/src/utils/extended-reality/vr-menus/ui-menu/connection/spectate-menu';
import DetailInfoMenu from 'react-lib/src/utils/extended-reality/vr-menus/ui-menu/detail-info-menu';
import HeatmapMenu from 'react-lib/src/utils/extended-reality/vr-menus/ui-menu/heatmap-menu';
import HintMenu from 'react-lib/src/utils/extended-reality/vr-menus/ui-menu/hud/hint-menu';
import MessageBoxMenu from 'react-lib/src/utils/extended-reality/vr-menus/ui-menu/hud/message-box-menu';
import ResetMenu from 'react-lib/src/utils/extended-reality/vr-menus/ui-menu/reset-menu';
import TimeMenu from 'react-lib/src/utils/extended-reality/vr-menus/ui-menu/time-menu';
import ToolMenu from 'react-lib/src/utils/extended-reality/vr-menus/ui-menu/tool-menu';
import ConnectingMenu from 'react-lib/src/utils/extended-reality/vr-menus/ui-menu/connection/connecting-menu';
import OfflineMenu from 'react-lib/src/utils/extended-reality/vr-menus/ui-menu/connection/offline-menu';
import MainMenu from 'react-lib/src/utils/extended-reality/vr-menus/ui-menu/main-menu';
import SettingsMenu from 'react-lib/src/utils/extended-reality/vr-menus/ui-menu/settings-menu';
import ZoomMenu from 'react-lib/src/utils/extended-reality/vr-menus/ui-menu/zoom-menu';
import { useDetachedMenuGroupsStore } from './detached-menu-groups';
import { useSpectateUserStore } from 'react-lib/src/stores/collaboration/spectate-user';
import SearchMenu from 'react-lib/src/utils/extended-reality/vr-menus/search-menu';
import { AuxiliaryScrollMenu } from 'react-lib/src/utils/extended-reality/vr-menus/ui-menu/auxiliary-scroll-menu';
import DetailInfoScrollarea from 'react-lib/src/utils/extended-reality/view-objects/vr/detail-info-scrollarea';
import VrRendering from 'react-lib/src/components/extended-reality/vr-rendering';
import VRController from 'react-lib/src/utils/extended-reality/vr-controller';
import SpectateViewMenu from 'react-lib/src/utils/extended-reality/vr-menus/ui-menu/connection/spectate-view-menu';
import OnlineMenu2 from 'react-lib/src/utils/extended-reality/vr-menus/ui-menu/connection/online-menu2';
import InteractiveMenu from 'react-lib/src/utils/extended-reality/vr-menus/interactive-menu';
import { useMessageSenderStore } from 'react-lib/src/stores/collaboration/message-sender';
import { useRoomServiceStore } from 'react-lib/src/stores/collaboration/room-service';

interface VrMenuFactoryState {
  scene: THREE.Scene;
  renderer: THREE.WebGLRenderer;
  buildMainMenu: () => MainMenu;
  buildToolMenu: () => ToolMenu;
  buildSettingsMenu: () => SettingsMenu;
  buildCameraMenu: () => CameraMenu;
  buildConnectionMenu: () => ConnectionBaseMenu | InteractiveMenu;
  buildOfflineMenu: () => OfflineMenu;
  buildConnectingMenu: () => ConnectingMenu;
  buildOnlineMenu: () => OnlineMenu2;
  buildJoinMenu: () => JoinMenu;
  buildTimeMenu: () => TimeMenu;
  buildSpectateMenu: (remoteUser: RemoteUser) => SpectateMenu;
  buildZoomMenu: () => ZoomMenu;
  buildHeatmapMenu: () => HeatmapMenu;
  buildPingMenu: () => PingMenu;
  buildInfoMenu: (object: EntityMesh) => DetailInfoMenu;
  buildAuxiliaryMenu: (
    object: DetailInfoScrollarea,
    controller: VRController,
    grabIntersectedObject: (controller: VRController) => void
  ) => AuxiliaryScrollMenu;
  buildGrabMenu: (grabbedObject: GrabbableObject) => GrabMenu;
  buildScaleMenus: (grabbedObject: GrabbableObject) => {
    scaleMenu1: ScaleMenu;
    scaleMenu2: ScaleMenu;
  };
  buildSearchMenu: () => SearchMenu;
  buildSpectateViewMenu: (userId: string) => SpectateViewMenu;
  buildHintMenu: (title: string, text: string | undefined) => HintMenu;
  buildMessageBoxMenu: (args: {
    title: string;
    text?: string;
    color: string;
    time: number;
  }) => MessageBoxMenu;
  buildResetMenu: () => ResetMenu;
  buildDisableInputMenu: () => DisableInputMenu;
  setScene: (value: THREE.Scene) => void;
  setRenderer: (value: THREE.WebGLRenderer) => void;
}

export const useVrMenuFactoryStore = create<VrMenuFactoryState>((set, get) => ({
  scene: new THREE.Scene(),
  renderer: new THREE.WebGLRenderer(),

  setScene: (value: THREE.Scene) => {
    set({ scene: value });
  },

  setRenderer: (value: THREE.WebGLRenderer) => {
    set({ renderer: value });
  },

  buildMainMenu: (): MainMenu => {
    //TODO: look into why any args are needed. Previously:
    // return new MainMenu({ menuFactory: this });
    return new MainMenu({});
  },

  buildToolMenu: (): ToolMenu => {
    return new ToolMenu();
  },

  // TODO: Could be changed, because SettingsMenu should lose the service reference parameter
  buildSettingsMenu: (): SettingsMenu => {
    return new SettingsMenu({
      labelGroups: [
        useLocalUserStore.getState().controller1?.labelGroup,
        useLocalUserStore.getState().controller2?.labelGroup,
      ],
    });
  },

  // TODO: Could be changed, because SettingsMenu should lose the service reference parameter
  buildCameraMenu: (): CameraMenu => {
    //TODO: look into why any args are needed. Previously:
    // return new CameraMenu({
    //   localUser: useLocalUserStore,
    //   menuFactory: this,
    // });
    return new CameraMenu({});
  },

  buildConnectionMenu: (): ConnectionBaseMenu | InteractiveMenu => {
    switch (useCollaborationSessionStore.getState().connectionStatus) {
      case 'connecting':
        return get().buildConnectingMenu();
      case 'online':
        return get().buildOnlineMenu();
      default:
        return get().buildOfflineMenu();
    }
  },

  // TODO: Could be changed, because SettingsMenu should lose the service reference parameter
  buildOfflineMenu: (): OfflineMenu => {
    //TODO: look into why any args are needed. Previously:
    // return new OfflineMenu({
    //   collaborationSession: useCollaborationSessionStore,
    //   localUser: useLocalUserStore,
    //   menuFactory: this,
    // });
    return new OfflineMenu({});
  },

  // TODO: Could be changed, because SettingsMenu should lose the service reference parameter
  buildConnectingMenu: (): ConnectingMenu => {
    //TODO: look into why any args are needed. Previously:
    // return new ConnectingMenu({
    //   collaborationSession: useCollaborationSessionStore,
    //   localUser: useLocalUserStore,
    //   menuFactory: this,
    // });
    return new ConnectingMenu({});
  },

  // TODO: Could be changed, because SettingsMenu should lose the service reference parameter
  buildOnlineMenu: (): OnlineMenu2 => {
    return new OnlineMenu2({
      owner: getOwner(this),
      renderer: get().renderer,
      scene: get().scene,
    });
  },

  // TODO: Could be changed, because SettingsMenu should lose the service reference parameter
  buildJoinMenu: (): JoinMenu => {
    //TODO: look into why any args are needed. Previously:
    // return new JoinMenu({
    //   collaborationSession: useCollaborationSessionStore,
    //   localUser: useLocalUserStore,
    //   roomService: useRoomServiceStore,
    //   menuFactory: this,
    // });
    return new JoinMenu({});
  },

  // TODO: Could be changed, because SettingsMenu should lose the service reference parameter
  buildTimeMenu: (): TimeMenu => {
    //TODO: look into why any args are needed. Previously:
    // return new TimeMenu({
    //   timestampService: useTimestampStore,
    //   menuFactory: this,
    // });
    return new TimeMenu({});
  },

  // TODO: Could be changed, because SettingsMenu should lose the service reference parameter
  buildSpectateMenu: (remoteUser: RemoteUser): SpectateMenu => {
    return new SpectateMenu({
      remoteUser,
    });
  },

  // TODO: Could be changed, because SettingsMenu should lose the service reference parameter
  buildZoomMenu: (): ZoomMenu => {
    return new ZoomMenu({
      renderer: get().renderer,
      scene: get().scene,
      headsetCamera: useLocalUserStore.getState().camera,
    });
  },

  // TODO: Could be changed, because SettingsMenu should lose the service reference parameter
  buildHeatmapMenu: (): HeatmapMenu => {
    //TODO: look into why any args are needed. Previously:
    // return new HeatmapMenu({
    //   heatmapConfiguration: useHeatmapConfigurationStore,
    //   menuFactory: this,
    // });
    return new HeatmapMenu({});
  },

  // TODO: Could be changed, because SettingsMenu should lose the service reference parameter
  buildPingMenu: (): PingMenu => {
    return new PingMenu({
      scene: get().scene,
    });
  },

  // TODO: Could be changed, because SettingsMenu should lose the service reference parameter
  buildInfoMenu: (object: EntityMesh): DetailInfoMenu => {
    return new DetailInfoMenu({
      owner: getOwner(this), // TODO: How to to owner-things here?
      object: object,
      renderer: get().renderer,
    });
  },

  // TODO: Could be changed, because SettingsMenu should lose the service reference parameter
  buildAuxiliaryMenu: (
    object: DetailInfoScrollarea,
    controller: VRController,
    grabIntersectedObject: (controller: VRController) => void
  ): AuxiliaryScrollMenu => {
    return new AuxiliaryScrollMenu({
      object: object,
      controller: controller,
      grabIntersectedObject: grabIntersectedObject,
    });
  },

  // TODO: Could be changed, because SettingsMenu should lose the service reference parameter
  buildGrabMenu: (grabbedObject: GrabbableObject): GrabMenu => {
    return new GrabMenu({
      grabbedObject,
    });
  },

  buildScaleMenus: (
    grabbedObject: GrabbableObject
  ): {
    scaleMenu1: ScaleMenu;
    scaleMenu2: ScaleMenu;
  } => {
    const sharedState = new SharedScaleMenuState(grabbedObject);
    return {
      scaleMenu1: new ScaleMenu({ sharedState }),
      scaleMenu2: new ScaleMenu({ sharedState }),
    };
  },

  // TODO: Could be changed, because SettingsMenu should lose the service reference parameter
  buildSearchMenu: (): SearchMenu => {
    return new SearchMenu({
      owner: getOwner(this), // TODO: How to do owner-things here?
      renderer: get().renderer,
    });
  },

  // TODO: Could be changed, because SettingsMenu should lose the service reference parameter
  buildSpectateViewMenu: (userId: string): SpectateViewMenu => {
    return new SpectateViewMenu({
      owner: getOwner(this), // TODO: How to do owner-things here?
      renderer: get().renderer,
      scene: get().scene,
      userId: userId,
    });
  },

  // TODO: Could be changed, because SettingsMenu should lose the service reference parameter
  buildHintMenu: (
    title: string,
    text: string | undefined = undefined
  ): HintMenu => {
    return new HintMenu({ title, text });
  },

  // TODO: Could be changed, because SettingsMenu should lose the service reference parameter
  buildMessageBoxMenu: (args: {
    title: string;
    text?: string;
    color: string;
    time: number;
  }): MessageBoxMenu => {
    return new MessageBoxMenu({
      ...args,
    });
  },

  // TODO: Could be changed, because SettingsMenu should lose the service reference parameter
  buildResetMenu: (): ResetMenu => {
    return new ResetMenu({
      owner: getOwner(this), // TODO: How to do owner-things here?
      online:
        useCollaborationSessionStore.getState().connectionStatus !== 'online',
    });
  },

  // TODO: Could be changed, because SettingsMenu should lose the service reference parameter
  buildDisableInputMenu: (): DisableInputMenu => {
    return new DisableInputMenu();
  },
}));
