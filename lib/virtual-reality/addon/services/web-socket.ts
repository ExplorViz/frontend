import Service, { inject as service } from '@ember/service';
import Evented from '@ember/object/evented';
import debugLogger from 'ember-debug-logger';
import ENV from 'explorviz-frontend/config/environment';
import { Nonce } from 'virtual-reality/utils/vr-message/util/nonce';
import { RESPONSE_EVENT } from 'virtual-reality/utils/vr-message/receivable/response';
import { FORWARDED_EVENT } from 'virtual-reality/utils/vr-message/receivable/forwarded';
import PerformanceLogger from 'collaborative-mode/services/performance-logger';

type ResponseHandler<T> = (msg: T) => void;

const { collaborationService, collaborationSocketPath } = ENV.backendAddresses;

export const SELF_DISCONNECTED_EVENT = 'self_disconnected';

export default class WebSocketService extends Service.extend(Evented) {
  @service()
  private websockets!: any;

  @service('performance-logger')
  private performanceLogger!: PerformanceLogger;

  private debug = debugLogger('WebSocketService');

  private currentSocket: any = null; // WebSocket to send/receive messages to/from backend

  private currentSocketUrl: string | null = null;

  private responseHandlers = new Map<Nonce, ResponseHandler<any>>();

  private lastNonce: Nonce = 0;

  nextNonce() {
    return ++this.lastNonce;
  }

  private getSocketUrl(ticketId: string) {
    const collaborationServiceSocket = collaborationService.replace(
      /^http(s?):\/\//i,
      'ws$1://'
    );
    return collaborationServiceSocket + collaborationSocketPath + ticketId;
  }

  async initSocket(ticketId: string) {
    this.currentSocketUrl = this.getSocketUrl(ticketId);
    this.currentSocket = this.websockets.socketFor(this.currentSocketUrl);
    this.currentSocket.on('message', this.messageHandler, this);
    this.currentSocket.on('close', this.closeHandler, this);
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
    this.currentSocket.off('message', this.messageHandler);
    this.currentSocket.off('close', this.closeHandler);
    this.currentSocket = null;
    this.currentSocketUrl = null;
  }

  private messageHandler(event: any) {
    const message = JSON.parse(event.data);
    this.debug(`Got a message${message.event}`);
    if (message.event === FORWARDED_EVENT) {
      var timerId = this.performanceLogger.start();
      this.trigger(message.originalMessage.event, message, timerId);
    } else if (message.event === RESPONSE_EVENT) {
      const handler = this.responseHandlers.get(message.nonce);
      if (handler) handler(message.response);
    } else {
      var timerId = this.performanceLogger.start();
      this.trigger(message.event, message, timerId);
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
  send<T>(msg: T) {
    if (this.isWebSocketOpen()) this.currentSocket.send(JSON.stringify(msg));
  }

  isWebSocketOpen(): boolean {
    return this.currentSocket && this.currentSocket.readyState() === 1;
  }

  reset() {
    this.currentSocket = null;
    this.currentSocketUrl = null;
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
    this.send<T>({
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
