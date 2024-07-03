import Service, { inject as service } from '@ember/service';
import { tracked } from '@glimmer/tracking';
import ToastHandlerService from './toast-handler';
import collaborationSession from 'explorviz-frontend/services/collaboration-session';
import * as THREE from 'three';

interface ChatMessage {
  msgId: number;
  userName: string;
  userColor: THREE.Color;
  timestamp: string;
  message: string;
}

export default class ChatService extends Service {

  @tracked
  userIdMuteList?: string[];

  @tracked
  chatMessages: ChatMessage[] = [];

  @tracked 
  filteredChatMessages: ChatMessage[] = [];

  @service('toast-handler')
  toastHandler!: ToastHandlerService;

  @service('collaboration-session')
  collaborationSession!: collaborationSession;

  @tracked
  msgId: number = 1;

  addChatMessage(userId: string, msg: string) {
    const user = this.collaborationSession.lookupRemoteUserById(userId);
    const userName = user?.userName || 'You';
    const userColor = user?.color || new THREE.Color(0,0,0);
    const timestamp = this.getTime();
    
    const chatMessage: ChatMessage = {
      msgId: this.msgId++,
      userName, userColor,
      timestamp,
      message: msg
    };

    this.chatMessages = [...this.chatMessages, chatMessage];
    this.applyCurrentFilter();
  }

  removeChatMessage(messageId: number) {
    this.chatMessages = this.chatMessages.filter(msg => msg.msgId !== messageId);
    //this.updateFilteredMessages();
  }

  muteUserById(userId: string) {

  }

  unmuteUserById(userId: string) {

  }

  filterChat(filterMode: string, filterValue: string) {
    this.applyCurrentFilter(filterMode, filterValue);
  }

  clearFilter() {
    this.filteredChatMessages = this.chatMessages;
  }

  private applyCurrentFilter(filterMode: string = '', filterValue: string = '') {
    if (!filterMode || !filterValue) {
      this.filteredChatMessages = this.chatMessages;
    } else {
      switch (filterMode) {
        case 'UserId':
          this.filteredChatMessages = this.chatMessages.filter(msg => msg.userName === filterValue);
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
}

// DO NOT DELETE: this is how TypeScript knows how to look up your services.
declare module '@ember/service' {
  interface Registry {
    'chat': ChatService;
  }
}
