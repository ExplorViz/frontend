import { createStore } from "zustand/vanilla";

import { VisualizationMode } from "react-lib/src/stores/collaboration/local-user";
import { INITIAL_LANDSCAPE_EVENT } from "react-lib/src/utils/collaboration//web-socket-messages/receivable/landscape";
import { ANNOTATION_EDIT_RESPONSE_EVENT } from "react-lib/src/utils/collaboration//web-socket-messages/receivable/response/annotation-edit-response";
import { ANNOTATION_RESPONSE_EVENT } from "react-lib/src/utils/collaboration//web-socket-messages/receivable/response/annotation-response";
import { ANNOTATION_UPDATED_RESPONSE_EVENT } from "react-lib/src/utils/collaboration//web-socket-messages/receivable/response/annotation-updated-response";
import { SELF_CONNECTED_EVENT } from "react-lib/src/utils/collaboration//web-socket-messages/receivable/self-connected";
import { TIMESTAMP_UPDATE_TIMER_EVENT } from "react-lib/src/utils/collaboration//web-socket-messages/receivable/timestamp-update-timer";
import { USER_CONNECTED_EVENT } from "react-lib/src/utils/collaboration//web-socket-messages/receivable/user-connected";
import { USER_DISCONNECTED_EVENT } from "react-lib/src/utils/collaboration//web-socket-messages/receivable/user-disconnect";
import { ALL_HIGHLIGHTS_RESET_EVENT } from "react-lib/src/utils/collaboration//web-socket-messages/sendable/all-highlights-reset";
import { ANNOTATION_CLOSED_EVENT } from "react-lib/src/utils/collaboration//web-socket-messages/sendable/annotation-closed";
import { ANNOTATION_EDIT_EVENT } from "react-lib/src/utils/collaboration//web-socket-messages/sendable/annotation-edit";
import { ANNOTATION_OPENED_EVENT } from "react-lib/src/utils/collaboration//web-socket-messages/sendable/annotation-opened";
import { ANNOTATION_UPDATED_EVENT } from "react-lib/src/utils/collaboration//web-socket-messages/sendable/annotation-updated";
import { APP_OPENED_EVENT } from "react-lib/src/utils/collaboration//web-socket-messages/sendable/app-opened";
import { CHANGE_LANDSCAPE_EVENT } from "react-lib/src/utils/collaboration//web-socket-messages/sendable/change-landscape";
import { COMPONENT_UPDATE_EVENT } from "react-lib/src/utils/collaboration//web-socket-messages/sendable/component-update";
import { HEATMAP_UPDATE_EVENT } from "react-lib/src/utils/collaboration//web-socket-messages/sendable/heatmap-update";
import { HIGHLIGHTING_UPDATE_EVENT } from "react-lib/src/utils/collaboration//web-socket-messages/sendable/highlighting-update";
import { MOUSE_PING_UPDATE_EVENT } from "react-lib/src/utils/collaboration//web-socket-messages/sendable/mouse-ping-update";
import { PING_UPDATE_EVENT } from "react-lib/src/utils/collaboration//web-socket-messages/sendable/ping-update";
import { SHARE_SETTINGS_EVENT } from "react-lib/src/utils/collaboration//web-socket-messages/sendable/share-settings";
import { SPECTATING_UPDATE_EVENT } from "react-lib/src/utils/collaboration//web-socket-messages/sendable/spectating-update";
import { SYNC_ROOM_STATE_EVENT } from "react-lib/src/utils/collaboration//web-socket-messages/sendable/synchronize-room-state";
import { TIMESTAMP_UPDATE_EVENT } from "react-lib/src/utils/collaboration//web-socket-messages/sendable/timestamp-update";
import { Nonce } from "react-lib/src/utils/collaboration//web-socket-messages/types/nonce";
import { MENU_DETACHED_RESPONSE_EVENT } from "react-lib/src/utils/extended-reality/vr-web-wocket-messages/receivable/response/menu-detached";
import { OBJECT_CLOSED_RESPONSE_EVENT } from "react-lib/src/utils/extended-reality/vr-web-wocket-messages/receivable/response/object-closed";
import { OBJECT_GRABBED_RESPONSE_EVENT } from "react-lib/src/utils/extended-reality/vr-web-wocket-messages/receivable/response/object-grabbed";
import { JOIN_VR_EVENT } from "react-lib/src/utils/extended-reality/vr-web-wocket-messages/sendable/join-vr";
import { OBJECT_MOVED_EVENT } from "react-lib/src/utils/extended-reality/vr-web-wocket-messages/sendable/object-moved";
import { APP_CLOSED_EVENT } from "react-lib/src/utils/extended-reality/vr-web-wocket-messages/sendable/request/app-closed";
import { DETACHED_MENU_CLOSED_EVENT } from "react-lib/src/utils/extended-reality/vr-web-wocket-messages/sendable/request/detached-menu-closed";
import { MENU_DETACHED_EVENT } from "react-lib/src/utils/extended-reality/vr-web-wocket-messages/sendable/request/menu-detached";
import { USER_CONTROLLER_CONNECT_EVENT } from "react-lib/src/utils/extended-reality/vr-web-wocket-messages/sendable/user-controller-connect";
import { USER_CONTROLLER_DISCONNECT_EVENT } from "react-lib/src/utils/extended-reality/vr-web-wocket-messages/sendable/user-controller-disconnect";
import { USER_POSITIONS_EVENT } from "react-lib/src/utils/extended-reality/vr-web-wocket-messages/sendable/user-positions";
import { CHAT_MESSAGE_EVENT } from "react-lib/src/utils/collaboration//web-socket-messages/receivable/chat-message";
import { CHAT_SYNC_EVENT } from "react-lib/src/utils/collaboration//web-socket-messages/receivable/chat-syncronization";
import { io, Socket } from "socket.io-client";
import { USER_KICK_EVENT } from "react-lib/src/utils/collaboration//web-socket-messages/sendable/kick-user";
import { MESSAGE_DELETE_EVENT } from "react-lib/src/utils/collaboration//web-socket-messages/sendable/delete-message";

type ResponseHandler<T> = (msg: T) => void;

// TODO read .env
// const { collaborationService } = ENV.backendAddresses;

// TODO Evented

export const SELF_DISCONNECTED_EVENT = "self_disconnected";

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

interface WebSocketState {
  currentSocket: Socket | null;
  currentSocketUrl: string | null;
  responseHandlers: Map<Nonce, ResponseHandler<any>>;
  lastNonce: Nonce;
}

export const useWebSocketStore = createStore<WebSocketState>((set, get) => ({
  // TODO private
  currentSocket: null, // WebSocket to send/receive messages to/from backend
  // TODO private
  currentSocketUrl: null,
  responseHandlers: new Map<Nonce, ResponseHandler<any>>(),
  lastNonce: 0,
  // TODO methods
}));
