import '@copilotkit/react-ui/styles.css';
import { ChatbotChat } from 'explorviz-frontend/src/components/chatbot/chatbot-chat';
import { ChatbotContext } from 'explorviz-frontend/src/components/chatbot/chatbot-context';
import { ModelDropdown } from 'explorviz-frontend/src/components/chatbot/model-dropdown';
import { ProviderDropdown } from 'explorviz-frontend/src/components/chatbot/provider-dropdown';
import { ResetButton } from 'explorviz-frontend/src/components/chatbot/reset-button';
import { StudyDownloadButton } from 'explorviz-frontend/src/components/chatbot/study-download-button';
import { EditingBackButton } from 'explorviz-frontend/src/components/editing/editing-back-button';
import { EditingForwardButton } from 'explorviz-frontend/src/components/editing/editing-forward-button';
import { use } from 'react';
import Alert from 'react-bootstrap/Alert';
import Button from 'react-bootstrap/Button';

export default function ChatbotBox() {
  const {
    providersError,
    isLoadingProviders,
    reloadProviders,
    providers,
    selectedModel,
  } = use(ChatbotContext);

  const isReady =
    providers.length > 0 && Boolean(selectedModel.id) && !providersError;

  return (
    <>
      <div className="chatbot">
        <div className="chatbox-button-area">
          <EditingBackButton />
          <EditingForwardButton />
          <ResetButton />
          <StudyDownloadButton />
          <ProviderDropdown />
          <ModelDropdown />
        </div>
        {providersError && (
          <Alert variant="warning" className="m-3 mb-0">
            <div>{providersError}</div>
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
        {!providersError && isLoadingProviders && (
          <Alert variant="info" className="m-3 mb-0">
            Connecting to the AI chat service…
          </Alert>
        )}
        {isReady && <ChatbotChat />}
      </div>
      <div className="bg" />
    </>
  );
}
