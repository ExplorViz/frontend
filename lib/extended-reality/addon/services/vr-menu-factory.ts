import { getOwner } from '@ember/application';
import Service, { inject as service } from '@ember/service';
import CollaborationSession from 'collaboration/services/collaboration-session';
import LocalUser from 'collaboration/services/local-user';
import RemoteUser from 'collaboration/utils/remote-user';
import ApplicationRepository from 'explorviz-frontend/services/repos/application-repository';
import TimestampService from 'explorviz-frontend/services/timestamp';
import HeatmapConfiguration from 'heatmap/services/heatmap-configuration';
import GrabbedObjectService from 'extended-reality/services/grabbed-object';
import { GrabbableObject } from 'extended-reality/utils/view-objects/interfaces/grabbable-object';
import { EntityMesh } from 'extended-reality/utils/vr-helpers/detail-info-composer';
import DisableInputMenu from 'extended-reality/utils/vr-menus/ui-less-menu/disable-input-menu';
import GrabMenu from 'extended-reality/utils/vr-menus/ui-less-menu/grab-menu';
import PingMenu from 'extended-reality/utils/vr-menus/ui-less-menu/ping-menu';
import ScaleMenu from 'extended-reality/utils/vr-menus/ui-less-menu/scale-menu';
import SharedScaleMenuState from 'extended-reality/utils/vr-menus/ui-less-menu/scale-menu/shared-state';
import CameraMenu from 'extended-reality/utils/vr-menus/ui-menu/camera-menu';
import ConnectionBaseMenu from 'extended-reality/utils/vr-menus/ui-menu/connection/base';
import JoinMenu from 'extended-reality/utils/vr-menus/ui-menu/connection/join-menu';
import SpectateMenu from 'extended-reality/utils/vr-menus/ui-menu/connection/spectate-menu';
import DetailInfoMenu from 'extended-reality/utils/vr-menus/ui-menu/detail-info-menu';
import HeatmapMenu from 'extended-reality/utils/vr-menus/ui-menu/heatmap-menu';
import HintMenu from 'extended-reality/utils/vr-menus/ui-menu/hud/hint-menu';
import MessageBoxMenu from 'extended-reality/utils/vr-menus/ui-menu/hud/message-box-menu';
import ResetMenu from 'extended-reality/utils/vr-menus/ui-menu/reset-menu';
import TimeMenu from 'extended-reality/utils/vr-menus/ui-menu/time-menu';
import ToolMenu from 'extended-reality/utils/vr-menus/ui-menu/tool-menu';
import ConnectingMenu from '../utils/vr-menus/ui-menu/connection/connecting-menu';
import OfflineMenu from '../utils/vr-menus/ui-menu/connection/offline-menu';
import MainMenu from '../utils/vr-menus/ui-menu/main-menu';
import SettingsMenu from '../utils/vr-menus/ui-menu/settings-menu';
import ZoomMenu from '../utils/vr-menus/ui-menu/zoom-menu';
import DetachedMenuGroupsService from './detached-menu-groups';
import SpectateUser from '../../../collaboration/addon/services/spectate-user';
import SearchMenu from 'extended-reality/utils/vr-menus/search-menu';
import { AuxiliaryScrollMenu } from 'extended-reality/utils/vr-menus/ui-menu/auxiliary-scroll-menu';
import DetailInfoScrollarea from 'extended-reality/utils/view-objects/vr/detail-info-scrollarea';
import VrRendering from 'extended-reality/components/vr-rendering';
import VRController from 'extended-reality/utils/vr-controller';
import SpectateViewMenu from 'extended-reality/utils/vr-menus/ui-menu/connection/spectate-view-menu';
import OnlineMenu2 from 'extended-reality/utils/vr-menus/ui-menu/connection/online-menu2';
import InteractiveMenu from 'extended-reality/utils/vr-menus/interactive-menu';
import MessageSender from 'collaboration/services/message-sender';
import RoomService from 'collaboration/services/room-service';

export default class VrMenuFactoryService extends Service {
  @service('detached-menu-groups')
  private detachedMenuGroups!: DetachedMenuGroupsService;

  @service('grabbed-object')
  private grabbedObjectService!: GrabbedObjectService;

  @service('local-user')
  private localUser!: LocalUser;

  @service('collaboration-session')
  private collaborationSession!: CollaborationSession;

  @service('spectate-user')
  private spectateUserService!: SpectateUser;

  @service('message-sender')
  private sender!: MessageSender;

  @service('room-service')
  private roomService!: RoomService;

  @service('timestamp')
  private timestampService!: TimestampService;

  @service('repos/application-repository')
  applicationRepo!: ApplicationRepository;

  @service('heatmap-configuration')
  heatmapConfiguration!: HeatmapConfiguration;

  // TODO the factory should no be a singleton, but instantiated on each rendering.
  scene!: THREE.Scene;

  renderer!: THREE.WebGLRenderer;

  buildMainMenu(): MainMenu {
    return new MainMenu({ menuFactory: this });
  }

  buildToolMenu(): ToolMenu {
    return new ToolMenu({ menuFactory: this });
  }

  // #region SETTINGS MENUS

  buildSettingsMenu(): SettingsMenu {
    return new SettingsMenu({
      labelGroups: [
        this.localUser.controller1?.labelGroup,
        this.localUser.controller2?.labelGroup,
      ],
      menuFactory: this,
    });
  }

