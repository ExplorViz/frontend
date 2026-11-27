import { CopilotChat } from '@copilotkit/react-core/v2';
import { ChatbotContext } from 'explorviz-frontend/src/components/chatbot/chatbot-context-store';
import { use } from 'react';

type ChatMessages = { role: string }[];

/**
 * The results of tool calls show nothing themselves; the cards of the tool
 * calls find them in the full list. They must not get a row of their own:
 * once a long conversation is virtualized, CopilotKit reserves 100px for every
 * row without a height, which leaves large blank areas after tool calls.
 */
function withoutToolResults<Messages extends ChatMessages>(messages: Messages) {
  return messages.filter((message) => message.role !== 'tool') as Messages;
}

export function ChatbotChat() {
  const { selectedModel } = use(ChatbotContext);

  return (
    <CopilotChat
      agentId={selectedModel.agentId}
      attachments={{ enabled: true }}
      labels={{
        welcomeMessageText: 'ExplorViz Chat Assistant',
      }}
      messageView={{ transformMessages: withoutToolResults }}
    />
  );
}
