import Service, { inject as service } from '@ember/service';
import { registerDestructor } from '@ember/destroyable';
import { tracked } from '@glimmer/tracking';
import ToastHandlerService from './toast-handler';
import collaborationSession from 'explorviz-frontend/services/collaboration-session';
import WebSocketService from 'explorviz-frontend/services/collaboration/web-socket';
import MessageSender from 'explorviz-frontend/services/collaboration/message-sender';
import * as THREE from 'three';
import LocalUser from 'explorviz-frontend/services/collaboration/local-user';
import {
  CHAT_MESSAGE_EVENT,
  ChatMessage,
} from 'explorviz-frontend/utils/collaboration/web-socket-messages/receivable/chat-message';
import {
  CHAT_SYNC_EVENT,
  ChatSynchronizeMessage,
} from 'explorviz-frontend/utils/collaboration/web-socket-messages/receivable/chat-syncronization';
import {
  MESSAGE_DELETE_EVENT,
  MessageDeleteEvent,
} from 'explorviz-frontend/utils/collaboration/web-socket-messages/sendable/delete-message';
import { ForwardedMessage } from 'explorviz-frontend/utils/collaboration/web-socket-messages/receivable/forwarded';

export interface ChatMessageInterface {
  msgId: number;
  userId: string;
  userName: string;
  userColor: THREE.Color;
  timestamp: string;
  message: string;
  isEvent?: boolean;
  eventType?: string;
  eventData?: any[];
}

export default class ChatService extends Service {
  @tracked
  userIdMuteList?: string[] = [];

  @tracked
  chatMessages: ChatMessageInterface[] = [];

  @tracked
  filteredChatMessages: ChatMessageInterface[] = [];

  @service('toast-handler')
  toastHandler!: ToastHandlerService;

  @service('collaboration/collaboration-session')
  collaborationSession!: collaborationSession;

  @service('collaboration/message-sender')
  private sender!: MessageSender;

  @service('collaboration/local-user')
  private localUser!: LocalUser;

  @service('collaboration/web-socket')
  private webSocket!: WebSocketService;

  @tracked
  msgId: number = 1;

  @tracked
  deletedMessage: boolean = false; // Can be adjusted to 'needSynchronization' for exmaple, to synchronize chat whenever necessary..

  deletedMessageIds: number[] = [];

  constructor() {
    super(...arguments);

    this.webSocket.on(CHAT_MESSAGE_EVENT, this, this.onChatMessageEvent);
    this.webSocket.on(CHAT_SYNC_EVENT, this, this.onChatSyncEvent);
    this.webSocket.on(MESSAGE_DELETE_EVENT, this, this.onMessageDeleteEvent);

    registerDestructor(this, this.cleanup);
  }

  cleanup = () => {
    this.removeEventListener();
  };

  removeEventListener() {
    this.webSocket.off(CHAT_MESSAGE_EVENT, this, this.onChatMessageEvent);
    this.webSocket.off(CHAT_SYNC_EVENT, this, this.onChatSyncEvent);
    this.webSocket.off(MESSAGE_DELETE_EVENT, this, this.onMessageDeleteEvent);
  }

  /**
   * Chat message received from backend
   */
  onChatMessageEvent({
    userId,
    originalMessage: {
      msgId,
      msg,
      userName,
      timestamp,
      isEvent,
      eventType,
      eventData,
    },
  }: ForwardedMessage<ChatMessage>) {
    if (this.localUser.userId != userId && !isEvent) {
      this.toastHandler.showInfoToastMessage(`Message received: ` + msg);
    }
    this.addChatMessage(
      msgId,
      userId,
      msg,
      userName,
      timestamp,
      isEvent,
      eventType,
      eventData
    );
  }

  /**
   * Chat synchronization event received from backend
   */
  onChatSyncEvent({
    userId,
    originalMessage,
  }: ForwardedMessage<ChatSynchronizeMessage[]>): void {
    if (this.localUser.userId == userId) {
      this.syncChatMessages(originalMessage);
    }
  }

  /**
   * Chat message delete event received from backend
   */
  onMessageDeleteEvent({
    userId,
    originalMessage,
  }: ForwardedMessage<MessageDeleteEvent>): void {
    if (userId == this.localUser.userId) {
      return;
    }
    this.removeChatMessage(originalMessage.msgIds, true);
    this.toastHandler.showErrorToastMessage('Message(s) deleted');
  }

