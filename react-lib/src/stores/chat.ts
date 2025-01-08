import { createStore } from "zustand/vanilla";

import * as THREE from "three";
import {
  CHAT_MESSAGE_EVENT,
  ChatMessage,
} from "react-lib/src/utils/collaboration/web-socket-messages/receivable/chat-message";
import {
  CHAT_SYNC_EVENT,
  ChatSynchronizeMessage,
} from "react-lib/src/utils/collaboration/web-socket-messages/receivable/chat-syncronization";
import {
  MESSAGE_DELETE_EVENT,
  MessageDeleteEvent,
} from "react-lib/src/utils/collaboration/web-socket-messages/sendable/delete-message";
import { ForwardedMessage } from "react-lib/src/utils/collaboration/web-socket-messages/receivable/forwarded";
import { string } from "three/examples/jsm/nodes/shadernode/ShaderNode";

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
  cleanup: () => void;
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
  applyCurrentFilter: (filterMode: string, filterValue: string) => void;
  getTime: () => string;
  synchronizeWithServer: () => void;
  syncChatMessages: (messages: ChatSynchronizeMessage[]) => void;
}

export const useChatStore = createStore<ChatState>((set, get) => {
  // TODO constructor here?

  return {
    userIdMuteList: [],
    chatMessages: [],
    filteredChatMessages: [],
    msgId: 1,
    deletedMessage: false,
    deletedMessageIds: [],

    cleanup: () => {
      // TODO implement me!
    },

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
      // TODO implement me!
    },

    onChatSyncEvent: ({
      userId,
      originalMessage,
    }: ForwardedMessage<ChatSynchronizeMessage[]>) => {
      // TODO implement me!
    },

    onMessageDeleteEvent: ({
      userId,
      originalMessage,
    }: ForwardedMessage<MessageDeleteEvent>) => {
      // TODO implement me!
    },

    sendChatMessage: (
      userId: string,
      msg: string,
      isEvent: boolean,
      eventType: string = "",
      eventData: any[] = []
    ) => {
      // TODO implement me!
    },

    addChatMessage: (
      msgId: number,
      userId: string,
      msg: string,
      username: string = "",
      time: string = "",
      isEvent: boolean = false,
      eventType: string = "",
      eventData: any[] = []
    ) => {
      // TODO implement me!
    },

    removeChatMessage: (messageId: number[], received?: boolean) => {
      // TODO implement me!
    },

    findEventByUserId: (userId: string, eventType: string): boolean => {
      const messages = get().chatMessages.filter(
        (msg) => msg.userId === userId && msg.eventType === eventType
      );
      return messages.length > 0;
    },

    toggleMuteStatus: (userId: string) => {
      // TODO implement me!
    },

    isUserMuted: (userId: string): boolean | undefined => {
      return get().userIdMuteList?.includes(userId);
    },

    // TODO maybe remove applyCurrentFilter and only keep this?
    filterChat: (filterMode: string, filterValue: string): void => {
      get().applyCurrentFilter(filterMode, filterValue);
    },

    clearFilter: () => {
      set({
        filteredChatMessages: get().chatMessages,
      });
    },

    // TODO: private
    applyCurrentFilter: (filterMode: string = "", filterValue: string = "") => {
      if (!filterMode || !filterValue) {
        set({ filteredChatMessages: get().chatMessages });
      } else {
        switch (filterMode) {
          case "UserId":
            set({
              filteredChatMessages: get().chatMessages.filter(
                (msg) => msg.userName + "(" + msg.userId + ")" === filterValue
              ),
            });
            break;
          case "Events":
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
    getTime: () => {
      const h = new Date().getHours();
      const m = new Date().getMinutes();
      return `${h}:${m < 10 ? "0" + m : m}`;
    },

    synchronizeWithServer: () => {
      // TODO implement me!
    },

    syncChatMessages: (messages: ChatSynchronizeMessage[]) => {
      // TODO implement me!
    },
  };
});
