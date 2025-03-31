import { create } from 'zustand';
import * as THREE from 'three';
import { useCollaborationSessionStore } from 'explorviz-frontend/src/stores/collaboration/collaboration-session';
import { useLocalUserStore } from 'explorviz-frontend/src/stores/collaboration/local-user';
import RemoteUser from 'explorviz-frontend/src/utils/collaboration/remote-user';
import { useTimestampStore } from 'explorviz-frontend/src/stores/timestamp';
import { useHeatmapConfigurationStore } from 'explorviz-frontend/src/stores/heatmap/heatmap-configuration';
import { useGrabbedObjectStore } from 'explorviz-frontend/src/stores/extended-reality/grabbed-object';
import { GrabbableObject } from 'explorviz-frontend/src/utils/extended-reality/view-objects/interfaces/grabbable-object';
import { EntityMesh } from 'explorviz-frontend/src/utils/extended-reality/vr-helpers/detail-info-composer';
import DisableInputMenu from 'explorviz-frontend/src/utils/extended-reality/vr-menus/ui-less-menu/disable-input-menu';
import GrabMenu from 'explorviz-frontend/src/utils/extended-reality/vr-menus/ui-less-menu/grab-menu';
import PingMenu from 'explorviz-frontend/src/utils/extended-reality/vr-menus/ui-less-menu/ping-menu';
import ScaleMenu from 'explorviz-frontend/src/utils/extended-reality/vr-menus/ui-less-menu/scale-menu';
import SharedScaleMenuState from 'explorviz-frontend/src/utils/extended-reality/vr-menus/ui-less-menu/scale-menu/shared-state';
import CameraMenu from 'explorviz-frontend/src/utils/extended-reality/vr-menus/ui-menu/camera-menu';
import ConnectionBaseMenu from 'explorviz-frontend/src/utils/extended-reality/vr-menus/ui-menu/connection/base';
import JoinMenu from 'explorviz-frontend/src/utils/extended-reality/vr-menus/ui-menu/connection/join-menu';
import SpectateMenu from 'explorviz-frontend/src/utils/extended-reality/vr-menus/ui-menu/connection/spectate-menu';
import DetailInfoMenu from 'explorviz-frontend/src/utils/extended-reality/vr-menus/ui-menu/detail-info-menu';
import HeatmapMenu from 'explorviz-frontend/src/utils/extended-reality/vr-menus/ui-menu/heatmap-menu';
import HintMenu from 'explorviz-frontend/src/utils/extended-reality/vr-menus/ui-menu/hud/hint-menu';
import MessageBoxMenu from 'explorviz-frontend/src/utils/extended-reality/vr-menus/ui-menu/hud/message-box-menu';
import ResetMenu from 'explorviz-frontend/src/utils/extended-reality/vr-menus/ui-menu/reset-menu';
import TimeMenu from 'explorviz-frontend/src/utils/extended-reality/vr-menus/ui-menu/time-menu';
import ToolMenu from 'explorviz-frontend/src/utils/extended-reality/vr-menus/ui-menu/tool-menu';
import ConnectingMenu from 'explorviz-frontend/src/utils/extended-reality/vr-menus/ui-menu/connection/connecting-menu';
import OfflineMenu from 'explorviz-frontend/src/utils/extended-reality/vr-menus/ui-menu/connection/offline-menu';
import MainMenu from 'explorviz-frontend/src/utils/extended-reality/vr-menus/ui-menu/main-menu';
import SettingsMenu from 'explorviz-frontend/src/utils/extended-reality/vr-menus/ui-menu/settings-menu';
import ZoomMenu from 'explorviz-frontend/src/utils/extended-reality/vr-menus/ui-menu/zoom-menu';
import { useDetachedMenuGroupsStore } from './detached-menu-groups';
import { useSpectateUserStore } from 'explorviz-frontend/src/stores/collaboration/spectate-user';
import SearchMenu from 'explorviz-frontend/src/utils/extended-reality/vr-menus/search-menu';
import { AuxiliaryScrollMenu } from 'explorviz-frontend/src/utils/extended-reality/vr-menus/ui-menu/auxiliary-scroll-menu';
import DetailInfoScrollarea from 'explorviz-frontend/src/utils/extended-reality/view-objects/vr/detail-info-scrollarea';
import VrRendering from 'explorviz-frontend/src/components/extended-reality/vr-rendering';
import VRController from 'explorviz-frontend/src/utils/extended-reality/vr-controller';
import SpectateViewMenu from 'explorviz-frontend/src/utils/extended-reality/vr-menus/ui-menu/connection/spectate-view-menu';
import OnlineMenu2 from 'explorviz-frontend/src/utils/extended-reality/vr-menus/ui-menu/connection/online-menu2';
import InteractiveMenu from 'explorviz-frontend/src/utils/extended-reality/vr-menus/interactive-menu';
import { useMessageSenderStore } from 'explorviz-frontend/src/stores/collaboration/message-sender';
import { useRoomServiceStore } from 'explorviz-frontend/src/stores/collaboration/room-service';

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
    return new OfflineMenu({});
  },

  // TODO: Could be changed, because SettingsMenu should lose the service reference parameter
  buildConnectingMenu: (): ConnectingMenu => {
    return new ConnectingMenu({});
  },

  // TODO: Could be changed, because SettingsMenu should lose the service reference parameter
  buildOnlineMenu: (): OnlineMenu2 => {
    return new OnlineMenu2({
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
      headsetCamera: useLocalUserStore.getState().defaultCamera,
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
      renderer: get().renderer,
    });
  },

  // TODO: Could be changed, because SettingsMenu should lose the service reference parameter
  buildSpectateViewMenu: (userId: string): SpectateViewMenu => {
    return new SpectateViewMenu({
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
      online:
        useCollaborationSessionStore.getState().connectionStatus !== 'online',
    });
  },

  // TODO: Could be changed, because SettingsMenu should lose the service reference parameter
  buildDisableInputMenu: (): DisableInputMenu => {
    return new DisableInputMenu();
  },
}));
