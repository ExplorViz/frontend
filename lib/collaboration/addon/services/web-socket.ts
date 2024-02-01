import Service from '@ember/service';
import Evented from '@ember/object/evented';
import debugLogger from 'ember-debug-logger';
import ENV from 'explorviz-frontend/config/environment';
import { io, Socket } from 'socket.io-client';
import { VisualizationMode } from 'collaboration/services/local-user';
import { INITIAL_LANDSCAPE_EVENT } from 'collaboration/utils/web-socket-messages/receivable/landscape';
import { SELF_CONNECTED_EVENT } from 'collaboration/utils/web-socket-messages/receivable/self-connected';
import { USER_CONNECTED_EVENT } from 'collaboration/utils/web-socket-messages/receivable/user-connected';
import { USER_DISCONNECTED_EVENT } from 'collaboration/utils/web-socket-messages/receivable/user-disconnect';
import { TIMESTAMP_UPDATE_TIMER_EVENT } from 'collaboration/utils/web-socket-messages/receivable/timestamp-update-timer';
import { MENU_DETACHED_EVENT } from 'extended-reality/utils/vr-web-wocket-messages/sendable/request/menu-detached';
import { APP_OPENED_EVENT } from 'collaboration/utils/web-socket-messages/sendable/app-opened';
import { HEATMAP_UPDATE_EVENT } from 'collaboration/utils/web-socket-messages/sendable/heatmap-update';
import { COMPONENT_UPDATE_EVENT } from 'collaboration/utils/web-socket-messages/sendable/component-update';
import { HIGHLIGHTING_UPDATE_EVENT } from 'collaboration/utils/web-socket-messages/sendable/highlighting-update';
import { MOUSE_PING_UPDATE_EVENT } from 'collaboration/utils/web-socket-messages/sendable/mouse-ping-update';
import { PING_UPDATE_EVENT } from 'collaboration/utils/web-socket-messages/sendable/ping-update';
import { TIMESTAMP_UPDATE_EVENT } from 'collaboration/utils/web-socket-messages/sendable/timetsamp-update';
import { USER_CONTROLLER_CONNECT_EVENT } from 'extended-reality/utils/vr-web-wocket-messages/sendable/user-controller-connect';
import { USER_CONTROLLER_DISCONNECT_EVENT } from 'extended-reality/utils/vr-web-wocket-messages/sendable/user-controller-disconnect';
import { USER_POSITIONS_EVENT } from 'extended-reality/utils/vr-web-wocket-messages/sendable/user-positions';
import { OBJECT_MOVED_EVENT } from 'extended-reality/utils/vr-web-wocket-messages/sendable/object-moved';
import { APP_CLOSED_EVENT } from 'extended-reality/utils/vr-web-wocket-messages/sendable/request/app-closed';
import { DETACHED_MENU_CLOSED_EVENT } from 'extended-reality/utils/vr-web-wocket-messages/sendable/request/detached-menu-closed';
import { SPECTATING_UPDATE_EVENT } from 'collaboration/utils/web-socket-messages/sendable/spectating-update';
import { ALL_HIGHLIGHTS_RESET_EVENT } from 'collaboration/utils/web-socket-messages/sendable/all-highlights-reset';
import { JOIN_VR_EVENT } from 'extended-reality/utils/vr-web-wocket-messages/sendable/join-vr';
import { OBJECT_CLOSED_RESPONSE_EVENT } from 'extended-reality/utils/vr-web-wocket-messages/receivable/response/object-closed';
import { MENU_DETACHED_RESPONSE_EVENT } from 'extended-reality/utils/vr-web-wocket-messages/receivable/response/menu-detached';
import { OBJECT_GRABBED_RESPONSE_EVENT } from 'extended-reality/utils/vr-web-wocket-messages/receivable/response/object-grabbed';
import { Nonce } from 'collaboration/utils/web-socket-messages/types/nonce';

type ResponseHandler<T> = (msg: T) => void;

const { collaborationService } = ENV.backendAddresses;

export const SELF_DISCONNECTED_EVENT = 'self_disconnected';

const RECEIVABLE_EVENTS = [
  INITIAL_LANDSCAPE_EVENT,
  SELF_CONNECTED_EVENT,
  USER_CONNECTED_EVENT,
  USER_DISCONNECTED_EVENT,
  TIMESTAMP_UPDATE_TIMER_EVENT,
  MENU_DETACHED_EVENT,
  APP_OPENED_EVENT,
  COMPONENT_UPDATE_EVENT,
  HEATMAP_UPDATE_EVENT,
  HIGHLIGHTING_UPDATE_EVENT,
  MOUSE_PING_UPDATE_EVENT,
  PING_UPDATE_EVENT,
  TIMESTAMP_UPDATE_EVENT,
  USER_CONTROLLER_CONNECT_EVENT,
  USER_CONTROLLER_DISCONNECT_EVENT,
  USER_POSITIONS_EVENT,
  OBJECT_MOVED_EVENT,
  APP_CLOSED_EVENT,
  DETACHED_MENU_CLOSED_EVENT,
  MENU_DETACHED_EVENT,
  SPECTATING_UPDATE_EVENT,
  ALL_HIGHLIGHTS_RESET_EVENT,
  JOIN_VR_EVENT,
];

const RESPONSE_EVENTS = [
  OBJECT_CLOSED_RESPONSE_EVENT,
  MENU_DETACHED_RESPONSE_EVENT,
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
