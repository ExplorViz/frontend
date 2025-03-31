import React, { useEffect, useState } from 'react';

import Button from 'react-bootstrap/Button';
import { useLocalUserStore } from 'explorviz-frontend/src/stores/collaboration/local-user';
import { useCollaborationSessionStore } from 'explorviz-frontend/src/stores/collaboration/collaboration-session';
import { useChatStore } from 'explorviz-frontend/src/stores/chat';
import { useHighlightingStore } from 'explorviz-frontend/src/stores/highlighting';
import { useToastHandlerStore } from 'explorviz-frontend/src/stores/toast-handler';
import * as THREE from 'three';
import {
  DownloadIcon,
  GearIcon,
  LogIcon,
  TrashIcon,
} from '@primer/octicons-react';

interface ChatUser {
  id: string;
  name: string;
}

interface ChatBoxProps {}

export default function ChatBox({}: ChatBoxProps) {
  const connectionStatus = useCollaborationSessionStore(
    (state) => state.connectionStatus
  );
  const userId = useLocalUserStore((state) => state.userId);
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

  const deleteMessageOnEvent = () => {
    const messageIds = deletedMessageIds;

    messageIds.forEach((msg) => {
      removeMessage(msg);
    });

    setDeletedMessageIds([]);
  };

  const toggleFilter = () => {
    setOpenFilterOptions((prev) => !prev);
  };

  const toggleDeleteAction = () => {
    setOpenDeleteActions((prev) => !prev);
  };

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

  const deleteSelectedMessages = () => {
    const messageIds: number[] = [];
    selectedMessages.forEach((messageId) => {
      messageIds.push(messageId);
    });
    removeUserMessage(messageIds);
    setSelectedMessages(new Set());
    toggleDeleteAction();
  };

  const applyFilter = () => {
    if (isFilterEnabled) {
      clearChat('.chat-thread.filtered');
    } else {
      clearChat('.chat-thread.normal');
    }
    filterChat(filterMode, filterValue);
  };

  const toggleCheckbox = (event: React.FormEvent) => {
    const target = event.currentTarget as HTMLInputElement;
    setIsFilterEnabled(target.checked);
    if (!target.checked) {
      clearFilter();
    } else {
      applyFilter();
    }
  };

  const changeFilterMode = (mode: string) => {
    clearFilter();
    if (isFilterEnabled) {
      clearChat('.chat-thread.filtered');
    } else {
      clearChat('.chat-thread.normal');
    }
    setFilterMode(mode);
    applyFilter();
  };

  const updateFilterValue = (event: React.FormEvent) => {
    if (isFilterEnabled) {
      const target = event.currentTarget as HTMLInputElement;
      setFilterValue(target.value);
      applyFilter();
    }
  };

  const synchronize = () => {
    if (connectionStatus == 'offline') {
      showErrorToastMessage("Can't synchronize with server");
      return;
    }
    clearFilter();
    clearChat('.chat-thread');
    synchronizeWithServer();
  };

  const downloadChat = () => {
    const chatContent = chatMessages
      .map(
        (msg) =>
          `${msg.timestamp} ${msg.userName}(${msg.userId}): ${msg.message}`
      )
      .join('\n');

    const blob = new Blob([chatContent], { type: 'text/plain' });
    const url = window.URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = 'chat.txt'; // TODO: Change filename to landscape token + room id and date?
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

  const insertMessage = () => {
    const inputElement = document.querySelector(
      '.message-input'
    ) as HTMLInputElement;

    const msg = inputElement.value.trim();
    if (msg.trim() === '') {
      return;
    }

    sendChatMessage(userId, msg, false);
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
          pingReplay(userId, objId, pingPos, pingDurationInMs);
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

  const clearChat = (thread: string) => {
    const chatThread = document.querySelector(thread) as HTMLElement;
    if (chatThread) {
      const messages = document.querySelectorAll('.message-container');
      messages.forEach((msg) => msg.remove());
      filteredMessages.forEach((chatMessage) => {
        const messageToRemove = chatThread.querySelector(
          `.message-container[data-message-id="${chatMessage.msgId}"]`
        );
        if (messageToRemove) {
          messageToRemove.remove();
        }
      });
      const messageItems = document.querySelectorAll('.message-item');
      messageItems.forEach((msgItem) => msgItem.remove());
    }
  };

  const scrollChatToBottom = () => {
    const chatThread = document.querySelector('.chat-thread') as HTMLElement;
    if (chatThread) {
      chatThread.scrollTop = chatThread.scrollHeight;
    }
  };

  useEffect(() => {
    if (deletedMessage) {
      deleteMessageOnEvent();
    }
    useChatStore.setState({ deletedMessage: false });
  }, [deletedMessage]);

  useEffect(() => {
    filteredMessages.forEach(postMessage);
    chatMessages.forEach(postMessage);
  });

  return (
    <>
      <div className="chat">
        <h5 className="text-center">Chat</h5>
        <div className="chat-button-area">
          <div className="filter-box">
            <Button title="Filter" onClick={toggleFilter}>
              <GearIcon size="small" className="align-middle" />
            </Button>
            {openFilterOptions && (
              <div className="filter-options">
                <label htmlFor="filter-checkbox">
                  <input
                    type="checkbox"
                    checked={isFilterEnabled}
                    id="filter-checkbox"
                    onChange={toggleCheckbox}
                  />
                  Enable Filtering By
                  <div className="radio-buttons-chat">
                    <label>
                      <input
                        type="radio"
                        name="filter-u"
                        value="UserId"
                        checked={filterMode === 'UserId'}
                        onChange={() => changeFilterMode('UserId')}
                      />
                      User
                      <select
                        id="filter-val"
                        value={filterValue}
                        onFocus={updateFilterValue}
                        onChange={updateFilterValue}
                      >
                        {usersInChat.map((user) => (
                          <option value={user.name}>{user.name}</option>
                        ))}
                      </select>
                    </label>
                    <label>
                      <input
                        type="radio"
                        name="filter-e"
                        value="Events"
                        checked={filterMode === 'Events'}
                        onChange={() => setFilterMode('Events')}
                      />
                      Events
                    </label>
                  </div>
                </label>
              </div>
            )}
          </div>
          <div className="chat-right-buttons">
            {userIsHost && (
              <div className="host-actions">
                <Button title="Host action" onClick={toggleDeleteAction}>
                  <TrashIcon size="small" className="align-middle" />
                </Button>
                {openDeleteActions && (
                  <Button
                    title="Delete Selected Messages"
                    variant="danger"
                    onClick={deleteSelectedMessages}
                  >
                    Delete
                  </Button>
                )}
              </div>
            )}
            <div className="synchronize">
              <Button title="Get Chat Log From Room" onClick={synchronize}>
                <LogIcon size="small" className="align-middle" />
              </Button>
            </div>
            <div className="download">
              <Button title="Download" onClick={downloadChat}>
                <DownloadIcon size="small" className="align-middle" />
              </Button>
            </div>
          </div>
        </div>

        {isFilterEnabled ? (
          <ul className="chat-thread filtered"></ul>
        ) : (
          <ul className="chat-thread normal"></ul>
        )}

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
