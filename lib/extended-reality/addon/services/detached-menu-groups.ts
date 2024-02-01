import Service, { inject as service } from '@ember/service';
import CollaborationSession from 'collaboration/services/collaboration-session';
import HighlightingService from 'explorviz-frontend/services/highlighting-service';
import HeatmapConfiguration from 'heatmap/services/heatmap-configuration';
import * as THREE from 'three';
import ActionIcon from 'extended-reality/utils/view-objects/vr/action-icon';
import HeatmapMenu from 'extended-reality/utils/vr-menus/ui-menu/heatmap-menu';
import CloseIcon from '../utils/view-objects/vr/close-icon';
import { DetachableMenu } from '../utils/vr-menus/detachable-menu';
import DetachedMenuGroup from '../utils/vr-menus/detached-menu-group';
import VrAssetRepository from './vr-asset-repo';
import SpectateViewMenu from 'extended-reality/utils/vr-menus/ui-menu/connection/spectate-view-menu';
import WebSocketService from 'collaboration/services/web-socket';
import {
  MENU_DETACHED_EVENT,
  MenuDetachedMessage,
} from 'extended-reality/utils/vr-web-wocket-messages/sendable/request/menu-detached';
import {
  MenuDetachedResponse,
  isMenuDetachedResponse,
} from 'extended-reality/utils/vr-web-wocket-messages/receivable/response/menu-detached';
import {
  DETACHED_MENU_CLOSED_EVENT,
  DetachedMenuClosedMessage,
} from 'extended-reality/utils/vr-web-wocket-messages/sendable/request/detached-menu-closed';
import {
  ObjectClosedResponse,
  isObjectClosedResponse,
} from 'extended-reality/utils/vr-web-wocket-messages/receivable/response/object-closed';

export default class DetachedMenuGroupsService extends Service {
  @service('extended-reality@vr-asset-repo')
  private assetRepo!: VrAssetRepository;

  @service('web-socket')
  private webSocket!: WebSocketService;

  @service('collaboration-session')
  private collaborationSession!: CollaborationSession;

  @service('highlighting-service')
  private highlightingService!: HighlightingService;

  @service('heatmap-configuration')
  heatmapConf!: HeatmapConfiguration;

  private detachedMenuGroups: Set<DetachedMenuGroup>;

  private detachedMenuGroupsById: Map<string, DetachedMenuGroup>;

  readonly container: THREE.Group;

  constructor(properties?: object) {
    super(properties);

    this.detachedMenuGroups = new Set();
    this.detachedMenuGroupsById = new Map();

    this.container = new THREE.Group();
  }

  /**
   * Callback that is invoked by the timestamp service when a new landscape or timestamp is
   * selected.
   */
  updateLandscapeData() {
    this.removeAllDetachedMenusLocally();
  }

  /**
   * Gets the menu groups of all detached menus.
   */
  getDetachedMenus(): DetachedMenuGroup[] {
    return Array.from(this.detachedMenuGroups);
  }

  /**
   * Asks the backend for an id for the given menu and adds a detached menu
   * group for the menu. In offline mode, the menu is not assigned an id
   * but still detached.
   */
  addDetachedMenu(menu: DetachableMenu) {
    this.addDetachedMenuLocally(menu, null, null);
  }

