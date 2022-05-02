import Service, { inject as service } from '@ember/service';
import CollaborationSession from 'collaborative-mode/services/collaboration-session';
import LocalUser from 'collaborative-mode/services/local-user';
import ApplicationRenderer from 'explorviz-frontend/services/application-renderer';
import LandscapeRenderer from 'explorviz-frontend/services/landscape-renderer';
import TimestampService from 'explorviz-frontend/services/timestamp';
import DeltaTimeService from 'virtual-reality/services/delta-time';
import GrabbedObjectService from 'virtual-reality/services/grabbed-object';
import VrMessageSender from 'virtual-reality/services/vr-message-sender';
import { GrabbableObject } from 'virtual-reality/utils/view-objects/interfaces/grabbable-object';
import { EntityMesh } from 'virtual-reality/utils/vr-helpers/detail-info-composer';
import DisableInputMenu from 'virtual-reality/utils/vr-menus/ui-less-menu/disable-input-menu';
import GrabMenu from 'virtual-reality/utils/vr-menus/ui-less-menu/grab-menu';
import PingMenu from 'virtual-reality/utils/vr-menus/ui-less-menu/ping-menu';
import ScaleMenu from 'virtual-reality/utils/vr-menus/ui-less-menu/scale-menu';
import SharedScaleMenuState from 'virtual-reality/utils/vr-menus/ui-less-menu/scale-menu/shared-state';
import CameraMenu from 'virtual-reality/utils/vr-menus/ui-menu/camera-menu';
import ConnectionBaseMenu from 'virtual-reality/utils/vr-menus/ui-menu/connection/base';
import JoinMenu from 'virtual-reality/utils/vr-menus/ui-menu/connection/join-menu';
import SpectateMenu from 'virtual-reality/utils/vr-menus/ui-menu/connection/spectate-menu';
import DetailInfoMenu from 'virtual-reality/utils/vr-menus/ui-menu/detail-info-menu';
import HintMenu from 'virtual-reality/utils/vr-menus/ui-menu/hud/hint-menu';
import MessageBoxMenu from 'virtual-reality/utils/vr-menus/ui-menu/hud/message-box-menu';
import ResetMenu from 'virtual-reality/utils/vr-menus/ui-menu/reset-menu';
import TimeMenu from 'virtual-reality/utils/vr-menus/ui-menu/time-menu';
import ToolMenu from 'virtual-reality/utils/vr-menus/ui-menu/tool-menu';
import RemoteVrUser from 'virtual-reality/utils/vr-multi-user/remote-vr-user';
import ConnectingMenu from '../utils/vr-menus/ui-menu/connection/connecting-menu';
import OfflineMenu from '../utils/vr-menus/ui-menu/connection/offline-menu';
import OnlineMenu from '../utils/vr-menus/ui-menu/connection/online-menu';
import MainMenu from '../utils/vr-menus/ui-menu/main-menu';
import SettingsMenu from '../utils/vr-menus/ui-menu/settings-menu';
import ZoomMenu from '../utils/vr-menus/ui-menu/zoom-menu';
import DetachedMenuGroupsService from './detached-menu-groups';
import RemoteVrUserService from './remote-vr-users';
import SpectateUserService from './spectate-user';
import VrRoomService from './vr-room';

export default class VrMenuFactoryService extends Service {
  @service('delta-time')
  private deltaTimeService!: DeltaTimeService;

  @service('detached-menu-groups')
  private detachedMenuGroups!: DetachedMenuGroupsService;

  @service('grabbed-object')
  private grabbedObjectService!: GrabbedObjectService;

  @service('local-user')
  private localUser!: LocalUser;

  @service('collaboration-session')
  private collaborationSession!: CollaborationSession;

  @service('remote-vr-users')
  private remoteUsers!: RemoteVrUserService;

  @service('spectate-user')
  private spectateUserService!: SpectateUserService;

  @service('application-renderer')
  private applicationRenderer!: ApplicationRenderer;

  @service('landscape-renderer')
  private landscapeRenderer!: LandscapeRenderer;

  @service('vr-message-sender')
  private sender!: VrMessageSender;

  @service('vr-room')
  private roomService!: VrRoomService;

  @service('timestamp')
  private timestampService!: TimestampService;

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

  buildConnectionMenu(): ConnectionBaseMenu {
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

  buildOnlineMenu(): OnlineMenu {
    return new OnlineMenu({
      collaborationSession: this.collaborationSession,
      localUser: this.localUser,
      remoteUsers: this.remoteUsers,
      spectateUserService: this.spectateUserService,
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

  buildSpectateMenu(remoteUser: RemoteVrUser): SpectateMenu {
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
      headsetCamera: this.localUser.defaultCamera,
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
    return new DetailInfoMenu({ object, menuFactory: this });
  }

  buildGrabMenu(grabbedObject: GrabbableObject): GrabMenu {
    return new GrabMenu({
      grabbedObject,
      grabbedObjectService: this.grabbedObjectService,
      deltaTimeService: this.deltaTimeService,
      menuFactory: this,
    });
  }

  buildScaleMenus(
    grabbedObject: GrabbableObject,
  ): { scaleMenu1: ScaleMenu; scaleMenu2: ScaleMenu } {
    const sharedState = new SharedScaleMenuState(grabbedObject);
    return {
      scaleMenu1: new ScaleMenu({ sharedState, menuFactory: this }),
      scaleMenu2: new ScaleMenu({ sharedState, menuFactory: this }),
    };
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
      localUser: this.localUser,
      online: this.collaborationSession.connectionStatus !== 'online',
      applicationRenderer: this.applicationRenderer,
      landscapeRenderer: this.landscapeRenderer,
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
