import Service, {inject as service} from '@ember/service';
import { tracked } from '@glimmer/tracking';
import ToastHandlerService from './toast-handler';

export default class ChatService extends Service {

  @tracked
  userIdMuteList?: string[];

  @tracked
  private chatMessagesByUser = new Map<string, string[]>;

  @tracked
  private chatMessageByEvents!: string[];

  @tracked
  private chatMessages: string[] = [];

  @service('toast-handler')
  toastHandler!: ToastHandlerService;

  getChatMessagesByUserId(userId: string) {
    if(this.chatMessagesByUser.has(userId)) {
      return this.chatMessagesByUser.get(userId);
    } else {
      return [];
    }
  }

  addChatMessage(userId: string, msg: string) {
    this.chatMessages = [...this.chatMessages, msg];

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
