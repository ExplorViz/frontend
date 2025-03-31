import { create } from 'zustand';
import { useCollaborationSessionStore } from 'explorviz-frontend/src/stores/collaboration/collaboration-session';
import { useHighlightingStore } from 'explorviz-frontend/src/stores/highlighting';
import * as THREE from 'three';
import ActionIcon from 'explorviz-frontend/src/utils/extended-reality/view-objects/vr/action-icon';
import HeatmapMenu from 'explorviz-frontend/src/utils/extended-reality/vr-menus/ui-menu/heatmap-menu';
import CloseIcon from 'explorviz-frontend/src/utils/extended-reality/view-objects/vr/close-icon';
import { DetachableMenu } from 'explorviz-frontend/src/utils/extended-reality/vr-menus/detachable-menu';
import DetachedMenuGroup from 'explorviz-frontend/src/utils/extended-reality/vr-menus/detached-menu-group';
import { useVrAssetRepoStore } from './vr-asset-repo';
import SpectateViewMenu from 'explorviz-frontend/src/utils/extended-reality/vr-menus/ui-menu/connection/spectate-view-menu';
import { useWebSocketStore } from 'explorviz-frontend/src/stores/collaboration/web-socket';
import {
  MENU_DETACHED_EVENT,
  MenuDetachedMessage,
} from 'explorviz-frontend/src/utils/extended-reality/vr-web-wocket-messages/sendable/request/menu-detached';
import {
  MenuDetachedResponse,
  isMenuDetachedResponse,
} from 'explorviz-frontend/src/utils/extended-reality/vr-web-wocket-messages/receivable/response/menu-detached';
import {
  DETACHED_MENU_CLOSED_EVENT,
  DetachedMenuClosedMessage,
} from 'explorviz-frontend/src/utils/extended-reality/vr-web-wocket-messages/sendable/request/detached-menu-closed';
import {
  ObjectClosedResponse,
  isObjectClosedResponse,
} from 'explorviz-frontend/src/utils/extended-reality/vr-web-wocket-messages/receivable/response/object-closed';
import { useHeatmapConfigurationStore } from 'explorviz-frontend/src/stores/heatmap/heatmap-configuration';

interface DetachedMenuGroupsState {
  detachedMenuGroups: Set<DetachedMenuGroup>;
  detachedMenuGroupsById: Map<string, DetachedMenuGroup>;
  readonly container: THREE.Group;
  updateLandscapeData: () => void;
  getDetachedMenus: () => DetachedMenuGroup[];
  addDetachedMenu: (menu: DetachableMenu) => void;
  shareDetachedMenu: (
    menuGroup: DetachedMenuGroup,
    icon: ActionIcon
  ) => Promise<boolean>;
  updateDetachedMenus: (delta: number) => void;
  addDetachedMenuLocally: (
    menu: DetachableMenu,
    menuId: string | null,
    userId: string | null
  ) => void;
  toggleHighlightComponent: (entityId: string) => Promise<boolean>;
  removeDetachedMenu: (
    detachedMenuGroup: DetachedMenuGroup
  ) => Promise<boolean>;
  removeDetachedMenuLocallyById: (menuId: string) => void;
  removeDetachedMenuLocally: (detachedMenuGroup: DetachedMenuGroup) => void;
  removeAllDetachedMenusLocally: () => void;
}

