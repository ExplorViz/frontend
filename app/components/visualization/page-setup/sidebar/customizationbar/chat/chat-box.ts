import Component from '@glimmer/component';
import { inject as service } from '@ember/service';
import { action } from '@ember/object';
import LocalUser from 'collaboration/services/local-user';
import MessageSender from 'collaboration/services/message-sender';
import collaborationSession from 'explorviz-frontend/services/collaboration-session';
import ChatService from 'explorviz-frontend/services/chat';
import ToastHandlerService from 'explorviz-frontend/services/toast-handler';

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

    @action
    insertMessage() {
        const inputElement = document.querySelector('.message-input') as HTMLInputElement;

        const msg = inputElement.value.trim();
        if (msg.trim() === '') {
            return;
        }
        
        //post directly to chat or send to server depending on connection status
        if(this.collaborationSession.connectionStatus == 'offline') {
            this.chatService.addChatMessage(this.localUser.userId, msg);
        } else {
            this.sender.sendChatMessage(msg);
        }

        inputElement.value = '';
    }

    @action
    postMessage(chatMessage: {userName: string, userColor: THREE.Color, message: string}) {
        const chatThread = document.querySelector('.chat-thread') as HTMLElement;
        //const userName = this.chatService.name;
        if (chatThread) {
            const userDiv = document.createElement('div');
            userDiv.textContent = `${chatMessage.userName} (${this.getTime()})`;
            userDiv.classList.add('User');
            userDiv.style.color = `rgb(${chatMessage.userColor.r * 255}, ${chatMessage.userColor.g * 255}, ${chatMessage.userColor.b * 255})`;
            chatThread.appendChild(userDiv);

            const messageLi = document.createElement('li');
            messageLi.textContent = chatMessage.message;
            messageLi.classList.add('Message');
            chatThread.appendChild(messageLi);

            this.scrollChatToBottom();
        }
    }

    getTime() {
        const h = new Date().getHours();
        const m = new Date().getMinutes();
        return `${h}:${m < 10 ? '0' + m : m}`;
    }

    scrollChatToBottom() {
        const chatThread = document.querySelector('.chat-thread') as HTMLElement;
        if(chatThread) {
            chatThread.scrollTop = chatThread.scrollHeight;
        }
    }
}