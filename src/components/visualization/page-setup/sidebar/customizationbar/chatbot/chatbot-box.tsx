import { useLocalUserStore } from 'explorviz-frontend/src/stores/collaboration/local-user';
import { useHighlightingStore } from 'explorviz-frontend/src/stores/highlighting';

import { CopilotChat } from '@copilotkit/react-ui';
import '@copilotkit/react-ui/styles.css';
import { ProviderDropdown } from 'explorviz-frontend/src/components/chatbot/provider-dropdown';
import { ModelDropdown } from 'explorviz-frontend/src/components/chatbot/model-dropdown';

export default function ChatbotBox() {
  const pingReplay = useLocalUserStore((state) => state.pingReplay);
  const highlightReplay = useHighlightingStore(
    (state) => state.highlightReplay
  );

  return (
    <>
      <div className="chatbot">
        <div className="chatbox-button-area">
          <ProviderDropdown />
          <ModelDropdown />
        </div>

        <CopilotChat
          instructions={
            'You are assisting the user as best as you can. Answer in the best way possible given the data you have.'
          }
          labels={{
            initial: 'Hi! 👋 How can I assist you today?',
          }}
        />
      </div>
      <div className="bg" />
    </>
  );
}