export const useDetachedMenuGroupsStore = create<DetachedMenuGroupsState>(
  (set, get) => ({
    detachedMenuGroups: new Set(),
    detachedMenuGroupsById: new Map(),
    container: new THREE.Group(),

    /**
     * Callback that is invoked by the timestamp service when a new landscape or timestamp is
     * selected.
     */
    updateLandscapeData: () => {
      get().removeAllDetachedMenusLocally();
    },

    /**
     * Gets the menu groups of all detached menus.
     */
    getDetachedMenus: (): DetachedMenuGroup[] => {
      return Array.from(get().detachedMenuGroups);
    },

    /**
     * Asks the backend for an id for the given menu and adds a detached menu
     * group for the menu. In offline mode, the menu is not assigned an id
     * but still detached.
     */
    addDetachedMenu: (menu: DetachableMenu) => {
      get().addDetachedMenuLocally(menu, null, null);
    },

    shareDetachedMenu: (
      menuGroup: DetachedMenuGroup,
      icon: ActionIcon
    ): Promise<boolean> => {
      const menu = menuGroup.currentMenu as DetachableMenu;
      const position = new THREE.Vector3();
      menu.getWorldPosition(position);

      const quaternion = new THREE.Quaternion();
      menu.getWorldQuaternion(quaternion);
      return useWebSocketStore
        .getState()
        .sendRespondableMessage<MenuDetachedMessage, MenuDetachedResponse>(
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
                const color = useCollaborationSessionStore
                  .getState()
                  .getColor('');
                icon.material.color = new THREE.Color(color);
                menuGroup.menuId = menuId;
                if (menuId) {
                  const newDetachedMenuGroupsById =
                    get().detachedMenuGroupsById;
                  newDetachedMenuGroupsById.set(menuId, menuGroup);
                  set({ detachedMenuGroupsById: newDetachedMenuGroupsById });
                }
                return true;
              }
              return false;
            },
            onOffline: () => {
              // nothing to do
            },
          }
        );
    },

    /**
     * Updates all detached menus.
     */
    updateDetachedMenus: (delta: number) => {
      get().detachedMenuGroups.forEach((menuGroup) =>
        menuGroup.updateMenu(delta)
      ); // TODO: Does this need to be set again?
    },

    /**
     * Adds a group for a detached menu to this container at the position and
     * with the same rotation and scale as the given menu.
     */
    addDetachedMenuLocally: (
      menu: DetachableMenu,
      menuId: string | null,
      userId: string | null
    ) => {
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
        // TODO: Change call because of store reference?
        menu,
        menuId,
      });
      const newDetachedMenuGroups = get().detachedMenuGroups;
      const newDetachedMenuGroupsById = get().detachedMenuGroupsById;
      const newContainer = get().container;
      newDetachedMenuGroups.add(detachedMenuGroup);
      if (menuId) newDetachedMenuGroupsById.set(menuId, detachedMenuGroup);
      newContainer.add(detachedMenuGroup);
      set({
        detachedMenuGroups: newDetachedMenuGroups,
        detachedMenuGroupsById: newDetachedMenuGroupsById,
        container: newContainer,
      });

      let color = 'white';
      if (userId) {
        color = useCollaborationSessionStore.getState().getColor(userId);
      }
      // Make detached menu closable.
      // Since the menu has been scaled already and is not scaled when it has its
      // normal size, the close icon does not have to correct for the menu's scale.
      const closeIcon = new CloseIcon({
        textures: useVrAssetRepoStore.getState().closeIconTextures,
        onClose: () => get().removeDetachedMenu(detachedMenuGroup),
        radius: 0.04,
      });
      closeIcon.addToObject(detachedMenuGroup);

      if (menu instanceof HeatmapMenu) {
        const shareIcon: ActionIcon = new ActionIcon({
          textures: useVrAssetRepoStore.getState().shareIconTextures,
          color: new THREE.Color(color),
          onAction: () => {
            useHeatmapConfigurationStore.getState().toggleShared();
            if (useHeatmapConfigurationStore.getState().heatmapShared) {
              shareIcon.material.color = new THREE.Color(
                useCollaborationSessionStore.getState().getColor('')
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
          textures: useVrAssetRepoStore.getState().fireIconTextures,
          color: new THREE.Color(color),
          onAction: () => {
            useHeatmapConfigurationStore.getState().switchMetric();
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
          textures: useVrAssetRepoStore.getState().shareIconTextures,
          color: new THREE.Color(color),
          onAction: () => get().shareDetachedMenu(detachedMenuGroup, shareIcon),
          radius: 0.04,
        });
        shareIcon.addToObject(detachedMenuGroup);
        // shareIcon.position.y -= 0.04;
        shareIcon.position.x -= 0.15;

        color = useCollaborationSessionStore.getState().getColor('');
        // highlight icon
        const highlightIcon = new ActionIcon({
          textures: useVrAssetRepoStore.getState().paintbrushIconTextures,
          color: new THREE.Color(color),
          onAction: () => get().toggleHighlightComponent(menu.getDetachId()),
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
    },

    toggleHighlightComponent: (entityId: string): Promise<boolean> => {
      return new Promise((resolve) => {
        useHighlightingStore.getState().toggleHighlightById(entityId);
        useHighlightingStore.getState().updateHighlighting();
        resolve(true);
      });
    },

    /**
     * Asks the backend to close the given detached menu. If the backend allows
     * the menu to be closed, the menu is removed.
     */
    removeDetachedMenu: (
      detachedMenuGroup: DetachedMenuGroup
    ): Promise<boolean> => {
      // Remove the menu locally when it does not have an id (e.g., when we are
      // offline).
      const menuId = detachedMenuGroup.getGrabId();
      if (!menuId) {
        get().removeDetachedMenuLocally(detachedMenuGroup);
        return Promise.resolve(true);
      }

      return useWebSocketStore
        .getState()
        .sendRespondableMessage<
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
                get().removeDetachedMenuLocally(detachedMenuGroup);
              }
              return response.isSuccess;
            },
            onOffline: () => {
              get().removeDetachedMenuLocally(detachedMenuGroup);
            },
          }
        );
    },

    /**
     * Removes the detached menu with the given id.
     */
    removeDetachedMenuLocallyById: (menuId: string) => {
      const detachedMenuGroup = get().detachedMenuGroupsById.get(menuId);
      if (detachedMenuGroup) get().removeDetachedMenuLocally(detachedMenuGroup);
    },

    /**
     * Removes the given menu without asking the backend.
     */
    removeDetachedMenuLocally: (detachedMenuGroup: DetachedMenuGroup) => {
      // Notify the detached menu that it has been closed.
      detachedMenuGroup.closeAllMenus();

      const newContainer = get().container;
      const newDetachedMenuGroups = get().detachedMenuGroups;
      const newDetachedMenuGroupsById = get().detachedMenuGroupsById;

      // Remove the 3D object of the menu.
      newContainer.remove(detachedMenuGroup);

      // Stop updating the menu.
      newDetachedMenuGroups.delete(detachedMenuGroup);

      // Remove association with the menu's id.
      const menuId = detachedMenuGroup.getGrabId();
      if (menuId) newDetachedMenuGroupsById.delete(menuId);

      set({
        container: newContainer,
        detachedMenuGroups: newDetachedMenuGroups,
        detachedMenuGroupsById: newDetachedMenuGroupsById,
      });
    },

    removeAllDetachedMenusLocally: () => {
      const newContainer = get().container;
      const newDetachedMenuGroups = get().detachedMenuGroups;
      const newDetachedMenuGroupsById = get().detachedMenuGroupsById;

      // Notify all detached menus that they have been closed.
      newDetachedMenuGroups.forEach((menuGroup) => menuGroup.closeAllMenus());

      newContainer.remove(...newDetachedMenuGroups);
      newDetachedMenuGroups.clear();
      newDetachedMenuGroupsById.clear();

      set({
        container: newContainer,
        detachedMenuGroups: newDetachedMenuGroups,
        detachedMenuGroupsById: newDetachedMenuGroupsById,
      });
    },
  })
);
