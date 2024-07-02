import Service, { inject as service } from '@ember/service';
import { tracked } from '@glimmer/tracking';
import ToastHandlerService from './toast-handler';
import collaborationSession from 'explorviz-frontend/services/collaboration-session';
import * as THREE from 'three';

interface ChatMessage {
  userName: string;
  userColor: THREE.Color;
  message: string;
}

export default class ChatService extends Service {

  @tracked
  userIdMuteList?: string[];

  @tracked
  private chatMessagesByUser = new Map<string, string[]>;

  @tracked
  private chatMessageByEvents: string[] = [];

  @tracked
  private chatMessages: ChatMessage[] = [];

  @service('toast-handler')
  toastHandler!: ToastHandlerService;

  @service('collaboration-session')
  collaborationSession!: collaborationSession;


  getChatMessagesByUserId(userId: string) {
    if(this.chatMessagesByUser.has(userId)) {
      return this.chatMessagesByUser.get(userId);
    } else {
      return [];
    }
  }

  addChatMessage(userId: string, msg: string) {
    const user = this.collaborationSession.lookupRemoteUserById(userId);
    const userName = user?.userName || 'You';
    const userColor = user?.color || new THREE.Color(0,0,0);
    
    const chatMessage: ChatMessage = { userName, userColor, message: msg };
    this.chatMessages = [...this.chatMessages, chatMessage];
    //this.chatMessagesByUser.set(userId, [...this.getChatMessagesByUserId(userId) as [], msg]);
    /* TODO: User or Event message?
    if(user msg) {
      this.chatMessagesByUser.set(userId, ..)
    } else {
      this.chatMessagesByEvents.set(userId, ..)
    }
    */
  }

  removeChatMessage(userId: string, msg: string) {
  }

  muteUserById(userId: string) {
    // this.userIdMuteList?.
  }

  unmuteUserById(userId: string) {
    // this.userIdMuteList?.remove(userId);
  }

  filterChat(filterMode: string) {
    /* TODO: Filter by UserId, by Users, by Events
    if(filterMode == 'Events') {

    } else {

    }
    */
  }
}

// DO NOT DELETE: this is how TypeScript knows how to look up your services.
declare module '@ember/service' {
  interface Registry {
    'chat': ChatService;
  }
}
