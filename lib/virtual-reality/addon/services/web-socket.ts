import Service, { inject as service } from '@ember/service';
import Evented from '@ember/object/evented';
import debugLogger from 'ember-debug-logger';
import ENV from 'explorviz-frontend/config/environment';
import { Nonce } from 'virtual-reality/utils/vr-message/util/nonce';
import { RESPONSE_EVENT } from 'virtual-reality/utils/vr-message/receivable/response';
import { FORWARDED_EVENT } from 'virtual-reality/utils/vr-message/receivable/forwarded';
import { io, Socket } from 'socket.io-client';
import { INITIAL_LANDSCAPE_EVENT } from 'virtual-reality/utils/vr-message/receivable/landscape';
import { SELF_CONNECTED_EVENT } from 'virtual-reality/utils/vr-message/receivable/self_connected';
import { USER_CONNECTED_EVENT } from 'virtual-reality/utils/vr-message/receivable/user_connected';
import { USER_DISCONNECTED_EVENT } from 'virtual-reality/utils/vr-message/receivable/user_disconnect';
import { APP_OPENED_EVENT } from 'virtual-reality/utils/vr-message/sendable/app_opened';
import { COMPONENT_UPDATE_EVENT } from 'virtual-reality/utils/vr-message/sendable/component_update';
import { HEATMAP_UPDATE_EVENT } from 'virtual-reality/utils/vr-message/sendable/heatmap_update';
import { HIGHLIGHTING_UPDATE_EVENT } from 'virtual-reality/utils/vr-message/sendable/highlighting_update';
import { MOUSE_PING_UPDATE_EVENT } from 'virtual-reality/utils/vr-message/sendable/mouse-ping-update';
import { PING_UPDATE_EVENT } from 'virtual-reality/utils/vr-message/sendable/ping_update';
import { SPECTATING_UPDATE_EVENT } from 'virtual-reality/utils/vr-message/sendable/spectating_update';
import { TIMESTAMP_UPDATE_TIMER_EVENT } from 'virtual-reality/utils/vr-message/receivable/timestamp-update-timer';
import { OBJECT_MOVED_EVENT } from 'virtual-reality/utils/vr-message/sendable/object_moved';
import { APP_CLOSED_EVENT } from 'virtual-reality/utils/vr-message/sendable/request/app_closed';
import { DETACHED_MENU_CLOSED_EVENT } from 'virtual-reality/utils/vr-message/sendable/request/detached_menu_closed';
import { TIMESTAMP_UPDATE_EVENT } from 'virtual-reality/utils/vr-message/sendable/timetsamp_update';
import { USER_CONTROLLER_CONNECT_EVENT } from 'virtual-reality/utils/vr-message/sendable/user_controller_connect';
import { USER_CONTROLLER_DISCONNECT_EVENT } from 'virtual-reality/utils/vr-message/sendable/user_controller_disconnect';
import { USER_POSITIONS_EVENT } from 'virtual-reality/utils/vr-message/sendable/user_positions';
import { MENU_DETACHED_EVENT } from 'virtual-reality/utils/vr-message/sendable/request/menu_detached';

type ResponseHandler<T> = (msg: T) => void;

const { collaborationService, collaborationSocketPath } = ENV.backendAddresses;

export const SELF_DISCONNECTED_EVENT = 'self_disconnected';

export default class WebSocketService extends Service.extend(Evented) {
  @service()
  private websockets!: any;

  private debug = debugLogger('WebSocketService');

  private currentSocket: Socket|null = null; // WebSocket to send/receive messages to/from backend

  private currentSocketUrl: string | null = null;

  private responseHandlers = new Map<Nonce, ResponseHandler<any>>();

  private lastNonce: Nonce = 0;

  nextNonce() {
    return ++this.lastNonce;
  }

  private getSocketUrl() {
    const collaborationServiceSocket = collaborationService.replace(
      /^http(s?):\/\//i,
      'ws$1://'
    );
    return collaborationServiceSocket;
  }

