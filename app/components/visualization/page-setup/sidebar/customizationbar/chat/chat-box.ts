import Component from '@glimmer/component';
import { inject as service } from '@ember/service';
import { action } from '@ember/object';
import LocalUser from 'collaboration/services/local-user';
import MessageSender from 'collaboration/services/message-sender';
import collaborationSession from 'explorviz-frontend/services/collaboration-session';
import ChatService from 'explorviz-frontend/services/chat';
import ToastHandlerService from 'explorviz-frontend/services/toast-handler';
import { tracked } from '@glimmer/tracking';

interface chatUser {
  id: string;
  name: string;
}

export default class ChatBox extends Component {
  @service('local-user')
  private localUser!: LocalUser;

  @service('message-sender')
  private sender!: MessageSender;

  @service('collaboration-session')
  collaborationSession!: collaborationSession;

  @service('chat')
  chatService!: ChatService;

  @service('toast-handler')
  toastHandler!: ToastHandlerService;

  @tracked
  isFiltering = false;

  @tracked
  isFilterEnabled = false;

  @tracked
  filterMode = '';

  @tracked
  filterValue = '';

  @tracked
  usersInChat: chatUser[] = [];

  @action
  toggleFilter() {
    this.isFiltering = !this.isFiltering;
  }

  @action
  toggleCheckbox(event: Event) {
    const target = event.target as HTMLInputElement;
    this.isFilterEnabled = target.checked;
    if (!this.isFilterEnabled) {
      const mode = this.filterMode;
      const value = this.filterValue;
      this.filterMode = mode;
      this.filterValue = value;
      this.chatService.clearFilter();
    } else {
      this.applyFilter();
    }
  }

  @action
  setFilterMode(mode: string) {
    this.filterMode = mode;
    this.applyFilter();
  }

  @action
  updateFilterMode(event: Event) {
    const target = event.target as HTMLSelectElement;
    this.filterMode = target.value;
    this.applyFilter();
  }

  @action
  updateFilterValue(event: Event) {
    const target = event.target as HTMLInputElement;
    this.filterValue = target.value;
    this.applyFilter();
  }

  @action
  applyFilter() {
    if (this.isFilterEnabled) {
      this.clearChat('.chat-thread.filtered');
      this.chatService.filterChat(this.filterMode, this.filterValue);
    }
  }

  get filteredMessages() {
    return this.chatService.filteredChatMessages;
  }

  @action
  synchronize() {
    if (this.collaborationSession.connectionStatus == 'offline') {
      this.toastHandler.showErrorToastMessage("Can't synchronize with server");
      return;
    }
    this.clearChat('.chat-thread.normal');
    this.clearChat('.chat-thread.filtered');
    this.sender.sendChatSynchronize();
  }

  @action
  downloadChat() {
    const chatMessages = this.chatService.chatMessages;
    const chatContent = chatMessages
      .map((msg) => `${msg.timestamp} ${msg.userName}(${msg.userId}): ${msg.message}`)
      .join('\n');

    const blob = new Blob([chatContent], { type: 'text/plain' });
    const url = window.URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = 'chat.txt'; //TODO: Change filename to landscape token + id and date?
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  }

  @action
  insertMessage() {
    const inputElement = document.querySelector(
      '.message-input'
    ) as HTMLInputElement;
    const userId = this.localUser.userId; // Put into chatService?

    const msg = inputElement.value.trim();
    if (msg.trim() === '') {
      return;
    }

    this.chatService.sendChatMessage(userId, msg, false);
    inputElement.value = '';
  }

  @action
  postMessage(chatMessage: {
    msgId: number;
    userId: string;
    userName: string;
    userColor: THREE.Color;
    timestamp: string;
    message: string;
    isEvent: boolean;
  }) {
    const chatThreadClass =
      this.isFilterEnabled &&
      chatMessage.userName + '(' + chatMessage.userId + ')' ===
        this.filterValue &&
      this.filterMode !== 'Events'
        ? '.chat-thread.filtered'
        : '.chat-thread.normal';
    const chatThread = document.querySelector(chatThreadClass) as HTMLElement;
    if (chatThread) {
      const messageContainer = document.createElement('div');
      messageContainer.classList.add('message-container');
      chatThread.appendChild(messageContainer);

      const userDiv = document.createElement('div');
      userDiv.textContent =
        chatMessage.userId !== 'unknown'
          ? `${chatMessage.userName}(${chatMessage.userId})`
          : `${chatMessage.userName}`;
      userDiv.classList.add('User');
      userDiv.style.color = `rgb(${chatMessage.userColor.r * 255}, ${chatMessage.userColor.g * 255}, ${chatMessage.userColor.b * 255})`;
      messageContainer.appendChild(userDiv);

      const messageLi = document.createElement('li');
      messageLi.textContent = chatMessage.message;
      messageLi.classList.add('Message');
      messageContainer.setAttribute(
        'data-message-id',
        chatMessage.msgId.toString()
      );
      messageContainer.appendChild(messageLi);

      if (chatMessage.isEvent) {
      // Erstelle einen Button für Ereignisnachrichten
      const eventButton = document.createElement('button');
      eventButton.textContent = 'Event';
      eventButton.classList.add('event-button');
      eventButton.onclick = () => this.handleEventClick(chatMessage);

      // Füge den Button zur Nachricht hinzu
      messageLi.appendChild(eventButton);
      }
      const timestampDiv = document.createElement('div');
      timestampDiv.textContent = chatMessage.timestamp;
      timestampDiv.classList.add('chat-timestamp');
      messageLi.appendChild(timestampDiv);

      this.scrollChatToBottom();
      this.addUserToChat(chatMessage.userId, chatMessage.userName);
    }
  }

  handleEventClick(chatMessage: { msgId: number; userId: string; userName: string; userColor: THREE.Color; timestamp: string; message: string; isEvent: boolean; }): any {
    this.toastHandler.showErrorToastMessage("Not implemented yet");
  }

  private addUserToChat(id: string, userName: string) {
    const userExists = this.usersInChat.some((user) => user.id === id);
    //TODO: find solution for local chat messages (->merge?..)
    if (!userExists) {
      const name = userName + '(' + id + ')';
      this.usersInChat.push({ id, name });
    }
  }

  @action
  removeUserMessage(messageId: number) {
    this.chatService.removeChatMessage(messageId);
    this.removeMessage(messageId);
  }

  @action
  private removeMessage(messageId: number) {
    const chatThread = document.querySelector('.chat-thread') as HTMLElement;
    if (chatThread) {
      if (
        this.filteredMessages.some((message) => message.msgId === messageId)
      ) {
        const messageToRemove = chatThread.querySelector(
          `.message-container[data-message-id="${messageId}"]`
        );
        if (messageToRemove) {
          messageToRemove.remove();
          this.chatService.removeChatMessage(messageId);
          //this.toastHandler.showInfoToastMessage('Removed message');
        }
      }
    }
  }

  private clearChat(thread: string) {
    const chatThread = document.querySelector(thread) as HTMLElement;
    if (chatThread) {
      this.chatService.filteredChatMessages.forEach((chatMessage) => {
        const messageToRemove = chatThread.querySelector(
          `.message-container[data-message-id="${chatMessage.msgId}"]`
        );
        if (messageToRemove) {
          messageToRemove.remove();
        }
      });
    }
  }

  private scrollChatToBottom() {
    const chatThread = document.querySelector('.chat-thread') as HTMLElement;
    if (chatThread) {
      chatThread.scrollTop = chatThread.scrollHeight;
    }
  }
}