  shareDetachedMenu(
    menuGroup: DetachedMenuGroup,
    icon: ActionIcon
  ): Promise<boolean> {
    const menu = menuGroup.currentMenu as DetachableMenu;
    const position = new THREE.Vector3();
    menu.getWorldPosition(position);

    const quaternion = new THREE.Quaternion();
    menu.getWorldQuaternion(quaternion);
    return this.webSocket.sendRespondableMessage<
      MenuDetachedMessage,
      MenuDetachedResponse
    >(
      MENU_DETACHED_EVENT,
      // Notify backend about detached menu.
      {
        event: 'menu_detached',
        detachId: menu.getDetachId(),
        entityType: menu.getEntityType(),
        position: position.toArray(),
        quaternion: quaternion.toArray(),
        scale: menu.scale.toArray(),
        nonce: 0, // will be overwritten
      },
      // Wait for backend to assign an id to the detached menu.
      {
        responseType: isMenuDetachedResponse,
        onResponse: (response: MenuDetachedResponse) => {
          const menuId = response.objectId;
          if (menuId) {
            const color = this.collaborationSession.getColor('');
            icon.material.color = new THREE.Color(color);
            menuGroup.menuId = menuId;
            if (menuId) this.detachedMenuGroupsById.set(menuId, menuGroup);
            return true;
          }
          return false;
        },
        onOffline: () => {
          // nothing to do
        },
      }
    );
  }

  /**
   * Updates all detached menus.
   */
  updateDetachedMenus(delta: number) {
    this.detachedMenuGroups.forEach((menuGroup) => menuGroup.updateMenu(delta));
  }

  /**
   * Adds a group for a detached menu to this container at the position and
   * with the same rotation and scale as the given menu.
   */
  addDetachedMenuLocally(
    menu: DetachableMenu,
    menuId: string | null,
    userId: string | null
  ) {
    // Remember the position, rotation and scale of the detached menu.
    const position = new THREE.Vector3();
    const quaternion = new THREE.Quaternion();
    const scale = new THREE.Vector3();
    menu.getWorldPosition(position);
    menu.getWorldQuaternion(quaternion);
    scale.copy(menu.scale);

    // Reset position, rotation and scale of detached menu.
    menu.position.set(0, 0, 0);
    menu.rotation.set(0, 0, 0);
    menu.scale.set(1, 1, 1);

    // Create menu group for the detached menu.
    const detachedMenuGroup = new DetachedMenuGroup({
      menu,
      menuId,
      detachedMenuGroups: this,
    });
    this.detachedMenuGroups.add(detachedMenuGroup);
    if (menuId) this.detachedMenuGroupsById.set(menuId, detachedMenuGroup);
    this.container.add(detachedMenuGroup);

    let color = 'white';
    if (userId) {
      color = this.collaborationSession.getColor(userId);
    }
    // Make detached menu closable.
    // Since the menu has been scaled already and is not scaled when it has its
    // normal size, the close icon does not have to correct for the menu's scale.
    const closeIcon = new CloseIcon({
      textures: this.assetRepo.closeIconTextures,
      onClose: () => this.removeDetachedMenu(detachedMenuGroup),
      radius: 0.04,
    });
    closeIcon.addToObject(detachedMenuGroup);

    if (menu instanceof HeatmapMenu) {
      const shareIcon: ActionIcon = new ActionIcon({
        textures: this.assetRepo.shareIconTextures,
        color: new THREE.Color(color),
        onAction: () => {
          this.heatmapConf.toggleShared();
          if (this.heatmapConf.heatmapShared) {
            shareIcon.material.color = new THREE.Color(
              this.collaborationSession.getColor('')
            );
          } else {
            shareIcon.material.color = new THREE.Color('white');
          }
          // shareIcon.updateColor();
          return Promise.resolve(true);
        },
        radius: 0.04,
      });
      shareIcon.addToObject(detachedMenuGroup);
      shareIcon.position.y -= 0.04;
      shareIcon.position.x -= 0.15;

      const metricIcon = new ActionIcon({
        textures: this.assetRepo.fireIconTextures,
        color: new THREE.Color(color),
        onAction: () => {
          this.heatmapConf.switchMetric();
          menu.redrawMenu();
          return Promise.resolve(true);
        },
        radius: 0.04,
      });
      metricIcon.addToObject(detachedMenuGroup);
      metricIcon.position.y -= 0.04;
      metricIcon.position.x -= 0.25;
    } else if (!(menu instanceof SpectateViewMenu)) {
      const shareIcon: ActionIcon = new ActionIcon({
        textures: this.assetRepo.shareIconTextures,
        color: new THREE.Color(color),
        onAction: () => this.shareDetachedMenu(detachedMenuGroup, shareIcon),
        radius: 0.04,
      });
      shareIcon.addToObject(detachedMenuGroup);
      // shareIcon.position.y -= 0.04;
      shareIcon.position.x -= 0.15;

      color = this.collaborationSession.getColor('');
      // highlight icon
      const highlightIcon = new ActionIcon({
        textures: this.assetRepo.paintbrushIconTextures,
        color: new THREE.Color(color),
        onAction: () => this.highlightComponent(menu.getDetachId()),
        radius: 0.04,
      });
      highlightIcon.addToObject(detachedMenuGroup);
      // highlightIcon.position.y -= 0.04;
      highlightIcon.position.x -= 0.25;
    }

    // Apply same position, rotation and scale as detached menu.
    detachedMenuGroup.position.copy(position);
    detachedMenuGroup.quaternion.copy(quaternion);
    detachedMenuGroup.scale.copy(scale);
  }

