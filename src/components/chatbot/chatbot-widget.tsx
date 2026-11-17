import '@copilotkit/react-core/v2/styles.css';
import { CommentDiscussionIcon, XIcon } from '@primer/octicons-react';
import { ChatbotChat } from 'explorviz-frontend/src/components/chatbot/chatbot-chat';
import { CopilotRuntime } from 'explorviz-frontend/src/components/chatbot/chatbot-context';
import { CHATBOT_WIDGET_CLASS, ChatbotContext } from 'explorviz-frontend/src/components/chatbot/chatbot-context-store';
import { ModelDropdown } from 'explorviz-frontend/src/components/chatbot/model-dropdown';
import { ProviderDropdown } from 'explorviz-frontend/src/components/chatbot/provider-dropdown';
import { ResetButton } from 'explorviz-frontend/src/components/chatbot/reset-button';
import { StudyDownloadButton } from 'explorviz-frontend/src/components/chatbot/study-download-button';
import { EditingBackButton } from 'explorviz-frontend/src/components/editing/editing-back-button';
import { EditingForwardButton } from 'explorviz-frontend/src/components/editing/editing-forward-button';
import { BottomBarContext } from 'explorviz-frontend/src/components/visualization/page-setup/bottom-bar/bottom-bar-context';
import ResizeHandle from 'explorviz-frontend/src/components/visualization/page-setup/resize-handle';
import { type CSSProperties, use, useEffect, useLayoutEffect, useRef, useState } from 'react';
import Alert from 'react-bootstrap/Alert';
import Button from 'react-bootstrap/Button';

/**
 * Floating chat: an action button in the bottom right corner that toggles a
 * chat window above it. Both are layered below the sidebars.
 */
export function ChatbotWidget() {
  const {
    isChatOpen,
    setIsChatOpen,
    copilotRuntimeRequested,
    providersError,
    isLoadingProviders,
    reloadProviders,
    isCopilotRuntimeReady,
    copilotRuntimeError,
    isChatServiceReachable,
  } = use(ChatbotContext);

  const widgetRef = useRef<HTMLDivElement>(null);
  const chatBodyRef = useRef<HTMLDivElement>(null);
  const bottomOffset = useBottomBarOffset(widgetRef);
  const contentHeight = useChatContentHeight(chatBodyRef, isCopilotRuntimeReady);

  // Put the cursor into the input when the window opens, so typing can start
  // right away. Also runs when the chat becomes ready while already open.
  useEffect(() => {
    if (!isChatOpen || !isCopilotRuntimeReady) {
      return;
    }
    const frame = requestAnimationFrame(() => {
      chatBodyRef.current?.querySelector<HTMLTextAreaElement>('textarea')?.focus();
    });
    return () => cancelAnimationFrame(frame);
  }, [isChatOpen, isCopilotRuntimeReady]);

  const statusMessage = copilotRuntimeError ?? providersError;

  const style = {
    '--chatbot-bottom-offset': `${bottomOffset}px`,
    ...(contentHeight !== null && { '--chatbot-content-height': `${contentHeight}px` }),
  } as CSSProperties;

  return (
    <div className={CHATBOT_WIDGET_CLASS} ref={widgetRef} style={style}>
      {/* Stays mounted once opened, so closing the window keeps the conversation. */}
      {copilotRuntimeRequested && (
        <div className="chatbot-window card" hidden={!isChatOpen} role="dialog" aria-label="AI chat">
          <ChatbotResizeHandle widgetRef={widgetRef} />
          <CopilotRuntime>
            <div className="chatbot-window-header">
              <EditingBackButton />
              <EditingForwardButton />
              {isCopilotRuntimeReady && (
                <>
                  <ResetButton />
                  <StudyDownloadButton />
                  <ProviderDropdown />
                  <ModelDropdown />
                </>
              )}
            </div>
            {statusMessage && (
              <Alert variant="warning" className="m-3">
                <div>{statusMessage}</div>
                <Button
                  size="sm"
                  variant="outline-dark"
                  className="mt-2"
                  disabled={isLoadingProviders}
                  onClick={() => reloadProviders()}
                >
                  {isLoadingProviders ? 'Reloading…' : 'Retry'}
                </Button>
              </Alert>
            )}
            {!statusMessage && !isCopilotRuntimeReady && (
              <Alert variant="info" className="m-3">
                Connecting to the AI chat service…
              </Alert>
            )}
            {isCopilotRuntimeReady && (
              <div className="chatbot-window-body" ref={chatBodyRef}>
                <ChatbotChat />
              </div>
            )}
          </CopilotRuntime>
        </div>
      )}
      {/* Only offered while the chat service answers. An open chat keeps its
          button, so the window can still be closed and shows the error. */}
      {(isChatServiceReachable || isChatOpen) && (
        <Button
          variant="primary"
          className="chatbot-fab"
          title={isChatOpen ? 'Close Chat' : 'Open AI Chat'}
          aria-expanded={isChatOpen}
          onClick={() => setIsChatOpen(!isChatOpen)}
        >
          {isChatOpen ? <XIcon size={24} /> : <CommentDiscussionIcon size={24} />}
        </Button>
      )}
    </div>
  );
}

