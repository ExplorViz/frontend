import Evented from '@ember/object/evented';
import Service from '@ember/service';
import { VisualizationMode } from 'collaboration/services/local-user';
import { INITIAL_LANDSCAPE_EVENT } from 'collaboration/utils/web-socket-messages/receivable/landscape';
import { ANNOTATION_EDIT_RESPONSE_EVENT } from 'collaboration/utils/web-socket-messages/receivable/response/annotation-edit-response';
import { ANNOTATION_RESPONSE_EVENT } from 'collaboration/utils/web-socket-messages/receivable/response/annotation-response';
import { ANNOTATION_UPDATED_RESPONSE_EVENT } from 'collaboration/utils/web-socket-messages/receivable/response/annotation-updated-response';
import { SELF_CONNECTED_EVENT } from 'collaboration/utils/web-socket-messages/receivable/self-connected';
import { TIMESTAMP_UPDATE_TIMER_EVENT } from 'collaboration/utils/web-socket-messages/receivable/timestamp-update-timer';
import { USER_CONNECTED_EVENT } from 'collaboration/utils/web-socket-messages/receivable/user-connected';
import { USER_DISCONNECTED_EVENT } from 'collaboration/utils/web-socket-messages/receivable/user-disconnect';
import { ALL_HIGHLIGHTS_RESET_EVENT } from 'collaboration/utils/web-socket-messages/sendable/all-highlights-reset';
import { ANNOTATION_CLOSED_EVENT } from 'collaboration/utils/web-socket-messages/sendable/annotation-closed';
import { ANNOTATION_EDIT_EVENT } from 'collaboration/utils/web-socket-messages/sendable/annotation-edit';
import { ANNOTATION_OPENED_EVENT } from 'collaboration/utils/web-socket-messages/sendable/annotation-opened';
import { ANNOTATION_UPDATED_EVENT } from 'collaboration/utils/web-socket-messages/sendable/annotation-updated';
import { APP_OPENED_EVENT } from 'collaboration/utils/web-socket-messages/sendable/app-opened';
import { CHANGE_LANDSCAPE_EVENT } from 'collaboration/utils/web-socket-messages/sendable/change-landscape';
import { COMPONENT_UPDATE_EVENT } from 'collaboration/utils/web-socket-messages/sendable/component-update';
import { HEATMAP_UPDATE_EVENT } from 'collaboration/utils/web-socket-messages/sendable/heatmap-update';
import { HIGHLIGHTING_UPDATE_EVENT } from 'collaboration/utils/web-socket-messages/sendable/highlighting-update';
import { MOUSE_PING_UPDATE_EVENT } from 'collaboration/utils/web-socket-messages/sendable/mouse-ping-update';
import { PING_UPDATE_EVENT } from 'collaboration/utils/web-socket-messages/sendable/ping-update';
import { SHARE_SETTINGS_EVENT } from 'collaboration/utils/web-socket-messages/sendable/share-settings';
import { SPECTATING_UPDATE_EVENT } from 'collaboration/utils/web-socket-messages/sendable/spectating-update';
import { SYNC_ROOM_STATE_EVENT } from 'collaboration/utils/web-socket-messages/sendable/synchronize-room-state';
import { TIMESTAMP_UPDATE_EVENT } from 'collaboration/utils/web-socket-messages/sendable/timetsamp-update';
import { Nonce } from 'collaboration/utils/web-socket-messages/types/nonce';
import debugLogger from 'ember-debug-logger';
import ENV from 'explorviz-frontend/config/environment';
import { MENU_DETACHED_RESPONSE_EVENT } from 'extended-reality/utils/vr-web-wocket-messages/receivable/response/menu-detached';
import { OBJECT_CLOSED_RESPONSE_EVENT } from 'extended-reality/utils/vr-web-wocket-messages/receivable/response/object-closed';
import { OBJECT_GRABBED_RESPONSE_EVENT } from 'extended-reality/utils/vr-web-wocket-messages/receivable/response/object-grabbed';
import { JOIN_VR_EVENT } from 'extended-reality/utils/vr-web-wocket-messages/sendable/join-vr';
import { OBJECT_MOVED_EVENT } from 'extended-reality/utils/vr-web-wocket-messages/sendable/object-moved';
import { APP_CLOSED_EVENT } from 'extended-reality/utils/vr-web-wocket-messages/sendable/request/app-closed';
import { DETACHED_MENU_CLOSED_EVENT } from 'extended-reality/utils/vr-web-wocket-messages/sendable/request/detached-menu-closed';
import { MENU_DETACHED_EVENT } from 'extended-reality/utils/vr-web-wocket-messages/sendable/request/menu-detached';
import { USER_CONTROLLER_CONNECT_EVENT } from 'extended-reality/utils/vr-web-wocket-messages/sendable/user-controller-connect';
import { USER_CONTROLLER_DISCONNECT_EVENT } from 'extended-reality/utils/vr-web-wocket-messages/sendable/user-controller-disconnect';
import { USER_POSITIONS_EVENT } from 'extended-reality/utils/vr-web-wocket-messages/sendable/user-positions';
import { CHAT_MESSAGE_EVENT } from 'collaboration/utils/web-socket-messages/receivable/chat-message';
import { CHAT_SYNC_EVENT } from 'collaboration/utils/web-socket-messages/receivable/chat-syncronization';
import { io, Socket } from 'socket.io-client';
import { USER_KICK_EVENT } from 'collaboration/utils/web-socket-messages/sendable/kick-user';
import { MESSAGE_DELETE_EVENT } from 'collaboration/utils/web-socket-messages/sendable/delete-message';

