import Component from '@glimmer/component';
import { inject as service } from '@ember/service';
import { action } from '@ember/object';
import LocalUser from 'explorviz-frontend/services/collaboration/local-user';
import collaborationSession from 'explorviz-frontend/services/collaboration/collaboration-session';
import ChatService from 'explorviz-frontend/services/chat';
import ToastHandlerService from 'explorviz-frontend/services/toast-handler';
import HighlightingService from 'explorviz-frontend/services/highlighting-service';
import { tracked } from '@glimmer/tracking';
import * as THREE from 'three';
import { next } from '@ember/runloop';

interface chatUser {
  id: string;
  name: string;
}

export default class ChatBox extends Component {
  @service('collaboration/local-user')
  private localUser!: LocalUser;

  @service('collaboration/collaboration-session')
  collaborationSession!: collaborationSession;

  @service('chat')
  chatService!: ChatService;

  @service('toast-handler')
  toastHandler!: ToastHandlerService;

  @service('highlighting-service')
  private highlightingService!: HighlightingService;

  @tracked
  openFilterOptions = false;

  @tracked
  openDeleteActions = false;

  @tracked
  isFilterEnabled = false;

  @tracked
  filterMode = '';

  @tracked
  filterValue = '';

  @tracked
  usersInChat: chatUser[] = [];

  @tracked selectedMessages: Set<number> = new Set();

  get userIsHost() {
    return this.localUser.isHost;
  }

  get filteredMessages() {
    return this.chatService.filteredChatMessages;
  }

  get deletedMessage() {
    const value = this.chatService.deletedMessage;
    next(this, function resetDeletedMessage() {
      this.chatService.deletedMessage = false;
    });
    return value;
  }

  @action
  deleteMessageOnEvent() {
    const messageIds = this.chatService.deletedMessageIds;

    messageIds.forEach((msg) => {
      this.removeMessage(msg);
    });

    this.chatService.deletedMessageIds.clear();
  }

  @action
  toggleFilter() {
    this.openFilterOptions = !this.openFilterOptions;
  }

  @action
  toggleDeleteAction() {
    this.openDeleteActions = !this.openDeleteActions;
  }

  @action
  selectMessage(event: any, chatMessage: any) {
    const checkbox = event.target as HTMLInputElement;

    if (checkbox.checked) {
      this.selectedMessages.add(chatMessage.msgId);
    } else {
      this.selectedMessages.delete(chatMessage.msgId);
    }
  }

  @action
  deleteSelectedMessages() {
    const messageIds: number[] = [];
    this.selectedMessages.forEach((messageId) => {
      messageIds.push(messageId);
    });
    this.removeUserMessage(messageIds);
    this.selectedMessages.clear();
    this.toggleDeleteAction();
  }

  @action
  toggleCheckbox(event: Event) {
    const target = event.target as HTMLInputElement;
    this.isFilterEnabled = target.checked;
    if (!this.isFilterEnabled) {
      this.chatService.clearFilter();
    } else {
      this.applyFilter();
    }
  }

  @action
  setFilterMode(mode: string) {
    this.chatService.clearFilter();
    if (this.isFilterEnabled) {
      this.clearChat('.chat-thread.filtered');
    } else {
      this.clearChat('.chat-thread.normal');
    }
    this.filterMode = mode;
    this.applyFilter();
  }

  @action
  updateFilterValue(event: Event) {
    if (this.isFilterEnabled) {
      const target = event.target as HTMLInputElement;
      this.filterValue = target.value;
      this.applyFilter();
    }
  }

  @action
  applyFilter() {
    if (this.isFilterEnabled) {
      this.clearChat('.chat-thread.filtered');
    } else {
      this.clearChat('.chat-thread.normal');
    }
    this.chatService.filterChat(this.filterMode, this.filterValue);
  }

  @action
  synchronize() {
    if (this.collaborationSession.connectionStatus == 'offline') {
      this.toastHandler.showErrorToastMessage("Can't synchronize with server");
      return;
    }
    this.chatService.clearFilter();
    this.clearChat('.chat-thread');
    this.chatService.synchronizeWithServer();
  }