const WIDTH_STORAGE_KEY = 'chatbotWidthInPx';
const MIN_WIDTH_IN_PX = 320;
const DEFAULT_WIDTH_IN_PX = 448;

/** Widest the window may be: the area it is positioned in, minus its margins. */
function maxChatbotWidth(widget: HTMLElement | null) {
  const anchorWidth = (widget?.offsetParent as HTMLElement | null)?.clientWidth ?? window.innerWidth;
  const gap = widget ? parseFloat(getComputedStyle(widget).right) || 0 : 0;
  return Math.max(MIN_WIDTH_IN_PX, anchorWidth - 2 * gap);
}

function clampChatbotWidth(width: number, widget: HTMLElement | null) {
  return Math.min(Math.max(width, MIN_WIDTH_IN_PX), maxChatbotWidth(widget));
}

function applyChatbotWidth(widget: HTMLElement | null, width: number) {
  widget?.style.setProperty('--chatbot-width', `${width}px`);
}

/**
 * Left edge of the chat window, resizing its width like the sidebars' edges
 * do. The width is persisted in localStorage.
 */
function ChatbotResizeHandle({ widgetRef }: { widgetRef: React.RefObject<HTMLDivElement | null> }) {
  const [initialWidth] = useState(() => {
    try {
      const storedWidth = Number(localStorage.getItem(WIDTH_STORAGE_KEY));
      return storedWidth > 0 ? storedWidth : DEFAULT_WIDTH_IN_PX;
    } catch {
      return DEFAULT_WIDTH_IN_PX;
    }
  });
  const previewWidth = useRef<number | null>(null);

  // Before paint, so the window never flashes at the default width. The CSS
  // caps it at the available width if the browser window got narrower.
  useLayoutEffect(() => {
    applyChatbotWidth(widgetRef.current, initialWidth);
  }, [widgetRef, initialWidth]);

  const onPreview = (width: number) => {
    const clampedWidth = clampChatbotWidth(width, widgetRef.current);
    previewWidth.current = clampedWidth;
    applyChatbotWidth(widgetRef.current, clampedWidth);
    return clampedWidth;
  };

  const onCommit = () => {
    if (previewWidth.current === null) {
      return;
    }
    try {
      localStorage.setItem(WIDTH_STORAGE_KEY, previewWidth.current.toString());
    } catch {
      // localStorage is unavailable; the width just is not remembered.
    }
    previewWidth.current = null;
  };

  return (
    <ResizeHandle
      className="chatbot-resize-handle"
      ariaLabel="Resize chat window"
      orientation="vertical"
      // Anchored on the right, so dragging the left edge to the left grows it
      growDirection={-1}
      valueNow={initialWidth}
      getSize={() => widgetRef.current?.getBoundingClientRect().width ?? initialWidth}
      onPreview={onPreview}
      onCommit={onCommit}
    />
  );
}

/**
 * How far the bottom bar reaches into the area the widget is positioned in,
 * so the widget can sit above the bar instead of underneath it.
 */
function useBottomBarOffset(widgetRef: React.RefObject<HTMLDivElement | null>) {
  const { isExpanded } = use(BottomBarContext);
  const [offset, setOffset] = useState(0);

  useEffect(() => {
    const bottomBar = document.getElementById('bottom-bar-container');
    const anchor = widgetRef.current?.offsetParent;
    if (!bottomBar || !anchor) {
      setOffset(0);
      return;
    }

    const measure = () => {
      const overlap = anchor.getBoundingClientRect().bottom - bottomBar.getBoundingClientRect().top;
      setOffset(Math.max(0, Math.round(overlap)));
    };

    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(bottomBar);
    observer.observe(anchor);
    return () => observer.disconnect();
  }, [isExpanded, widgetRef]);

  return offset;
}

/**
 * Natural height of the chat's message list (including the room it reserves
 * for the input). The window grows with it until the available height is used
 * up; from there on the message list scrolls. Null while there is nothing to
 * measure, e.g. on the welcome screen.
 */
function useChatContentHeight(chatBodyRef: React.RefObject<HTMLDivElement | null>, enabled: boolean) {
  const [height, setHeight] = useState<number | null>(null);

  useEffect(() => {
    const chatBody = chatBodyRef.current;
    if (!enabled || !chatBody) {
      setHeight(null);
      return;
    }

    let observed: Element | null = null;
    const resizeObserver = new ResizeObserver(() => {
      // Hidden elements report 0; keep the last height while the window is closed.
      if (observed instanceof HTMLElement && observed.offsetHeight > 0) {
        setHeight(observed.offsetHeight);
      }
    });

    // The message list only exists while there are messages, and CopilotKit
    // replaces it when the conversation changes.
    const track = () => {
      const content = chatBody.querySelector('[data-testid="copilot-scroll-content"]');
      if (content === observed) {
        return;
      }
      if (observed) {
        resizeObserver.unobserve(observed);
      }
      observed = content;
      if (content) {
        resizeObserver.observe(content);
      } else {
        setHeight(null);
      }
    };

    track();
    const mutationObserver = new MutationObserver(track);
    mutationObserver.observe(chatBody, { childList: true, subtree: true });

    return () => {
      mutationObserver.disconnect();
      resizeObserver.disconnect();
    };
  }, [chatBodyRef, enabled]);

  return height;
}