type ResponseHandler<T> = (msg: T) => void;

const { collaborationService } = ENV.backendAddresses;

export const SELF_DISCONNECTED_EVENT = 'self_disconnected';

const RECEIVABLE_EVENTS = [
  ALL_HIGHLIGHTS_RESET_EVENT,
  APP_CLOSED_EVENT,
  APP_OPENED_EVENT,
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

export default class WebSocketService extends Service.extend(Evented) {
  private debug = debugLogger('WebSocketService');

  private currentSocket: Socket | null = null; // WebSocket to send/receive messages to/from backend

  private currentSocketUrl: string | null = null;

  private responseHandlers = new Map<Nonce, ResponseHandler<any>>();

  private lastNonce: Nonce = 0;

  nextNonce() {
    return ++this.lastNonce;
  }

  private getSocketUrl() {
    return collaborationService;
  }

  async initSocket(ticketId: string, mode: VisualizationMode) {
    this.currentSocketUrl = this.getSocketUrl();
    const urlParams = new URLSearchParams(window.location.search);
    this.currentSocket = io(this.currentSocketUrl, {
      transports: ['websocket'],
      query: {
        ticketId: ticketId,
        userName: 'JOHNNY',
        deviceId: urlParams.get('deviceId'),
        mode: mode,
      },
    });
    this.currentSocket.on('disconnect', this.closeHandler.bind(this));

    RECEIVABLE_EVENTS.forEach((event) => {
      this.currentSocket?.on(event, (message) => {
        this.trigger(event, message);
      });
    });

    RESPONSE_EVENTS.forEach((event) => {
      this.currentSocket?.on(event, (message) => {
        const handler = this.responseHandlers.get(message.nonce);
        if (handler) handler(message.response);
      });
    });
  }

  closeSocket() {
    if (this.isWebSocketOpen()) this.currentSocket?.disconnect();
  }

  private closeHandler(event: any) {
    // Log that connection has been closed.
    if (event && event.code && event.target.url) {
      this.debug(
        `Connection to Backend-Extension ( ${event.target.url} ) closed, WebSocket close code ${event.code}.`
      );
    }

    // Invoke external event listener for close event.
    this.trigger(SELF_DISCONNECTED_EVENT, event);

    // Remove internal event listeners.
    this.currentSocket?.disconnect();
    this.currentSocket = null;
    this.currentSocketUrl = null;
  }

  /**
   * Sends a message to the backend.
   *
   * The type parameter `T` is used to validate the type of the sent message
   * at compile time.
   *
   * @param msg The message to send.
   */
  send<T>(event: string, msg: T) {
    if (this.isWebSocketOpen()) this.currentSocket?.emit(event, msg);
  }

  // removeCircularReferences() {
  //   const seen = new WeakSet();
  //   return (key, value) => {
  //     if (typeof value === 'object' && value !== null) {
  //       if (seen.has(value)) {
  //         return;
  //       }
  //       seen.add(value);
  //     }
  //     return value;
  //   }
  // }

  isWebSocketOpen(): boolean {
    return this.currentSocket != null && this.currentSocket.connected;
  }

  reset() {
    this.currentSocket?.disconnect();
    this.currentSocket = null;
  }

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
  private awaitResponse<T>({
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
  }) {
    // Don't wait for response unless there is a open websocket connection.
    if (!this.isWebSocketOpen()) {
      if (onOffline) onOffline();
      return;
    }

    // If a websocket connection is open, notify callee that the listener is added.
    if (onOnline) onOnline();

    // Listen for responses.
    const handler = (response: any) => {
      if (isValidResponse(response)) {
        this.responseHandlers.delete(nonce);
        onResponse(response);
      } else {
        this.debug('Received invalid response', response);
      }
    };
    this.responseHandlers.set(nonce, handler);
  }

  /**
   * Send a message to the backend that requires a response.
   *
   * This is usually used, when the backend is required to synchronize some actions.
   * */
  sendRespondableMessage<T, R>(
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
  ): Promise<boolean> {
    const nonce = this.nextNonce();
    // send message
    this.send<T>(event, {
      ...message,
      nonce,
    });

    // handle response
    return new Promise<boolean>((resolve) => {
      this.awaitResponse({
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
  }
}

declare module '@ember/service' {
  interface Registry {
    'web-socket': WebSocketService;
  }
}
