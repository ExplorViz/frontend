import { useCollaborationSessionStore } from 'explorviz-frontend/src/stores/collaboration/collaboration-session';
import { useLocalUserStore } from 'explorviz-frontend/src/stores/collaboration/local-user';
import { useMessageSenderStore } from 'explorviz-frontend/src/stores/collaboration/message-sender';
import { useToastHandlerStore } from 'explorviz-frontend/src/stores/toast-handler';
import {
  CHAT_MESSAGE_EVENT,
  ChatMessage,
} from 'explorviz-frontend/src/utils/collaboration/web-socket-messages/receivable/chat-message';
import {
  CHAT_SYNC_EVENT,
  ChatSynchronizeMessage,
} from 'explorviz-frontend/src/utils/collaboration/web-socket-messages/receivable/chat-synchronization';
import { ForwardedMessage } from 'explorviz-frontend/src/utils/collaboration/web-socket-messages/receivable/forwarded';
import {
  MESSAGE_DELETE_EVENT,
  MessageDeleteEvent,
} from 'explorviz-frontend/src/utils/collaboration/web-socket-messages/sendable/delete-message';
import eventEmitter from 'explorviz-frontend/src/utils/event-emitter';
import * as THREE from 'three';
import { create } from 'zustand';

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
  isInitialized: boolean;
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
    msg: string,
    isEvent?: boolean,
    eventType?: string,
    eventData?: any[]
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
  clearChat: () => void;
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

    isInitialized: false,

    _constructor: () => {
      if (get().isInitialized) return;
      eventEmitter.on(CHAT_MESSAGE_EVENT, get().onChatMessageEvent);
      eventEmitter.on(CHAT_SYNC_EVENT, get().onChatSyncEvent);
      eventEmitter.on(MESSAGE_DELETE_EVENT, get().onMessageDeleteEvent);
      set({ isInitialized: true });
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
      if (!msg) return; // Prevent empty/corrupt messages
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
      msg: string,
      isEvent: boolean = false,
      eventType: string = '',
      eventData: any[] = []
    ) => {
      const userId = useLocalUserStore.getState().userId;
      if (
        useCollaborationSessionStore.getState().connectionStatus == 'offline'
      ) {
        const nextId = get().msgId + 1;
        set({ msgId: nextId });
        get().addChatMessage(
          nextId,
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
      const remainingMessages = get().chatMessages.filter(
        (msg) => !messageId.includes(msg.msgId)
      );
      set({ chatMessages: remainingMessages });

      if (!received) {
        useMessageSenderStore.getState().sendMessageDelete(messageId);
      } else {
        set({
          deletedMessage: true,
          deletedMessageIds: [...get().deletedMessageIds, ...messageId],
        });
      }
      get()._applyCurrentFilter('', '');
    },

    clearChat: () => {
      const messageIds = get().chatMessages.map((msg) => msg.msgId);
      if (messageIds.length === 0) return;
      get().removeChatMessage(messageIds, false);
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
          `${remoteUser.userName}(${remoteUser.userId})` + ' was unmuted',
          true,
          'mute_event',
          []
        );
      } else {
        set({ userIdMuteList: [...get().userIdMuteList!, userId] });
        get().sendChatMessage(
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

    filterChat: (filterMode: string, filterValue: string): void => {
      get()._applyCurrentFilter(filterMode, filterValue);
    },

    clearFilter: () => {
      set({
        filteredChatMessages: get().chatMessages,
      });
    },

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
