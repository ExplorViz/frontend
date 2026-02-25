import React, { useEffect, useRef, useState } from 'react';

import {
  DownloadIcon,
  GearIcon,
  LogIcon,
  TrashIcon,
} from '@primer/octicons-react';
import { useCameraControlsStore } from 'explorviz-frontend/src/stores/camera-controls-store';
import {
  ChatMessageInterface,
  useChatStore,
} from 'explorviz-frontend/src/stores/chat';
import { useCollaborationSessionStore } from 'explorviz-frontend/src/stores/collaboration/collaboration-session';
import { useLocalUserStore } from 'explorviz-frontend/src/stores/collaboration/local-user';
import { useToastHandlerStore } from 'explorviz-frontend/src/stores/toast-handler';
import { pingReplay } from 'explorviz-frontend/src/view-objects/3d/application/animated-ping-r3f';
import Button from 'react-bootstrap/Button';

interface ChatUser {
  id: string;
  name: string;
}

export default function ChatBox() {
  const connectionStatus = useCollaborationSessionStore(
    (state) => state.connectionStatus
  );
  const userId = useLocalUserStore((state) => state.userId);
  const userIsHost = useLocalUserStore((state) => state.isHost);
  const { lookAtEntity } = useCameraControlsStore();
  const chatMessages = useChatStore((state) => state.chatMessages);
  const filteredMessages = useChatStore((state) => state.filteredChatMessages);
  const sendChatMessage = useChatStore((state) => state.sendChatMessage);
  const removeChatMessage = useChatStore((state) => state.removeChatMessage);
  const clearFilter = useChatStore((state) => state.clearFilter);
  const filterChat = useChatStore((state) => state.filterChat);
  const synchronizeWithServer = useChatStore(
    (state) => state.synchronizeWithServer
  );
  const clearChat = useChatStore((state) => state.clearChat);
  const [openFilterOptions, setOpenFilterOptions] = useState<boolean>(false);
  const [openDeleteActions, setOpenDeleteActions] = useState<boolean>(false);
  const [isFilterEnabled, setIsFilterEnabled] = useState<boolean>(false);
  const [filterMode, setFilterMode] = useState<string>('');
  const [filterValue, setFilterValue] = useState<string>('');
  const [selectedMessages, setSelectedMessages] = useState<Set<number>>(
    new Set()
  );
  const showErrorToastMessage = useToastHandlerStore(
    (state) => state.showErrorToastMessage
  );

  const chatThreadRef = useRef<HTMLUListElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const usersInChat = React.useMemo<ChatUser[]>(() => {
    const uniqueUsers = new Map<string, string>();
    chatMessages.forEach((msg) => {
      uniqueUsers.set(msg.userId, msg.userName);
    });

    return Array.from(uniqueUsers.entries()).map(([id, name]) => ({
      id,
      name: `${name}(${id})`,
    }));
  }, [chatMessages]);

  const canModifyChat = userIsHost || connectionStatus === 'offline';

  useEffect(() => {
    if (chatThreadRef.current) {
      chatThreadRef.current.scrollTop = chatThreadRef.current.scrollHeight;
    }
  }, [chatMessages, filteredMessages, isFilterEnabled]);

  const toggleFilter = () => {
    setOpenFilterOptions((prev) => !prev);
  };

  const toggleDeleteAction = () => {
    setOpenDeleteActions((prev) => !prev);
  };

  const deleteSelectedMessages = () => {
    const messageIds = Array.from(selectedMessages);
    removeChatMessage(messageIds);
    setSelectedMessages(new Set());
    setOpenDeleteActions(false);
  };

  const renderChatActions = () => {
    if (!canModifyChat) return null;

    return (
      <div className="d-flex gap-2">
        <Button
          variant={openDeleteActions ? 'secondary' : 'outline-secondary'}
          title="Select Messages to Delete"
          onClick={toggleDeleteAction}
          className="btn-chat-action"
        >
          <TrashIcon size="small" />
          <span className="ms-1">Select Messages</span>
        </Button>
        {openDeleteActions && (
          <Button
            title="Delete Selected"
            variant="danger"
            size="sm"
            onClick={deleteSelectedMessages}
            disabled={selectedMessages.size === 0}
            className="btn-delete-action"
          >
            Delete ({selectedMessages.size})
          </Button>
        )}
        <Button
          variant="outline-danger"
          title="Clear All Messages"
          onClick={clearChat}
          className="btn-chat-action btn-clear-chat"
          disabled={chatMessages.length === 0}
        >
          <TrashIcon size="small" />
          <span className="ms-1">Clear Chat</span>
        </Button>
      </div>
    );
  };

  const toggleCheckbox = (event: React.ChangeEvent<HTMLInputElement>) => {
    const checked = event.target.checked;
    setIsFilterEnabled(checked);
    if (!checked) {
      clearFilter();
    } else {
      filterChat(filterMode, filterValue);
    }
  };

  const changeFilterMode = (mode: string) => {
    setFilterMode(mode);
    if (isFilterEnabled) {
      filterChat(mode, filterValue);
    }
  };

  const updateFilterValue = (
    event: React.ChangeEvent<HTMLSelectElement | HTMLInputElement>
  ) => {
    setFilterValue(event.target.value);
    if (isFilterEnabled) {
      filterChat(filterMode, event.target.value);
    }
  };

  const synchronize = () => {
    if (connectionStatus === 'offline') {
      showErrorToastMessage("Can't synchronize with server");
      return;
    }
    clearFilter();
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
    a.download = 'chat.txt';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

  const insertMessage = () => {
    if (!inputRef.current) return;

    const msg = inputRef.current.value.trim();
    if (msg === '') return;

    sendChatMessage(msg, false);
    inputRef.current.value = '';
  };

  const handleEventClick = (chatMessage: ChatMessageInterface) => {
    if (!chatMessage.eventData || chatMessage.eventData.length === 0) {
      showErrorToastMessage('No event data');
      return;
    }

    const msgUserId = chatMessage.userId;
    switch (chatMessage.eventType) {
      case 'ping':
        {
          const objId = chatMessage.eventData[0] as string;
          const pingPos = chatMessage.eventData[1] as {
            x: number;
            y: number;
            z: number;
          } | null;
          const pingDurationInMs = chatMessage.eventData[2] as number;
          pingReplay(msgUserId, objId, pingPos, pingDurationInMs);
        }
        break;
      case 'highlight':
        {
          const entityId = chatMessage.eventData[1] as string;
          lookAtEntity(entityId);
        }
        break;
      default:
        showErrorToastMessage('Unknown event');
    }
  };

  const toggleMessageSelection = (chatMessage: ChatMessageInterface) => {
    if (!openDeleteActions) return;

    setSelectedMessages((prev) => {
      const next = new Set(prev);
      if (next.has(chatMessage.msgId)) {
        next.delete(chatMessage.msgId);
      } else {
        next.add(chatMessage.msgId);
      }
      return next;
    });
  };

  const messagesToDisplay = isFilterEnabled ? filteredMessages : chatMessages;

  const handleEnabledChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    toggleCheckbox(event);
  };

  const renderFilterOptions = () => {
    if (!openFilterOptions) return null;

    return (
      <div className="filter-options">
        <label htmlFor="filter-checkbox">
          <input
            type="checkbox"
            checked={isFilterEnabled}
            id="filter-checkbox"
            onChange={handleEnabledChange}
          />
          <span>Enable Filtering</span>
        </label>
        <div className="radio-buttons-chat">
          <label>
            <input
              type="radio"
              name="filter-type"
              value="UserId"
              checked={filterMode === 'UserId'}
              onChange={() => changeFilterMode('UserId')}
            />
            <span>Filter by User</span>
          </label>
          {filterMode === 'UserId' && (
            <select
              id="filter-val"
              className="form-select form-select-sm"
              value={filterValue}
              onChange={updateFilterValue}
            >
              <option value="">Select a user...</option>
              {usersInChat.map((user) => (
                <option value={user.name} key={user.id}>
                  {user.name}
                </option>
              ))}
            </select>
          )}
          <label>
            <input
              type="radio"
              name="filter-type"
              value="Events"
              checked={filterMode === 'Events'}
              onChange={() => changeFilterMode('Events')}
            />
            <span>Filter by Events</span>
          </label>
        </div>
      </div>
    );
  };

  return (
    <>
      <div className="chat">
        <h5>Collaboration Chat</h5>
        <div className="chat-button-area">
          <div className="d-flex gap-2 flex-wrap align-items-center w-100">
            <div style={{ position: 'relative' }}>
              <Button
                variant="outline-secondary"
                title="Filter Options"
                onClick={toggleFilter}
                className="btn-chat-action"
              >
                <GearIcon size="small" />
              </Button>
              {renderFilterOptions()}
            </div>

            {renderChatActions()}

            <Button
              variant="outline-secondary"
              title="Sync with Server"
              onClick={synchronize}
              className="btn-chat-action ms-auto"
            >
              <LogIcon size="small" />
            </Button>
            <Button
              variant="outline-secondary"
              title="Download Chat History"
              onClick={downloadChat}
              className="btn-chat-action"
            >
              <DownloadIcon size="small" />
            </Button>
          </div>
        </div>

        <ul className="chat-thread" ref={chatThreadRef}>
          {messagesToDisplay.map((chatMessage) => {
            const isSelf = chatMessage.userId === userId;
            const isEvent = chatMessage.isEvent;
            const isSelected = selectedMessages.has(chatMessage.msgId);

            let containerClass = 'message-container';
            if (isEvent) containerClass += ' event';
            else if (isSelf) containerClass += ' self';
            else containerClass += ' other';

            if (openDeleteActions) containerClass += ' selectable';
            if (isSelected) containerClass += ' selected';

            return (
              <div
                key={chatMessage.msgId}
                className={containerClass}
                data-message-id={chatMessage.msgId}
                onClick={() => toggleMessageSelection(chatMessage)}
              >
                {!isEvent && (
                  <div
                    className="User"
                    style={{
                      color: `rgb(${chatMessage.userColor.r * 255}, ${chatMessage.userColor.g * 255}, ${chatMessage.userColor.b * 255})`,
                    }}
                  >
                    {chatMessage.userId !== 'unknown'
                      ? `${chatMessage.userName} (${chatMessage.userId})`
                      : chatMessage.userName}
                  </div>
                )}
                <li className={isEvent ? 'event-message' : 'Message'}>
                  {chatMessage.message}
                  {(chatMessage.eventType === 'ping' ||
                    chatMessage.eventType === 'highlight') && (
                    <Button
                      variant="link"
                      className="event-button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleEventClick(chatMessage);
                      }}
                    >
                      {chatMessage.eventType === 'highlight'
                        ? 'Look At'
                        : 'Replay'}
                    </Button>
                  )}
                </li>
                {!isEvent && (
                  <div className="chat-timestamp">{chatMessage.timestamp}</div>
                )}
              </div>
            );
          })}
        </ul>

        <div className="message-box">
          <input
            ref={inputRef}
            id="texfield"
            className="message-input"
            placeholder="Type a message..."
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