  highlightComponent(entityId: string): Promise<boolean> {
    return new Promise((resolve) => {
      this.highlightingService.highlightById(entityId);
      this.highlightingService.updateHighlighting();
      resolve(true);
    });
  }

  /**
   * Asks the backend to close the given detached menu. If the backend allows
   * the menu to be closed, the menu is removed.
   */
  removeDetachedMenu(detachedMenuGroup: DetachedMenuGroup): Promise<boolean> {
    // Remove the menu locally when it does not have an id (e.g., when we are
    // offline).
    const menuId = detachedMenuGroup.getGrabId();
    if (!menuId) {
      this.removeDetachedMenuLocally(detachedMenuGroup);
      return Promise.resolve(true);
    }

    return this.webSocket.sendRespondableMessage<
      DetachedMenuClosedMessage,
      ObjectClosedResponse
    >(
      DETACHED_MENU_CLOSED_EVENT,
      // Informs the backend that an detached menu was closed by this user.
      {
        event: 'detached_menu_closed',
        menuId,
        nonce: 0, // will be overwritten
      },
      // Close menu if backend responds with OK.
      {
        responseType: isObjectClosedResponse,
        onResponse: (response: ObjectClosedResponse) => {
          if (response.isSuccess) {
            this.removeDetachedMenuLocally(detachedMenuGroup);
          }
          return response.isSuccess;
        },
        onOffline: () => {
          this.removeDetachedMenuLocally(detachedMenuGroup);
        },
      }
    );
  }

  /**
   * Removes the detached menu with the given id.
   */
  removeDetachedMenuLocallyById(menuId: string) {
    const detachedMenuGroup = this.detachedMenuGroupsById.get(menuId);
    if (detachedMenuGroup) this.removeDetachedMenuLocally(detachedMenuGroup);
  }

  /**
   * Removes the given menu without asking the backend.
   */
  removeDetachedMenuLocally(detachedMenuGroup: DetachedMenuGroup) {
    // Notify the detached menu that it has been closed.
    detachedMenuGroup.closeAllMenus();

    // Remove the 3D object of the menu.
    this.container.remove(detachedMenuGroup);

    // Stop updating the menu.
    this.detachedMenuGroups.delete(detachedMenuGroup);

    // Remove association with the menu's id.
    const menuId = detachedMenuGroup.getGrabId();
    if (menuId) this.detachedMenuGroupsById.delete(menuId);
  }

  removeAllDetachedMenusLocally() {
    // Notify all detached menus that they have been closed.
    this.detachedMenuGroups.forEach((menuGroup) => menuGroup.closeAllMenus());

    this.container.remove(...this.detachedMenuGroups);
    this.detachedMenuGroups.clear();
    this.detachedMenuGroupsById.clear();
  }
}

declare module '@ember/service' {
  interface Registry {
    'detached-menu-groups': DetachedMenuGroupsService;
  }
}
