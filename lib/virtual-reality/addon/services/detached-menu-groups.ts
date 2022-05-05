import Service, { inject as service } from '@ember/service';
import THREE from 'three';
import CloseIcon from '../utils/view-objects/vr/close-icon';
import { DetachableMenu } from '../utils/vr-menus/detachable-menu';
import DetachedMenuGroup from '../utils/vr-menus/detached-menu-group';
import { isMenuDetachedResponse, MenuDetachedResponse } from '../utils/vr-message/receivable/response/menu-detached';
import { isObjectClosedResponse, ObjectClosedResponse } from '../utils/vr-message/receivable/response/object-closed';
import VrAssetRepository from './vr-asset-repo';
import VrMessageReceiver from './vr-message-receiver';
import VrMessageSender from './vr-message-sender';

export default class DetachedMenuGroupsService extends Service {
  @service('vr-asset-repo')
  private assetRepo!: VrAssetRepository;

  @service('vr-message-receiver')
  private receiver!: VrMessageReceiver;

  @service('vr-message-sender')
  private sender!: VrMessageSender;

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
    // Notify backend about detached menu.
    const nonce = this.sender.sendMenuDetached(menu);

    // Wait for backend to assign an id to the detached menu.
    this.receiver.awaitResponse({
      nonce,
      responseType: isMenuDetachedResponse,
      onResponse: (response: MenuDetachedResponse) => {
        this.addDetachedMenuLocally(menu, response.objectId);
      },
      onOffline: () => {
        this.addDetachedMenuLocally(menu, null);
      },
    });
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
  addDetachedMenuLocally(menu: DetachableMenu, menuId: string | null) {
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

    // Make detached menu closable.
    // Since the menu has been scaled already and is not scaled when it has its
    // normal size, the close icon does not have to correct for the menu's scale.
    const closeIcon = new CloseIcon({
      textures: this.assetRepo.closeIconTextures,
      onClose: () => this.removeDetachedMenu(detachedMenuGroup),
      radius: 0.04,
    });
    closeIcon.addToObject(detachedMenuGroup);

    // Apply same position, rotation and scale as detached menu.
    detachedMenuGroup.position.copy(position);
    detachedMenuGroup.quaternion.copy(quaternion);
    detachedMenuGroup.scale.copy(scale);
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

    return new Promise((resolve) => {
      const nonce = this.sender.sendDetachedMenuClosed(menuId);
      this.receiver.awaitResponse({
        nonce,
        responseType: isObjectClosedResponse,
        onResponse: (response: ObjectClosedResponse) => {
          if (response.isSuccess) this.removeDetachedMenuLocally(detachedMenuGroup);
          resolve(response.isSuccess);
        },
        onOffline: () => {
          this.removeDetachedMenuLocally(detachedMenuGroup);
          resolve(true);
        },
      });
    });
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
