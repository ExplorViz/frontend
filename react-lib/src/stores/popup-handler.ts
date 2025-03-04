import { create } from 'zustand';

import { useLocalUserStore } from 'react-lib/src/stores/collaboration/local-user';

import { useWebSocketStore } from 'react-lib/src/stores/collaboration/web-socket';
import { ForwardedMessage } from 'react-lib/src/utils/collaboration/web-socket-messages/receivable/forwarded';
import { SerializedPopup } from 'react-lib/src/utils/collaboration/web-socket-messages/types/serialized-room';
import PopupData from 'react-lib/src/components/visualization/rendering/popups/popup-data';
import { useApplicationRendererStore } from 'react-lib/src/stores/application-renderer';
import { getStoredSettings } from 'react-lib/src/utils/settings/local-storage-settings';
import ApplicationObject3D from 'react-lib/src/view-objects/3d/application/application-object-3d';
import { useDetachedMenuRendererStore } from 'react-lib/src/stores/extended-reality/detached-menu-renderer';
import {
  getTypeOfEntity,
  isEntityMesh,
} from 'react-lib/src/utils/extended-reality/vr-helpers/detail-info-composer';
import { MenuDetachedForwardMessage } from 'react-lib/src/utils/extended-reality/vr-web-wocket-messages/receivable/menu-detached-forward';
import {
  MenuDetachedResponse,
  isMenuDetachedResponse,
} from 'react-lib/src/utils/extended-reality/vr-web-wocket-messages/receivable/response/menu-detached';
import {
  ObjectClosedResponse,
  isObjectClosedResponse,
} from 'react-lib/src/utils/extended-reality/vr-web-wocket-messages/receivable/response/object-closed';
import {
  DETACHED_MENU_CLOSED_EVENT,
  DetachedMenuClosedMessage,
} from 'react-lib/src/utils/extended-reality/vr-web-wocket-messages/sendable/request/detached-menu-closed';
import {
  MENU_DETACHED_EVENT,
  MenuDetachedMessage,
} from 'react-lib/src/utils/extended-reality/vr-web-wocket-messages/sendable/request/menu-detached';
import * as THREE from 'three';
import { useToastHandlerStore } from 'react-lib/src/stores/toast-handler';
import Landscape3D from 'react-lib/src/view-objects/3d/landscape/landscape-3d';
import eventEmitter from 'react-lib/src/utils/event-emitter';

type Position2D = {
  x: number;
  y: number;
};

interface PopupHandlerState {
  popupData: PopupData[];
  deactivated: boolean;
  latestMousePosition: { timestamp: number; x: number; y: number };
  isShiftPressed: boolean;
  _constructor: () => void;
}

export const usePopupHandlerStore = create<PopupHandlerState>((set, get) => ({
  popupData: [],
  deactivated: false,
  latestMousePosition: { timestamp: 0, x: 0, y: 0 },
  isShiftPressed: false,

  _constructor: () => {
    eventEmitter.on(MENU_DETACHED_EVENT, get().onMenuDetached);
    eventEmitter.on(DETACHED_MENU_CLOSED_EVENT, get().onMenuClosed);
    eventEmitter.on('restore_popups', get().onRestorePopups);
  },

  clearPopups: () => {
    set({ popupData: [] });
  },

  removeUnpinnedPopups: () => {
    set({ popupData: get().popupData.filter((data) => data.isPinned) });
  },

  removeUnmovedPopups: () => {
    set({ popupData: get().popupData.filter((data) => data.wasMoved) });
  },

  sharePopup: (popup: PopupData) => {
    get().updateMeshReference(popup);

    const { mesh } = popup;
    const entityId = mesh.getModelId();
    const worldPosition = useApplicationRendererStore
      .getState()
      .getPositionInLandscape(mesh);
    worldPosition.y += 0.3;

    useWebSocketStore
      .getState()
      .sendRespondableMessage<MenuDetachedMessage, MenuDetachedResponse>(
        MENU_DETACHED_EVENT,
        {
          event: MENU_DETACHED_EVENT,
          detachId: entityId,
          entityType: getTypeOfEntity(mesh),
          position: worldPosition.toArray(),
          quaternion: [0, 0, 0, 0],
          scale: [1, 1, 1],
          nonce: 0, // will be overwritten
        },
        {
          responseType: isMenuDetachedResponse,
          onResponse: (response: MenuDetachedResponse) => {
            const newPopup = {
              ...popup,
              sharedBy: useLocalUserStore.getState().userId,
              isPinned: true,
              menuId: response.objectId,
            };

            const newPopupData = [
              ...get().popupData.filter((element) => {
                element !== popup;
              }),
              newPopup,
            ];

            set({
              popupData: newPopupData,
            });

            return true;
          },
          onOffline: () => {
            // Not used at the moment
          },
        }
      );
  },

  pinPopup: (popup: PopupData) => {
    const newPopup = {
      ...popup,
      isPinned: true,
    };

    const newPopupData = [
      ...get().popupData.filter((element) => {
        element !== popup;
      }),
      newPopup,
    ];

    set({
      popupData: newPopupData,
    });
  },
}));

usePopupHandlerStore.getState()._constructor();
