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
}

export default class ChatService extends Service {
  @tracked
  userIdMuteList?: string[];

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

  sendChatMessage(userId: string, msg: string) {
    if (this.collaborationSession.connectionStatus == 'offline') {
      this.addChatMessage(userId, msg);
    } else {
      const timestamp = this.getTime();
      const userName = this.localUser.userName;
      this.sender.sendChatMessage(userId, msg, userName, timestamp);
    }
  }

  addChatMessage(userId: string, msg: string, username: string = '', time: string = '') {
    var userName;
    var userColor;
    var timestamp;

    if(!(userId == this.localUser.userId)) {
      const user = this.collaborationSession.lookupRemoteUserById(userId);
      userName = user?.userName || username;
      userColor = user?.color || new THREE.Color(0,0,0);
      timestamp = time;
    } else {
      userName = this.localUser.userName;
      userColor = this.localUser.color;
      timestamp = time === '' ? this.getTime() : time;
    }

    const chatMessage: ChatMessageInterface = {
      msgId: this.msgId++,
      userId,
      userName,
      userColor,
      timestamp,
      message: msg,
    };

    this.chatMessages = [...this.chatMessages, chatMessage];
    this.applyCurrentFilter();
  }

  removeChatMessage(messageId: number) {
    this.chatMessages = this.chatMessages.filter(
      (msg) => msg.msgId !== messageId
    );
    //this.removeChatMessageFromServer(messageId);
  }

  muteUserById() {}

  unmuteUserById() {}

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
          // TODO: Implement event filtering logic here
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

  syncChatMessages(messages: ChatSynchronizeMessage[]) {
    this.chatMessages = [];
    messages.forEach((msg) =>
      this.addChatMessage(msg.userId, msg.msg, msg.userName, msg.timestamp)
    );
    this.toastHandler.showInfoToastMessage("Synchronized")
  }
}

// DO NOT DELETE: this is how TypeScript knows how to look up your services.
declare module '@ember/service' {
  interface Registry {
    chat: ChatService;
  }
}
