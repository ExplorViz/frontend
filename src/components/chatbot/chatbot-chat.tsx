import { CopilotChat } from '@copilotkit/react-core/v2';
import { ChatbotContext } from 'explorviz-frontend/src/components/chatbot/chatbot-context-store';
import { use } from 'react';

export function ChatbotChat() {
  const { selectedModel } = use(ChatbotContext);

  return (
    <CopilotChat
      agentId={selectedModel.agentId}
      attachments={{ enabled: true }}
      labels={{
        welcomeMessageText: 'How can I assist you?',
      }}
    />
  );
}
