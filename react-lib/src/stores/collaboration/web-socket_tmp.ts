import { create } from 'zustand';

import { INITIAL_LANDSCAPE_EVENT } from 'react-lib/src/utils/collaboration//web-socket-messages/receivable/landscape';
import { ANNOTATION_EDIT_RESPONSE_EVENT } from 'react-lib/src/utils/collaboration//web-socket-messages/receivable/response/annotation-edit-response';
import { ANNOTATION_RESPONSE_EVENT } from 'react-lib/src/utils/collaboration//web-socket-messages/receivable/response/annotation-response';
import { ANNOTATION_UPDATED_RESPONSE_EVENT } from 'react-lib/src/utils/collaboration//web-socket-messages/receivable/response/annotation-updated-response';
import { SELF_CONNECTED_EVENT } from 'react-lib/src/utils/collaboration//web-socket-messages/receivable/self-connected';
import { TIMESTAMP_UPDATE_TIMER_EVENT } from 'react-lib/src/utils/collaboration//web-socket-messages/receivable/timestamp-update-timer';
import { USER_CONNECTED_EVENT } from 'react-lib/src/utils/collaboration//web-socket-messages/receivable/user-connected';
import { USER_DISCONNECTED_EVENT } from 'react-lib/src/utils/collaboration//web-socket-messages/receivable/user-disconnect';
import { ALL_HIGHLIGHTS_RESET_EVENT } from 'react-lib/src/utils/collaboration//web-socket-messages/sendable/all-highlights-reset';
import { ANNOTATION_CLOSED_EVENT } from 'react-lib/src/utils/collaboration//web-socket-messages/sendable/annotation-closed';
import { ANNOTATION_EDIT_EVENT } from 'react-lib/src/utils/collaboration//web-socket-messages/sendable/annotation-edit';
import { ANNOTATION_OPENED_EVENT } from 'react-lib/src/utils/collaboration//web-socket-messages/sendable/annotation-opened';
import { ANNOTATION_UPDATED_EVENT } from 'react-lib/src/utils/collaboration//web-socket-messages/sendable/annotation-updated';
import { CHANGE_LANDSCAPE_EVENT } from 'react-lib/src/utils/collaboration//web-socket-messages/sendable/change-landscape';
import { COMPONENT_UPDATE_EVENT } from 'react-lib/src/utils/collaboration//web-socket-messages/sendable/component-update';
import { HEATMAP_UPDATE_EVENT } from 'react-lib/src/utils/collaboration//web-socket-messages/sendable/heatmap-update';
import { HIGHLIGHTING_UPDATE_EVENT } from 'react-lib/src/utils/collaboration//web-socket-messages/sendable/highlighting-update';
import { MOUSE_PING_UPDATE_EVENT } from 'react-lib/src/utils/collaboration//web-socket-messages/sendable/mouse-ping-update';
import { PING_UPDATE_EVENT } from 'react-lib/src/utils/collaboration//web-socket-messages/sendable/ping-update';
import { SHARE_SETTINGS_EVENT } from 'react-lib/src/utils/collaboration//web-socket-messages/sendable/share-settings';
import { SPECTATING_UPDATE_EVENT } from 'react-lib/src/utils/collaboration//web-socket-messages/sendable/spectating-update';
import { SYNC_ROOM_STATE_EVENT } from 'react-lib/src/utils/collaboration//web-socket-messages/sendable/synchronize-room-state';
import { TIMESTAMP_UPDATE_EVENT } from 'react-lib/src/utils/collaboration//web-socket-messages/sendable/timestamp-update';
import { Nonce } from 'react-lib/src/utils/collaboration//web-socket-messages/types/nonce';
import { MENU_DETACHED_RESPONSE_EVENT } from 'react-lib/src/utils/extended-reality/vr-web-wocket-messages/receivable/response/menu-detached';
import { OBJECT_CLOSED_RESPONSE_EVENT } from 'react-lib/src/utils/extended-reality/vr-web-wocket-messages/receivable/response/object-closed';
import { OBJECT_GRABBED_RESPONSE_EVENT } from 'react-lib/src/utils/extended-reality/vr-web-wocket-messages/receivable/response/object-grabbed';
import { JOIN_VR_EVENT } from 'react-lib/src/utils/extended-reality/vr-web-wocket-messages/sendable/join-vr';
import { OBJECT_MOVED_EVENT } from 'react-lib/src/utils/extended-reality/vr-web-wocket-messages/sendable/object-moved';
import { DETACHED_MENU_CLOSED_EVENT } from 'react-lib/src/utils/extended-reality/vr-web-wocket-messages/sendable/request/detached-menu-closed';
import { MENU_DETACHED_EVENT } from 'react-lib/src/utils/extended-reality/vr-web-wocket-messages/sendable/request/menu-detached';
import { USER_CONTROLLER_CONNECT_EVENT } from 'react-lib/src/utils/extended-reality/vr-web-wocket-messages/sendable/user-controller-connect';
import { USER_CONTROLLER_DISCONNECT_EVENT } from 'react-lib/src/utils/extended-reality/vr-web-wocket-messages/sendable/user-controller-disconnect';
import { USER_POSITIONS_EVENT } from 'react-lib/src/utils/extended-reality/vr-web-wocket-messages/sendable/user-positions';
import { CHAT_MESSAGE_EVENT } from 'react-lib/src/utils/collaboration//web-socket-messages/receivable/chat-message';
import { CHAT_SYNC_EVENT } from 'react-lib/src/utils/collaboration//web-socket-messages/receivable/chat-syncronization';
import { io, Socket } from 'socket.io-client';
import { USER_KICK_EVENT } from 'react-lib/src/utils/collaboration//web-socket-messages/sendable/kick-user';
import { MESSAGE_DELETE_EVENT } from 'react-lib/src/utils/collaboration//web-socket-messages/sendable/delete-message';
import { VisualizationMode } from 'react-lib/src/stores/collaboration/local-user';
import * as ENV from 'react-lib/src/env';
import { useAuthStore } from 'react-lib/src/stores/auth';
import eventEmitter from '../../utils/event-emitter';

