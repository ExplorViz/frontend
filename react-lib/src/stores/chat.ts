import { create } from 'zustand';
import { useCollaborationSessionStore } from 'explorviz-frontend/src/stores/collaboration/collaboration-session';
import { useMessageSenderStore } from 'explorviz-frontend/src/stores/collaboration/message-sender';
import * as THREE from 'three';
import { useLocalUserStore } from 'explorviz-frontend/src/stores/collaboration/local-user';
import {
  CHAT_MESSAGE_EVENT,
  ChatMessage,
} from 'explorviz-frontend/src/utils/collaboration/web-socket-messages/receivable/chat-message';
import {
  CHAT_SYNC_EVENT,
  ChatSynchronizeMessage,
} from 'explorviz-frontend/src/utils/collaboration/web-socket-messages/receivable/chat-syncronization';
import {
  MESSAGE_DELETE_EVENT,
  MessageDeleteEvent,
} from 'explorviz-frontend/src/utils/collaboration/web-socket-messages/sendable/delete-message';
import { ForwardedMessage } from 'explorviz-frontend/src/utils/collaboration/web-socket-messages/receivable/forwarded';
import { useToastHandlerStore } from 'explorviz-frontend/src/stores/toast-handler';
import eventEmitter from '../utils/event-emitter';

export interface ChatMessageInterface {
  msgId: number;
  userId: string;
  userName: string;
  userColor: THREE.Color;
  timestamp: string;
  message: string;
  isEvent?: boolean;
  eventType?: string;
  eventData?: any[];
}

interface ChatState {
  userIdMuteList?: string[];
  chatMessages: ChatMessageInterface[];
  filteredChatMessages: ChatMessageInterface[];
  msgId: number;
  deletedMessage: boolean; // Can be adjusted to 'needSynchronization' for exmaple, to synchronize chat whenever necessary..
  deletedMessageIds: number[];
  _constructor: () => void;
  cleanup: () => void;
  removeEventListener: () => void;
  onChatMessageEvent: ({
    userId,
    originalMessage: {
      msgId,
      msg,
      userName,
      timestamp,
      isEvent,
      eventType,
      eventData,
    },
  }: ForwardedMessage<ChatMessage>) => void;
  onChatSyncEvent: ({
    userId,
    originalMessage,
  }: ForwardedMessage<ChatSynchronizeMessage[]>) => void;
  onMessageDeleteEvent: ({
    userId,
    originalMessage,
  }: ForwardedMessage<MessageDeleteEvent>) => void;
  sendChatMessage: (
    userId: string,
    msg: string,
    isEvent: boolean,
    eventType: string,
    eventData: any[]
  ) => void;
  addChatMessage: (
    msgId: number,
    userId: string,
    msg: string,
    username: string,
    time: string,
    isEvent: boolean,
    eventType: string,
    eventData: any[]
  ) => void;
  removeChatMessage: (messageId: number[], received?: boolean) => void;
  findEventByUserId: (userId: string, eventType: string) => boolean;
  toggleMuteStatus: (userId: string) => void;
  isUserMuted: (userId: string) => boolean | undefined;
  filterChat: (filterMode: string, filterValue: string) => void;
  clearFilter: () => void;
  _applyCurrentFilter: (filterMode: string, filterValue: string) => void;
  _getTime: () => string;
  synchronizeWithServer: () => void;
  syncChatMessages: (messages: ChatSynchronizeMessage[]) => void;
  setDeletedMessageIds: (deletedMessageIds: number[]) => void;
}

// Has to be explicitly called
// SUbstitute for 'registerDestructor(this, this.cleanup);' from old constructor
export const destroyChatStore = () => {
  useChatStore.getState().cleanup();
};

