import '@copilotkit/react-ui/styles.css';
import { ProviderDropdown } from 'explorviz-frontend/src/components/chatbot/provider-dropdown';
import { ModelDropdown } from 'explorviz-frontend/src/components/chatbot/model-dropdown';
import { ChatbotChat } from 'explorviz-frontend/src/components/chatbot/chatbot-chat';
import { ResetButton } from 'explorviz-frontend/src/components/chatbot/reset-button';
import { EditingBackButton } from 'explorviz-frontend/src/components/editing/editing-back-button';
import { EditingForwardButton } from 'explorviz-frontend/src/components/editing/editing-forward-button';

export default function ChatbotBox() {
  return (
    <>
      <div className="chatbot">
        <div className="chatbox-button-area">
          <EditingBackButton />
          <EditingForwardButton />
          <ResetButton />
          <ProviderDropdown />
          <ModelDropdown />
        </div>
        <ChatbotChat />
      </div>
      <div className="bg" />
    </>
  );
}