type ResponseHandler<T> = (msg: T) => void;

const collaborationService = ENV.COLLABORATION_SERV_URL;

// TODO Evented

export const SELF_DISCONNECTED_EVENT = 'self_disconnected';

const RECEIVABLE_EVENTS = [
  ALL_HIGHLIGHTS_RESET_EVENT,
  CHANGE_LANDSCAPE_EVENT,
  COMPONENT_UPDATE_EVENT,
  DETACHED_MENU_CLOSED_EVENT,
  ANNOTATION_CLOSED_EVENT,
  HEATMAP_UPDATE_EVENT,
  HIGHLIGHTING_UPDATE_EVENT,
  INITIAL_LANDSCAPE_EVENT,
  JOIN_VR_EVENT,
  MENU_DETACHED_EVENT,
  MENU_DETACHED_EVENT,
  ANNOTATION_OPENED_EVENT,
  ANNOTATION_EDIT_EVENT,
  ANNOTATION_UPDATED_EVENT,
  MOUSE_PING_UPDATE_EVENT,
  OBJECT_MOVED_EVENT,
  PING_UPDATE_EVENT,
  SELF_CONNECTED_EVENT,
  SHARE_SETTINGS_EVENT,
  SPECTATING_UPDATE_EVENT,
  SYNC_ROOM_STATE_EVENT,
  TIMESTAMP_UPDATE_EVENT,
  TIMESTAMP_UPDATE_TIMER_EVENT,
  USER_CONNECTED_EVENT,
  USER_CONTROLLER_CONNECT_EVENT,
  USER_CONTROLLER_DISCONNECT_EVENT,
  USER_DISCONNECTED_EVENT,
  USER_POSITIONS_EVENT,
  CHAT_MESSAGE_EVENT,
  CHAT_SYNC_EVENT,
  USER_KICK_EVENT,
  MESSAGE_DELETE_EVENT,
];

const RESPONSE_EVENTS = [
  MENU_DETACHED_RESPONSE_EVENT,
  ANNOTATION_RESPONSE_EVENT,
  ANNOTATION_EDIT_RESPONSE_EVENT,
  ANNOTATION_UPDATED_RESPONSE_EVENT,
  OBJECT_CLOSED_RESPONSE_EVENT,
  OBJECT_GRABBED_RESPONSE_EVENT,
];

interface WebSocketState {
  currentSocket: Socket | null;
  currentSocketUrl: string | null;
  responseHandlers: Map<Nonce, ResponseHandler<any>>;
  lastNonce: Nonce;
  nextNonce: () => number;
  getSocketUrl: () => string;
  initSocket: (ticketId: string, mode: VisualizationMode) => Promise<void>;
  closeSocket: () => void;
  closeHandler: (event: any) => void;
  send: <T>(event: string, msg: T) => void;
  isWebSocketOpen: () => boolean;
  reset: () => void;
  awaitResponse: <T>({
    nonce,
    responseType,
    onResponse,
    onOnline,
    onOffline,
  }: {
    nonce: Nonce;
    responseType: (msg: any) => msg is T;
    onResponse: ResponseHandler<T>;
    onOnline?: () => void;
    onOffline?: () => void;
  }) => void;
  sendRespondableMessage: <T, R>(
    event: string,
    message: T,
    {
      responseType,
      onResponse,
      onOffline,
    }: {
      responseType: (msg: any) => msg is R;
      onResponse: (msg: R) => boolean;
      onOffline?: () => void;
    }
  ) => Promise<boolean>;
}

