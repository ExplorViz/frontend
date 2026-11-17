import { useAgent } from '@copilotkit/react-core/v2';
import { ChatbotContext } from 'explorviz-frontend/src/components/chatbot/chatbot-context-store';
import { use } from 'react';

/** Clears the conversation of the currently selected model's agent. */
export function useResetChat() {
  const { selectedModel } = use(ChatbotContext);
  // No updates: resetting never needs a re-render on new messages.
  const { agent } = useAgent({ agentId: selectedModel.agentId, updates: [] });

  return () => {
    if (agent.isRunning) {
      agent.abortRun();
    }
    agent.setMessages([]);
    agent.setState({});
  };
}
