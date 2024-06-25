import Component from '@glimmer/component';
import { inject as service } from '@ember/service';
import { action } from '@ember/object';
import Auth from 'explorviz-frontend/services/auth';
import LocalUser from 'collaboration/services/local-user';
import MessageSender from 'collaboration/services/message-sender';
import collaborationSession from 'explorviz-frontend/services/collaboration-session';
import ChatService from 'explorviz-frontend/services/chat';
import ToastHandlerService from 'explorviz-frontend/services/toast-handler';


export default class ChatBox extends Component {
    @service('auth')
    auth!: Auth;

    @service('local-user')
    private localUser!: LocalUser;

    @service('message-sender')
    private sender!: MessageSender;

    @service('collaboration-session')
    collaborationSession!: collaborationSession;

    @service('chat')
    chatService!: ChatService

    @service('toast-handler')
    toastHandler!: ToastHandlerService;
    
    $messages = $('.messages-content') as JQuery<HTMLElement>;

    chatWindow = document.querySelector('.chat-window');
	chatWindowMessage = document.querySelector('.chat-window-message');
	chatThread = document.querySelector('.chat-thread');

    @action
    handleSpaceBar() {
        $('.message-input').val('');
    }

    @action
    insertMessage() {
        const msg = $('.message-input').val() as string;
        if (msg.trim() === '') {
            return;
        }
        
        //post directly to chat or send to server depending on connection status
        if(this.collaborationSession.connectionStatus == 'offline') {
            this.chatService.addChatMessage(this.localUser.userId, msg);
        } else {
            this.sender.sendChatMessage(msg);
        }

        $('.message-input').val('');
        //this.updateScrollbar();
    }

    @action
    postMessage(msg: string) {
        $('<div class="">' + this.localUser.userName + ' (' + this.getTime() + ')' + '</div>').appendTo($('.chat-thread')).addClass('User');
        $('<li>' + msg + '</li>').appendTo($('.chat-thread')).addClass('Message');
    }

    getTime() {
        const h = new Date().getHours();
        var m = new Date().getMinutes();

        if(m < 10){
            return h + ':' + '0' + m;
        } else {
            return h + ':' + m;
        }
    }
}