  sendChatMessage(
    userId: string,
    msg: string,
    isEvent: boolean,
    eventType: string = '',
    eventData: any[] = []
  ) {
    if (this.collaborationSession.connectionStatus == 'offline') {
      this.addChatMessage(
        this.msgId++,
        userId,
        msg,
        '',
        '',
        isEvent,
        eventType,
        eventData
      );
    } else {
      const userName = this.localUser.userName;
      this.sender.sendChatMessage(
        userId,
        msg,
        userName,
        '',
        isEvent,
        eventType,
        eventData
      );
    }
  }

  addChatMessage(
    msgId: number,
    userId: string,
    msg: string,
    username: string = '',
    time: string = '',
    isEvent: boolean = false,
    eventType: string = '',
    eventData: any[] = []
  ) {
    let userName = username;
    let userColor = new THREE.Color(0, 0, 0);
    let timestamp = time;

    const user = this.collaborationSession.lookupRemoteUserById(userId);
    if (user) {
      userName = user.userName;
      userColor = user.color;
      timestamp = time;
    } else if (userId === this.localUser.userId) {
      userName = this.localUser.userName;
      userColor = this.localUser.color;
      timestamp = time === '' ? this.getTime() : time;
    }

    const chatMessage: ChatMessageInterface = {
      msgId,
      userId,
      userName,
      userColor,
      timestamp,
      message: msg,
      isEvent,
      eventType,
      eventData,
    };

    this.chatMessages = [...this.chatMessages, chatMessage];
    this.applyCurrentFilter();
  }

  removeChatMessage(messageId: number[], received?: boolean) {
    messageId.forEach((msgId) => {
      this.chatMessages = this.chatMessages.filter(
        (msg) => msg.msgId !== msgId
      );
    });

    if (!received) {
      this.sender.sendMessageDelete(messageId);
    } else {
      this.deletedMessage = true;
      messageId.forEach((msgId) => this.deletedMessageIds.push(msgId));
    }
  }

  findEventByUserId(userId: string, eventType: string) {
    const messages = this.chatMessages.filter(
      (msg) => msg.userId === userId && msg.eventType === eventType
    );
    return messages.length > 0;
  }

  toggleMuteStatus(userId: string) {
    const remoteUser = this.collaborationSession.getUserById(userId);
    if (!remoteUser) {
      return;
    }

    if (this.isUserMuted(userId)) {
      this.userIdMuteList =
        this.userIdMuteList?.filter((id) => userId !== id) || [];
      this.sendChatMessage(
        this.localUser.userId,
        `${remoteUser.userName}(${remoteUser.userId})` + ' was unmuted',
        true,
        'mute_event'
      );
    } else {
      this.userIdMuteList?.push(userId);
      this.sendChatMessage(
        this.localUser.userId,
        `${remoteUser.userName}(${remoteUser.userId})` + ' was muted',
        true,
        'mute_event'
      );
    }
    this.sender.sendUserMuteUpdate(userId);
  }

  isUserMuted(userId: string) {
    return this.userIdMuteList?.includes(userId);
  }

  filterChat(filterMode: string, filterValue: string) {
    this.applyCurrentFilter(filterMode, filterValue);
  }

  clearFilter() {
    this.filteredChatMessages = this.chatMessages;
  }

  private applyCurrentFilter(
    filterMode: string = '',
    filterValue: string = ''
  ) {
    if (!filterMode || !filterValue) {
      this.filteredChatMessages = this.chatMessages;
    } else {
      switch (filterMode) {
        case 'UserId':
          this.filteredChatMessages = this.chatMessages.filter(
            (msg) => msg.userName + '(' + msg.userId + ')' === filterValue
          );
          break;
        case 'Events':
          this.filteredChatMessages = this.chatMessages.filter(
            (msg) => msg.isEvent
          );
          break;
        default:
          this.filteredChatMessages = this.chatMessages;
      }
    }
  }

  private getTime() {
    const h = new Date().getHours();
    const m = new Date().getMinutes();
    return `${h}:${m < 10 ? '0' + m : m}`;
  }

  synchronizeWithServer() {
    this.sender.sendChatSynchronize();
  }

  syncChatMessages(messages: ChatSynchronizeMessage[]) {
    this.chatMessages = [];
    messages.forEach((msg) =>
      this.addChatMessage(
        msg.msgId,
        msg.userId,
        msg.msg,
        msg.userName,
        msg.timestamp,
        msg.isEvent,
        msg.eventType,
        msg.eventData
      )
    );
    this.toastHandler.showInfoToastMessage('Synchronized');
  }
}

// DO NOT DELETE: this is how TypeScript knows how to look up your services.
declare module '@ember/service' {
  interface Registry {
    chat: ChatService;
  }
}
