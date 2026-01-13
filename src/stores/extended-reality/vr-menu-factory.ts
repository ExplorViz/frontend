import { useCollaborationSessionStore } from 'explorviz-frontend/src/stores/collaboration/collaboration-session';
import { useLocalUserStore } from 'explorviz-frontend/src/stores/collaboration/local-user';
import RemoteUser from 'explorviz-frontend/src/utils/collaboration/remote-user';
import { GrabbableObject } from 'explorviz-frontend/src/utils/extended-reality/view-objects/interfaces/grabbable-object';
import DetailInfoScrollarea from 'explorviz-frontend/src/utils/extended-reality/view-objects/vr/detail-info-scrollarea';
import VRController from 'explorviz-frontend/src/utils/extended-reality/vr-controller';
import { EntityMesh } from 'explorviz-frontend/src/utils/extended-reality/vr-helpers/detail-info-composer';
import InteractiveMenu from 'explorviz-frontend/src/utils/extended-reality/vr-menus/interactive-menu';
import SearchMenu from 'explorviz-frontend/src/utils/extended-reality/vr-menus/search-menu';
import DisableInputMenu from 'explorviz-frontend/src/utils/extended-reality/vr-menus/ui-less-menu/disable-input-menu';
import GrabMenu from 'explorviz-frontend/src/utils/extended-reality/vr-menus/ui-less-menu/grab-menu';
import PingMenu from 'explorviz-frontend/src/utils/extended-reality/vr-menus/ui-less-menu/ping-menu';
import ScaleMenu from 'explorviz-frontend/src/utils/extended-reality/vr-menus/ui-less-menu/scale-menu';
import SharedScaleMenuState from 'explorviz-frontend/src/utils/extended-reality/vr-menus/ui-less-menu/scale-menu/shared-state';
import { AuxiliaryScrollMenu } from 'explorviz-frontend/src/utils/extended-reality/vr-menus/ui-menu/auxiliary-scroll-menu';
import CameraMenu from 'explorviz-frontend/src/utils/extended-reality/vr-menus/ui-menu/camera-menu';
import ConnectionBaseMenu from 'explorviz-frontend/src/utils/extended-reality/vr-menus/ui-menu/connection/base';
import ConnectingMenu from 'explorviz-frontend/src/utils/extended-reality/vr-menus/ui-menu/connection/connecting-menu';
import JoinMenu from 'explorviz-frontend/src/utils/extended-reality/vr-menus/ui-menu/connection/join-menu';
import OfflineMenu from 'explorviz-frontend/src/utils/extended-reality/vr-menus/ui-menu/connection/offline-menu';
import OnlineMenu2 from 'explorviz-frontend/src/utils/extended-reality/vr-menus/ui-menu/connection/online-menu2';
import SpectateMenu from 'explorviz-frontend/src/utils/extended-reality/vr-menus/ui-menu/connection/spectate-menu';
import SpectateViewMenu from 'explorviz-frontend/src/utils/extended-reality/vr-menus/ui-menu/connection/spectate-view-menu';
import DetailInfoMenu from 'explorviz-frontend/src/utils/extended-reality/vr-menus/ui-menu/detail-info-menu';
import HeatmapMenu from 'explorviz-frontend/src/utils/extended-reality/vr-menus/ui-menu/heatmap-menu';
import HintMenu from 'explorviz-frontend/src/utils/extended-reality/vr-menus/ui-menu/hud/hint-menu';
import MessageBoxMenu from 'explorviz-frontend/src/utils/extended-reality/vr-menus/ui-menu/hud/message-box-menu';
import MainMenu from 'explorviz-frontend/src/utils/extended-reality/vr-menus/ui-menu/main-menu';
import ResetMenu from 'explorviz-frontend/src/utils/extended-reality/vr-menus/ui-menu/reset-menu';
import SettingsMenu from 'explorviz-frontend/src/utils/extended-reality/vr-menus/ui-menu/settings-menu';
import TimeMenu from 'explorviz-frontend/src/utils/extended-reality/vr-menus/ui-menu/time-menu';
import ToolMenu from 'explorviz-frontend/src/utils/extended-reality/vr-menus/ui-menu/tool-menu';
import ZoomMenu from 'explorviz-frontend/src/utils/extended-reality/vr-menus/ui-menu/zoom-menu';
import * as THREE from 'three';
import { create } from 'zustand';

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

  buildSettingsMenu: (): SettingsMenu => {
    return new SettingsMenu({
      labelGroups: [
        useLocalUserStore.getState().controller1?.labelGroup,
        useLocalUserStore.getState().controller2?.labelGroup,
      ],
    });
  },

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

  buildOfflineMenu: (): OfflineMenu => {
    return new OfflineMenu({});
  },

  buildConnectingMenu: (): ConnectingMenu => {
    return new ConnectingMenu({});
  },

  buildOnlineMenu: (): OnlineMenu2 => {
    return new OnlineMenu2({
      renderer: get().renderer,
      scene: get().scene,
    });
  },

  buildJoinMenu: (): JoinMenu => {
    return new JoinMenu({});
  },

  buildTimeMenu: (): TimeMenu => {
    return new TimeMenu({});
  },

  buildSpectateMenu: (remoteUser: RemoteUser): SpectateMenu => {
    return new SpectateMenu({
      remoteUser,
    });
  },

  buildZoomMenu: (): ZoomMenu => {
    return new ZoomMenu({
      renderer: get().renderer,
      scene: get().scene,
      headsetCamera: useLocalUserStore.getState().defaultCamera,
    });
  },

  buildHeatmapMenu: (): HeatmapMenu => {
    return new HeatmapMenu({});
  },

  buildPingMenu: (): PingMenu => {
    return new PingMenu({
      scene: get().scene,
    });
  },

  buildInfoMenu: (object: EntityMesh): DetailInfoMenu => {
    return new DetailInfoMenu({
      object: object,
      renderer: get().renderer,
    });
  },

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

  buildSearchMenu: (): SearchMenu => {
    return new SearchMenu({
      renderer: get().renderer,
    });
  },

  buildSpectateViewMenu: (userId: string): SpectateViewMenu => {
    return new SpectateViewMenu({
      renderer: get().renderer,
      scene: get().scene,
      userId: userId,
    });
  },

  buildHintMenu: (
    title: string,
    text: string | undefined = undefined
  ): HintMenu => {
    return new HintMenu({ title, text });
  },

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

  buildResetMenu: (): ResetMenu => {
    return new ResetMenu({
      online:
        useCollaborationSessionStore.getState().connectionStatus !== 'online',
    });
  },

  buildDisableInputMenu: (): DisableInputMenu => {
    return new DisableInputMenu();
  },
}));
