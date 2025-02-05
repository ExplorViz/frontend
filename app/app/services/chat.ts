import Service, { inject as service } from '@ember/service';
import { registerDestructor } from '@ember/destroyable';
import collaborationSession from 'explorviz-frontend/services/collaboration/collaboration-session';
import WebSocketService from 'explorviz-frontend/services/collaboration/web-socket';
import MessageSender from 'explorviz-frontend/services/collaboration/message-sender';
import * as THREE from 'three';
import LocalUser from 'explorviz-frontend/services/collaboration/local-user';
import {
  CHAT_MESSAGE_EVENT,
  ChatMessage,
} from 'react-lib/src/utils/collaboration/web-socket-messages/receivable/chat-message';
import {
  CHAT_SYNC_EVENT,
  ChatSynchronizeMessage,
} from 'react-lib/src/utils/collaboration/web-socket-messages/receivable/chat-syncronization';
import {
  MESSAGE_DELETE_EVENT,
  MessageDeleteEvent,
} from 'react-lib/src/utils/collaboration/web-socket-messages/sendable/delete-message';
import { ForwardedMessage } from 'react-lib/src/utils/collaboration/web-socket-messages/receivable/forwarded';
import { useChatStore } from 'react-lib/src/stores/chat.ts';
import { useToastHandlerStore } from 'react-lib/src/stores/toast-handler';

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
  set userIdMuteList(value) {
    useChatStore.setState({ userIdMuteList: value });
  }

  // @tracked
  get userIdMuteList(): string[] | undefined {
    return useChatStore.getState().userIdMuteList;
  }

  // @tracked
  get chatMessages(): ChatMessageInterface[] {
    return useChatStore.getState().chatMessages;
  }

  set chatMessages(value) {
    useChatStore.setState({ chatMessages: value });
  }

  set filteredChatMessages(value) {
    useChatStore.setState({
      filteredChatMessages: value,
    });
  }

  // @tracked
  get filteredChatMessages(): ChatMessageInterface[] {
    return useChatStore.getState().filteredChatMessages;
  }

  @service('collaboration/collaboration-session')
  collaborationSession!: collaborationSession;

  @service('collaboration/message-sender')
  private sender!: MessageSender;

  @service('collaboration/local-user')
  private localUser!: LocalUser;

  @service('collaboration/web-socket')
  private webSocket!: WebSocketService;

  // @tracked
  get msgId(): number {
    return useChatStore.getState().msgId;
  }

  set msgId(value) {
    useChatStore.setState({ msgId: value });
  }

  // @tracked
  get deletedMessage(): boolean {
    return useChatStore.getState().deletedMessage;
  } // Can be adjusted to 'needSynchronization' for exmaple, to synchronize chat whenever necessary..

  set deletedMessage(value) {
    useChatStore.setState({ deletedMessage: value });
  }

  get deletedMessageIds(): number[] {
    return useChatStore.getState().deletedMessageIds;
  }

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
      useToastHandlerStore
        .getState()
        .showInfoToastMessage(`Message received: ` + msg);
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
    useToastHandlerStore.getState().showErrorToastMessage('Message(s) deleted');
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
    return useChatStore.getState().findEventByUserId(userId, eventType);
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
    return useChatStore.getState().isUserMuted(userId);
  }

  filterChat(filterMode: string, filterValue: string) {
    useChatStore.getState().filterChat(filterMode, filterValue);
  }

  clearFilter() {
    this.filteredChatMessages = this.chatMessages;
  }

  private applyCurrentFilter(
    filterMode: string = '',
    filterValue: string = ''
  ) {
    useChatStore.getState().applyCurrentFilter(filterMode, filterValue);
  }

  private getTime() {
    return useChatStore.getState().getTime();
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
    useToastHandlerStore.getState().showInfoToastMessage('Synchronized');
  }
}

// DO NOT DELETE: this is how TypeScript knows how to look up your services.
declare module '@ember/service' {
  interface Registry {
    chat: ChatService;
  }
}
