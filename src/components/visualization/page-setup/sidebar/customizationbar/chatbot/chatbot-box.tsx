import '@copilotkit/react-ui/styles.css';
import { ProviderDropdown } from 'explorviz-frontend/src/components/chatbot/provider-dropdown';
import { ModelDropdown } from 'explorviz-frontend/src/components/chatbot/model-dropdown';
import { ChatbotChat } from 'explorviz-frontend/src/components/chatbot/chatbot-chat';
import { ResetButton } from 'explorviz-frontend/src/components/chatbot/reset-button';

export default function ChatbotBox() {
  return (
    <>
      <div className="chatbot">
        <div className="chatbox-button-area">
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
