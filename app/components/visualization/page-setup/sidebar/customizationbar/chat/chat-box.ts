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
    usersInChat: chatUser[] = []; // TODO: synchronize with server

    @action
    toggleFilter() {
        this.isFiltering = !this.isFiltering;
    }

    @action
    toggleCheckbox(event: Event) {
        const target = event.target as HTMLInputElement;
        this.isFilterEnabled = target.checked;
        if (!this.isFilterEnabled) {
            this.filterMode = this.filterMode;
            this.filterValue = this.filterValue;
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
            this.clearChat()
            this.chatService.filterChat(this.filterMode, this.filterValue);
        }
    }

    get filteredMessages() {
        return this.chatService.filteredChatMessages;
    }

    @action
    insertMessage() {
        const inputElement = document.querySelector('.message-input') as HTMLInputElement;

        const msg = inputElement.value.trim();
        if (msg.trim() === '') {
            return;
        }
        
        if(this.collaborationSession.connectionStatus == 'offline') {
            this.chatService.addChatMessage(this.localUser.userId, msg);
        } else {
            this.sender.sendChatMessage(msg);
        }

        inputElement.value = '';
    }

    @action
    postMessage(chatMessage: {msgId: number, userId: string, userName: string, userColor: THREE.Color, timestamp: string, message: string}) {
        const chatThreadClass = this.isFilterEnabled && chatMessage.userName + "(" + chatMessage.userId + ")" === this.filterValue && this.filterMode !== 'Events' ? '.chat-thread.filtered' : '.chat-thread.normal';
        const chatThread = document.querySelector(chatThreadClass) as HTMLElement;
        if (chatThread) {
            const messageContainer = document.createElement('div');
            messageContainer.classList.add('message-container');
            chatThread.appendChild(messageContainer);

            const userDiv = document.createElement('div');
            userDiv.textContent = chatMessage.userId !== 'unknown' ? `${chatMessage.userName}(${chatMessage.userId})` : `${chatMessage.userName}`;
            userDiv.classList.add('User');
            userDiv.style.color = `rgb(${chatMessage.userColor.r * 255}, ${chatMessage.userColor.g * 255}, ${chatMessage.userColor.b * 255})`;
            messageContainer.appendChild(userDiv);

            const messageLi = document.createElement('li');
            messageLi.textContent = chatMessage.message;
            messageLi.classList.add('Message');
            messageContainer.setAttribute('data-message-id', chatMessage.msgId.toString());
            messageContainer.appendChild(messageLi);

            const timestampDiv = document.createElement('div');
            timestampDiv.textContent = chatMessage.timestamp;
            timestampDiv.classList.add('chat-timestamp');
            messageLi.appendChild(timestampDiv);

            this.scrollChatToBottom();
            this.addUserToChat(chatMessage.userId, chatMessage.userName);
        }
    }

    @action
    private addUserToChat(id: string, name: string) {
        const userExists = this.usersInChat.some(user => user.id === id);
        //TODO: maybe find solution for local chat messages (merge?)
        if (!userExists) {
            name = name + "(" + id + ")";
            this.usersInChat.push({ id, name });
        }
    }

    @action
    removeFilteredMessages(chatMessages: {msgId: number, userId: string, userName: string, userColor: THREE.Color, timestamp: string, message: string}[]) {
        chatMessages.forEach(chatMessage => {this.removeMessage(chatMessage.msgId)})
    }

    @action
    removeUserMessage(messageId: number){
        this.chatService.removeChatMessage(messageId);
        this.removeMessage(messageId);
    }

    @action
    removeMessage(messageId: number) {
        const chatThread = document.querySelector('.chat-thread.filtered') as HTMLElement;
        if (chatThread) {
            if(this.filteredMessages.some(message => message.msgId === messageId)) {
                const messageToRemove = chatThread.querySelector(`.message-container[data-message-id="${messageId}"]`);
                if (messageToRemove) {
                    this.toastHandler.showInfoToastMessage("Found message here id: " + messageId + "msg: " + messageToRemove)
                    messageToRemove.remove();
                }
            }
        }
    }

    @action
    clearChat() {
        const chatThread = document.querySelector('.chat-thread.filtered') as HTMLElement;
        if (chatThread) {
            this.chatService.filteredChatMessages.forEach(chatMessage => {
                const messageToRemove = chatThread.querySelector(`.message-container[data-message-id="${chatMessage.msgId}"]`);
                if (messageToRemove) {
                    messageToRemove.remove();
                }
            })
        }
    }

    private scrollChatToBottom() {
        const chatThread = document.querySelector('.chat-thread') as HTMLElement;
        if(chatThread) {
            chatThread.scrollTop = chatThread.scrollHeight;
        }
    }
}