export const useChatStore = create<ChatState>((set, get) => {
  return {
    userIdMuteList: [], // tracked
    chatMessages: [], // tracked
    filteredChatMessages: [], // tracked
    msgId: 1, // tracked
    deletedMessage: false, // tracked
    deletedMessageIds: [],

    _constructor: () => {
      eventEmitter.on(CHAT_MESSAGE_EVENT, get().onChatMessageEvent);
      eventEmitter.on(CHAT_SYNC_EVENT, get().onChatSyncEvent);
      eventEmitter.on(MESSAGE_DELETE_EVENT, get().onMessageDeleteEvent);
    },

    cleanup: () => {
      get().removeEventListener();
    },

    removeEventListener: () => {
      eventEmitter.off(CHAT_MESSAGE_EVENT, get().onChatMessageEvent);
      eventEmitter.off(CHAT_SYNC_EVENT, get().onChatSyncEvent);
      eventEmitter.off(MESSAGE_DELETE_EVENT, get().onMessageDeleteEvent);
    },

    /**
     * Chat message received from backend
     */
    onChatMessageEvent: ({
      userId,
      originalMessage: {
        msgId,
        msg,
        userName,
        timestamp,
        isEvent,
        eventType,
        eventData,
      },
    }: ForwardedMessage<ChatMessage>) => {
      if (useLocalUserStore.getState().userId != userId && !isEvent) {
        useToastHandlerStore
          .getState()
          .showInfoToastMessage(`Message received: ` + msg);
      }
      get().addChatMessage(
        msgId,
        userId,
        msg,
        userName,
        timestamp,
        isEvent,
        eventType,
        eventData
      );
    },

    /**
     * Chat synchronization event received from backend
     */
    onChatSyncEvent: ({
      userId,
      originalMessage,
    }: ForwardedMessage<ChatSynchronizeMessage[]>) => {
      if (useLocalUserStore.getState().userId == userId) {
        get().syncChatMessages(originalMessage);
      }
    },

    /**
     * Chat message delete event received from backend
     */
    onMessageDeleteEvent: ({
      userId,
      originalMessage,
    }: ForwardedMessage<MessageDeleteEvent>) => {
      if (userId == useLocalUserStore.getState().userId) {
        return;
      }
      get().removeChatMessage(originalMessage.msgIds, true);
      useToastHandlerStore
        .getState()
        .showErrorToastMessage('Message(s) deleted');
    },

    sendChatMessage: (
      userId: string,
      msg: string,
      isEvent: boolean,
      eventType: string = '',
      eventData: any[] = []
    ) => {
      if (
        useCollaborationSessionStore.getState().connectionStatus == 'offline'
      ) {
        set({ msgId: get().msgId++ });
        get().addChatMessage(
          get().msgId,
          userId,
          msg,
          '',
          '',
          isEvent,
          eventType,
          eventData
        );
      } else {
        const userName = useLocalUserStore.getState().userName;
        useMessageSenderStore
          .getState()
          .sendChatMessage(
            userId,
            msg,
            userName,
            '',
            isEvent,
            eventType,
            eventData
          );
      }
    },

    addChatMessage: (
      msgId: number,
      userId: string,
      msg: string,
      username: string = '',
      time: string = '',
      isEvent: boolean = false,
      eventType: string = '',
      eventData: any[] = []
    ) => {
      let userName = username;
      let userColor = new THREE.Color(0, 0, 0);
      let timestamp = time;

      const user = useCollaborationSessionStore
        .getState()
        .lookupRemoteUserById(userId);
      if (user) {
        userName = user.userName;
        userColor = user.color;
        timestamp = time;
      } else if (userId === useLocalUserStore.getState().userId) {
        userName = useLocalUserStore.getState().userName;
        userColor = useLocalUserStore.getState().color;
        timestamp = time === '' ? get()._getTime() : time;
      }

      const chatMessage: ChatMessageInterface = {
        msgId,
        userId,
        userName,
        userColor,
        timestamp,
        message: msg,
        isEvent,
        eventType,
        eventData,
      };

      set({ chatMessages: [...get().chatMessages, chatMessage] });
      get()._applyCurrentFilter('', '');
    },

    removeChatMessage: (messageId: number[], received?: boolean) => {
      messageId.forEach((msgId) => {
        set({
          chatMessages: get().chatMessages.filter((msg) => msg.msgId !== msgId),
        });
      });

      if (!received) {
        useMessageSenderStore.getState().sendMessageDelete(messageId);
      } else {
        set({ deletedMessage: true });
        let newDeletedMessageIds = get().deletedMessageIds;
        messageId.forEach((msgId) => newDeletedMessageIds.push(msgId));
        set({ deletedMessageIds: newDeletedMessageIds });
      }
    },

    findEventByUserId: (userId: string, eventType: string): boolean => {
      const messages = get().chatMessages.filter(
        (msg) => msg.userId === userId && msg.eventType === eventType
      );
      return messages.length > 0;
    },

    toggleMuteStatus: (userId: string) => {
      const remoteUser = useCollaborationSessionStore
        .getState()
        .getUserById(userId);
      if (!remoteUser) {
        return;
      }

      if (get().isUserMuted(userId)) {
        set({
          userIdMuteList:
            get().userIdMuteList?.filter((id) => userId !== id) || [],
        });
        get().sendChatMessage(
          useLocalUserStore.getState().userId,
          `${remoteUser.userName}(${remoteUser.userId})` + ' was unmuted',
          true,
          'mute_event',
          []
        );
      } else {
        set({ userIdMuteList: [...get().userIdMuteList!, userId] });
        get().sendChatMessage(
          useLocalUserStore.getState().userId,
          `${remoteUser.userName}(${remoteUser.userId})` + ' was muted',
          true,
          'mute_event',
          []
        );
      }
      useMessageSenderStore.getState().sendUserMuteUpdate(userId);
    },

    isUserMuted: (userId: string): boolean | undefined => {
      return get().userIdMuteList?.includes(userId);
    },

    // TODO maybe remove _applyCurrentFilter and only keep this?
    filterChat: (filterMode: string, filterValue: string): void => {
      get()._applyCurrentFilter(filterMode, filterValue);
    },

    clearFilter: () => {
      set({
        filteredChatMessages: get().chatMessages,
      });
    },

    // TODO: private
    _applyCurrentFilter: (
      filterMode: string = '',
      filterValue: string = ''
    ) => {
      if (!filterMode || !filterValue) {
        set({ filteredChatMessages: get().chatMessages });
      } else {
        switch (filterMode) {
          case 'UserId':
            set({
              filteredChatMessages: get().chatMessages.filter(
                (msg) => msg.userName + '(' + msg.userId + ')' === filterValue
              ),
            });
            break;
          case 'Events':
            set({
              filteredChatMessages: get().chatMessages.filter(
                (msg) => msg.isEvent === true
              ),
            });
            break;
          default:
            set({ filteredChatMessages: get().chatMessages });
            break;
        }
      }
    },

    // TODO: private
    // This could be made into a utility function
    _getTime: () => {
      const h = new Date().getHours();
      const m = new Date().getMinutes();
      return `${h}:${m < 10 ? '0' + m : m}`;
    },

    synchronizeWithServer: () => {
      useMessageSenderStore.getState().sendChatSynchronize();
    },

    syncChatMessages: (messages: ChatSynchronizeMessage[]) => {
      set({ chatMessages: [] });
      messages.forEach((msg) =>
        get().addChatMessage(
          msg.msgId,
          msg.userId,
          msg.msg,
          msg.userName,
          msg.timestamp,
          msg.isEvent,
          msg.eventType,
          msg.eventData
        )
      );
      useToastHandlerStore.getState().showInfoToastMessage('Synchronized');
    },

    setDeletedMessageIds: (deletedMessageIds) => {
      set({ deletedMessageIds: deletedMessageIds });
    },
  };
});

useChatStore.getState()._constructor();