  async initSocket(ticketId: string) {
    this.currentSocketUrl = this.getSocketUrl();
    this.currentSocket = io(this.currentSocketUrl, {
      transports: ["websocket"],
      query: {
        "ticketId": ticketId, 
        "userName": "JOHNNY"
    }});
    this.currentSocket.on('disconnect', this.closeHandler.bind(this));
    this.currentSocket.on(INITIAL_LANDSCAPE_EVENT, (message) => this.trigger(INITIAL_LANDSCAPE_EVENT, message));
    this.currentSocket.on(SELF_CONNECTED_EVENT, (message) => this.trigger(SELF_CONNECTED_EVENT, message));
    this.currentSocket.on(USER_CONNECTED_EVENT, (message) => this.trigger(SELF_CONNECTED_EVENT, message));
    this.currentSocket.on(USER_DISCONNECTED_EVENT, (message) => this.trigger(USER_DISCONNECTED_EVENT, message));
    this.currentSocket.on(APP_OPENED_EVENT, (message) => this.trigger(APP_OPENED_EVENT, message));
    this.currentSocket.on(COMPONENT_UPDATE_EVENT, (message) => this.trigger(COMPONENT_UPDATE_EVENT, message));
    this.currentSocket.on(HEATMAP_UPDATE_EVENT, (message) => this.trigger(HEATMAP_UPDATE_EVENT, message));
    this.currentSocket.on(HIGHLIGHTING_UPDATE_EVENT, (message) => this.trigger(HIGHLIGHTING_UPDATE_EVENT, message));
    this.currentSocket.on(MOUSE_PING_UPDATE_EVENT, (message) => this.trigger(MOUSE_PING_UPDATE_EVENT, message));
    this.currentSocket.on(PING_UPDATE_EVENT, (message) => this.trigger(PING_UPDATE_EVENT, message));
    this.currentSocket.on(TIMESTAMP_UPDATE_EVENT, (message) => this.trigger(TIMESTAMP_UPDATE_EVENT, message));
    this.currentSocket.on(USER_CONTROLLER_CONNECT_EVENT, (message) => this.trigger(USER_CONTROLLER_CONNECT_EVENT, message));
    this.currentSocket.on(USER_CONTROLLER_DISCONNECT_EVENT, (message) => this.trigger(USER_CONTROLLER_DISCONNECT_EVENT, message));
    this.currentSocket.on(USER_POSITIONS_EVENT, (message) => this.trigger(USER_POSITIONS_EVENT, message));
    this.currentSocket.on(TIMESTAMP_UPDATE_TIMER_EVENT, (message) => this.trigger(TIMESTAMP_UPDATE_TIMER_EVENT, message));
    this.currentSocket.on(OBJECT_MOVED_EVENT, (message) => this.trigger(OBJECT_MOVED_EVENT, message));
    this.currentSocket.on(APP_CLOSED_EVENT, (message) => this.trigger(APP_CLOSED_EVENT, message));
    this.currentSocket.on(DETACHED_MENU_CLOSED_EVENT, (message) => this.trigger(DETACHED_MENU_CLOSED_EVENT, message));
    this.currentSocket.on(MENU_DETACHED_EVENT, (message) => this.trigger(MENU_DETACHED_EVENT, message));
    this.currentSocket.on(SPECTATING_UPDATE_EVENT, (message) => this.trigger(SPECTATING_UPDATE_EVENT, message));

  }

  closeSocket() {
    if (this.currentSocketUrl)
      this.websockets.closeSocketFor(this.currentSocketUrl);
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
    this.currentSocket?.off('message', this.messageHandler);
    this.currentSocket?.off('close', this.closeHandler);
    this.currentSocket = null;
    this.currentSocketUrl = null;
  }

  private messageHandler(event: any) {
    const message = JSON.parse(event.data);
    this.debug(`Got a message${message.event}`);
    if (message.event === FORWARDED_EVENT) {
      this.trigger(message.originalMessage.event, message);
    } else if (message.event === RESPONSE_EVENT) {
      const handler = this.responseHandlers.get(message.nonce);
      if (handler) handler(message.response);
    } else {
      this.trigger(message.event, message);
    }
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

  isWebSocketOpen(): boolean {
    return this.currentSocket != null && this.currentSocket.connected;
  }

  reset() {
    this.currentSocket?.close;
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
  awaitResponse<T>({
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
