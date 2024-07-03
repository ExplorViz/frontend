import Component from '@glimmer/component';
import { inject as service } from '@ember/service';
import { action } from '@ember/object';
import LocalUser from 'collaboration/services/local-user';
import MessageSender from 'collaboration/services/message-sender';
import collaborationSession from 'explorviz-frontend/services/collaboration-session';
import ChatService from 'explorviz-frontend/services/chat';
import ToastHandlerService from 'explorviz-frontend/services/toast-handler';
import { tracked } from '@glimmer/tracking';

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

    @action
    toggleFilter() {
        this.isFiltering = !this.isFiltering;
    }

    @action
    toggleCheckbox(event: Event) {
        const target = event.target as HTMLInputElement;
        this.isFilterEnabled = target.checked;
        if (!this.isFilterEnabled) {
            this.filterMode = '';
            this.filterValue = '';
            this.chatService.clearFilter();
        } else {
            this.applyFilter();
        }
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
            this.chatService.filterChat(this.filterMode, this.filterValue);
        }
        /*
        for(message : this.chatService.chatMessages) {
            
        }
        */
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
    postMessage(chatMessage: {msgId: number, userName: string, userColor: THREE.Color, timestamp: string, message: string}) {
        const chatThread = document.querySelector('.chat-thread') as HTMLElement;
        if (chatThread) {
            const messageContainer = document.createElement('div');
            messageContainer.classList.add('message-container');
            chatThread.appendChild(messageContainer);

            const userDiv = document.createElement('div');
            userDiv.textContent = `${chatMessage.userName} (${chatMessage.timestamp})`;
            userDiv.classList.add('User');
            userDiv.style.color = `rgb(${chatMessage.userColor.r * 255}, ${chatMessage.userColor.g * 255}, ${chatMessage.userColor.b * 255})`;
            messageContainer.appendChild(userDiv);

            const messageLi = document.createElement('li');
            messageLi.textContent = chatMessage.message;
            messageLi.classList.add('Message');
            messageContainer.setAttribute('data-message-id', chatMessage.msgId.toString());
            messageContainer.appendChild(messageLi);
            this.scrollChatToBottom();
        }
    }

    @action
    removeMessage(messageId: number) {
        //this.chatService.removeChatMessage(messageId);
        const chatThread = document.querySelector('.chat-thread') as HTMLElement;
        if (chatThread) {
            if(!this.filteredMessages.some(message => message.msgId === messageId)) {
                const messageToRemove = chatThread.querySelector(`li[data-message-id="${messageId}"]`);
                if (messageToRemove) {
                    messageToRemove.remove();
                }
            } 
        }
    }

    scrollChatToBottom() {
        const chatThread = document.querySelector('.chat-thread') as HTMLElement;
        if(chatThread) {
            chatThread.scrollTop = chatThread.scrollHeight;
        }
    }
}