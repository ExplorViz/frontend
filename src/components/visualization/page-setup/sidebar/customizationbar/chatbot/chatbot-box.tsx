import { useEffect, useRef, useState } from 'react';

import { useLocalUserStore } from 'explorviz-frontend/src/stores/collaboration/local-user';
import { useChatStore } from 'explorviz-frontend/src/stores/chat';
import { useHighlightingStore } from 'explorviz-frontend/src/stores/highlighting';
import { useToastHandlerStore } from 'explorviz-frontend/src/stores/toast-handler';
import * as THREE from 'three';
import { LandscapeData } from 'explorviz-frontend/src/utils/landscape-schemes/landscape-data';

const llms = [
  { id: 'chatgpt', name: 'ChatGPT' },
  { id: 'claude', name: 'Claude' },
  { id: 'gemini', name: 'Gemini' },
  { id: 'mistral', name: 'Mistral' },
  { id: 'llama', name: 'Llama' },
] as const

interface ChatUser {
  id: string;
  name: string;
}

interface ChatbotBoxProps {
  landscapeData: LandscapeData | null
}

export default function ChatbotBox({ landscapeData }: ChatbotBoxProps) {
  const userIsHost = useLocalUserStore((state) => state.isHost);
  const pingReplay = useLocalUserStore((state) => state.pingReplay);
  const highlightReplay = useHighlightingStore(
    (state) => state.highlightReplay
  );
  const chatMessages = useChatStore((state) => state.chatMessages);
  const filteredMessages = useChatStore((state) => state.filteredChatMessages);
  const sendChatMessage = useChatStore((state) => state.sendChatMessage);
  const removeChatMessage = useChatStore((state) => state.removeChatMessage);
  const deletedMessage = useChatStore((state) => state.deletedMessage);
  const deletedMessageIds = useChatStore((state) => state.deletedMessageIds);
  const setDeletedMessageIds = useChatStore(
    (state) => state.setDeletedMessageIds
  );
  const clearFilter = useChatStore((state) => state.clearFilter);
  const filterChat = useChatStore((state) => state.filterChat);
  const synchronizeWithServer = useChatStore(
    (state) => state.synchronizeWithServer
  );
  const [openFilterOptions, setOpenFilterOptions] = useState<boolean>(false);
  const [openDeleteActions, setOpenDeleteActions] = useState<boolean>(false);
  const [isFilterEnabled, setIsFilterEnabled] = useState<boolean>(false);
  const [filterMode, setFilterMode] = useState<string>('');
  const [filterValue, setFilterValue] = useState<string>('');
  const [usersInChat, setUsersInChat] = useState<ChatUser[]>([]);
  const [selectedMessages, setSelectedMessages] = useState<Set<number>>(
    new Set()
  );
  const showErrorToastMessage = useToastHandlerStore(
    (state) => state.showErrorToastMessage
  );

  const selectMessage = (event: any, chatMessage: any) => {
    const checkbox = event.target as HTMLInputElement;

    if (checkbox.checked) {
      setSelectedMessages((prev) => new Set([...prev, chatMessage.msgId]));
    } else {
      setSelectedMessages(
        (prev) =>
          new Set([...prev].filter((msgId) => msgId !== chatMessage.msgId))
      );
    }
  };

  const insertMessage = () => {
    const inputElement = document.querySelector(
      '.message-input'
    ) as HTMLInputElement;

    const msg = inputElement.value.trim();
    if (msg.trim() === '') {
      return;
    }

    //sendChatMessage(userId, msg, false);
    inputElement.value = '';
  };

  const postMessage = (chatMessage: {
    msgId: number;
    userId: string;
    userName: string;
    userColor: THREE.Color;
    timestamp: string;
    message: string;
    isEvent: boolean;
    eventType: string;
    eventData: any[];
  }) => {
    // Check filter selection
    const activeUserFilter =
      filterValue === chatMessage.userName + '(' + chatMessage.userId + ')' &&
      filterMode === 'UserId';

    const activeEventFilter = filterMode === 'Events' && chatMessage.isEvent;

    const shouldDisplayMessage = isFilterEnabled
      ? activeUserFilter || activeEventFilter
      : true;

    if (!shouldDisplayMessage) {
      return;
    }

    // Post message into normal chat or filtered chat depending on filter
    const chatThreadClass = isFilterEnabled
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
        eventButton.onclick = () => handleEventClick(chatMessage);

        messageLi.appendChild(eventButton);
      }

      // Add the checkbox for message deletion
      if (userIsHost) {
        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.value = chatMessage.msgId.toString();
        checkbox.classList.add('delete-checkbox');
        checkbox.onchange = (event) => selectMessage(event, chatMessage);
        messageLi.appendChild(checkbox);
      }

      // Add the timestamp at the end of the message
      const timestampDiv = document.createElement('div');
      timestampDiv.textContent = chatMessage.timestamp;
      timestampDiv.classList.add('chat-timestamp');
      messageLi.appendChild(timestampDiv);

      scrollChatToBottom();
      addUserToChat(chatMessage.userId, chatMessage.userName);
    }
  };

  const handleEventClick = (chatMessage: {
    msgId: number;
    userId: string;
    userName: string;
    userColor: THREE.Color;
    timestamp: string;
    message: string;
    isEvent: boolean;
    eventType: string;
    eventData: any[];
  }): any => {
    if (chatMessage.eventData.length == 0) {
      showErrorToastMessage('No event data');
      return;
    }

    const userId = chatMessage.userId;
    switch (chatMessage.eventType) {
      case 'ping':
        {
          const objId = chatMessage.eventData[0];
          const pingPos = chatMessage.eventData[1];
          const pingDurationInMs = chatMessage.eventData[2];
          //pingReplay(userId, objId, pingPos, pingDurationInMs);
        }
        break;
      case 'highlight':
        {
          const appId = chatMessage.eventData[0];
          const entityId = chatMessage.eventData[1];
          highlightReplay(userId, appId, entityId);
        }
        break;
      default:
        showErrorToastMessage('Unknown event');
    }
  };

  const removeUserMessage = (messageId: number[]) => {
    removeChatMessage(messageId);
    messageId.forEach((msg) => removeMessage(msg));
  };

  const addUserToChat = (id: string, userName: string) => {
    const userExists = usersInChat.some((user) => user.id === id);
    if (!userExists) {
      const name = userName + '(' + id + ')';
      setUsersInChat((prev) => [...prev, { id, name }]);
    }
  };

  const removeMessage = (messageId: number) => {
    const chatThread = document.querySelector('.chat-thread') as HTMLElement;
    if (chatThread) {
      if (filteredMessages.some((message) => message.msgId === messageId)) {
        const messageToRemove = chatThread.querySelector(
          `.message-container[data-message-id="${messageId}"]`
        );
        if (messageToRemove) {
          messageToRemove.remove();
        }
      }
    }
  };

  const scrollChatToBottom = () => {
    const chatThread = document.querySelector('.chat-thread') as HTMLElement;
    if (chatThread) {
      chatThread.scrollTop = chatThread.scrollHeight;
    }
  };

  const [isOpen, setIsOpen] = useState(false);
  const [selectedLlm, setSelectedLlm] = useState<(typeof llms)[number]>(llms[0]);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const toggleDropdown = () => {
    setIsOpen(!isOpen);
  };

  const handleSelectLlm = (llm: (typeof llms)[number]) => {
    setIsOpen(false); // Close the dropdown after selection
    setSelectedLlm(llm);
  };

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = ({ target }: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [dropdownRef]);

  return (
    <>
      <div className="chatbot">
        <div className="chatbox-button-area">
          <div id="colorPresets" className="dropdown" ref={dropdownRef}>
            <button
              className="btn btn-outline-dark dropdown-toggle autoMargin"
              type="button"
              onClick={toggleDropdown}
              aria-haspopup="true"
              aria-expanded={isOpen}
            >
              {selectedLlm.name}
            </button>
            <div
              className={`dropdown-menu dropdown-menu-right ${isOpen ? 'show' : ''}`}
              aria-labelledby="dropdownMenuButton"
            >
              {llms.map((llm) => (
                <div
                  key={llm.id}
                  className="dropdown-item pointer-cursor"
                  onClick={() => handleSelectLlm(llm)}
                >
                  {llm.name}
                </div>
              ))}
            </div>
          </div>
        </div>


        <ul className="chat-thread normal"></ul>

        <div className="message-box">
          <input
            id="texfield"
            className="message-input form-control mr-2"
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                insertMessage();
              }
            }}
          />
        </div>
      </div>
      <div className="bg" />
    </>
  );
}
