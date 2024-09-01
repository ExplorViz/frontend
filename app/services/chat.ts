import Service, { inject as service } from '@ember/service';
import { tracked } from '@glimmer/tracking';
import ToastHandlerService from './toast-handler';
import collaborationSession from 'explorviz-frontend/services/collaboration-session';
import MessageSender from 'collaboration/services/message-sender';
import { ChatSynchronizeMessage } from 'collaboration/utils/web-socket-messages/receivable/chat-syncronization';
import * as THREE from 'three';
import LocalUser from 'collaboration/services/local-user';

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

  @service('collaboration-session')
  collaborationSession!: collaborationSession;

  @service('message-sender')
  private sender!: MessageSender;

  @service('local-user')
  private localUser!: LocalUser;

  @tracked
  msgId: number = 1;

  @tracked
  deletedMessage: boolean = false; // Can be adjusted to needSynchronization, so chat be synchronized whenever necessary..

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
      const timestamp = this.getTime();
      const userName = this.localUser.userName;
      this.sender.sendChatMessage(
        userId,
        msg,
        userName,
        timestamp,
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

    if (userId != this.localUser.userId) {
      const user = this.collaborationSession.lookupRemoteUserById(userId); //refactor if(user)..
      userName = user?.userName || username;
      userColor = user?.color || new THREE.Color(0, 0, 0);
      timestamp = time;
    } else {
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

    /* Put chat service into collaboration lib? */

    this.chatMessages = [...this.chatMessages, chatMessage];
    this.applyCurrentFilter();
  }

  removeChatMessage(messageId: number, received?: boolean) {
    this.chatMessages = this.chatMessages.filter(
      (msg) => msg.msgId !== messageId
    );

    if (!received) {
      this.sender.sendMessageDelete(messageId);
    } else {
      this.deletedMessage = true;
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
            (msg) => msg.isEvent === true
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