  buildCameraMenu(): CameraMenu {
    return new CameraMenu({
      localUser: this.localUser,
      menuFactory: this,
    });
  }

  // #endregion SETTINGS MENUS

  // #region CONNECTION MENUS

  buildConnectionMenu(): ConnectionBaseMenu | InteractiveMenu {
    switch (this.collaborationSession.connectionStatus) {
      case 'connecting':
        return this.buildConnectingMenu();
      case 'online':
        return this.buildOnlineMenu();
      default:
        return this.buildOfflineMenu();
    }
  }

  buildOfflineMenu(): OfflineMenu {
    return new OfflineMenu({
      collaborationSession: this.collaborationSession,
      localUser: this.localUser,
      menuFactory: this,
    });
  }

  buildConnectingMenu(): ConnectingMenu {
    return new ConnectingMenu({
      collaborationSession: this.collaborationSession,
      localUser: this.localUser,
      menuFactory: this,
    });
  }

  // Got replaced by OnlineMenu2
  // buildOnlineMenu(): OnlineMenu {
  //   return new OnlineMenu({
  //     collaborationSession: this.collaborationSession,
  //     localUser: this.localUser,
  //     spectateUserService: this.spectateUserService,
  //     menuFactory: this,
  //   });
  // }

  buildOnlineMenu(): OnlineMenu2 {
    return new OnlineMenu2({
      owner: getOwner(this),
      renderer: this.renderer,
      scene: this.scene,
      menuFactory: this,
    });
  }

  buildJoinMenu(): JoinMenu {
    return new JoinMenu({
      collaborationSession: this.collaborationSession,
      localUser: this.localUser,
      roomService: this.roomService,
      menuFactory: this,
    });
  }

  buildTimeMenu(): TimeMenu {
    return new TimeMenu({
      timestampService: this.timestampService,
      menuFactory: this,
    });
  }

  buildSpectateMenu(remoteUser: RemoteUser): SpectateMenu {
    return new SpectateMenu({
      menuFactory: this,
      localUser: this.localUser,
      spectateUserService: this.spectateUserService,
      remoteUser,
    });
  }

  // #endregion CONNECTION MENUS

  // #region TOOL MENUS

  buildZoomMenu(): ZoomMenu {
    return new ZoomMenu({
      renderer: this.renderer,
      scene: this.scene,
      headsetCamera: this.localUser.camera,
      menuFactory: this,
    });
  }

  buildHeatmapMenu(): HeatmapMenu {
    return new HeatmapMenu({
      heatmapConfiguration: this.heatmapConfiguration,
      menuFactory: this,
    });
  }

  buildPingMenu(): PingMenu {
    return new PingMenu({
      scene: this.scene,
      sender: this.sender,
      menuFactory: this,
    });
  }

  buildInfoMenu(object: EntityMesh): DetailInfoMenu {
    return new DetailInfoMenu({
      owner: getOwner(this),
      object: object,
      renderer: this.renderer,
      menuFactory: this,
    });
  }

  buildAuxiliaryMenu(
    object: DetailInfoScrollarea,
    controller: VRController,
    renderer: VrRendering
  ): AuxiliaryScrollMenu {
    return new AuxiliaryScrollMenu({
      object: object,
      controller: controller,
      renderer: renderer,
      menuFactory: this,
    });
  }

  buildGrabMenu(grabbedObject: GrabbableObject): GrabMenu {
    return new GrabMenu({
      grabbedObject,
      grabbedObjectService: this.grabbedObjectService,
      menuFactory: this,
    });
  }

  buildScaleMenus(grabbedObject: GrabbableObject): {
    scaleMenu1: ScaleMenu;
    scaleMenu2: ScaleMenu;
  } {
    const sharedState = new SharedScaleMenuState(grabbedObject);
    return {
      scaleMenu1: new ScaleMenu({ sharedState, menuFactory: this }),
      scaleMenu2: new ScaleMenu({ sharedState, menuFactory: this }),
    };
  }

  buildSearchMenu(): SearchMenu {
    return new SearchMenu({
      owner: getOwner(this),
      renderer: this.renderer,
      menuFactory: this,
    });
  }

  buildSpectateViewMenu(userId: string): SpectateViewMenu {
    return new SpectateViewMenu({
      owner: getOwner(this),
      renderer: this.renderer,
      scene: this.scene,
      userId: userId,
      menuFactory: this,
    });
  }

  // #endregion TOOL MENUS

  // #region HUD MENUS

  buildHintMenu(title: string, text: string | undefined = undefined): HintMenu {
    return new HintMenu({ title, text, menuFactory: this });
  }

  buildMessageBoxMenu(args: {
    title: string;
    text?: string;
    color: string;
    time: number;
  }): MessageBoxMenu {
    return new MessageBoxMenu({
      menuFactory: this,
      ...args,
    });
  }

  // #endregion HUD MENUS

  // #region OTHER MENUS

  buildResetMenu(): ResetMenu {
    return new ResetMenu({
      owner: getOwner(this),
      online: this.collaborationSession.connectionStatus !== 'online',
      menuFactory: this,
      detachedMenuGroups: this.detachedMenuGroups,
    });
  }

  buildDisableInputMenu(): DisableInputMenu {
    return new DisableInputMenu({
      menuFactory: this,
    });
  }

  // #endregion OTHER MENUS
}

declare module '@ember/service' {
  interface Registry {
    'vr-menu-factory': VrMenuFactoryService;
  }
}
