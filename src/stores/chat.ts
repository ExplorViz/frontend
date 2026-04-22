import { getState, me, RPC } from 'playroomkit';
import * as THREE from 'three';
import { create } from 'zustand';
import { useToastHandlerStore } from './toast-handler';

let isChatRpcRegistered = false;

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
  deletedMessage: boolean; // Can be adjusted to 'needSynchronization' for exmaple, to synchronize chat whenever necessary..
  deletedMessageIds: number[];
  _constructor: () => void;
  cleanup: () => void;
  sendChatMessage: (
    userId: string,
    msg: string,
    isEvent: boolean,
    eventType?: string,
    eventData?: any[]
  ) => void;
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

    _constructor: () => {
      // Register the listener for chat messages
      if (isChatRpcRegistered) return;
      isChatRpcRegistered = true;

      RPC.register('chatMessage', async (data: any) => {
        // Check if a toast message have to be sent
        const myPlayer = me();
        if (!data.isEvent && myPlayer && data.userId != myPlayer.id) {
          useToastHandlerStore
            .getState()
            .showInfoToastMessage(`Message received: ` + data.msg);
        }

        // Add themessage toi the interface
        get().addChatMessage(
          data.msgId,
          data.userId,
          data.msg,
          data.userName,
          data.timestamp,
          data.isEvent,
          data.eventType,
          data.eventData,
          data.color
        );
      });

      // Register a function to listen for delete messages
      RPC.register('deleteMessage', async (messageIds: any) => {
        get().removeChatMessage(messageIds, true);
        useToastHandlerStore
          .getState()
          .showErrorToastMessage('Message(s) deleted');
      });
    },

    cleanup: () => {
      // manuel cleanup is not needed for RPCs
    },

    sendChatMessage: (
      userId: string,
      msg: string,
      isEvent: boolean,
      eventType: string = '',
      eventData: any[] = []
    ) => {
      // Check if the current user is muted
      const mutedUsers = getState('globalMutedUsers') || [];
      if (mutedUsers.includes(userId) && !isEvent) {
        useToastHandlerStore
          .getState()
          .showErrorToastMessage('You have been muted by the host.');
        return;
      }
      // Create a uniqze ID for te message
      const newId = Date.now() + Math.floor(Math.random() * 1000);
      set({ msgId: newId });

      // Get the current users ID and color
      const myPlayer = me();
      const userName = myPlayer ? myPlayer.getProfile().name : 'You';
      const color = myPlayer ? myPlayer.getProfile().color.hex : 0xffffff;
      // Get the current time
      const timestamp = get()._getTime();

      // Construct payload for playroomkit and send it
      const payload = {
        msgId: newId,
        userId,
        msg,
        userName,
        color,
        timestamp,
        isEvent,
        eventType,
        eventData,
      };

      // Add the message locally
      get().addChatMessage(
        newId,
        userId,
        msg,
        userName,
        timestamp,
        isEvent,
        eventType,
        eventData,
        color
      );

      try {
        RPC.call('chatMessage', payload, RPC.Mode.OTHERS); // Message is sent to others, as the current user already added it locally
      } catch (e) {}
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

      const userColor = new THREE.Color(
        colorHex !== undefined ? colorHex : 0x888888
      );
      const timestamp = time === '' ? get()._getTime() : time;

      // Check if the message is from yourself
      const myPlayer = me();
      if (myPlayer && userId == myPlayer.id) {
        username = 'You';
      }

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

      if (!received) {
        try {
          RPC.call('deleteMessage', messageId, RPC.Mode.OTHERS);
        } catch (e) {}
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

    setDeletedMessageIds: (deletedMessageIds) => {
      set({ deletedMessageIds: deletedMessageIds });
    },
  };
});

useChatStore.getState()._constructor();
