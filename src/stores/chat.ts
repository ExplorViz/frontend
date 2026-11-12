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
  chatMessages: ChatMessageInterface[];
  filteredChatMessages: ChatMessageInterface[];
  msgId: number;
  deletedMessage: boolean; // Can be adjusted to 'needSynchronization' for example, to synchronize chat whenever necessary..
  deletedMessageIds: number[];
  _constructor: () => void;
  cleanup: () => void;
  sendChatMessage: (userId: string, msg: string, isEvent: boolean, eventType?: string, eventData?: any[]) => void;
  addChatMessage: (
    msgId: number,
    userId: string,
    msg: string,
    username?: string,
    time?: string,
    isEvent?: boolean,
    eventType?: string,
    eventData?: any[],
    colorHex?: number
  ) => void;
  removeChatMessage: (messageId: number[], received?: boolean) => void;
  findEventByUserId: (userId: string, eventType: string) => boolean;
  toggleMuteStatus: (userId: string) => void;
  isUserMuted: (userId: string) => boolean | undefined;
  filterChat: (filterMode: string, filterValue: string) => void;
  clearFilter: () => void;
  _applyCurrentFilter: (filterMode: string, filterValue: string) => void;
  _getTime: () => string;
  setDeletedMessageIds: (deletedMessageIds: number[]) => void;
}

// Has to be explicitly called
// SUbstitute for 'registerDestructor(this, this.cleanup);' from old constructor
export const destroyChatStore = () => {
  useChatStore.getState().cleanup();
};

export const useChatStore = create<ChatState>((set, get) => {
  return {
    chatMessages: [], // tracked
    filteredChatMessages: [], // tracked
    msgId: 1, // tracked
    deletedMessage: false, // tracked
    deletedMessageIds: [],

    _constructor: () => {},

    cleanup: () => {},

    sendChatMessage: (userId: string, msg: string, isEvent: boolean, eventType: string = '', eventData: any[] = []) => {
      // Create a uniqze ID for te message
      const newId = Date.now() + Math.floor(Math.random() * 1000);
      set({ msgId: newId });

      const userName = 'You';
      const color = 0xffffff;
      // Get the current time
      const timestamp = get()._getTime();

      // Add the message locally
      get().addChatMessage(newId, userId, msg, userName, timestamp, isEvent, eventType, eventData, color);
    },

    addChatMessage: (
      msgId: number,
      userId: string,
      msg: string,
      username: string = 'Unknown',
      time: string = '',
      isEvent: boolean = false,
      eventType: string = '',
      eventData: any[] = [],
      colorHex?: number
    ) => {
      // Avoid duplicate messages
      if (get().chatMessages.some((m) => m.msgId === msgId)) {
        return;
      }

      const userColor = new THREE.Color(colorHex !== undefined ? colorHex : 0x888888);
      const timestamp = time === '' ? get()._getTime() : time;

      // Create a message object
      const chatMessage: ChatMessageInterface = {
        msgId,
        userId,
        userName: username,
        userColor,
        timestamp,
        message: msg,
        isEvent,
        eventType,
        eventData,
      };

      // Add the message
      set({ chatMessages: [...get().chatMessages, chatMessage] });
      get()._applyCurrentFilter('', '');
    },

    removeChatMessage: (messageId: number[], received?: boolean) => {
      messageId.forEach((msgId) => {
        set({
          chatMessages: get().chatMessages.filter((msg) => msg.msgId !== msgId),
        });
      });

      if (received) {
        set({ deletedMessage: true });
        let newDeletedMessageIds = get().deletedMessageIds;
        messageId.forEach((msgId) => newDeletedMessageIds.push(msgId));
        set({ deletedMessageIds: newDeletedMessageIds });
      }
    },

    findEventByUserId: (userId: string, eventType: string): boolean => {
      const messages = get().chatMessages.filter((msg) => msg.userId === userId && msg.eventType === eventType);
      return messages.length > 0;
    },

    filterChat: (filterMode: string, filterValue: string): void => {
      get()._applyCurrentFilter(filterMode, filterValue);
    },

    clearFilter: () => {
      set({
        filteredChatMessages: get().chatMessages,
      });
    },

    _applyCurrentFilter: (filterMode: string = '', filterValue: string = '') => {
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
              filteredChatMessages: get().chatMessages.filter((msg) => msg.isEvent === true),
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

    setDeletedMessageIds: (deletedMessageIds) => {
      set({ deletedMessageIds: deletedMessageIds });
    },
  };
});

useChatStore.getState()._constructor();