  @action
  downloadChat() {
    const chatMessages = this.chatService.chatMessages;
    const chatContent = chatMessages
      .map(
        (msg) =>
          `${msg.timestamp} ${msg.userName}(${msg.userId}): ${msg.message}`
      )
      .join('\n');

    const blob = new Blob([chatContent], { type: 'text/plain' });
    const url = window.URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = 'chat.txt'; //TODO: Change filename to landscape token + room id and date?
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
    const userId = this.localUser.userId;

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
    eventType: string;
    eventData: any[];
  }) {
    // Check filter selection
    const activeUserFilter =
      this.filterValue ===
        chatMessage.userName + '(' + chatMessage.userId + ')' &&
      this.filterMode === 'UserId';

    const activeEventFilter =
      this.filterMode === 'Events' && chatMessage.isEvent;

    const shouldDisplayMessage = this.isFilterEnabled
      ? activeUserFilter || activeEventFilter
      : true;

    if (!shouldDisplayMessage) {
      return;
    }

    // Post message into normal chat or filtered chat depending on filter
    const chatThreadClass = this.isFilterEnabled
      ? '.chat-thread.filtered'
      : '.chat-thread.normal';
    const chatThread = document.querySelector(chatThreadClass) as HTMLElement;
    if (chatThread) {
      // If message already exists, don't post it again
      const existingMessage = chatThread.querySelector(
        `.message-container[data-message-id="${chatMessage.msgId}"]`
      );
      if (existingMessage) {
        return;
      }

      // Create container div for the message
      const messageContainer = document.createElement('div');
      messageContainer.classList.add('message-container');
      chatThread.appendChild(messageContainer);

      // Create and add the User on top of the message container
      if (!chatMessage.isEvent) {
        const userDiv = document.createElement('div');
        userDiv.textContent =
          chatMessage.userId !== 'unknown'
            ? `${chatMessage.userName}(${chatMessage.userId})`
            : `${chatMessage.userName}`;
        userDiv.classList.add('User');
        userDiv.style.color = `rgb(${chatMessage.userColor.r * 255}, ${chatMessage.userColor.g * 255}, ${chatMessage.userColor.b * 255})`;
        messageContainer.appendChild(userDiv);
      }

      // Add the message with a unique id attribute to the container
      const messageLi = document.createElement('li');
      messageLi.textContent = chatMessage.message;
      const messageClass = chatMessage.isEvent ? 'event-message' : 'Message';
      messageLi.classList.add(messageClass);
      messageContainer.setAttribute(
        'data-message-id',
        chatMessage.msgId.toString()
      );
      messageContainer.appendChild(messageLi);

      // Add the button for replayability of certain events
      if (
        (chatMessage.isEvent && chatMessage.eventType == 'ping') ||
        chatMessage.eventType === 'highlight'
      ) {
        const eventButton = document.createElement('Button');
        eventButton.textContent = 'Replay';
        eventButton.classList.add('event-button');
        eventButton.onclick = () => this.handleEventClick(chatMessage);

        messageLi.appendChild(eventButton);
      }

      // Add the checkbox for message deletion
      if (this.localUser.isHost) {
        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.value = chatMessage.msgId.toString();
        checkbox.classList.add('delete-checkbox');
        checkbox.onchange = (event) => this.selectMessage(event, chatMessage);
        messageLi.appendChild(checkbox);
      }

      // Add the timestamp at the end of the message
      const timestampDiv = document.createElement('div');
      timestampDiv.textContent = chatMessage.timestamp;
      timestampDiv.classList.add('chat-timestamp');
      messageLi.appendChild(timestampDiv);

      this.scrollChatToBottom();
      this.addUserToChat(chatMessage.userId, chatMessage.userName);
    }
  }

  private handleEventClick(chatMessage: {
    msgId: number;
    userId: string;
    userName: string;
    userColor: THREE.Color;
    timestamp: string;
    message: string;
    isEvent: boolean;
    eventType: string;
    eventData: any[];
  }): any {
    if (chatMessage.eventData.length == 0) {
      this.toastHandler.showErrorToastMessage('No event data');
      return;
    }

    const userId = chatMessage.userId;
    switch (chatMessage.eventType) {
      case 'ping':
        {
          const objId = chatMessage.eventData.objectAt(0);
          const pingPos = chatMessage.eventData.objectAt(1);
          const pingDurationInMs = chatMessage.eventData.objectAt(2);
          this.localUser.pingReplay(userId, objId, pingPos, pingDurationInMs);
        }
        break;
      case 'highlight':
        {
          const appId = chatMessage.eventData.objectAt(0);
          const entityId = chatMessage.eventData.objectAt(1);
          this.highlightingService.highlightReplay(userId, appId, entityId);
        }
        break;
      default:
        this.toastHandler.showErrorToastMessage('Unknown event');
    }
  }

  removeUserMessage(messageId: number[]) {
    this.chatService.removeChatMessage(messageId);
    messageId.forEach((msg) => this.removeMessage(msg));
    //this.removeMessage(messageId);
  }

  private addUserToChat(id: string, userName: string) {
    const userExists = this.usersInChat.some((user) => user.id === id);
    if (!userExists) {
      const name = userName + '(' + id + ')';
      this.usersInChat.push({ id, name });
    }
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
        }
      }
    }
  }

  private clearChat(thread: string) {
    const chatThread = document.querySelector(thread) as HTMLElement;
    if (chatThread) {
      const messages = document.querySelectorAll('.message-container');
      messages.forEach((msg) => msg.remove());
      this.filteredMessages.forEach((chatMessage) => {
        const messageToRemove = chatThread.querySelector(
          `.message-container[data-message-id="${chatMessage.msgId}"]`
        );
        if (messageToRemove) {
          messageToRemove.remove();
        }
      });
      const messageItems = document.querySelectorAll('.message-item');
      messageItems.forEach((msgItem) => msgItem.remove());
    }
  }

  private scrollChatToBottom() {
    const chatThread = document.querySelector('.chat-thread') as HTMLElement;
    if (chatThread) {
      chatThread.scrollTop = chatThread.scrollHeight;
    }
  }
}