export const useWebSocketStore = create<WebSocketState>((set, get) => ({
  // TODO private
  currentSocket: null, // WebSocket to send/receive messages to/from backend
  // TODO private
  currentSocketUrl: null,
  responseHandlers: new Map<Nonce, ResponseHandler<any>>(),
  lastNonce: 0,
  // TODO methods

  nextNonce: () => {
    set({ lastNonce: get().lastNonce++ });
    return get().lastNonce;
  },

  // private
  getSocketUrl: () => {
    return collaborationService;
  },

  initSocket: async (ticketId: string, mode: VisualizationMode) => {
    set({ currentSocketUrl: get().getSocketUrl() });
    const urlParams = new URLSearchParams(window.location.search);
    set({
      currentSocket: io(get().currentSocketUrl!, {
        transports: ['websocket'],
        query: {
          ticketId: ticketId,
          userName: useAuthStore.getState().user?.name,
          deviceId: urlParams.get('deviceId'),
          mode: mode,
        },
      }),
    });
    get().currentSocket!.on('disconnect', get().closeHandler.bind(this)); // TODO: Does this work?

    RECEIVABLE_EVENTS.forEach((event) => {
      get().currentSocket?.on(event, (message) => {
        eventEmitter.emit(event, message);
      });
    });

    RESPONSE_EVENTS.forEach((event) => {
      get().currentSocket?.on(event, (message) => {
        const handler = get().responseHandlers.get(message.nonce);
        if (handler) handler(message.response);
      });
    });
  },

  closeSocket: () => {
    if (get().isWebSocketOpen()) get().currentSocket?.disconnect();
  },

  // private
  closeHandler: (event: any) => {
    // Invoke external event listener for close event.
    eventEmitter.emit(SELF_DISCONNECTED_EVENT, event);

    // Remove internal event listeners.
    get().currentSocket?.disconnect();
    set({ currentSocket: null });
    set({ currentSocketUrl: null });
  },

  /**
   * Sends a message to the backend.
   *
   * The type parameter `T` is used to validate the type of the sent message
   * at compile time.
   *
   * @param msg The message to send.
   */
  send: <T>(event: string, msg: T) => {
    if (get().isWebSocketOpen()) get().currentSocket?.emit(event, msg);
  },

  isWebSocketOpen: (): boolean => {
    return get().currentSocket != null && get().currentSocket!.connected;
  },

  reset: () => {
    get().currentSocket?.disconnect();
    set({ currentSocket: null });
  },

  // private
  /**
   * Adds an event listener that is invoked when a response with the given
   * identifier is received.
   *
   * When the response is received, the listener is removed.
   *
   * If the user is offline, no listener will be created.
   *
   * @param nonce Locally unique identifier of the request whose response to wait for.
   * @param responseType A type guard that tests whether the received response has the correct type.
   * @param onResponse The callback to invoke when the response is received.
   * @param onOnline The callback to invoke before staring to listen for responses when the client
   * is connected.
   * @param onOffline The callback to invoke instead of listening for responses when the client is
   * not connected.
   */
  awaitResponse: <T>({
    nonce,
    responseType: isValidResponse,
    onResponse,
    onOnline,
    onOffline,
  }: {
    nonce: Nonce;
    responseType: (msg: any) => msg is T;
    onResponse: ResponseHandler<T>;
    onOnline?: () => void;
    onOffline?: () => void;
  }) => {
    // Don't wait for response unless there is a open websocket connection.
    if (!get().isWebSocketOpen()) {
      if (onOffline) onOffline();
      return;
    }

    // If a websocket connection is open, notify callee that the listener is added.
    if (onOnline) onOnline();

    // Listen for responses.
    const newResponseHandlers = get().responseHandlers;
    const handler = (response: any) => {
      if (isValidResponse(response)) {
        newResponseHandlers.delete(nonce);
        onResponse(response);
      }
    };
    newResponseHandlers.set(nonce, handler);
    set({ responseHandlers: newResponseHandlers });
  },

  /**
   * Send a message to the backend that requires a response.
   *
   * This is usually used, when the backend is required to synchronize some actions.
   * */
  sendRespondableMessage: <T, R>(
    event: string,
    message: T,
    {
      responseType,
      onResponse,
      onOffline,
    }: {
      responseType: (msg: any) => msg is R;
      onResponse: (msg: R) => boolean;
      onOffline?: () => void;
    }
  ): Promise<boolean> => {
    const nonce = get().nextNonce();
    // send message
    get().send<T>(event, {
      ...message,
      nonce,
    });

    // handle response
    return new Promise<boolean>((resolve) => {
      get().awaitResponse({
        nonce,
        responseType,
        onResponse: (response: R) => {
          resolve(onResponse?.(response));
        },
        onOffline: () => {
          onOffline?.();
          resolve(true);
        },
      });
    });
  },
}));
